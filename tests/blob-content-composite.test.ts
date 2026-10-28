import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ObjectByteStream } from '../src/core/object-storage';
import { CompositeBlobContentVerifier } from '../src/blob-reference/content-composite';
import { SharpBlobContentVerifier } from '../src/blob-reference/content-sharp';
import { FfmpegBlobContentVerifier } from '../src/blob-reference/content-ffmpeg';

const ffprobe = process.env.TEAQL_FFPROBE_BIN || '/usr/bin/ffprobe';
const ffmpeg = process.env.TEAQL_FFMPEG_BIN || '/usr/bin/ffmpeg';
const prlimit = process.env.TEAQL_PRLIMIT_BIN || '/usr/bin/prlimit';
const supported = process.platform === 'linux' && [ffprobe, ffmpeg, prlimit].every(existsSync);
const stream = (data: Uint8Array): ObjectByteStream => (async function* () { yield data; })();

(supported ? test : test.skip)('one passive module verifier dispatches real image and media parsers', async () => {
  const image = new SharpBlobContentVerifier();
  const media = new FfmpegBlobContentVerifier(ffprobe, ffmpeg, prlimit);
  const verifier = new CompositeBlobContentVerifier({ jpg: image, jpeg: image,
    png: image, mp3: media, mp4: media });
  expect(verifier.supportedExtensions).toEqual(['jpeg', 'jpg', 'mp3', 'mp4', 'png']);
  await verifier.validateReady();
  for (const [extension, path, mime] of [
    ['jpg', 'blob-sample.jpg', 'image/jpeg'],
    ['mp3', 'reference-modules/sample.mp3', 'audio/mpeg'],
  ]) {
    const data = await readFile(join(__dirname, 'fixtures', path));
    expect(await verifier.verify(stream(data), extension, data.length)).toEqual({
      sizeBytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
      contentType: mime,
    });
  }
  let read = false;
  const forbidden = (async function* () { read = true; yield Buffer.from('secret'); })();
  await expect(verifier.verify(forbidden, 'docx', 100)).rejects.toThrow('BLOB_FORMAT_NOT_ALLOWED');
  expect(read).toBe(false);
  expect(() => new CompositeBlobContentVerifier({ PDF: image }))
    .toThrow('BLOB_POLICY_INVALID');
});
