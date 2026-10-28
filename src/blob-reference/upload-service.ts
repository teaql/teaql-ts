import { createHash, randomBytes } from 'node:crypto';
import { BlobFieldSpec, BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { MAX_OBJECT_PUT_SIZE, ObjectByteStream, ObjectKey, ObjectMetadata,
  ObjectPutOptions, ObjectStorage, StorageError } from '../core/object-storage';
import type { SqlQueryResult, SqlSession } from '../sql/core';
import { SqlBlobCatalog } from './sql-catalog';
import { BlobRetentionPolicy } from './retention';

export type BlobUploadTarget = Readonly<{ entity: string; entityId: string | null; field: string }>;
export type BlobUploadInput = Readonly<{ fileName: string; declaredSize: number; declaredContentType?: string }>;
export type BlobVerifiedContent = Readonly<{ sizeBytes: number; sha256: string; contentType: string }>;

/** The host must resolve the current model and make independent field/action decisions. */
export interface BlobUploadAuthorization {
  scope(context: UserContext): string;
  field(context: UserContext, target: BlobUploadTarget): BlobFieldSpec;
  authorize(context: UserContext, target: BlobUploadTarget,
    action: 'Begin' | 'Write' | 'Confirm', input: BlobUploadInput): Promise<boolean>;
  /** Resolve current scope, model field and action permission on this physical SQL lease. */
  currentOnLease(context: UserContext, lease: SqlSession, target: BlobUploadTarget,
    action: 'Begin' | 'Write' | 'Confirm', input: BlobUploadInput): Promise<{
      scope: string; field: BlobFieldSpec; allowed: boolean;
      policy?: BlobRetentionPolicy;
    }>;
}

/** A mandatory trusted byte parser. Client MIME and object metadata cannot implement this SPI. */
export interface BlobContentVerifier {
  verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
  validateReady?(): Promise<void> | void;
}

export type BlobUploadSession = Readonly<{ uploadId: string; reference: BlobRef; expiresAt: Date }>;
type UploadRow = {
  upload_id: string; scope: string; key: string; entity: string; entity_id: string | null;
  field: string; file_name: string; extension: string; declared_size: number;
  expires_ms: number; state: 'initiated' | 'written' | 'completed';
  written_sha256: string | null; written_etag: string | null;
};

const MIME: Readonly<Record<string, string>> = Object.freeze({
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4',
  mp3: 'audio/mpeg', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
});
const token = () => randomBytes(24).toString('base64url');
const name = (value: unknown) => typeof value === 'string' && !!value.trim() &&
  value === value.trim() && Buffer.byteLength(value) <= 256 &&
  !/[\x00-\x1f\x7f-\x9f]/.test(value);
const entityId = (value: unknown) => value === null || typeof value === 'string' &&
  /^[1-9][0-9]*$/.test(value) && value.length <= 20 && BigInt(value) <= 18446744073709551615n;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** SQLite server-stream upload path. Installation is explicit through SqlBlobCatalog.ensureSchema. */
export class SqliteBlobUploadService {
  constructor(private readonly catalog: SqlBlobCatalog,
              private readonly authorization: BlobUploadAuthorization,
              private readonly verifier: BlobContentVerifier,
              private readonly maximumBytes: number,
              private readonly leaseSeconds = 900,
              private readonly now: () => number = Date.now) {
    if (catalog.driver.databaseKind !== 'sqlite' || !verifier ||
        !Number.isSafeInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > MAX_OBJECT_PUT_SIZE ||
        !Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3600) {
      throw new Error('BLOB_POLICY_INVALID');
    }
  }

  async validateVerifierReady(): Promise<void> {
    await this.verifier.validateReady?.();
  }

  private async query(sql: SqlSession, statement: string, values?: any[]): Promise<SqlQueryResult> {
    try { return await sql.query(statement, values); }
    catch { throw new Error('BLOB_CATALOG_FAILED'); }
  }

  /** A driver can commit successfully and lose only its reply. Keep business
   * errors from the callback, but never expose a raw driver/commit failure. */
  private async transaction<T>(work: (sql: SqlSession) => Promise<T>): Promise<T> {
    let workFailed = false;
    let workError: unknown;
    try {
      return await this.catalog.driver.transaction(async sql => {
        try { return await work(sql); }
        catch (error) {
          workFailed = true;
          workError = error;
          throw error;
        }
      });
    } catch {
      if (workFailed) throw workError;
      throw new Error('BLOB_CATALOG_FAILED');
    }
  }

  private async current(context: UserContext, target: BlobUploadTarget,
                        action: 'Begin' | 'Write' | 'Confirm', input: BlobUploadInput,
                        expectedScope?: string): Promise<string> {
    if (!target || !name(target.entity) || !name(target.field) || !entityId(target.entityId)) {
      throw new Error('BLOB_REFERENCE_INVALID');
    }
    let scope: string, field: BlobFieldSpec, allowed: boolean;
    try {
      scope = this.authorization.scope(context);
      field = this.authorization.field(context, target);
      allowed = await this.authorization.authorize(context, target, action, input);
    } catch { throw new Error('BLOB_UPLOAD_DENIED'); }
    return this.checkCurrent(scope, field, allowed, target, input, expectedScope);
  }

  private async currentOnLease(context: UserContext, lease: SqlSession, target: BlobUploadTarget,
                               action: 'Begin' | 'Write' | 'Confirm', input: BlobUploadInput,
                               expectedScope?: string): Promise<{
                                 scope: string; field: BlobFieldSpec; allowed: boolean;
                                 policy?: BlobRetentionPolicy;
                               }> {
    if (!target || !name(target.entity) || !name(target.field) || !entityId(target.entityId)) {
      throw new Error('BLOB_REFERENCE_INVALID');
    }
    let current;
    try { current = await this.authorization.currentOnLease(context, lease, target, action, input); }
    catch { throw new Error('BLOB_UPLOAD_DENIED'); }
    this.checkCurrent(current.scope, current.field, current.allowed, target, input, expectedScope);
    if (current.policy !== undefined &&
        (!(current.policy instanceof BlobRetentionPolicy) ||
          current.policy.profile !== current.field.policyProfile ||
          current.policy.uploadMode !== 'server_stream')) throw new Error('BLOB_POLICY_INVALID');
    return current;
  }

  private checkCurrent(scope: string, field: BlobFieldSpec, allowed: boolean,
                       target: BlobUploadTarget, input: BlobUploadInput,
                       expectedScope?: string): string {
    if (!name(scope) || Buffer.byteLength(scope) > 256 || expectedScope !== undefined && scope !== expectedScope ||
        !(field instanceof BlobFieldSpec) || field.entity !== target.entity ||
        field.field !== target.field || !allowed) throw new Error('BLOB_UPLOAD_DENIED');
    const extension = input.fileName.slice(input.fileName.lastIndexOf('.') + 1).toLowerCase();
    if (!field.allowedExtensions.includes(extension)) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    return scope;
  }

  private normalize(input: BlobUploadInput): BlobUploadInput {
    if (!input || typeof input.fileName !== 'string' ||
        !Number.isSafeInteger(input.declaredSize) || input.declaredSize < 0 ||
        input.declaredSize > this.maximumBytes) throw new Error('BLOB_SIZE_EXCEEDED');
    const fileName = input.fileName.split(/[/\\]/).pop()!;
    if (!name(fileName) || Buffer.byteLength(fileName) > 512) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(MIME, extension)) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    const declaredContentType = input.declaredContentType?.trim().toLowerCase();
    if (declaredContentType !== undefined &&
        (!name(declaredContentType) || Buffer.byteLength(declaredContentType) > 128)) {
      throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    }
    return { fileName, declaredSize: input.declaredSize, declaredContentType };
  }

  private digest(target: BlobUploadTarget, input: BlobUploadInput): string {
    const parts = [target.entity, target.entityId, target.field, input.fileName,
      input.declaredSize, input.declaredContentType ?? ''];
    return sha256(Buffer.from(JSON.stringify(parts), 'utf8'));
  }

  private legacyDigest(target: BlobUploadTarget, input: BlobUploadInput): string {
    const parts = [target.entity, target.entityId, target.field, input.fileName,
      input.declaredSize, input.declaredContentType ?? null];
    return sha256(Buffer.from(JSON.stringify(parts), 'utf8'));
  }

  async begin(context: UserContext, target: BlobUploadTarget, input: BlobUploadInput,
              replayKey: string): Promise<BlobUploadSession> {
    const normalized = this.normalize(input);
    if (!name(replayKey) || Buffer.byteLength(replayKey) > 256) throw new Error('BLOB_REFERENCE_INVALID');
    const scope = await this.current(context, target, 'Begin', normalized);
    const digest = this.digest(target, normalized);
    const extension = normalized.fileName.slice(normalized.fileName.lastIndexOf('.') + 1).toLowerCase();
    return this.transaction(async sql => {
      const existing = await this.query(sql, 'SELECT * FROM teaql_blob_upload WHERE scope = ? AND replay_key = ?',
        [scope, replayKey]);
      if (existing.rows.length) {
        const row = existing.rows[0] as UploadRow & { request_hash: string };
        if (row.request_hash !== digest &&
            row.request_hash !== this.legacyDigest(target, normalized)) {
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        }
        await this.currentOnLease(context, sql, target, 'Begin', normalized, scope);
        if (!Number.isSafeInteger(Number(row.expires_ms)) ||
            this.now() >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
        return Object.freeze({ uploadId: row.upload_id, reference: new BlobRef(row.key),
          expiresAt: new Date(Number(row.expires_ms)) });
      }
      const reference = new BlobRef(`blob_${token()}`);
      const uploadId = `bu_${token()}`;
      const objectKey = `blob/${token()}`;
      const expiresAt = this.now() + this.leaseSeconds * 1000;
      const current = await this.currentOnLease(context, sql, target, 'Begin', normalized, scope);
      await this.query(sql, `INSERT INTO teaql_blob_catalog
        (key,scope,object_key,content_version,file_name,content_type,size_bytes,status,
         policy_profile,upload_mode,unbound_retention_seconds,effective_unref_seconds)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [reference.key, scope, objectKey, '', normalized.fileName,
          '', 0, 'initiated', current.policy?.profile ?? null,
          current.policy?.uploadMode ?? null, current.policy?.unboundRetentionSeconds ?? null,
          current.policy?.unreferencedRetentionSeconds ?? null]);
      await this.query(sql, `INSERT INTO teaql_blob_upload
        (upload_id,scope,replay_key,request_hash,key,entity,entity_id,field,file_name,
         extension,declared_size,expires_ms,expires_at,state)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uploadId, scope, replayKey, digest, reference.key, target.entity, target.entityId,
        target.field, normalized.fileName, extension, normalized.declaredSize,
        expiresAt, expiresAt, 'initiated']);
      return Object.freeze({ uploadId, reference, expiresAt: new Date(expiresAt) });
    });
  }

  private async row(context: UserContext, uploadId: string,
                    action: 'Write' | 'Confirm'): Promise<UploadRow> {
    if (typeof uploadId !== 'string' || !/^bu_[A-Za-z0-9_-]{32}$/.test(uploadId)) {
      throw new Error('BLOB_UPLOAD_DENIED');
    }
    let scope: string;
    try { scope = this.authorization.scope(context); }
    catch { throw new Error('BLOB_UPLOAD_DENIED'); }
    if (!name(scope)) throw new Error('BLOB_UPLOAD_DENIED');
    const result = await this.query(this.catalog.driver, 'SELECT * FROM teaql_blob_upload WHERE scope = ? AND upload_id = ?',
      [scope, uploadId]);
    if (result.rows.length !== 1) throw new Error('BLOB_UPLOAD_DENIED');
    const row = result.rows[0] as UploadRow;
    const target = { entity: row.entity, entityId: row.entity_id, field: row.field };
    await this.current(context, target, action,
      { fileName: row.file_name, declaredSize: Number(row.declared_size) }, scope);
    if (!Number.isSafeInteger(Number(row.expires_ms)) || this.now() >= Number(row.expires_ms)) {
      throw new Error('BLOB_UPLOAD_EXPIRED');
    }
    if (!Number.isSafeInteger(Number(row.declared_size)) || Number(row.declared_size) > this.maximumBytes) {
      throw new Error('BLOB_SIZE_EXCEEDED');
    }
    return row;
  }

  private async objectKey(sql: SqlSession, row: UploadRow): Promise<ObjectKey> {
    const result = await this.query(sql, 'SELECT object_key FROM teaql_blob_catalog WHERE key = ? AND scope = ?',
      [row.key, row.scope]);
    if (result.rows.length !== 1 || typeof result.rows[0].object_key !== 'string') {
      throw new Error('BLOB_CATALOG_FAILED');
    }
    try { return new ObjectKey(result.rows[0].object_key as string); }
    catch { throw new Error('BLOB_CATALOG_FAILED'); }
  }

  private async recoverExisting(store: ObjectStorage, key: ObjectKey, row: UploadRow,
                                mime: string, inputHash: string,
                                expectedETag?: string): Promise<ObjectMetadata> {
    const mismatch = expectedETag ? 'BLOB_IDEMPOTENCY_CONFLICT' : 'BLOB_STORE_FAILED';
    const before = await store.head(key);
    if (!before || before.size !== Number(row.declared_size) ||
        before.contentType !== mime || !before.etag ||
        expectedETag && before.etag !== expectedETag) throw new Error(mismatch);
    const content = await store.get(key);
    try {
      if (content.metadata.size !== before.size || content.metadata.etag !== before.etag ||
          content.metadata.contentType !== mime) throw new Error(mismatch);
      const hash = createHash('sha256');
      let count = 0;
      for await (const block of content.stream) {
        if (!(block instanceof Uint8Array) || block.byteLength > before.size - count) {
          throw new Error(mismatch);
        }
        count += block.byteLength;
        hash.update(block);
      }
      if (count !== before.size || hash.digest('hex') !== inputHash) {
        throw new Error(mismatch);
      }
    } finally { await content.close(); }
    const after = await store.head(key);
    if (!after || after.size !== before.size || after.etag !== before.etag ||
        after.contentType !== mime) throw new Error(mismatch);
    return before;
  }

  async write(context: UserContext, uploadId: string, source: ObjectByteStream): Promise<number> {
    const row = await this.row(context, uploadId, 'Write');
    const key = await this.objectKey(this.catalog.driver, row);
    const digest = createHash('sha256');
    let size = 0, consumed = false;
    const service = this;
    const stream: ObjectByteStream = { [Symbol.asyncIterator]: async function* () {
      for await (const block of source) {
        if (service.now() >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
        if (!(block instanceof Uint8Array) || block.byteLength > Number(row.declared_size) - size) {
          throw new Error('BLOB_SIZE_EXCEEDED');
        }
        size += block.byteLength;
        digest.update(block);
        yield block;
      }
      if (size !== Number(row.declared_size)) throw new Error('BLOB_UPLOAD_INCOMPLETE');
      consumed = true;
    } };
    const target = { entity: row.entity, entityId: row.entity_id, field: row.field };
    return this.transaction(async sql => {
      const current = await this.query(sql, `SELECT state, key, expires_ms, written_sha256, written_etag FROM teaql_blob_upload
        WHERE upload_id = ? AND scope = ?`, [uploadId, row.scope]);
      const catalog = await this.query(sql, `SELECT object_key, status, content_version, content_type, size_bytes FROM teaql_blob_catalog
        WHERE key = ? AND scope = ?`, [row.key, row.scope]);
      if (current.rows.length !== 1 || catalog.rows.length !== 1 ||
          current.rows[0].key !== row.key ||
          Number(current.rows[0].expires_ms) !== Number(row.expires_ms) ||
          catalog.rows[0].object_key !== key.value) {
        throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      }
      const observed = current.rows[0] as UploadRow;
      const catalogRow = catalog.rows[0];
      if (observed.state === 'written' || observed.state === 'completed') {
        const writtenHash = observed.written_sha256, writtenETag = observed.written_etag;
        if (!writtenHash || !/^[0-9a-f]{64}$/.test(writtenHash) || !writtenETag ||
            observed.state === 'written' && catalogRow.status !== 'initiated') {
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        }
        if (observed.state === 'completed' &&
            (catalogRow.status !== 'uploaded_unbound' && catalogRow.status !== 'available' ||
             catalogRow.content_version !== writtenETag ||
             catalogRow.content_type !== MIME[row.extension] ||
             Number(catalogRow.size_bytes) !== Number(row.declared_size))) {
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        }
        await this.currentOnLease(context, sql, target, 'Write',
          { fileName: row.file_name, declaredSize: Number(row.declared_size) }, row.scope);
        if (this.now() >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
        const replayHash = createHash('sha256');
        let replaySize = 0;
        try {
          for await (const block of source) {
            if (!(block instanceof Uint8Array) || block.byteLength > Number(row.declared_size) - replaySize) {
              throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
            }
            replaySize += block.byteLength;
            replayHash.update(block);
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'BLOB_IDEMPOTENCY_CONFLICT') throw error;
          throw new Error('BLOB_STORE_FAILED');
        }
        if (replaySize !== Number(row.declared_size) || replayHash.digest('hex') !== writtenHash) {
          throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        }
        let store: ObjectStorage;
        try { store = context.objectStorage('recheck committed Blob upload'); }
        catch { throw new Error('BLOB_STORE_FAILED'); }
        try { await this.recoverExisting(store, key, row, MIME[row.extension], writtenHash, writtenETag); }
        catch (error) {
          if (error instanceof Error && error.message === 'BLOB_IDEMPOTENCY_CONFLICT') throw error;
          throw new Error('BLOB_STORE_FAILED');
        }
        await this.currentOnLease(context, sql, target, 'Write',
          { fileName: row.file_name, declaredSize: replaySize }, row.scope);
        if (this.now() >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
        return replaySize;
      }
      if (observed.state !== 'initiated' || catalogRow.status !== 'initiated') {
        throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      }
      await this.currentOnLease(context, sql, target, 'Write',
        { fileName: row.file_name, declaredSize: Number(row.declared_size) }, row.scope);
      let now = this.now();
      if (now >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
      let metadata: ObjectMetadata;
      let recoveredHash: string | undefined;
      let store: ObjectStorage;
      try { store = context.objectStorage('write Blob upload'); }
      catch { throw new Error('BLOB_STORE_FAILED'); }
      try { metadata = await store.put(key, stream,
        new ObjectPutOptions(Number(row.declared_size), 'create_only', MIME[row.extension])); }
      catch (error) {
        if (!(error instanceof StorageError) || error.code !== 'Conflict') {
          throw new Error('BLOB_STORE_FAILED');
        }
        try {
          if (!consumed || size !== Number(row.declared_size)) throw new Error('BLOB_STORE_FAILED');
          recoveredHash = digest.digest('hex');
          metadata = await this.recoverExisting(store, key, row, MIME[row.extension], recoveredHash);
        } catch { throw new Error('BLOB_STORE_FAILED'); }
      }
      await this.currentOnLease(context, sql, target, 'Write',
        { fileName: row.file_name, declaredSize: size }, row.scope);
      now = this.now();
      if (now >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
      if (!consumed || metadata.size !== size || !metadata.etag || size !== Number(row.declared_size)) {
        throw new Error('BLOB_UPLOAD_INCOMPLETE');
      }
      const hash = recoveredHash ?? digest.digest('hex');
      let updated;
      try { updated = await this.query(sql, `UPDATE teaql_blob_upload
        SET state = 'written', written_sha256 = ?, written_etag = ?
        WHERE upload_id = ? AND scope = ? AND state = 'initiated' AND expires_ms > ?
          AND EXISTS (SELECT 1 FROM teaql_blob_catalog
            WHERE key = teaql_blob_upload.key AND scope = teaql_blob_upload.scope
              AND status = 'initiated')`,
      [hash, metadata.etag, uploadId, row.scope, now]); }
      catch { throw new Error('BLOB_CATALOG_FAILED'); }
      if (updated.rowCount !== 1) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      return size;
    });
  }

  async complete(context: UserContext, uploadId: string): Promise<BlobRef> {
    const row = await this.row(context, uploadId, 'Confirm');
    if (row.state === 'completed') {
      if (!row.written_sha256 || !/^[0-9a-f]{64}$/.test(row.written_sha256) ||
          !row.written_etag) throw new Error('BLOB_UPLOAD_INCOMPLETE');
      const target = { entity: row.entity, entityId: row.entity_id, field: row.field };
      const input = { fileName: row.file_name, declaredSize: Number(row.declared_size),
        declaredContentType: MIME[row.extension] };
      return this.transaction(async sql => {
        const observed = await this.query(sql, `SELECT state, key, expires_ms, written_sha256, written_etag
          FROM teaql_blob_upload WHERE upload_id = ? AND scope = ?`, [uploadId, row.scope]);
        const result = await this.query(sql, `SELECT object_key, content_version,
          content_type, size_bytes, status FROM teaql_blob_catalog WHERE key = ? AND scope = ?`,
        [row.key, row.scope]);
        if (observed.rows.length !== 1 || observed.rows[0].state !== 'completed' ||
            observed.rows[0].key !== row.key ||
            Number(observed.rows[0].expires_ms) !== Number(row.expires_ms) ||
            observed.rows[0].written_sha256 !== row.written_sha256 ||
            observed.rows[0].written_etag !== row.written_etag ||
            result.rows.length !== 1) throw new Error('BLOB_UPLOAD_INCOMPLETE');
        const catalog = result.rows[0] as Record<string, unknown>;
        if (catalog.status !== 'uploaded_unbound' && catalog.status !== 'available' ||
            catalog.content_version !== row.written_etag ||
            catalog.content_type !== MIME[row.extension] ||
            Number(catalog.size_bytes) !== Number(row.declared_size) ||
            typeof catalog.object_key !== 'string') throw new Error('BLOB_UPLOAD_INCOMPLETE');
        await this.currentOnLease(context, sql, target, 'Confirm', input, row.scope);
        if (this.now() >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
        let storage: ObjectStorage;
        try { storage = context.objectStorage('recheck completed Blob upload'); }
        catch { throw new Error('BLOB_STORE_FAILED'); }
        let currentKey: ObjectKey;
        try { currentKey = new ObjectKey(catalog.object_key); }
        catch { throw new Error('BLOB_UPLOAD_INCOMPLETE'); }
        let current: ObjectMetadata | undefined;
        try { current = await storage.head(currentKey); }
        catch { throw new Error('BLOB_UPLOAD_INCOMPLETE'); }
        if (!current || current.etag !== row.written_etag ||
            current.size !== Number(row.declared_size)) throw new Error('BLOB_UPLOAD_INCOMPLETE');
        await this.currentOnLease(context, sql, target, 'Confirm', input, row.scope);
        if (this.now() >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
        return new BlobRef(row.key);
      });
    }
    if (row.state !== 'written' || !row.written_sha256 || !row.written_etag) {
      throw new Error('BLOB_UPLOAD_INCOMPLETE');
    }
    const key = await this.objectKey(this.catalog.driver, row);
    const target = { entity: row.entity, entityId: row.entity_id, field: row.field };
    const writtenHash = row.written_sha256, writtenETag = row.written_etag;
    const result = await this.transaction(async sql => {
      const current = await this.query(sql, `SELECT state, key, expires_ms, written_sha256, written_etag
        FROM teaql_blob_upload WHERE upload_id = ? AND scope = ?`, [uploadId, row.scope]);
      const catalog = await this.query(sql, `SELECT object_key, status FROM teaql_blob_catalog
        WHERE key = ? AND scope = ?`, [row.key, row.scope]);
      if (current.rows.length !== 1 || catalog.rows.length !== 1) {
        throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      }
      const observed = current.rows[0];
      if (observed.state === 'completed' && observed.key === row.key &&
          Number(observed.expires_ms) === Number(row.expires_ms) &&
          observed.written_sha256 === writtenHash && observed.written_etag === writtenETag) {
        // Recheck catalog, generation and current permission on the normal
        // completed-replay path after releasing this physical SQL owner.
        return null;
      }
      if (observed.state !== 'written' || observed.key !== row.key ||
          Number(observed.expires_ms) !== Number(row.expires_ms) ||
          observed.written_sha256 !== writtenHash || observed.written_etag !== writtenETag ||
          catalog.rows[0].object_key !== key.value || catalog.rows[0].status !== 'initiated') {
        throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      }
      await this.currentOnLease(context, sql, target, 'Confirm',
        { fileName: row.file_name, declaredSize: Number(row.declared_size) }, row.scope);
      let now = this.now();
      if (now >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
      let storage: ObjectStorage;
      try { storage = context.objectStorage('verify Blob upload'); }
      catch { throw new Error('BLOB_STORE_FAILED'); }
      let before: ObjectMetadata | undefined;
      try { before = await storage.head(key); }
      catch { throw new Error('BLOB_UPLOAD_INCOMPLETE'); }
      if (!before || before.size !== Number(row.declared_size) || before.etag !== writtenETag) {
        throw new Error('BLOB_UPLOAD_INCOMPLETE');
      }
      let content: Awaited<ReturnType<ObjectStorage['get']>>;
      try { content = await storage.get(key); }
      catch { throw new Error('BLOB_UPLOAD_INCOMPLETE'); }
      let size = 0, consumed = false;
      const hash = createHash('sha256');
      const bytes: ObjectByteStream = { [Symbol.asyncIterator]: async function* () {
        for await (const block of content.stream) {
          size += block.byteLength;
          hash.update(block);
          yield block;
        }
        consumed = true;
      } };
      let verified: BlobVerifiedContent;
      try {
        if (content.metadata.size !== before.size || content.metadata.etag !== before.etag) {
          throw new Error('BLOB_UPLOAD_INCOMPLETE');
        }
        try { verified = await this.verifier.verify(bytes, row.extension, this.maximumBytes); }
        catch (error) {
          const code = error instanceof Error ? error.message : '';
          if (['BLOB_FORMAT_NOT_ALLOWED', 'BLOB_SIZE_EXCEEDED', 'BLOB_STORE_FAILED',
            'BLOB_VERIFICATION_BUSY', 'BLOB_CAPABILITY_MISSING', 'BLOB_POLICY_INVALID',
            'BLOB_UPLOAD_INCOMPLETE'].includes(code)) throw error;
          throw new Error('BLOB_UPLOAD_INCOMPLETE');
        }
      } finally {
        try { await content.close(); }
        catch { throw new Error('BLOB_UPLOAD_INCOMPLETE'); }
      }
      if (!consumed || size !== before.size || verified.sizeBytes !== size ||
          !/^[0-9a-f]{64}$/.test(verified.sha256) || verified.sha256 !== hash.digest('hex') ||
          verified.sha256 !== writtenHash || verified.contentType !== MIME[row.extension]) {
        throw new Error('BLOB_UPLOAD_INCOMPLETE');
      }
      let after: ObjectMetadata | undefined;
      try { after = await storage.head(key); }
      catch { throw new Error('BLOB_UPLOAD_INCOMPLETE'); }
      if (!after || after.size !== before.size || after.etag !== before.etag) {
        throw new Error('BLOB_UPLOAD_INCOMPLETE');
      }
      await this.currentOnLease(context, sql, target, 'Confirm',
        { fileName: row.file_name, declaredSize: size, declaredContentType: verified.contentType }, row.scope);
      now = this.now();
      if (now >= Number(row.expires_ms)) throw new Error('BLOB_UPLOAD_EXPIRED');
      const updated = await this.query(sql, `UPDATE teaql_blob_upload SET state = 'completed'
        WHERE upload_id = ? AND scope = ? AND state = 'written' AND written_sha256 = ?
          AND written_etag = ? AND expires_ms > ?`,
      [uploadId, row.scope, writtenHash, writtenETag, now]);
      if (updated.rowCount !== 1) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      const promoted = await this.query(sql, `UPDATE teaql_blob_catalog SET content_version = ?,
        content_type = ?, size_bytes = ?, completed_at_ms = ?, status = 'uploaded_unbound'
        WHERE key = ? AND scope = ? AND status = 'initiated'`,
      [writtenETag, verified.contentType, size, now, row.key, row.scope]);
      if (promoted.rowCount !== 1) throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
      return new BlobRef(row.key);
    });
    return result ?? this.complete(context, uploadId);
  }
}
