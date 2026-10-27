import type { TeaQLDataService, TeaQLSqlDriver } from '../sql/core';
import type { GraphMutationSession } from '../core/request-intent';
import type { UserContext } from '../core/context';
import { BlobRef } from '../core/blob-ref';
import type { AuthorizedBlobSlot } from '../core/view-preparation';

export type BlobReadRecord = Readonly<{
  objectKey: string;
  contentVersion: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}>;

export type BlobBindingTarget = Readonly<{
  entity: string;
  entityId: string;
  field: string;
}>;

export type BlobBindingChange = Readonly<{
  target: BlobBindingTarget;
  next: BlobRef | null;
  expectedVersion: number;
  nextVersion: number;
  action?: 'Create' | 'Update' | 'Delete';
}>;

/** The trusted host supplies current scope and authorizes the canonical target. */
export interface BlobBindingAuthorization {
  scope(context: UserContext): string;
  authorize(context: UserContext, target: BlobBindingTarget,
            previous: BlobRef | null, next: BlobRef | null,
            action: 'Create' | 'Update' | 'Delete'): Promise<boolean>;
}

/** Physical catalog for the optional module. Migration is an explicit host action. */
export class SqlBlobCatalog {
  constructor(readonly driver: TeaQLSqlDriver) {}

  async ensureSchema(): Promise<void> {
    try {
      await this.driver.query(`CREATE TABLE IF NOT EXISTS teaql_blob_catalog (
        key TEXT PRIMARY KEY, scope TEXT NOT NULL, object_key TEXT NOT NULL,
        content_version TEXT NOT NULL, file_name TEXT NOT NULL,
        content_type TEXT NOT NULL, size_bytes BIGINT NOT NULL,
        status TEXT NOT NULL CHECK (status IN
          ('initiated','uploaded_unbound','available','deleting','deleted'))
      )`);
      await this.driver.query(`CREATE TABLE IF NOT EXISTS teaql_blob_binding (
        scope TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
        field TEXT NOT NULL, key TEXT, version BIGINT NOT NULL,
        PRIMARY KEY (scope,entity,entity_id,field),
        FOREIGN KEY (key) REFERENCES teaql_blob_catalog(key)
      )`);
      await this.driver.query('CREATE INDEX IF NOT EXISTS teaql_blob_binding_key ON teaql_blob_binding(key)');
    } catch { throw new Error('BLOB_CATALOG_FAILED'); }
  }

  /** SQLite's BEGIN IMMEDIATE owner serializes the authoritative binding row.
   * The caller's graph owns commit; a failed module SQL call poisons that graph.
   * Other SQL backends need their own row-lock implementation before use.
   */
  async bindInGraph(owner: TeaQLDataService, graph: GraphMutationSession,
                    context: UserContext, change: BlobBindingChange,
                    authorization: BlobBindingAuthorization): Promise<number> {
    return owner.withGraphSqlSession(graph, async session => {
      try {
        if (!owner.isCurrentGraphActor(graph, context)) throw new Error('BLOB_BIND_DENIED');
        if (this.driver.databaseKind !== 'sqlite') throw new Error('BLOB_CAPABILITY_MISSING');
        if (!change || !change.target || !authorization ||
            (change.next !== null && !(change.next instanceof BlobRef)) ||
            (change.action !== undefined && !['Create', 'Update', 'Delete'].includes(change.action)) ||
            (change.action === 'Create' && change.expectedVersion !== 0) ||
            (change.action === 'Delete' && change.next !== null) ||
            !Number.isSafeInteger(change.expectedVersion) || change.expectedVersion < 0 ||
            !Number.isSafeInteger(change.nextVersion) ||
            change.nextVersion <= change.expectedVersion ||
            !validName(change.target.entity) || !validName(change.target.field) ||
            !validEntityID(change.target.entityId)) {
          throw new Error('BLOB_REFERENCE_INVALID');
        }
        let scope: string;
        try { scope = authorization.scope(context); }
        catch { throw new Error('BLOB_BIND_DENIED'); }
        if (!validScope(scope)) {
          throw new Error('BLOB_BIND_DENIED');
        }
        const p = (index: number) => this.driver.placeholder(index);
        const target = change.target;
        const identity = [scope, target.entity, target.entityId, target.field];
        const rows = await session.query(`SELECT key, version FROM teaql_blob_binding
        WHERE scope = ${p(1)} AND entity = ${p(2)} AND entity_id = ${p(3)} AND field = ${p(4)}`,
        identity);
        if (rows.rows.length > 1) throw new Error('BLOB_CATALOG_FAILED');
        const row = rows.rows[0] as { key: unknown; version: unknown } | undefined;
        const version = row ? Number(row.version) : 0;
        if (!Number.isSafeInteger(version) || version !== change.expectedVersion) {
          throw new Error('BLOB_BIND_DENIED');
        }
        const previous = row?.key == null ? null : BlobRef.fromSQL(row.key);
        let allowed = false;
        try { allowed = await authorization.authorize(context, target, previous,
          change.next, change.action ?? 'Update'); }
        catch { throw new Error('BLOB_BIND_DENIED'); }
        if (!allowed) throw new Error('BLOB_BIND_DENIED');
        if (change.next) {
          const eligible = await session.query(`SELECT key FROM teaql_blob_catalog
          WHERE key = ${p(1)} AND scope = ${p(2)} AND status = 'available'`,
          [change.next.key, scope]);
          if (eligible.rows.length !== 1) throw new Error('BLOB_BIND_DENIED');
        }
        let result;
        if (row) {
          result = await session.query(`UPDATE teaql_blob_binding SET key = ${p(1)}, version = ${p(2)}
          WHERE scope = ${p(3)} AND entity = ${p(4)} AND entity_id = ${p(5)}
          AND field = ${p(6)} AND version = ${p(7)}`,
          [change.next?.key ?? null, change.nextVersion, ...identity, version]);
        } else {
          result = await session.query(`INSERT INTO teaql_blob_binding
          (scope, entity, entity_id, field, key, version)
          VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)})`,
          [...identity, change.next?.key ?? null, change.nextVersion]);
        }
        if (result.rowCount !== 1) throw new Error('BLOB_BIND_DENIED');
        return change.nextVersion;
      } catch (error) {
        if (error instanceof Error && ['BLOB_BIND_DENIED', 'BLOB_CATALOG_FAILED',
          'BLOB_CAPABILITY_MISSING', 'BLOB_REFERENCE_INVALID'].includes(error.message)) {
          throw error;
        }
        throw new Error('BLOB_CATALOG_FAILED');
      }
    });
  }

