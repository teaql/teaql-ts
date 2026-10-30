import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import type { ObjectByteStream } from '../src/core/object-storage';
import { FileObjectStorage } from '../src/object-storage/file';
import { SharpBlobContentVerifier } from '../src/blob-reference/content-sharp';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobUploadAuthorization, SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { SQLiteDriver } from '../src/sql/sqlite';

const stream = (bytes: Uint8Array): ObjectByteStream => (async function* () { yield bytes; })();
const fixture = (extension: 'jpg' | 'png') =>
  readFile(join(__dirname, 'fixtures', `blob-sample.${extension}`));

test('real JPEG/PNG decoding establishes MIME and whole-byte facts, including negative controls', async () => {
  const verifier = new SharpBlobContentVerifier();
  await verifier.validateReady();
  for (const extension of ['jpg', 'png'] as const) {
    const bytes = await fixture(extension);
    const verified = await verifier.verify(stream(bytes), extension, 10000);
    expect(verified).toEqual({ sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      contentType: extension === 'jpg' ? 'image/jpeg' : 'image/png' });
    await expect(verifier.verify(stream(bytes), extension === 'jpg' ? 'png' : 'jpg', 10000))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    await expect(verifier.verify(stream(bytes.subarray(0, bytes.length - 12)), extension, 10000))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    if (extension === 'png') {
      const corrupt = Buffer.from(bytes);
      corrupt[corrupt.length - 25] ^= 1;
      await expect(verifier.verify(stream(corrupt), extension, 10000))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    }
    await expect(verifier.verify(stream(bytes), extension, bytes.length - 1))
      .rejects.toThrow('BLOB_SIZE_EXCEEDED');
  }
  await expect(verifier.verify(stream(Buffer.from('not an image')), 'jpg', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  await expect(verifier.verify(stream(Buffer.alloc(0)), 'png', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  await expect(verifier.verify(stream(await fixture('png')), 'pdf', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
});

test('bounded admission and decoded pixel budget fail closed', async () => {
  const bytes = await fixture('png');
  const verifier = new SharpBlobContentVerifier({ maximumInputBytes: 10000,
    maximumDecodedBytes: 4, concurrentVerifications: 1 });
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const first = verifier.verify((async function* () { await waiting; yield bytes; })(), 'png', 10000);
  await expect(verifier.verify(stream(bytes), 'png', 10000))
    .rejects.toThrow('BLOB_VERIFICATION_BUSY');
  release();
  await expect(first).rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  await expect(verifier.verify(stream(bytes), 'png', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
});

test('SQLite/File upload promotes only a JPEG that the real decoder parses', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-image-upload-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const store = new FileObjectStorage(join(root, 'objects'), randomBytes(32));
  const context = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  const target = { entity: 'Asset', entityId: null, field: 'image' };
  const authorization: BlobUploadAuthorization = {
    scope: () => 'tenant-a',
    field: () => new BlobFieldSpec('Asset', 'image', ['jpg'], true, 'default'),
    authorize: async () => true,
    currentOnLease: async () => ({ scope: 'tenant-a',
      field: new BlobFieldSpec('Asset', 'image', ['jpg'], true, 'default'), allowed: true }),
  };
  try {
    await catalog.ensureSchema();
    const service = new SqliteBlobUploadService(catalog, authorization,
      new SharpBlobContentVerifier(), 10000);
    const good = await fixture('jpg');
    const upload = await service.begin(context, target,
      { fileName: 'picture.jpg', declaredSize: good.length }, 'image-good');
    await service.write(context, upload.uploadId, stream(good));
    expect((await service.complete(context, upload.uploadId)).key).toBe(upload.reference.key);
    expect((await driver.query('SELECT status,content_type,size_bytes FROM teaql_blob_catalog WHERE key = ?',
      [upload.reference.key])).rows[0]).toMatchObject({ status: 'uploaded_unbound',
        content_type: 'image/jpeg', size_bytes: good.length });
    const bad = good.subarray(0, good.length - 12);
    const rejected = await service.begin(context, target,
      { fileName: 'broken.jpg', declaredSize: bad.length }, 'image-bad');
    await service.write(context, rejected.uploadId, stream(bad));
    await expect(service.complete(context, rejected.uploadId))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [rejected.reference.key])).rows[0].status).toBe('initiated');
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});
