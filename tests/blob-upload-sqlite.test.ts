import { createHash, randomBytes } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { ObjectByteStream, ObjectKey, ObjectPutOptions } from '../src/core/object-storage';
import { FileObjectStorage } from '../src/object-storage/file';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobRetentionPolicy } from '../src/blob-reference/retention';
import {
  BlobContentVerifier, BlobUploadAuthorization, SqliteBlobUploadService,
} from '../src/blob-reference/upload-service';
import { SQLiteDriver } from '../src/sql/sqlite';

/** Test-only verifier: integration checks the mandatory full-byte SPI, not PDF parsing coverage. */
class FixturePdfVerifier implements BlobContentVerifier {
  calls = 0;
  async verify(content: ObjectByteStream, extension: string, maximumBytes: number) {
    this.calls += 1;
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of content) {
      size += chunk.byteLength;
      if (size > maximumBytes) throw new Error('BLOB_SIZE_EXCEEDED');
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    if (extension !== 'pdf' || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
        !bytes.includes(Buffer.from('%%EOF'))) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    return { sizeBytes: size, sha256: createHash('sha256').update(bytes).digest('hex'),
      contentType: 'application/pdf' };
  }
}

test('SQLite upload records a real File write and permits binding only after full-byte verification', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-upload-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const store = new FileObjectStorage(join(root, 'objects'), randomBytes(32));
  const verifier = new FixturePdfVerifier();
  const bytes = await readFile(join(__dirname, 'fixtures', 'blob-sample.pdf'));
  const context = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  const target = { entity: 'Asset', entityId: null, field: 'document' };
  let permitted = true;
  let scope = 'tenant-a';
  let policy = new BlobRetentionPolicy('default', 'server_stream', 86400, 604800);
  const authorization: BlobUploadAuthorization = {
    scope: () => scope,
    field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
    authorize: async (_context, actual, action) => permitted &&
      actual.entity === 'Asset' && actual.field === 'document' &&
      ['Begin', 'Write', 'Confirm'].includes(action),
    currentOnLease: async (_context, _lease, actual, action) => ({
      scope, field: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
      policy,
      allowed: permitted && actual.entity === 'Asset' && actual.field === 'document' &&
        ['Begin', 'Write', 'Confirm'].includes(action),
    }),
  };
  const service = new SqliteBlobUploadService(catalog, authorization, verifier, 10_000);
  try {
    await expect(catalog.validateSchema()).rejects.toThrow('BLOB_SCHEMA_MISSING');
    await catalog.ensureSchema();
    await catalog.validateSchema();
    const info = { fileName: 'upload/path/report.pdf', declaredSize: bytes.length,
      declaredContentType: 'application/pdf' };
    const session = await service.begin(context, target, info, 'request-1');
    expect((await driver.query(`SELECT policy_profile,upload_mode,unbound_retention_seconds,
      effective_unref_seconds FROM teaql_blob_catalog WHERE key = ?`, [session.reference.key])).rows[0])
      .toMatchObject({ policy_profile: 'default', upload_mode: 'server_stream',
        unbound_retention_seconds: 86400, effective_unref_seconds: 604800 });
    policy = new BlobRetentionPolicy('default', 'server_stream', 3600, 3600);
    expect((await service.begin(context, target, info, 'request-1')).uploadId).toBe(session.uploadId);
    expect((await driver.query(`SELECT unbound_retention_seconds,effective_unref_seconds
      FROM teaql_blob_catalog WHERE key = ?`, [session.reference.key])).rows[0])
      .toMatchObject({ unbound_retention_seconds: 86400, effective_unref_seconds: 604800 });
    policy = new BlobRetentionPolicy('default', 'server_stream', 86400, 604800);
    await expect(service.begin(context, target, { ...info, fileName: 'other.pdf' }, 'request-1'))
      .rejects.toThrow('BLOB_IDEMPOTENCY_CONFLICT');
    await expect(service.complete(context, session.uploadId)).rejects.toThrow('BLOB_UPLOAD_INCOMPLETE');
    expect(verifier.calls).toBe(0);
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0].status).toBe('initiated');

    scope = 'tenant-b';
    await expect(service.write(context, session.uploadId, (async function* () { yield bytes; })()))
      .rejects.toThrow('BLOB_UPLOAD_DENIED');
    scope = 'tenant-a';
    expect(await service.write(context, session.uploadId,
      (async function* () { yield bytes; })())).toBe(bytes.length);
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0].status).toBe('initiated');
    permitted = false;
    await expect(service.complete(context, session.uploadId)).rejects.toThrow('BLOB_UPLOAD_DENIED');
    permitted = true;
    const beforeCompletion = Date.now();
    expect((await service.complete(context, session.uploadId)).key).toBe(session.reference.key);
    const completedAt = Number((await driver.query('SELECT completed_at_ms FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0].completed_at_ms);
    expect(completedAt).toBeGreaterThanOrEqual(beforeCompletion);
    expect(completedAt).toBeLessThanOrEqual(Date.now());
    expect(verifier.calls).toBe(1);
    expect((await service.complete(context, session.uploadId)).key).toBe(session.reference.key);
    expect(Number((await driver.query('SELECT completed_at_ms FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0].completed_at_ms)).toBe(completedAt);
    expect(verifier.calls).toBe(1);
    permitted = false;
    await expect(service.complete(context, session.uploadId)).rejects.toThrow('BLOB_UPLOAD_DENIED');
    permitted = true;
    expect((await driver.query('SELECT status, content_type, size_bytes FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0]).toMatchObject({
        status: 'uploaded_unbound', content_type: 'application/pdf', size_bytes: bytes.length,
      });
    const completedKey = (await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0].object_key;
    await context.objectStorage('test completed generation replacement').putBytes(
      new ObjectKey(String(completedKey)), bytes,
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf'));
    await expect(service.complete(context, session.uploadId)).rejects.toThrow('BLOB_UPLOAD_INCOMPLETE');
    expect(verifier.calls).toBe(1);

    const later = await service.begin(context, target, info, 'request-2');
    await service.write(context, later.uploadId, (async function* () { yield bytes; })());
    const record = (await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?',
      [later.reference.key])).rows[0];
    await context.objectStorage('test tampered generation').putBytes(
      new ObjectKey(String(record.object_key)), Buffer.from('malformed'),
      new ObjectPutOptions(9, 'replace', 'application/pdf'));
    await expect(service.complete(context, later.uploadId)).rejects.toThrow('BLOB_UPLOAD_INCOMPLETE');
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [later.reference.key])).rows[0].status).toBe('initiated');

    const sameBytes = await service.begin(context, target, info, 'request-4');
    await service.write(context, sameBytes.uploadId, (async function* () { yield bytes; })());
    const sameKey = (await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?',
      [sameBytes.reference.key])).rows[0].object_key;
    await context.objectStorage('test same-byte replacement').putBytes(
      new ObjectKey(String(sameKey)), bytes,
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf'));
    await expect(service.complete(context, sameBytes.uploadId)).rejects.toThrow('BLOB_UPLOAD_INCOMPLETE');
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [sameBytes.reference.key])).rows[0].status).toBe('initiated');

    const unconsumed = await service.begin(context, target, info, 'request-3');
    await service.write(context, unconsumed.uploadId, (async function* () { yield bytes; })());
    const shortcut: BlobContentVerifier = { verify: async () => ({
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      contentType: 'application/pdf',
    }) };
    const unsafe = new SqliteBlobUploadService(catalog, authorization, shortcut, 10_000);
    await expect(unsafe.complete(context, unconsumed.uploadId)).rejects.toThrow('BLOB_UPLOAD_INCOMPLETE');
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [unconsumed.reference.key])).rows[0].status).toBe('initiated');
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('additive catalog migration leaves historical completion time unknown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-completion-migration-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  try {
    await driver.query(`CREATE TABLE teaql_blob_catalog (
      key TEXT PRIMARY KEY, scope TEXT NOT NULL, object_key TEXT NOT NULL,
      content_version TEXT NOT NULL, file_name TEXT NOT NULL,
      content_type TEXT NOT NULL, size_bytes BIGINT NOT NULL,
      status TEXT NOT NULL)`);
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES ('blob_legacy','tenant-a','blob/legacy','old','legacy.pdf','application/pdf',1,'uploaded_unbound')`);
    await expect(catalog.validateSchema()).rejects.toThrow();
    await catalog.ensureSchema();
    await catalog.ensureSchema();
    await catalog.validateSchema();
    const row = await driver.query(`SELECT completed_at_ms, last_unbound_at_ms, policy_profile,
      upload_mode, unbound_retention_seconds, effective_unref_seconds,
      retention_floor_until_ms, status FROM teaql_blob_catalog WHERE key = ?`,
      ['blob_legacy']);
    expect(row.rows).toMatchObject([{
      completed_at_ms: null, last_unbound_at_ms: null, policy_profile: null,
      upload_mode: null, unbound_retention_seconds: null,
      effective_unref_seconds: null, retention_floor_until_ms: null,
      status: 'uploaded_unbound',
    }]);
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('legacy TypeScript upload leases migrate without changing replay identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-lease-migration-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext();
  const now = 1_700_000_000_000;
  const service = new SqliteBlobUploadService(catalog, {
    scope: () => 'tenant-a',
    field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
    authorize: async () => true,
    currentOnLease: async () => ({ scope: 'tenant-a',
      field: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'), allowed: true }),
  }, new FixturePdfVerifier(), 10_000, 60, () => now);
  const target = { entity: 'Asset', entityId: null, field: 'document' };
  const input = { fileName: 'report.pdf', declaredSize: 42 };
  try {
    await catalog.ensureSchema();
    const created = await service.begin(context, target, input, 'before-migration');
    const old = (await driver.query('SELECT * FROM teaql_blob_upload WHERE upload_id = ?',
      [created.uploadId])).rows[0];
    const legacyHash = createHash('sha256').update(JSON.stringify(
      ['Asset', null, 'document', 'report.pdf', 42, null])).digest('hex');
    await driver.query('DROP TABLE teaql_blob_upload');
    await driver.query(`CREATE TABLE teaql_blob_upload (
      upload_id TEXT PRIMARY KEY, scope TEXT NOT NULL, replay_key TEXT NOT NULL,
      request_hash TEXT NOT NULL, key TEXT NOT NULL UNIQUE, entity TEXT NOT NULL,
      entity_id TEXT, field TEXT NOT NULL, file_name TEXT NOT NULL,
      extension TEXT NOT NULL, declared_size BIGINT NOT NULL,
      expires_at BIGINT NOT NULL, state TEXT NOT NULL,
      written_sha256 TEXT, written_etag TEXT, UNIQUE (scope, replay_key))`);
    await driver.query(`INSERT INTO teaql_blob_upload
      (upload_id,scope,replay_key,request_hash,key,entity,entity_id,field,file_name,
       extension,declared_size,expires_at,state,written_sha256,written_etag)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [old.upload_id, old.scope, old.replay_key, legacyHash, old.key, old.entity,
      old.entity_id, old.field, old.file_name, old.extension, old.declared_size,
      old.expires_at, old.state, old.written_sha256, old.written_etag]);
    await expect(catalog.validateSchema()).rejects.toThrow();
    await catalog.ensureSchema();
    await catalog.ensureSchema();
    await catalog.validateSchema();
    const replay = await service.begin(context, target, input, 'before-migration');
    expect(replay.uploadId).toBe(created.uploadId);
    expect(replay.reference.key).toBe(created.reference.key);
    expect(replay.expiresAt.getTime()).toBe(created.expiresAt.getTime());
    const fresh = await service.begin(context, target, input, 'after-migration');
    const rows = await driver.query(`SELECT upload_id,expires_ms,expires_at,request_hash
      FROM teaql_blob_upload ORDER BY upload_id`);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.find(row => row.upload_id === created.uploadId)).toMatchObject({
      expires_ms: created.expiresAt.getTime(), expires_at: created.expiresAt.getTime(),
      request_hash: legacyHash,
    });
    expect(rows.rows.find(row => row.upload_id === fresh.uploadId)).toMatchObject({
      expires_ms: fresh.expiresAt.getTime(), expires_at: fresh.expiresAt.getTime(),
      request_hash: createHash('sha256').update(JSON.stringify(
        ['Asset', null, 'document', 'report.pdf', 42, ''])).digest('hex'),
    });
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('an expired replay key cannot recover an upload session, while a new request can begin', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-upload-expiry-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext();
  let clock = 1_700_000_000_000;
  const service = new SqliteBlobUploadService(catalog, {
    scope: () => 'tenant-a',
    field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
    authorize: async () => true,
    currentOnLease: async () => ({ scope: 'tenant-a',
      field: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'), allowed: true }),
  }, new FixturePdfVerifier(), 10_000, 1, () => clock);
  const target = { entity: 'Asset', entityId: null, field: 'document' };
  const input = { fileName: 'report.pdf', declaredSize: 42 };
  try {
    await catalog.ensureSchema();
    const first = await service.begin(context, target, input, 'request-expired');
    expect((await service.begin(context, target, input, 'request-expired')).uploadId)
      .toBe(first.uploadId);
    clock = first.expiresAt.getTime();
    await expect(service.begin(context, target, input, 'request-expired'))
      .rejects.toThrow('BLOB_UPLOAD_EXPIRED');
    const second = await service.begin(context, target, input, 'request-fresh');
    expect(second.uploadId).not.toBe(first.uploadId);
    await expect(service.write(context, first.uploadId,
      (async function* () { yield Buffer.alloc(42); })()))
      .rejects.toThrow('BLOB_UPLOAD_EXPIRED');
    expect((await driver.query('SELECT state FROM teaql_blob_upload WHERE upload_id = ?',
      [first.uploadId])).rows[0].state).toBe('initiated');
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});
