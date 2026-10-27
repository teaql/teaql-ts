import { createHash, randomBytes } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { ObjectByteStream, ObjectKey, ObjectPutOptions } from '../src/core/object-storage';
import { FileObjectStorage } from '../src/object-storage/file';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
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
  const authorization: BlobUploadAuthorization = {
    scope: () => scope,
    field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
    authorize: async (_context, actual, action) => permitted &&
      actual.entity === 'Asset' && actual.field === 'document' &&
      ['Begin', 'Write', 'Confirm'].includes(action),
  };
  const service = new SqliteBlobUploadService(catalog, authorization, verifier, 10_000);
  try {
    await expect(catalog.validateSchema()).rejects.toThrow('BLOB_SCHEMA_MISSING');
    await catalog.ensureSchema();
    await catalog.validateSchema();
    const info = { fileName: 'upload/path/report.pdf', declaredSize: bytes.length,
      declaredContentType: 'application/pdf' };
    const session = await service.begin(context, target, info, 'request-1');
    expect((await service.begin(context, target, info, 'request-1')).uploadId).toBe(session.uploadId);
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
    expect((await service.complete(context, session.uploadId)).key).toBe(session.reference.key);
    expect(verifier.calls).toBe(1);
    expect((await service.complete(context, session.uploadId)).key).toBe(session.reference.key);
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
