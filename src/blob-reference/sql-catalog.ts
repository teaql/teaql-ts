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

export type ExpiredUploadDeletionRecord = Readonly<{
  key: string; objectKey: string; contentVersion: string; writtenETag: string | null;
}>;
const validDeleteVersion = (value: unknown): value is string =>
  typeof value === 'string' && !!value && value !== '*' && value.length <= 256 &&
  value.trim() === value && !/[\x00-\x1f\x7f-\x9f]/.test(value);

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
  constructor(readonly driver: TeaQLSqlDriver, private readonly now: () => number = Date.now) {}

  async ensureSchema(): Promise<void> {
    try {
      await this.driver.query(`CREATE TABLE IF NOT EXISTS teaql_blob_catalog (
        key TEXT PRIMARY KEY, scope TEXT NOT NULL, object_key TEXT NOT NULL,
        content_version TEXT NOT NULL, file_name TEXT NOT NULL,
        content_type TEXT NOT NULL, size_bytes BIGINT NOT NULL,
        completed_at_ms BIGINT, last_unbound_at_ms BIGINT,
        status TEXT NOT NULL CHECK (status IN
          ('initiated','uploaded_unbound','available','deleting','deleted'))
      )`);
      if (this.driver.databaseKind === 'sqlite') {
        for (const column of ['completed_at_ms', 'last_unbound_at_ms']) {
          const columns = await this.driver.query('PRAGMA table_info(teaql_blob_catalog)');
          if (columns.rows.some(row => row.name === column)) continue;
          try { await this.driver.query(`ALTER TABLE teaql_blob_catalog ADD COLUMN ${column} BIGINT`); }
          catch {
            // Another process may have completed the same additive migration.
            const current = await this.driver.query('PRAGMA table_info(teaql_blob_catalog)');
            if (!current.rows.some(row => row.name === column))
              throw new Error('BLOB_CATALOG_FAILED');
          }
        }
      }
      await this.driver.query(`CREATE TABLE IF NOT EXISTS teaql_blob_binding (
        scope TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
        field TEXT NOT NULL, key TEXT, version BIGINT NOT NULL,
        PRIMARY KEY (scope,entity,entity_id,field),
        FOREIGN KEY (key) REFERENCES teaql_blob_catalog(key)
      )`);
      await this.driver.query('CREATE INDEX IF NOT EXISTS teaql_blob_binding_key ON teaql_blob_binding(key)');
      await this.driver.query('CREATE UNIQUE INDEX IF NOT EXISTS teaql_blob_catalog_object_key ON teaql_blob_catalog(object_key)');
      await this.driver.query(`CREATE TABLE IF NOT EXISTS teaql_blob_upload (
        upload_id TEXT PRIMARY KEY, scope TEXT NOT NULL, replay_key TEXT NOT NULL,
        request_hash TEXT NOT NULL, key TEXT NOT NULL UNIQUE,
        entity TEXT NOT NULL, entity_id TEXT, field TEXT NOT NULL,
        file_name TEXT NOT NULL, extension TEXT NOT NULL, declared_size BIGINT NOT NULL,
        expires_at BIGINT NOT NULL, state TEXT NOT NULL CHECK (state IN ('initiated','written','completed')),
        written_sha256 TEXT, written_etag TEXT,
        UNIQUE (scope, replay_key), FOREIGN KEY (key) REFERENCES teaql_blob_catalog(key)
      )`);
    } catch { throw new Error('BLOB_CATALOG_FAILED'); }
  }

  /** Scoped, bounded scan. The claim below rechecks every eligibility predicate. */
  async expiredUploadDeletionCandidates(scope: string, after: string, now: number,
                                        limit: number): Promise<string[]> {
    if (!validScope(scope) || !Number.isSafeInteger(now) || !Number.isSafeInteger(limit) ||
        limit < 1 || limit > 1000) throw new Error('BLOB_POLICY_INVALID');
    try {
      const rows = await this.driver.query(`SELECT c.key FROM teaql_blob_catalog c
        JOIN teaql_blob_upload u ON u.key = c.key AND u.scope = c.scope
        WHERE c.scope = ? AND c.key > ? AND u.expires_at <= ?
          AND u.state IN ('initiated','written') AND c.status IN ('initiated','deleting')
          AND NOT EXISTS (SELECT 1 FROM teaql_blob_binding b WHERE b.key = c.key)
        ORDER BY c.key LIMIT ?`, [scope, after, now, limit]);
      return rows.rows.map(row => {
        if (typeof row.key !== 'string') throw new Error('BLOB_CATALOG_FAILED');
        return row.key;
      });
    } catch { throw new Error('BLOB_CATALOG_FAILED'); }
  }

  /** BEGIN IMMEDIATE serializes this claim with upload write/complete and graph binding. */
  async claimExpiredUploadDeletion(scope: string, key: string,
                                   now: number): Promise<ExpiredUploadDeletionRecord | undefined> {
    try {
      return await this.driver.transaction(async sql => {
        const rows = await sql.query(`SELECT c.key, c.object_key, c.content_version,
            c.status, u.state, u.expires_at, u.written_etag
          FROM teaql_blob_catalog c JOIN teaql_blob_upload u
            ON u.key = c.key AND u.scope = c.scope
          WHERE c.scope = ? AND c.key = ?`, [scope, key]);
        if (rows.rows.length !== 1) return undefined;
        const row = rows.rows[0];
        const bound = await sql.query('SELECT 1 FROM teaql_blob_binding WHERE key = ? LIMIT 1', [key]);
        if (bound.rows.length || !Number.isSafeInteger(Number(row.expires_at)) ||
            Number(row.expires_at) > now ||
            !['initiated', 'written'].includes(String(row.state)) ||
            !['initiated', 'deleting'].includes(String(row.status))) return undefined;
        if (typeof row.object_key !== 'string' || !row.object_key ||
            typeof row.content_version !== 'string' ||
            (row.written_etag !== null && !validDeleteVersion(row.written_etag)) ||
            (row.content_version !== '' && !validDeleteVersion(row.content_version)) ||
            (row.state === 'written' && !row.written_etag))
          throw new Error('BLOB_CATALOG_FAILED');
        const owners = await sql.query('SELECT count(*) AS n FROM teaql_blob_catalog WHERE object_key = ?', [row.object_key]);
        if (Number(owners.rows[0]?.n) !== 1) throw new Error('BLOB_CATALOG_FAILED');
        if (row.status === 'initiated') {
          const changed = await sql.query(`UPDATE teaql_blob_catalog SET status = 'deleting'
            WHERE key = ? AND scope = ? AND status = 'initiated'`, [key, scope]);
          if (changed.rowCount !== 1) throw new Error('BLOB_CATALOG_FAILED');
        }
        return Object.freeze({ key, objectKey: row.object_key,
          contentVersion: row.content_version, writtenETag: row.written_etag });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'SQLITE_TRANSACTION_REENTRY') throw error;
      throw new Error('BLOB_CATALOG_FAILED');
    }
  }

  async captureExpiredDeletionVersion(scope: string, record: ExpiredUploadDeletionRecord,
                                      version: string, now: number): Promise<void> {
    if (!validDeleteVersion(version)) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
    try {
      await this.driver.transaction(async sql => {
        const rows = await sql.query(`SELECT c.object_key, c.content_version, c.status,
            u.state, u.expires_at, u.written_etag
          FROM teaql_blob_catalog c JOIN teaql_blob_upload u
            ON u.key = c.key AND u.scope = c.scope
          WHERE c.scope = ? AND c.key = ?`, [scope, record.key]);
        const row = rows.rows[0];
        const bound = await sql.query('SELECT 1 FROM teaql_blob_binding WHERE key = ? LIMIT 1', [record.key]);
        if (rows.rows.length !== 1 || bound.rows.length || row.status !== 'deleting' ||
            row.object_key !== record.objectKey || !Number.isSafeInteger(Number(row.expires_at)) ||
            Number(row.expires_at) > now ||
            !['initiated', 'written'].includes(String(row.state)) ||
            row.written_etag && row.written_etag !== version ||
            row.content_version && row.content_version !== version)
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        if (!row.content_version) {
          const changed = await sql.query(`UPDATE teaql_blob_catalog SET content_version = ?
            WHERE key = ? AND scope = ? AND status = 'deleting' AND content_version = ''`,
          [version, record.key, scope]);
          if (changed.rowCount !== 1) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        }
      });
    } catch (error) {
      if (error instanceof Error && ['BLOB_IDEMPOTENCY_CONFLICT', 'SQLITE_TRANSACTION_REENTRY'].includes(error.message)) throw error;
      throw new Error('BLOB_CATALOG_FAILED');
    }
  }

  async finishExpiredUploadDeletion(scope: string, record: ExpiredUploadDeletionRecord,
                                    version: string, now: number): Promise<void> {
    try {
      await this.driver.transaction(async sql => {
        const rows = await sql.query(`SELECT c.object_key, c.content_version, c.status,
            u.state, u.expires_at
          FROM teaql_blob_catalog c JOIN teaql_blob_upload u
            ON u.key = c.key AND u.scope = c.scope
          WHERE c.scope = ? AND c.key = ?`, [scope, record.key]);
        if (rows.rows.length !== 1) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        const row = rows.rows[0];
        if (row.object_key !== record.objectKey || row.content_version !== version)
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        if (row.status === 'deleted') return;
        const bound = await sql.query('SELECT 1 FROM teaql_blob_binding WHERE key = ? LIMIT 1', [record.key]);
        if (bound.rows.length || row.status !== 'deleting' ||
            !Number.isSafeInteger(Number(row.expires_at)) || Number(row.expires_at) > now ||
            !['initiated', 'written'].includes(String(row.state)))
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        const changed = await sql.query(`UPDATE teaql_blob_catalog SET status = 'deleted'
          WHERE key = ? AND scope = ? AND status = 'deleting' AND content_version = ?`,
        [record.key, scope, version]);
        if (changed.rowCount !== 1) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      });
    } catch (error) {
      if (error instanceof Error && ['BLOB_IDEMPOTENCY_CONFLICT', 'SQLITE_TRANSACTION_REENTRY'].includes(error.message)) throw error;
      throw new Error('BLOB_CATALOG_FAILED');
    }
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
          WHERE key = ${p(1)} AND scope = ${p(2)}
            AND status IN ('uploaded_unbound', 'available')`,
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
        if (change.next) {
          const promoted = await session.query(`UPDATE teaql_blob_catalog SET status = 'available'
            WHERE key = ${p(1)} AND scope = ${p(2)}
              AND status IN ('uploaded_unbound', 'available')`,
          [change.next.key, scope]);
          if (promoted.rowCount !== 1) throw new Error('BLOB_BIND_DENIED');
        }
        if (previous && !previous.equals(change.next)) {
          const now = this.now();
          if (!Number.isSafeInteger(now) || now < 0) throw new Error('BLOB_POLICY_INVALID');
          await session.query(`UPDATE teaql_blob_catalog SET last_unbound_at_ms = ${p(1)}
            WHERE key = ${p(2)} AND scope = ${p(3)} AND status = 'available'
              AND NOT EXISTS (SELECT 1 FROM teaql_blob_binding WHERE key = ${p(4)})`,
          [now, previous.key, scope, previous.key]);
        }
        return change.nextVersion;
      } catch (error) {
        if (error instanceof Error && ['BLOB_BIND_DENIED', 'BLOB_CATALOG_FAILED', 'BLOB_POLICY_INVALID',
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
        'content_type, size_bytes, completed_at_ms, last_unbound_at_ms, status ' +
        'FROM teaql_blob_catalog WHERE 1 = 0');
      await this.driver.query('SELECT scope, entity, entity_id, field, key, version ' +
        'FROM teaql_blob_binding WHERE 1 = 0');
      await this.driver.query('SELECT upload_id, scope, replay_key, request_hash, key, entity, ' +
        'entity_id, field, file_name, extension, declared_size, expires_at, state, ' +
        'written_sha256, written_etag FROM teaql_blob_upload WHERE 1 = 0');
      if (this.driver.databaseKind === 'sqlite') {
        const columns = await this.driver.query('PRAGMA table_info(teaql_blob_binding)');
        const key = columns.rows.find(row => row.name === 'key');
        const version = columns.rows.find(row => row.name === 'version');
        if (!key || Number(key.notnull) !== 0 || !version || Number(version.notnull) !== 1) {
          throw new Error('BLOB_SCHEMA_MISSING');
        }
        const indexes = await this.driver.query('PRAGMA index_list(teaql_blob_catalog)');
        const objectKeyIndex = indexes.rows.find(row => row.name === 'teaql_blob_catalog_object_key' &&
          Number(row.unique) === 1);
        const indexed = await this.driver.query('PRAGMA index_info(teaql_blob_catalog_object_key)');
        if (!objectKeyIndex || indexed.rows.length !== 1 || indexed.rows[0].name !== 'object_key') {
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
