import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ObjectByteStream } from '../src/core/object-storage';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { FileObjectStorage } from '../src/object-storage/file';
import { CompositeBlobContentVerifier } from '../src/blob-reference/content-composite';
import { LegacyOfficeBlobContentVerifier } from '../src/blob-reference/content-legacy-office';
import { SharpBlobContentVerifier } from '../src/blob-reference/content-sharp';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobUploadAuthorization, SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { SQLiteDriver } from '../src/sql/sqlite';

const stream = (bytes: Uint8Array): ObjectByteStream => (async function* () { yield bytes; })();
const fixture = (extension: 'doc' | 'xls') =>
  readFile(join(__dirname, 'fixtures', 'reference-modules', `sample.${extension}`));
const tools = ['/usr/bin/soffice', '/usr/bin/bwrap', '/usr/bin/prlimit'] as const;
const legacyTest = process.platform === 'linux' && tools.every(existsSync) ? test : test.skip;
const limits = { maximumInputBytes: 100_000, maximumConvertedBytes: 100_000,
  concurrentVerifications: 1 } as const;

async function environment() {
  const root = await mkdtemp(join(tmpdir(), 'teaql-legacy-office-'));
  await chmod(root, 0o700);
  const scratch = join(root, 'scratch');
  await mkdir(scratch, { mode: 0o700 });
  const verifier = new LegacyOfficeBlobContentVerifier(...tools, scratch, limits);
  return { root, scratch, verifier, close: () => rm(root, { recursive: true, force: true }) };
}

jest.setTimeout(60000);

legacyTest('real DOC/XLS conversion verifies original bytes, limits, busy admission and readiness', async () => {
  const host = await environment();
  try {
    await host.verifier.validateReady();
    for (const [extension, mime, digest] of [
      ['doc', 'application/msword', '9fca8d262d2aa905d58b1cc1c8914d1a8069c16c340f24cd3c4a77daff9c8b73'],
      ['xls', 'application/vnd.ms-excel', '7f387858aaa3ed39d3c7c692aa865b36ac6620462714f3d0daa96388424cf75d'],
    ] as const) {
      const bytes = await fixture(extension);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest);
      expect(await host.verifier.verify(stream(bytes), extension, bytes.length)).toEqual({
        sizeBytes: bytes.length, sha256: digest, contentType: mime,
      });
      await expect(host.verifier.verify(stream(bytes.subarray(0, -12)), extension, bytes.length))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
      await expect(host.verifier.verify(stream(bytes.subarray(0, 512)), extension, bytes.length))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
      const tampered = Buffer.from(bytes);
      tampered[0] ^= 1;
      await expect(host.verifier.verify(stream(tampered), extension, bytes.length))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
      await expect(host.verifier.verify(stream(bytes), extension, bytes.length - 1))
        .rejects.toThrow('BLOB_SIZE_EXCEEDED');
    }
    expect(await readdir(host.scratch)).toHaveLength(0);
    const bytes = await fixture('doc');
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const first = host.verifier.verify((async function* () { await waiting; yield bytes; })(),
      'doc', bytes.length);
    await expect(host.verifier.verify(stream(bytes), 'doc', bytes.length))
      .rejects.toThrow('BLOB_VERIFICATION_BUSY');
    release();
    expect((await first).sizeBytes).toBe(bytes.length);
    const constrained = new LegacyOfficeBlobContentVerifier(...tools, host.scratch,
      { ...limits, maximumConvertedBytes: 1 });
    await expect(constrained.verify(stream(bytes), 'doc', bytes.length))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    const missing = new LegacyOfficeBlobContentVerifier(join(host.root, 'missing'), tools[1],
      tools[2], host.scratch, limits);
    await expect(missing.validateReady()).rejects.toThrow('BLOB_CAPABILITY_MISSING');
    await chmod(host.scratch, 0o755);
    await expect(host.verifier.validateReady()).rejects.toThrow('BLOB_CAPABILITY_MISSING');
    await chmod(host.scratch, 0o700);
    let read = false;
    await expect(host.verifier.verify((async function* () {
      read = true; yield bytes;
    })(), 'pdf', bytes.length)).rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    expect(read).toBe(false);
    const composite = new CompositeBlobContentVerifier({ doc: host.verifier, xls: host.verifier,
      jpg: new SharpBlobContentVerifier() });
    await composite.validateReady();
    expect((await composite.verify(stream(bytes), 'doc', bytes.length)).contentType)
      .toBe('application/msword');
  } finally { await host.close(); }
});

legacyTest('SQLite/File promotes parsed original DOC/XLS and refuses truncated uploads', async () => {
  for (const extension of ['doc', 'xls'] as const) {
    const host = await environment();
    const driver = new SQLiteDriver(join(host.root, 'catalog.sqlite'));
    const catalog = new SqlBlobCatalog(driver);
    const store = new FileObjectStorage(join(host.root, 'objects'), randomBytes(32));
    const context = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
    const target = { entity: 'Asset', entityId: null, field: 'document' };
    const field = () => new BlobFieldSpec('Asset', 'document', [extension], true, 'default');
    const authorization: BlobUploadAuthorization = {
      scope: () => 'tenant-a', field, authorize: async () => true,
      currentOnLease: async () => ({ scope: 'tenant-a', field: field(), allowed: true }),
    };
    try {
      await catalog.ensureSchema();
      const service = new SqliteBlobUploadService(catalog, authorization, host.verifier, 100_000);
      const bytes = await fixture(extension);
      const good = await service.begin(context, target,
        { fileName: `sample.${extension}`, declaredSize: bytes.length }, `legacy-${extension}-good`);
      await service.write(context, good.uploadId, stream(bytes));
      expect((await service.complete(context, good.uploadId)).key).toBe(good.reference.key);
      expect((await driver.query('SELECT status,content_type,size_bytes FROM teaql_blob_catalog WHERE key = ?',
        [good.reference.key])).rows[0]).toMatchObject({ status: 'uploaded_unbound',
          content_type: extension === 'doc' ? 'application/msword' : 'application/vnd.ms-excel',
          size_bytes: bytes.length });
      const bad = bytes.subarray(0, -12);
      const rejected = await service.begin(context, target,
        { fileName: `broken.${extension}`, declaredSize: bad.length }, `legacy-${extension}-bad`);
      await service.write(context, rejected.uploadId, stream(bad));
      await expect(service.complete(context, rejected.uploadId))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
      expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
        [rejected.reference.key])).rows[0].status).toBe('initiated');
    } finally {
      await driver.close();
      await host.close();
    }
  }
});
