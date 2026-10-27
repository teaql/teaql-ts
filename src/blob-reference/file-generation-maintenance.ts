import { BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { ObjectKey } from '../core/object-storage';
import { SqliteFencedFileObjectStorage } from '../object-storage/file';
import { SQLiteDriver } from '../sql/sqlite';
import { BlobMaintenanceAuthorization, BlobMaintenanceCursor } from './maintenance-service';
import { SqlBlobCatalog } from './sql-catalog';

export type BlobFileGenerationSweepOutcome = Readonly<{
  reference: BlobRef;
  status: 'swept' | 'failed';
  removedGenerations?: number;
  error?: 'BLOB_STORE_FAILED';
}>;
export type BlobFileGenerationSweepBatch = Readonly<{
  outcomes: readonly BlobFileGenerationSweepOutcome[];
  next?: BlobMaintenanceCursor;
}>;

const validScope = (value: unknown): value is string =>
  typeof value === 'string' && !!value.trim() && value === value.trim() &&
  Buffer.byteLength(value) <= 256 && !/[\x00-\x1f\x7f-\x9f]/.test(value);

/** Explicit catalog-driven sweep of inaccessible File generations. The host
 * must first upgrade every writer sharing the private root to the fenced
 * protocol; this service never starts a worker or guesses that from age. */
export class SqliteBlobFileGenerationSweepService {
  constructor(private readonly catalog: SqlBlobCatalog,
              private readonly authorization: BlobMaintenanceAuthorization,
              private readonly allWritersUpgraded: boolean,
              private readonly batchSize = 100) {
    if (!(catalog.driver instanceof SQLiteDriver) || !authorization ||
        allWritersUpgraded !== true || !Number.isSafeInteger(batchSize) ||
        batchSize < 1 || batchSize > 1000) throw new Error('BLOB_POLICY_INVALID');
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

  async runBatch(context: UserContext, provider: SqliteFencedFileObjectStorage,
                 cursor?: BlobMaintenanceCursor): Promise<BlobFileGenerationSweepBatch> {
    const scope = await this.authorize(context);
    if (cursor !== undefined && (!(cursor instanceof BlobMaintenanceCursor) || !cursor.matches(scope)))
      throw new Error('BLOB_MAINTENANCE_DENIED');
    try { (this.catalog.driver as SQLiteDriver).assertNoCurrentTransaction(); }
    catch { throw new Error('BLOB_TRANSACTION_REQUIRED'); }
    if (!(provider instanceof SqliteFencedFileObjectStorage) ||
        context.getResource('objectStorageProvider') !== provider)
      throw new Error('BLOB_CAPABILITY_MISSING');
    await this.catalog.validateSchema();
    const candidates = await this.catalog.fileGenerationSweepCandidates(scope,
      cursor?.position() ?? '', this.batchSize);
    const outcomes: BlobFileGenerationSweepOutcome[] = [];
    for (const candidate of candidates) {
      await this.authorize(context, scope);
      const reference = new BlobRef(candidate.key);
      try {
        const removedGenerations = await provider.sweepOldGenerations(new ObjectKey(candidate.objectKey));
        if (!Number.isSafeInteger(removedGenerations) || removedGenerations < 0)
          throw new Error('BLOB_STORE_FAILED');
        outcomes.push(Object.freeze({ reference, status: 'swept', removedGenerations }));
      } catch {
        outcomes.push(Object.freeze({ reference, status: 'failed', error: 'BLOB_STORE_FAILED' }));
      }
    }
    return Object.freeze({ outcomes: Object.freeze(outcomes),
      next: candidates.length === this.batchSize
        ? BlobMaintenanceCursor.next(scope, candidates[candidates.length - 1]!.key) : undefined });
  }
}
