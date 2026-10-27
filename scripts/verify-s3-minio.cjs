// Explicit local S3-compatible integration gate. Requires a disposable bucket.
// Never print credentials, object keys or full signed URLs.
const { randomUUID } = require('node:crypto');
const { S3Client } = require('@aws-sdk/client-s3');
const { UserContext } = require('../dist/core/context');
const { ObjectKey, ObjectPutOptions, ObjectReadUrlOptions, StorageError } = require('../dist/core/object-storage');
const { S3ObjectStorage } = require('../dist/object-storage/s3');

async function main() {
  const endpoint = process.env.TEAQL_S3_TEST_ENDPOINT;
  const bucket = process.env.TEAQL_S3_TEST_BUCKET;
  const accessKeyId = process.env.TEAQL_S3_TEST_ACCESS_KEY;
  const secretAccessKey = process.env.TEAQL_S3_TEST_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 test endpoint, bucket and credentials are required');
  }
  const client = new S3Client({ region: 'us-east-1', endpoint, forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: { accessKeyId, secretAccessKey } });
  const provider = new S3ObjectStorage(client, bucket);
  const actor = new UserContext().withObjectStorage(provider).withObjectStorageObserver(() => {});
  const storage = actor.objectStorage('F4 real S3-compatible TypeScript');
  const key = new ObjectKey(`f4/typescript/${randomUUID()}`);
  const createKey = new ObjectKey(`f4/typescript/create/${randomUUID()}`);
  const raceKey = new ObjectKey(`f4/typescript/race/${randomUUID()}`);
  const bytes = Buffer.from('%PDF-1.7\nF4 real S3-compatible bytes\n%%EOF');
  try {
    const written = await storage.putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf'));
    const head = await storage.head(key);
    if (!head || head.size !== bytes.length || head.etag !== written.etag ||
        head.contentType !== 'application/pdf') throw new Error('S3 head mismatch');
    if (!Buffer.from(await storage.getBytes(key, 1024)).equals(bytes)) {
      throw new Error('S3 get mismatch');
    }
    const ticket = await storage.getReadUrl(key,
      new ObjectReadUrlOptions(2, 'attachment', 'report.pdf'));
    const response = await fetch(ticket.url, { headers: { Range: 'bytes=0-7' } });
    const partial = Buffer.from(await response.arrayBuffer());
    if (response.status !== 206 || !partial.equals(bytes.subarray(0, 8)) ||
        response.headers.get('content-type') !== 'application/pdf' ||
        !response.headers.get('content-disposition')?.includes('report.pdf')) {
      throw new Error('S3 signed Range or response headers mismatch');
    }
    await new Promise(resolve => setTimeout(resolve,
      Math.max(0, ticket.expiresAt.getTime() - Date.now() + 1300)));
    if ((await fetch(ticket.url)).status !== 403) throw new Error('S3 signed URL outlived expiry');
    if (process.env.TEAQL_S3_TEST_CREATE_ONLY === '1') {
      const options = new ObjectPutOptions(bytes.length, 'create_only', 'application/pdf');
      const created = await storage.putBytes(createKey, bytes, options);
      let conflict = false;
      try { await storage.putBytes(createKey, Buffer.alloc(bytes.length, 0x78), options); }
      catch (error) { conflict = error instanceof StorageError && error.code === 'Conflict'; }
      if (!conflict || (await storage.head(createKey))?.etag !== created.etag ||
          !Buffer.from(await storage.getBytes(createKey, 1024)).equals(bytes)) {
        throw new Error('S3 create-only did not preserve first object');
      }
      const candidates = [bytes, Buffer.alloc(bytes.length, 0x79)];
      const race = await Promise.allSettled(candidates.map(value =>
        storage.putBytes(raceKey, value, options)));
      const winner = race.findIndex(result => result.status === 'fulfilled');
      if (race.filter(result => result.status === 'fulfilled').length !== 1 ||
          race.filter(result => result.status === 'rejected').some(result =>
            !(result.reason instanceof StorageError) || result.reason.code !== 'Conflict') ||
          !Buffer.from(await storage.getBytes(raceKey, 1024)).equals(candidates[winner])) {
        throw new Error('S3 create-only race did not have one winner');
      }
      console.log('PASS TypeScript real S3-compatible create-only duplicate/race');
    }
    console.log('PASS TypeScript real S3-compatible replace/read/signed Range/expiry');
  } finally {
    try {
      await storage.delete(key);
      if (process.env.TEAQL_S3_TEST_CREATE_ONLY === '1') {
        await storage.delete(createKey);
        await storage.delete(raceKey);
      }
    } finally { provider.close(); }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'S3 integration failure');
  process.exitCode = 1;
});
