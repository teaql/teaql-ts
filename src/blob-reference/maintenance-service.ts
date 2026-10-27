import { BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { ObjectKey, ObjectStorage } from '../core/object-storage';
import { SQLiteDriver } from '../sql/sqlite';
import { SqlBlobCatalog } from './sql-catalog';

export interface BlobMaintenanceAuthorization {
  scope(context: UserContext): string;
  canMaintain(context: UserContext, scope: string): Promise<boolean> | boolean;
}

export class BlobMaintenanceCursor {
  private constructor(private readonly scopeValue: string, private readonly afterValue: string) {}
  static next(scope: string, after: string): BlobMaintenanceCursor {
    return new BlobMaintenanceCursor(scope, after);
  }
  matches(scope: string): boolean { return this.scopeValue === scope; }
  position(): string { return this.afterValue; }
  toString(): string { return 'BlobMaintenanceCursor[masked]'; }
}

export type BlobMaintenanceOutcome = Readonly<{
  reference: BlobRef;
  status: 'deleted' | 'already_missing' | 'not_eligible' | 'version_conflict' | 'failed';
  error?: 'BLOB_IDEMPOTENCY_CONFLICT' | 'BLOB_CATALOG_FAILED' | 'BLOB_STORE_FAILED';
}>;
export type BlobMaintenanceBatch = Readonly<{
  outcomes: readonly BlobMaintenanceOutcome[]; next?: BlobMaintenanceCursor;
}>;

const validScope = (value: unknown): value is string =>
  typeof value === 'string' && !!value.trim() && value === value.trim() &&
  Buffer.byteLength(value) <= 256 && !/[\x00-\x1f\x7f-\x9f]/.test(value);

/** Explicit host-scheduled, version-fenced server-stream lifecycle collection. */
export class SqliteBlobMaintenanceService {
  constructor(private readonly catalog: SqlBlobCatalog,
              private readonly authorization: BlobMaintenanceAuthorization,
              private readonly batchSize = 100,
              private readonly now: () => number = Date.now) {
    if (!(catalog.driver instanceof SQLiteDriver) || !authorization ||
        !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
      throw new Error('BLOB_POLICY_INVALID');
    }
  }

  private async authorize(context: UserContext, expected?: string): Promise<string> {
    let scope: string, allowed: boolean;
    try {
      scope = this.authorization.scope(context);
      allowed = await this.authorization.canMaintain(context, scope);
    } catch { throw new Error('BLOB_MAINTENANCE_DENIED'); }
    if (!validScope(scope) || expected !== undefined && scope !== expected || !allowed)
      throw new Error('BLOB_MAINTENANCE_DENIED');
    return scope;
  }

  private requireStandalone(): void {
    try { (this.catalog.driver as SQLiteDriver).assertNoCurrentTransaction(); }
    catch { throw new Error('BLOB_TRANSACTION_REQUIRED'); }
  }

  private time(): number {
    const value = this.now();
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('BLOB_POLICY_INVALID');
    return value;
  }

  private async collect(context: UserContext, scope: string, key: string,
                        store: ObjectStorage): Promise<BlobMaintenanceOutcome> {
    const reference = new BlobRef(key);
    await this.authorize(context, scope);
    const claim = await this.catalog.claimDeletion(scope, key, this.time());
    if (!claim) return { reference, status: 'not_eligible' };
    await this.authorize(context, scope);
    const objectKey = new ObjectKey(claim.objectKey);
    let version = claim.contentVersion;
    if (version && claim.writtenETag && version !== claim.writtenETag)
      throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
    if (!version) {
      let observed;
      try { observed = await store.head(objectKey); }
      catch { throw new Error('BLOB_STORE_FAILED'); }
      if (observed) {
        if (!observed.etag || claim.writtenETag && observed.etag !== claim.writtenETag)
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        version = observed.etag;
        await this.authorize(context, scope);
        await this.catalog.captureDeletionVersion(scope, claim, version, this.time());
      }
    }
    await this.authorize(context, scope);
    let status: 'deleted' | 'already_missing' = 'already_missing';
    if (version) {
      let result;
      try { result = await store.deleteIfVersion(objectKey, version); }
      catch { throw new Error('BLOB_STORE_FAILED'); }
      if (result === 'version_mismatch') throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      status = result;
    }
    await this.authorize(context, scope);
    await this.catalog.finishDeletion(scope, claim, version, this.time());
    return { reference, status };
  }

  async runBatch(context: UserContext, cursor?: BlobMaintenanceCursor): Promise<BlobMaintenanceBatch> {
    const scope = await this.authorize(context);
    if (cursor !== undefined && (!(cursor instanceof BlobMaintenanceCursor) || !cursor.matches(scope)))
      throw new Error('BLOB_MAINTENANCE_DENIED');
    this.requireStandalone();
    let store: ObjectStorage;
    try { store = context.objectStorage('collect retained Blob lifecycle'); }
    catch { throw new Error('BLOB_CAPABILITY_MISSING'); }
    if (!store.supportsVersionConditionalDelete()) throw new Error('BLOB_CAPABILITY_MISSING');
    await this.catalog.validateSchema();
    const candidates = await this.catalog.deletionCandidates(scope,
      cursor?.position() ?? '', this.time(), this.batchSize);
    const outcomes: BlobMaintenanceOutcome[] = [];
    for (const key of candidates) {
      try { outcomes.push(await this.collect(context, scope, key, store)); }
      catch (error) {
        if (error instanceof Error && ['BLOB_MAINTENANCE_DENIED', 'BLOB_TRANSACTION_REQUIRED'].includes(error.message)) throw error;
        const code = error instanceof Error ? error.message : '';
        outcomes.push({ reference: new BlobRef(key),
          status: code === 'BLOB_IDEMPOTENCY_CONFLICT' ? 'version_conflict' : 'failed',
          error: code === 'BLOB_IDEMPOTENCY_CONFLICT' || code === 'BLOB_CATALOG_FAILED'
            ? code : 'BLOB_STORE_FAILED' });
      }
    }
    return Object.freeze({ outcomes: Object.freeze(outcomes),
      next: candidates.length === this.batchSize
        ? BlobMaintenanceCursor.next(scope, candidates[candidates.length - 1]!) : undefined });
  }
}
