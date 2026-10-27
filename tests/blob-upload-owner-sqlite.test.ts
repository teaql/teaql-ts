import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { ObjectByteStream, ObjectKey, ObjectPutOptions, StorageInvocation } from '../src/core/object-storage';
import { FileObjectStorage } from '../src/object-storage/file';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobContentVerifier, BlobUploadAuthorization, SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import type { SqlSession } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

const source = (bytes: Uint8Array): ObjectByteStream => (async function* () { yield bytes; })();
const wait = () => {
  let release!: () => void;
  const promise = new Promise<void>(done => { release = done; });
  return { promise, release };
};
const authority = (): BlobUploadAuthorization => ({
  scope: () => 'tenant-a',
  field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
  authorize: async () => true,
  currentOnLease: async () => ({ scope: 'tenant-a',
    field: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'), allowed: true }),
});

class FixtureVerifier implements BlobContentVerifier {
  calls = 0;
  async verify(stream: ObjectByteStream, extension: string, maximum: number) {
    this.calls += 1;
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const block of stream) {
      size += block.byteLength;
      if (size > maximum) throw new Error('size');
      chunks.push(Buffer.from(block));
    }
    const bytes = Buffer.concat(chunks);
    if (extension !== 'pdf' || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
        !bytes.includes(Buffer.from('%%EOF'))) throw new Error('format');
    return { sizeBytes: size, sha256: createHash('sha256').update(bytes).digest('hex'),
      contentType: 'application/pdf' };
  }
}

class PausedFileStore extends FileObjectStorage {
  puts = 0;
  readonly entered = wait();
  readonly release = wait();
  override async put(invocation: StorageInvocation, key: ObjectKey, content: ObjectByteStream,
                     options: ObjectPutOptions) {
    const result = await super.put(invocation, key, content, options);
    if (++this.puts === 1) {
      this.entered.release();
      await this.release.promise;
    }
    return result;
  }
}

class CountingFileStore extends FileObjectStorage {
  puts = 0;
  override async put(invocation: StorageInvocation, key: ObjectKey, content: ObjectByteStream,
                     options: ObjectPutOptions) {
    this.puts += 1;
    return super.put(invocation, key, content, options);
  }
}

class LostWriteReplyDriver extends SQLiteDriver {
  loseNextCommitReply = false;
  override async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    const result = await super.transaction(work);
    if (this.loseNextCommitReply) {
      this.loseNextCommitReply = false;
      throw new Error('PRIVATE-COMMIT-CANARY');
    }
    return result;
  }
}

class PausedVerifier extends FixtureVerifier {
  readonly entered = wait();
  readonly release = wait();
  override async verify(stream: ObjectByteStream, extension: string, maximum: number) {
    const result = await super.verify(stream, extension, maximum);
    if (this.calls === 1) {
      this.entered.release();
      await this.release.promise;
    }
    return result;
  }
}