  async validateSchema(): Promise<void> {
    try {
      await this.driver.query('SELECT key, scope, object_key, content_version, file_name, ' +
        'content_type, size_bytes, status FROM teaql_blob_catalog WHERE 1 = 0');
      await this.driver.query('SELECT scope, entity, entity_id, field, key, version ' +
        'FROM teaql_blob_binding WHERE 1 = 0');
      if (this.driver.databaseKind === 'sqlite') {
        const columns = await this.driver.query('PRAGMA table_info(teaql_blob_binding)');
        const key = columns.rows.find(row => row.name === 'key');
        const version = columns.rows.find(row => row.name === 'version');
        if (!key || Number(key.notnull) !== 0 || !version || Number(version.notnull) !== 1) {
          throw new Error('BLOB_SCHEMA_MISSING');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'BLOB_SCHEMA_MISSING') throw error;
      if (isMissingTable(error)) throw new Error('BLOB_SCHEMA_MISSING');
      throw new Error('BLOB_CATALOG_FAILED');
    }
  }

  async currentRead(slot: AuthorizedBlobSlot): Promise<BlobReadRecord> {
    const p = (index: number) => this.driver.placeholder(index);
    const sql = `SELECT c.object_key, c.content_version, c.file_name,
      c.content_type, c.size_bytes FROM teaql_blob_binding b
      JOIN teaql_blob_catalog c ON c.key = b.key
      WHERE b.scope = ${p(1)} AND b.entity = ${p(2)}
        AND b.entity_id = ${p(3)} AND b.field = ${p(4)}
        AND b.key = ${p(5)} AND b.version = ${p(6)}
        AND c.scope = b.scope AND c.status = 'available'`;
    let rows: Record<string, unknown>[];
    try {
      const result = await this.driver.query(sql, [slot.scope, slot.entity, slot.entityId,
        slot.field, slot.reference.key, slot.bindingVersion]);
      rows = result.rows;
    } catch (error) {
      if (isMissingTable(error)) throw new Error('BLOB_SCHEMA_MISSING');
      throw new Error('BLOB_CATALOG_FAILED');
    }
    if (rows.length !== 1) throw new Error('BLOB_READ_DENIED');
    const row = rows[0];
    const size = Number(row.size_bytes);
    if (typeof row.object_key !== 'string' || !row.object_key ||
        typeof row.content_version !== 'string' || !row.content_version ||
        typeof row.file_name !== 'string' || !row.file_name ||
        typeof row.content_type !== 'string' || !row.content_type ||
        !Number.isSafeInteger(size) || size < 0) throw new Error('BLOB_CATALOG_FAILED');
    return Object.freeze({ objectKey: row.object_key, contentVersion: row.content_version,
      fileName: row.file_name, contentType: row.content_type, sizeBytes: size });
  }
}

function validName(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && value === value.trim() &&
    Array.from(value).length <= 128 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
}

function validScope(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && value === value.trim() &&
    new TextEncoder().encode(value).length <= 256 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
}

function validEntityID(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) &&
    value.length <= 20 && BigInt(value) <= 18446744073709551615n;
}

function isMissingTable(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === '42P01' || candidate?.code === 'SQLITE_ERROR' &&
    typeof candidate.message === 'string' && candidate.message.includes('no such table');
}
