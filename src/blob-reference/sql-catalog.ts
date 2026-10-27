import type { TeaQLSqlDriver } from '../sql/core';
import type { AuthorizedBlobSlot } from '../core/view-preparation';

export type BlobReadRecord = Readonly<{
  objectKey: string;
  contentVersion: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}>;

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
        field TEXT NOT NULL, key TEXT NOT NULL, version BIGINT NOT NULL,
        PRIMARY KEY (scope,entity,entity_id,field),
        FOREIGN KEY (key) REFERENCES teaql_blob_catalog(key)
      )`);
      await this.driver.query('CREATE INDEX IF NOT EXISTS teaql_blob_binding_key ON teaql_blob_binding(key)');
    } catch { throw new Error('BLOB_CATALOG_FAILED'); }
  }

  async validateSchema(): Promise<void> {
    try {
      await this.driver.query('SELECT key, scope, object_key, content_version, file_name, ' +
        'content_type, size_bytes, status FROM teaql_blob_catalog WHERE 1 = 0');
      await this.driver.query('SELECT scope, entity, entity_id, field, key, version ' +
        'FROM teaql_blob_binding WHERE 1 = 0');
    } catch (error) {
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

function isMissingTable(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === '42P01' || candidate?.code === 'SQLITE_ERROR' &&
    typeof candidate.message === 'string' && candidate.message.includes('no such table');
}
