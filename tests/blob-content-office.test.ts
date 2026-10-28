import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ObjectByteStream } from '../src/core/object-storage';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { FileObjectStorage } from '../src/object-storage/file';
import { CompositeBlobContentVerifier } from '../src/blob-reference/content-composite';
import { OfficeBlobContentVerifier } from '../src/blob-reference/content-office';
import { SharpBlobContentVerifier } from '../src/blob-reference/content-sharp';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobUploadAuthorization, SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { SQLiteDriver } from '../src/sql/sqlite';

const stream = (bytes: Uint8Array): ObjectByteStream => (async function* () { yield bytes; })();
const fixture = (extension: 'docx' | 'xlsx') =>
  readFile(join(__dirname, 'fixtures', 'reference-modules', `sample.${extension}`));

test('real DOCX/XLSX package and XML parsing returns original facts and rejects malformed packages', async () => {
  const verifier = new OfficeBlobContentVerifier();
  await verifier.validateReady();
  for (const [extension, mime] of [
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ] as const) {
    const bytes = await fixture(extension);
    expect(await verifier.verify(stream(bytes), extension, bytes.length)).toEqual({
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      contentType: mime,
    });
    await expect(verifier.verify(stream(bytes.subarray(0, -12)), extension, bytes.length))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    await expect(verifier.verify(stream(bytes), extension === 'docx' ? 'xlsx' : 'docx', bytes.length))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    await expect(verifier.verify(stream(bytes), extension, bytes.length - 1))
      .rejects.toThrow('BLOB_SIZE_EXCEEDED');
    await expect(verifier.verify(stream(Buffer.concat([bytes, Buffer.from('junk')])), extension,
      bytes.length + 4)).rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  }
  const docx = await fixture('docx');
  const utf16 = await readFile(join(__dirname, 'fixtures', 'reference-modules', 'sample-utf16.docx'));
  expect((await verifier.verify(stream(utf16), 'docx', utf16.length)).contentType)
    .toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const corrupt = Buffer.from(docx);
  const central = corrupt.indexOf(Buffer.from([0x50, 0x4b, 1, 2]));
  expect(central).toBeGreaterThan(0);
  corrupt[central + 16] ^= 1;
  await expect(verifier.verify(stream(corrupt), 'docx', corrupt.length))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  const entity = await readFile(join(__dirname, 'fixtures', 'reference-modules', 'sample-entity.docx'));
  await expect(verifier.verify(stream(entity), 'docx', entity.length))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  const limited = new OfficeBlobContentVerifier({ maximumInputBytes: 10000,
    maximumDecodedBytes: 100, maximumParts: 1000, maximumElements: 200000,
    concurrentVerifications: 1 });
  await expect(limited.verify(stream(docx), 'docx', docx.length))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  let read = false;
  const forbidden = (async function* () { read = true; yield Buffer.from('secret'); })();
  await expect(verifier.verify(forbidden, 'pdf', 1000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  expect(read).toBe(false);
  const busy = new OfficeBlobContentVerifier({ maximumInputBytes: 10000,
    maximumDecodedBytes: 100 * 1024 * 1024, maximumParts: 1000,
    maximumElements: 200000, concurrentVerifications: 1 });
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const first = busy.verify((async function* () { await waiting; yield docx; })(), 'docx', docx.length);
  await expect(busy.verify(stream(docx), 'docx', docx.length))
    .rejects.toThrow('BLOB_VERIFICATION_BUSY');
  release();
  expect((await first).sizeBytes).toBe(docx.length);
});

test('one host-selected composite routes real Office and image bytes', async () => {
  const office = new OfficeBlobContentVerifier();
  const image = new SharpBlobContentVerifier();
  const composite = new CompositeBlobContentVerifier({ docx: office, xlsx: office, jpg: image });
  expect(composite.supportedExtensions).toEqual(['docx', 'jpg', 'xlsx']);
  await composite.validateReady();
  for (const [extension, path] of [
    ['docx', 'reference-modules/sample.docx'], ['jpg', 'blob-sample.jpg'],
  ] as const) {
    const bytes = await readFile(join(__dirname, 'fixtures', path));
    expect((await composite.verify(stream(bytes), extension, bytes.length)).sizeBytes).toBe(bytes.length);
  }
});

test('SQLite/File upload promotes only a fully parsed Office package', async () => {
  for (const extension of ['docx', 'xlsx'] as const) {
    const root = await mkdtemp(join(tmpdir(), 'teaql-office-upload-'));
    const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
    const catalog = new SqlBlobCatalog(driver);
    const store = new FileObjectStorage(join(root, 'objects'), randomBytes(32));
    const context = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
    const target = { entity: 'Asset', entityId: null, field: 'document' };
    const authorization: BlobUploadAuthorization = {
      scope: () => 'tenant-a',
      field: () => new BlobFieldSpec('Asset', 'document', ['docx', 'xlsx'], true, 'default'),
      authorize: async () => true,
      currentOnLease: async () => ({ scope: 'tenant-a',
        field: new BlobFieldSpec('Asset', 'document', ['docx', 'xlsx'], true, 'default'), allowed: true }),
    };
    try {
      await catalog.ensureSchema();
      const service = new SqliteBlobUploadService(catalog, authorization,
        new OfficeBlobContentVerifier(), 10000);
      const good = await fixture(extension);
      const upload = await service.begin(context, target,
        { fileName: `sample.${extension}`, declaredSize: good.length }, `office-${extension}-good`);
      await service.write(context, upload.uploadId, stream(good));
      expect((await service.complete(context, upload.uploadId)).key).toBe(upload.reference.key);
      expect((await driver.query('SELECT status,content_type,size_bytes FROM teaql_blob_catalog WHERE key = ?',
        [upload.reference.key])).rows[0]).toMatchObject({ status: 'uploaded_unbound',
          content_type: extension === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size_bytes: good.length });
      const bad = good.subarray(0, -12);
      const rejected = await service.begin(context, target,
        { fileName: `broken.${extension}`, declaredSize: bad.length }, `office-${extension}-bad`);
      await service.write(context, rejected.uploadId, stream(bad));
      await expect(service.complete(context, rejected.uploadId))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
      expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
        [rejected.reference.key])).rows[0].status).toBe('initiated');
    } finally {
      await driver.close();
      await rm(root, { recursive: true, force: true });
    }
  }
});
