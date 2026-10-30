// Run after npm run build with Node 24; Jest's VM loader cannot require PDF.js ESM.
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { PdfjsBlobContentVerifier } = require('../dist/blob-reference/content-pdfjs');
const { BlobFieldSpec } = require('../dist/core/blob-ref');
const { UserContext } = require('../dist/core/context');
const { FileObjectStorage } = require('../dist/object-storage/file');
const { SqlBlobCatalog } = require('../dist/blob-reference/sql-catalog');
const { SqliteBlobUploadService } = require('../dist/blob-reference/upload-service');
const { SQLiteDriver } = require('../dist/sql/sqlite');

const stream = bytes => (async function* () { yield bytes; })();
const fixture = () => readFile(join(__dirname, '..', 'tests', 'fixtures', 'blob-parser-sample.pdf'));

async function main() {
  assert.equal(Object.keys(require.cache).some(path => path.includes('/pdfjs-dist/')), false);
  const bytes = await fixture();
  const verifier = new PdfjsBlobContentVerifier();
  await verifier.validateReady();
  assert.deepEqual(await verifier.verify(stream(bytes), 'pdf', 10000), {
    sizeBytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    contentType: 'application/pdf',
  });
  for (const invalid of [bytes.subarray(0, bytes.length - 12),
    Buffer.from('%PDF-1.7\nnot a real document\n%%EOF'), Buffer.alloc(0),
    Buffer.from('\x89PNG\r\n\x1a\n%%EOF')]) {
    await assert.rejects(verifier.verify(stream(invalid), 'pdf', 10000), /BLOB_FORMAT_NOT_ALLOWED/);
  }
  await assert.rejects(verifier.verify(stream(bytes), 'png', 10000), /BLOB_FORMAT_NOT_ALLOWED/);
  await assert.rejects(verifier.verify(stream(bytes), 'pdf', bytes.length - 1), /BLOB_SIZE_EXCEEDED/);
  const tight = new PdfjsBlobContentVerifier({ maximumInputBytes: 10000,
    maximumPages: 1, maximumOperatorsPerPage: 1, maximumImagePixels: 10000,
    concurrentVerifications: 1 });
  await assert.rejects(tight.verify(stream(bytes), 'pdf', 10000), /BLOB_FORMAT_NOT_ALLOWED/);

  const single = new PdfjsBlobContentVerifier({ maximumInputBytes: 10000,
    maximumPages: 1, maximumOperatorsPerPage: 100, maximumImagePixels: 10000,
    concurrentVerifications: 1 });
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const first = single.verify((async function* () { await waiting; yield bytes; })(), 'pdf', 10000);
  await assert.rejects(single.verify(stream(bytes), 'pdf', 10000), /BLOB_VERIFICATION_BUSY/);
  release();
  assert.equal((await first).contentType, 'application/pdf');
  assert.equal((await single.verify(stream(bytes), 'pdf', 10000)).sizeBytes, bytes.length);

  const root = await mkdtemp(join(tmpdir(), 'teaql-pdf-upload-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const store = new FileObjectStorage(join(root, 'objects'), randomBytes(32));
  const context = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  const target = { entity: 'Asset', entityId: null, field: 'document' };
  const authorization = {
    scope: () => 'tenant-a',
    field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
    authorize: async () => true,
    currentOnLease: async () => ({ scope: 'tenant-a',
      field: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'), allowed: true }),
  };
  try {
    await catalog.ensureSchema();
    const service = new SqliteBlobUploadService(catalog, authorization, verifier, 10000);
    const good = await service.begin(context, target,
      { fileName: 'valid.pdf', declaredSize: bytes.length }, 'pdf-good');
    await service.write(context, good.uploadId, stream(bytes));
    assert.equal((await service.complete(context, good.uploadId)).key, good.reference.key);
    const saved = (await driver.query('SELECT status,content_type,size_bytes FROM teaql_blob_catalog WHERE key = ?',
      [good.reference.key])).rows[0];
    assert.equal(saved.status, 'uploaded_unbound');
    assert.equal(saved.content_type, 'application/pdf');
    assert.equal(saved.size_bytes, bytes.length);
    const truncated = bytes.subarray(0, bytes.length - 12);
    const bad = await service.begin(context, target,
      { fileName: 'broken.pdf', declaredSize: truncated.length }, 'pdf-bad');
    await service.write(context, bad.uploadId, stream(truncated));
    await assert.rejects(service.complete(context, bad.uploadId), /BLOB_FORMAT_NOT_ALLOWED/);
    assert.equal((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [bad.reference.key])).rows[0].status, 'initiated');
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
  console.log('PASS PDF.js real parse, limits, concurrency, SQLite/File promotion and rejection');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