test('Blob upload reads SQL-backed current permission through its borrowed owner', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-owner-policy-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const actor = new UserContext().withObjectStorage(
    new FileObjectStorage(join(root, 'private'), randomBytes(32))).withObjectStorageObserver(() => {});
  const field = () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default');
  const authorization: BlobUploadAuthorization = {
    scope: () => 'tenant-a', field,
    authorize: async () => (await driver.query('SELECT allowed FROM upload_permission')).rows[0].allowed === 1,
    currentOnLease: async (_actor, lease) => ({ scope: 'tenant-a', field: field(),
      allowed: (await lease.query('SELECT allowed FROM upload_permission')).rows[0].allowed === 1 }),
  };
  const service = new SqliteBlobUploadService(catalog, authorization, new FixtureVerifier(), 10_000);
  const bytes = Buffer.from('%PDF-1.7\ncurrent SQL permission\n%%EOF');
  try {
    await catalog.ensureSchema();
    await driver.query('CREATE TABLE upload_permission (allowed INTEGER NOT NULL)');
    await driver.query('INSERT INTO upload_permission (allowed) VALUES (1)');
    const session = await service.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, 'sql-policy');
    await service.write(actor, session.uploadId, source(bytes));
    await driver.query('UPDATE upload_permission SET allowed = 0');
    await expect(service.complete(actor, session.uploadId)).rejects.toThrow('BLOB_UPLOAD_DENIED');
    await driver.query('UPDATE upload_permission SET allowed = 1');
    expect((await service.complete(actor, session.uploadId)).key).toBe(session.reference.key);
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('Blob retry recovers only identical File bytes after SQLite journal promotion rollback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-recover-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const actor = new UserContext().withObjectStorage(
    new FileObjectStorage(join(root, 'private'), randomBytes(32))).withObjectStorageObserver(() => {});
  const verifier = new FixtureVerifier();
  const service = new SqliteBlobUploadService(catalog, authority(), verifier, 10_000);
  const bytes = Buffer.from('%PDF-1.7\nrecover committed File content\n%%EOF');
  try {
    await catalog.ensureSchema();
    const session = await service.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, 'recovery-request');
    await driver.query(`CREATE TRIGGER reject_upload_write BEFORE UPDATE ON teaql_blob_upload
      WHEN NEW.state='written' BEGIN SELECT RAISE(ABORT, 'injected'); END`);
    await expect(service.write(actor, session.uploadId, source(bytes)))
      .rejects.toThrow('BLOB_CATALOG_FAILED');
    const row = (await driver.query(`SELECT c.object_key,u.state FROM teaql_blob_upload u
      JOIN teaql_blob_catalog c ON c.key=u.key WHERE u.upload_id=?`,
    [session.uploadId])).rows[0];
    expect(row.state).toBe('initiated');
    const key = new ObjectKey(String(row.object_key));
    const stable = await actor.objectStorage('check recovery candidate').head(key);
    expect(stable?.size).toBe(bytes.length);
    await driver.query('DROP TRIGGER reject_upload_write');
    await expect(service.write(actor, session.uploadId, source(Buffer.alloc(bytes.length, 'x'))))
      .rejects.toThrow('BLOB_STORE_FAILED');
    expect(await service.write(actor, session.uploadId, source(bytes))).toBe(bytes.length);
    expect((await actor.objectStorage('check recovered generation').head(key))?.etag).toBe(stable?.etag);
    expect((await service.complete(actor, session.uploadId)).key).toBe(session.reference.key);
    expect(verifier.calls).toBe(1);
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('committed Blob write with lost reply replays same bytes and File generation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-commit-unknown-'));
  const driver = new LostWriteReplyDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const store = new CountingFileStore(join(root, 'private'), randomBytes(32));
  const actor = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  let allowed = true;
  const field = () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default');
  const authorization: BlobUploadAuthorization = {
    scope: () => 'tenant-a', field,
    authorize: async () => allowed,
    currentOnLease: async () => ({ scope: 'tenant-a', field: field(), allowed }),
  };
  const verifier = new FixtureVerifier();
  const service = new SqliteBlobUploadService(catalog, authorization, verifier, 10_000);
  const bytes = Buffer.from('%PDF-1.7\nSQL commit succeeded, reply lost\n%%EOF');
  try {
    await catalog.ensureSchema();
    const session = await service.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, 'unknown-write');
    driver.loseNextCommitReply = true;
    await expect(service.write(actor, session.uploadId, source(bytes)))
      .rejects.toThrow('PRIVATE-COMMIT-CANARY');
    const row = (await driver.query(`SELECT u.state, c.status, c.object_key, u.written_etag
      FROM teaql_blob_upload u JOIN teaql_blob_catalog c ON c.key=u.key WHERE u.upload_id=?`,
    [session.uploadId])).rows[0];
    expect(row.state).toBe('written');
    expect(row.status).toBe('initiated');
    expect(row.written_etag).toBeTruthy();
    expect(store.puts).toBe(1);
    allowed = false;
    await expect(service.write(actor, session.uploadId, source(bytes)))
      .rejects.toThrow('BLOB_UPLOAD_DENIED');
    allowed = true;
    await expect(service.write(actor, session.uploadId, source(Buffer.alloc(bytes.length, 'x'))))
      .rejects.toThrow('BLOB_IDEMPOTENCY_CONFLICT');
    await expect(service.write(actor, session.uploadId, source(bytes.subarray(0, bytes.length - 1))))
      .rejects.toThrow('BLOB_IDEMPOTENCY_CONFLICT');
    const failedSource: ObjectByteStream = (async function* () {
      throw new Error('PRIVATE-SOURCE-CANARY');
      yield Buffer.alloc(0);
    })();
    await expect(service.write(actor, session.uploadId, failedSource))
      .rejects.toHaveProperty('message', 'BLOB_STORE_FAILED');
    expect(await service.write(actor, session.uploadId, source(bytes))).toBe(bytes.length);
    expect(store.puts).toBe(1);
    driver.loseNextCommitReply = true;
    await expect(service.complete(actor, session.uploadId))
      .rejects.toThrow('PRIVATE-COMMIT-CANARY');
    expect((await driver.query('SELECT state FROM teaql_blob_upload WHERE upload_id = ?',
      [session.uploadId])).rows[0].state).toBe('completed');
    allowed = false;
    await expect(service.complete(actor, session.uploadId)).rejects.toThrow('BLOB_UPLOAD_DENIED');
    allowed = true;
    expect((await service.complete(actor, session.uploadId)).key).toBe(session.reference.key);
    expect(verifier.calls).toBe(1);
    expect(await service.write(actor, session.uploadId, source(bytes))).toBe(bytes.length);
    expect(verifier.calls).toBe(1);
    const key = new ObjectKey(String(row.object_key));
    await actor.objectStorage('replace File generation').putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf'));
    await expect(service.write(actor, session.uploadId, source(bytes)))
      .rejects.toThrow('BLOB_IDEMPOTENCY_CONFLICT');
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('Blob upload does not promote a File write when its original lease expires during I/O', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-owner-expired-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const store = new PausedFileStore(join(root, 'private'), randomBytes(32));
  const actor = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  let clock = 1_700_000_000_000;
  const service = new SqliteBlobUploadService(catalog, authority(), new FixtureVerifier(),
    10_000, 1, () => clock);
  const bytes = Buffer.from('%PDF-1.7\nexpired during File write\n%%EOF');
  try {
    await catalog.ensureSchema();
    const session = await service.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, 'expiry-owner');
    const pending = service.write(actor, session.uploadId, source(bytes));
    await store.entered.promise;
    clock = session.expiresAt.getTime();
    store.release.release();
    await expect(pending).rejects.toThrow('BLOB_UPLOAD_EXPIRED');
    expect((await driver.query('SELECT state FROM teaql_blob_upload WHERE upload_id = ?',
      [session.uploadId])).rows[0].state).toBe('initiated');
  } finally {
    store.release.release();
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('two SQLite drivers serialize Blob File write across its SQL owner', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-owner-write-'));
  const file = join(root, 'catalog.sqlite');
  const firstDriver = new SQLiteDriver(file), secondDriver = new SQLiteDriver(file);
  const firstCatalog = new SqlBlobCatalog(firstDriver), secondCatalog = new SqlBlobCatalog(secondDriver);
  const store = new PausedFileStore(join(root, 'private'), randomBytes(32));
  const actor = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  const first = new SqliteBlobUploadService(firstCatalog, authority(), new FixtureVerifier(), 10_000);
  const second = new SqliteBlobUploadService(secondCatalog, authority(), new FixtureVerifier(), 10_000);
  const bytes = Buffer.from('%PDF-1.7\nlocked writer\n%%EOF');
  try {
    await firstCatalog.ensureSchema();
    const session = await first.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, 'write-owner');
    const firstWrite = first.write(actor, session.uploadId, source(bytes));
    await store.entered.promise;
    let secondDone = false;
    const secondWrite = second.write(actor, session.uploadId, source(bytes))
      .finally(() => { secondDone = true; });
    await new Promise(done => setTimeout(done, 30));
    expect(secondDone).toBe(false);
    store.release.release();
    expect(await firstWrite).toBe(bytes.length);
    expect(await secondWrite).toBe(bytes.length);
    expect(store.puts).toBe(1);
  } finally {
    store.release.release();
    await firstDriver.close();
    await secondDriver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('two SQLite drivers serialize Blob parser confirmation and replay the winner', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-owner-confirm-'));
  const file = join(root, 'catalog.sqlite');
  const firstDriver = new SQLiteDriver(file), secondDriver = new SQLiteDriver(file);
  const firstCatalog = new SqlBlobCatalog(firstDriver), secondCatalog = new SqlBlobCatalog(secondDriver);
  const actor = new UserContext().withObjectStorage(
    new FileObjectStorage(join(root, 'private'), randomBytes(32))).withObjectStorageObserver(() => {});
  const verifier = new PausedVerifier();
  const writer = new SqliteBlobUploadService(firstCatalog, authority(), new FixtureVerifier(), 10_000);
  const first = new SqliteBlobUploadService(firstCatalog, authority(), verifier, 10_000);
  const second = new SqliteBlobUploadService(secondCatalog, authority(), verifier, 10_000);
  const bytes = Buffer.from('%PDF-1.7\nlocked parser\n%%EOF');
  try {
    await firstCatalog.ensureSchema();
    const session = await writer.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, 'confirm-owner');
    await writer.write(actor, session.uploadId, source(bytes));
    const firstComplete = first.complete(actor, session.uploadId);
    await verifier.entered.promise;
    let secondDone = false;
    const secondComplete = second.complete(actor, session.uploadId)
      .finally(() => { secondDone = true; });
    await new Promise(done => setTimeout(done, 30));
    expect(secondDone).toBe(false);
    verifier.release.release();
    expect((await firstComplete).key).toBe(session.reference.key);
    expect((await secondComplete).key).toBe(session.reference.key);
    expect(verifier.calls).toBe(1);
  } finally {
    verifier.release.release();
    await firstDriver.close();
    await secondDriver.close();
    await rm(root, { recursive: true, force: true });
  }
});
