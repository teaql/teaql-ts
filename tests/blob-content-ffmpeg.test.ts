import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import type { ObjectByteStream } from '../src/core/object-storage';
import { FileObjectStorage } from '../src/object-storage/file';
import { FfmpegBlobContentVerifier } from '../src/blob-reference/content-ffmpeg';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobUploadAuthorization, SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { SQLiteDriver } from '../src/sql/sqlite';

const ffprobe = process.env.TEAQL_FFPROBE_BIN || '/usr/bin/ffprobe';
const ffmpeg = process.env.TEAQL_FFMPEG_BIN || '/usr/bin/ffmpeg';
const prlimit = process.env.TEAQL_PRLIMIT_BIN || '/usr/bin/prlimit';
const mediaTest = process.platform === 'linux' &&
  [ffprobe, ffmpeg, prlimit].every(existsSync) ? test : test.skip;
const stream = (bytes: Uint8Array): ObjectByteStream =>
  (async function* () { yield bytes; })();
const expectedSha: Record<string, string> = {
  mp3: 'a4facfc9e36b342c3f7b2de8283ab9f4c9cf53af2dfb2f1959825aa930748d9b',
  mp4: '5a3665235df157cb9d1cffe53501b86889849a38a5a643f0a64dbc957f4a58af',
};
async function fixture(extension: 'mp3' | 'mp4'): Promise<Buffer> {
  const bytes = await readFile(join(__dirname, 'fixtures', 'reference-modules', `sample.${extension}`));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedSha[extension]);
  return bytes;
}

mediaTest('real MP3/MP4 decode, truncation, format and resource budgets', async () => {
  const verifier = new FfmpegBlobContentVerifier(ffprobe, ffmpeg, prlimit);
  await verifier.validateReady();
  for (const extension of ['mp3', 'mp4'] as const) {
    const bytes = await fixture(extension);
    expect(await verifier.verify(stream(bytes), extension, bytes.length)).toEqual({
      sizeBytes: bytes.length, sha256: expectedSha[extension],
      contentType: extension === 'mp3' ? 'audio/mpeg' : 'video/mp4',
    });
    for (const invalid of [bytes.subarray(0, bytes.length - 1),
                           bytes.subarray(0, bytes.length - 12),
                           bytes.subarray(0, Math.floor(bytes.length / 2)),
                           Buffer.alloc(0), Buffer.from('not media')]) {
      await expect(verifier.verify(stream(invalid), extension, bytes.length))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
    }
    await expect(verifier.verify(stream(bytes), extension, bytes.length - 1))
      .rejects.toThrow('BLOB_SIZE_EXCEEDED');
    const limits = { maximumInputBytes: 10000, maximumFrames: 1,
      maximumVideoPixels: 1, concurrentVerifications: 1 };
    await expect(new FfmpegBlobContentVerifier(ffprobe, ffmpeg, prlimit, limits)
      .verify(stream(bytes), extension, bytes.length))
      .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  }
  await expect(verifier.verify(stream(await fixture('mp3')), 'mp4', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  await expect(verifier.verify(stream(await fixture('mp4')), 'mp3', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  await expect(verifier.verify(stream(await fixture('mp3')), 'pdf', 10000))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  await expect(new FfmpegBlobContentVerifier('/missing/ffprobe', ffmpeg, prlimit)
    .validateReady()).rejects.toThrow('BLOB_CAPABILITY_MISSING');
});

mediaTest('audio-only MP4 with valid boxes is rejected as video', async () => {
  const input = await fixture('mp3');
  const remux = spawnSync(ffmpeg, ['-nostdin', '-v', 'error', '-f', 'mp3', '-i',
    'pipe:0', '-vn', '-c:a', 'copy', '-movflags', 'frag_keyframe+empty_moov',
    '-f', 'mp4', 'pipe:1'], { input, timeout: 10000, maxBuffer: 10000 });
  expect(remux.status).toBe(0);
  await expect(new FfmpegBlobContentVerifier(ffprobe, ffmpeg, prlimit)
    .verify(stream(remux.stdout), 'mp4', remux.stdout.length))
    .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
});

mediaTest('admission slot is released after verification', async () => {
  const bytes = await fixture('mp3');
  const verifier = new FfmpegBlobContentVerifier(ffprobe, ffmpeg, prlimit,
    { maximumInputBytes: 10000, maximumFrames: 100000,
      maximumVideoPixels: 16000000, concurrentVerifications: 1 });
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const first = verifier.verify((async function* () { await waiting; yield bytes; })(),
    'mp3', bytes.length);
  await expect(verifier.verify(stream(bytes), 'mp3', bytes.length))
    .rejects.toThrow('BLOB_VERIFICATION_BUSY');
  release();
  expect((await first).contentType).toBe('audio/mpeg');
  expect((await verifier.verify(stream(bytes), 'mp3', bytes.length)).sizeBytes).toBe(bytes.length);
});

mediaTest('SQLite/File upload promotes real media and keeps truncated copy initiated', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-media-upload-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const store = new FileObjectStorage(join(root, 'objects'), randomBytes(32));
  const context = new UserContext().withObjectStorage(store).withObjectStorageObserver(() => {});
  const target = { entity: 'Asset', entityId: null, field: 'media' };
  const authorization: BlobUploadAuthorization = {
    scope: () => 'tenant-a',
    field: () => new BlobFieldSpec('Asset', 'media', ['mp3', 'mp4'], true, 'default'),
    authorize: async () => true,
    currentOnLease: async () => ({ scope: 'tenant-a',
      field: new BlobFieldSpec('Asset', 'media', ['mp3', 'mp4'], true, 'default'), allowed: true }),
  };
  try {
    await catalog.ensureSchema();
    const service = new SqliteBlobUploadService(catalog, authorization,
      new FfmpegBlobContentVerifier(ffprobe, ffmpeg, prlimit), 10000);
    for (const extension of ['mp3', 'mp4'] as const) {
      const bytes = await fixture(extension);
      const upload = await service.begin(context, target,
        { fileName: `sample.${extension}`, declaredSize: bytes.length }, `media-good-${extension}`);
      await service.write(context, upload.uploadId, stream(bytes));
      expect((await service.complete(context, upload.uploadId)).key).toBe(upload.reference.key);
      expect((await driver.query('SELECT status,content_type,size_bytes FROM teaql_blob_catalog WHERE key = ?',
        [upload.reference.key])).rows[0]).toMatchObject({ status: 'uploaded_unbound',
          content_type: extension === 'mp3' ? 'audio/mpeg' : 'video/mp4', size_bytes: bytes.length });
      const truncated = bytes.subarray(0, bytes.length - 12);
      const rejected = await service.begin(context, target,
        { fileName: `broken.${extension}`, declaredSize: truncated.length },
        `media-bad-${extension}`);
      await service.write(context, rejected.uploadId, stream(truncated));
      await expect(service.complete(context, rejected.uploadId))
        .rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
      expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
        [rejected.reference.key])).rows[0].status).toBe('initiated');
    }
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});
