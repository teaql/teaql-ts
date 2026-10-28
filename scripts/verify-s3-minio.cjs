// Explicit local S3-compatible integration gate. Requires a disposable bucket.
// Never print credentials, object keys or full signed URLs.
const { createHash, randomUUID } = require('node:crypto');
const { readFile, mkdtemp, mkdir, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { S3Client } = require('@aws-sdk/client-s3');
const { BlobFieldSpec } = require('../dist/core/blob-ref');
const { UserContext } = require('../dist/core/context');
const { ObjectKey, ObjectPutOptions, ObjectReadUrlOptions, StorageError } = require('../dist/core/object-storage');
const { S3ObjectStorage } = require('../dist/object-storage/s3');
const { SqlBlobCatalog } = require('../dist/blob-reference/sql-catalog');
const { SqlBlobResponseContributor } = require('../dist/blob-reference/read-service');
const { SqliteBlobUploadService } = require('../dist/blob-reference/upload-service');
const { SqliteBlobMaintenanceService } = require('../dist/blob-reference/maintenance-service');
const { BlobRetentionPolicy } = require('../dist/blob-reference/retention');
const { SharpBlobContentVerifier } = require('../dist/blob-reference/content-sharp');
const { PdfjsBlobContentVerifier } = require('../dist/blob-reference/content-pdfjs');
const { FfmpegBlobContentVerifier } = require('../dist/blob-reference/content-ffmpeg');
const { OfficeBlobContentVerifier } = require('../dist/blob-reference/content-office');
const { LegacyOfficeBlobContentVerifier } = require('../dist/blob-reference/content-legacy-office');
const { ViewPreparationService } = require('../dist/core/view-preparation');
const { MutationIntent } = require('../dist/core/request-intent');
const { SQLiteDriver, SQLiteTeaQLClient } = require('../dist/sql/sqlite');

async function verifyBlobUpload(actor, storage, mode = 'fixture') {
  const root = await mkdtemp(join(tmpdir(), 'teaql-s3-blob-upload-'));
  await mkdir(join(root, 'legacy-scratch'), { mode: 0o700 });
  const filename = join(root, 'catalog.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, {});
  client.setUserContext(actor);
  const catalog = new SqlBlobCatalog(driver);
  const extension = mode === 'image' ? 'jpg' :
    ['mp3', 'mp4', 'doc', 'docx', 'xls', 'xlsx'].includes(mode) ? mode : 'pdf';
  const contentType = mode === 'image' ? 'image/jpeg' :
    mode === 'mp3' ? 'audio/mpeg' : mode === 'mp4' ? 'video/mp4' :
      mode === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
        mode === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
          mode === 'doc' ? 'application/msword' : mode === 'xls' ? 'application/vnd.ms-excel' :
          'application/pdf';
  const fileName = mode === 'image' ? 'sample.jpg' :
    ['mp3', 'mp4', 'doc', 'docx', 'xls', 'xlsx'].includes(mode) ? `sample.${mode}` : 'report.pdf';
  const bytes = await readFile(join(__dirname, '..', 'tests', 'fixtures',
    mode === 'image' ? 'blob-sample.jpg' :
      mode === 'pdf' ? 'blob-parser-sample.pdf' :
        ['mp3', 'mp4', 'doc', 'docx', 'xls', 'xlsx'].includes(mode) ? `reference-modules/sample.${mode}` :
          'blob-sample.pdf'));
  const target = { entity: 'Asset', entityId: null, field: 'document' };
  let permitted = true;
  const field = () => new BlobFieldSpec('Asset', 'document', [extension], true, 'default');
  const authorization = {
    scope: () => 'f4-s3-upload',
    field,
    authorize: async () => permitted,
    currentOnLease: async () => ({ scope: 'f4-s3-upload', field: field(), allowed: permitted,
      policy: new BlobRetentionPolicy('default', 'server_stream', 86400, 604800) }),
  };
  const fixtureVerifier = { calls: 0, async verify(content, extension, maximumBytes) {
    this.calls++;
    const chunks = [];
    let size = 0;
    for await (const chunk of content) {
      size += chunk.byteLength;
      if (size > maximumBytes) throw new Error('BLOB_SIZE_EXCEEDED');
      chunks.push(Buffer.from(chunk));
    }
    const value = Buffer.concat(chunks);
    if (extension !== 'pdf' || !value.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
        !value.includes(Buffer.from('%%EOF'))) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    return { sizeBytes: size, sha256: createHash('sha256').update(value).digest('hex'),
      contentType: 'application/pdf' };
  } };
  const parser = mode === 'image' ? new SharpBlobContentVerifier() :
    mode === 'pdf' ? new PdfjsBlobContentVerifier() :
      mode === 'docx' || mode === 'xlsx' ? new OfficeBlobContentVerifier() :
      mode === 'doc' || mode === 'xls' ? new LegacyOfficeBlobContentVerifier(
        process.env.TEAQL_SOFFICE_BIN || '/usr/bin/soffice',
        process.env.TEAQL_BWRAP_BIN || '/usr/bin/bwrap',
        process.env.TEAQL_PRLIMIT_BIN || '/usr/bin/prlimit', join(root, 'legacy-scratch')) :
      mode === 'mp3' || mode === 'mp4' ? new FfmpegBlobContentVerifier(
        process.env.TEAQL_FFPROBE_BIN || '/usr/bin/ffprobe',
        process.env.TEAQL_FFMPEG_BIN || '/usr/bin/ffmpeg',
        process.env.TEAQL_PRLIMIT_BIN || '/usr/bin/prlimit') : undefined;
  const label = mode === 'image' ? 'real JPEG ' : mode === 'pdf' ? 'real PDF ' :
    ['mp3', 'mp4', 'doc', 'docx', 'xls', 'xlsx'].includes(mode) ? `real ${mode.toUpperCase()} ` : '';
  const verifier = parser ? { calls: 0, async verify(content, extension, maximumBytes) {
    this.calls++;
    return parser.verify(content, extension, maximumBytes);
  } } : fixtureVerifier;
  let objectKey;
  try {
    await catalog.ensureSchema();
    const service = new SqliteBlobUploadService(catalog, authorization, verifier, 10_000);
    const session = await service.begin(actor, target,
      { fileName, declaredSize: bytes.length, declaredContentType: contentType },
      randomUUID());
    const row = await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key]);
    objectKey = new ObjectKey(row.rows[0].object_key);
    const source = () => (async function* () { yield bytes; })();
    if (await service.write(actor, session.uploadId, source()) !== bytes.length) {
      throw new Error('Blob S3 upload write length mismatch');
    }
    permitted = false;
    try { await service.complete(actor, session.uploadId); throw new Error('Blob S3 upload ignored revocation'); }
    catch (error) { if (error.message !== 'BLOB_UPLOAD_DENIED') throw error; }
    permitted = true;
    if ((await service.complete(actor, session.uploadId)).key !== session.reference.key ||
        (await service.complete(actor, session.uploadId)).key !== session.reference.key ||
        verifier.calls !== 1) throw new Error('Blob S3 upload confirmation replay mismatch');
    if (await service.write(actor, session.uploadId, source()) !== bytes.length ||
        !Buffer.from(await storage.getBytes(objectKey, 10_000)).equals(bytes)) {
      throw new Error('Blob S3 upload committed-write replay mismatch');
    }
    const saved = await driver.query(
      'SELECT status, content_type, size_bytes, content_version FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key]);
    const head = await storage.head(objectKey);
    if (saved.rows[0].status !== 'uploaded_unbound' ||
        saved.rows[0].content_type !== contentType ||
        Number(saved.rows[0].size_bytes) !== bytes.length ||
        saved.rows[0].content_version !== head?.etag) {
      throw new Error('Blob S3 upload catalog/object mismatch');
    }
    console.log(`PASS TypeScript ${label}Blob upload SQLite/S3 write/confirm/replay/revocation`);
    await driver.query('CREATE TABLE asset (id TEXT PRIMARY KEY, document TEXT)');
    const bindingTarget = { entity: 'Asset', entityId: '1', field: 'document' };
    const bindingAuthorization = { scope: () => 'f4-s3-upload',
      authorize: async (_ctx, actual, _previous, next, action) =>
        actual.entity === 'Asset' && actual.entityId === '1' &&
        actual.field === 'document' && next?.equals(session.reference) && action === 'Create',
      currentPolicyOnLease: () => new BlobRetentionPolicy('default', 'server_stream', 86400, 604800),
    };
    await client.executeGraphSave(new MutationIntent('bind S3 Blob in business graph'),
      async graph => {
        await client.withGraphSqlSession(graph, sql => sql.query(
          'INSERT INTO asset(id, document) VALUES (?, ?)', ['1', session.reference.key]));
        if (await catalog.bindInGraph(client, graph, actor,
          { target: bindingTarget, next: session.reference, expectedVersion: 0,
            nextVersion: 1, action: 'Create' }, bindingAuthorization) !== 1) {
          throw new Error('Blob S3 graph bind version mismatch');
        }
      });
    if ((await driver.query('SELECT document FROM asset WHERE id = ?', ['1'])).rows[0].document
        !== session.reference.key ||
        (await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
          [session.reference.key])).rows[0].status !== 'available') {
      throw new Error('Blob S3 graph bind did not commit together');
    }
    let readAllowed = true, bindingVersion = 1;
    const viewContext = actor
      .insertResource('responseGraphAuthorizer', { authorize: async () => ({
        presentation: { document: session.reference },
        blobSlots: [{ path: ['document'], ...bindingTarget, scope: 'f4-s3-upload',
          bindingVersion, reference: session.reference }],
      }) })
      .insertResource('blobResponseContributor', new SqlBlobResponseContributor(catalog, {
        authorize: async () => readAllowed,
      }, 3));
    const viewService = new ViewPreparationService();
    const options = { mode: 'ordinary', businessOutcome: 'read_only' };
    const prepared = await viewService.prepare(viewContext,
      { document: session.reference }, options);
    const url = prepared.presentation.document;
    if (typeof url !== 'string' || !url.startsWith('http') || !prepared.expiresAt ||
        prepared.cacheControl !== 'private, no-store') {
      throw new Error('Blob S3 authorized URL projection mismatch');
    }
    const response = await fetch(url, { headers: { Range: 'bytes=0-7' } });
    const partial = Buffer.from(await response.arrayBuffer());
    if (response.status !== 206 || !partial.equals(bytes.subarray(0, 8)) ||
        response.headers.get('content-type') !== contentType ||
        !response.headers.get('content-disposition')?.includes(fileName)) {
      throw new Error('Blob S3 signed projection HTTP response mismatch');
    }
    readAllowed = false;
    try { await viewService.prepare(viewContext, { document: session.reference }, options);
      throw new Error('Blob S3 revoked read projected URL'); }
    catch (error) { if (error.code !== 'BLOB_READ_DENIED') throw error; }
    readAllowed = true;
    bindingVersion = 0;
    try { await viewService.prepare(viewContext, { document: session.reference },
      { mode: 'ordinary', businessOutcome: 'committed' });
      throw new Error('Blob S3 stale binding projected URL'); }
    catch (error) {
      if (error.code !== 'BLOB_READ_DENIED' || error.businessState !== 'committed') throw error;
    }
    console.log(`PASS TypeScript ${label}Blob S3 graph bind/authorized signed view/Range/revocation`);
  } finally {
    try { if (objectKey) await storage.delete(objectKey); }
    finally {
      await client.close();
      await driver.close();
      await rm(root, { recursive: true, force: true });
    }
  }
}

async function verifyExpiredUploadMaintenance(actor, storage) {
  const root = await mkdtemp(join(tmpdir(), 'teaql-s3-blob-maintenance-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  let objectKey;
  let clock = Date.now();
  const scope = 'f2-s3-maintenance';
  const field = () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default');
  const authorization = { scope: () => scope, field, authorize: async () => true,
    currentOnLease: async () => ({ scope, field: field(), allowed: true }) };
  const bytes = Buffer.from('%PDF-1.7\nexpired incomplete S3 upload\n%%EOF');
  try {
    await catalog.ensureSchema();
    const upload = new SqliteBlobUploadService(catalog, authorization,
      { verify: async () => { throw new Error('must not verify incomplete upload'); } },
      10_000, 1, () => clock);
    const session = await upload.begin(actor, { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'orphan.pdf', declaredSize: bytes.length }, randomUUID());
    objectKey = new ObjectKey((await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key])).rows[0].object_key);
    await upload.write(actor, session.uploadId, (async function* () { yield bytes; })());
    const original = await storage.head(objectKey);
    if (!original?.etag) throw new Error('maintenance S3 object missing after write');
    clock = session.expiresAt.getTime();
    const maintenance = new SqliteBlobMaintenanceService(catalog,
      { scope: () => scope, canMaintain: async () => true }, 10, () => clock);
    await driver.query(`CREATE TRIGGER reject_deletion BEFORE UPDATE OF status ON teaql_blob_catalog
      WHEN NEW.status = 'deleted' BEGIN SELECT RAISE(ABORT, 'test-only failure'); END`);
    const failed = await maintenance.runBatch(actor);
    if (failed.outcomes.length !== 1 || failed.outcomes[0].status !== 'failed' ||
        (await driver.query('SELECT status, content_version FROM teaql_blob_catalog WHERE key = ?',
          [session.reference.key])).rows[0].content_version !== original.etag ||
        await storage.head(objectKey) !== undefined) {
      throw new Error('maintenance S3 failed acknowledgement did not retain deletion claim');
    }
    await driver.query('DROP TRIGGER reject_deletion');
    const recovered = await maintenance.runBatch(actor);
    if (recovered.outcomes.length !== 1 || recovered.outcomes[0].status !== 'already_missing' ||
        (await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
          [session.reference.key])).rows[0].status !== 'deleted') {
      throw new Error('maintenance S3 recovery did not finalize pinned deletion');
    }
    console.log('PASS TypeScript real SQLite/S3 expired-upload claim/conditional delete/crash recovery');
  } finally {
    try { if (objectKey) await storage.delete(objectKey); }
    finally { await driver.close(); await rm(root, { recursive: true, force: true }); }
  }
}

async function verifyCompletedRetention(actor, storage) {
  const root = await mkdtemp(join(tmpdir(), 'teaql-s3-completed-retention-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const scope = 'f4-s3-completed-retention';
  const prefix = randomUUID().replaceAll('-', '');
  const objects = [];
  const maintenance = new SqliteBlobMaintenanceService(catalog,
    { scope: () => scope, canMaintain: async () => true }, 10, () => 10000);

  async function seed(suffix, status, lastUnbound = null, floor = null,
                      profile = 'default', mode = 'server_stream', bound = false) {
    const reference = `blob_${prefix}_${suffix}`;
    const key = new ObjectKey(`f4/typescript/completed-retention/${prefix}/${suffix}`);
    objects.push(key);
    const bytes = Buffer.from(`%PDF-1.7\n${suffix}\n%%EOF`);
    const created = await storage.putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'create_only', 'application/pdf'));
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key,scope,object_key,content_version,file_name,content_type,size_bytes,
       completed_at_ms,last_unbound_at_ms,policy_profile,upload_mode,
       unbound_retention_seconds,effective_unref_seconds,retention_floor_until_ms,status)
      VALUES (?,?,?,?,?,?,?,9000,?,?,?,1,2,?,?)`,
    [reference, scope, key.value, created.etag, 'file.pdf', 'application/pdf',
      bytes.length, lastUnbound, profile, mode, floor, status]);
    await driver.query(`INSERT INTO teaql_blob_upload
      (upload_id,scope,replay_key,request_hash,key,entity,entity_id,field,file_name,
       extension,declared_size,expires_ms,expires_at,state,written_etag)
      VALUES (?,?,?,?,?,'Asset','1','document','file.pdf','pdf',?,9000,9000,'completed',?)`,
    [`bu_${prefix}_${suffix}`, scope, `replay_${prefix}_${suffix}`,
      `hash_${prefix}_${suffix}`, reference, bytes.length, created.etag]);
    if (bound) await driver.query(`INSERT INTO teaql_blob_binding
      (scope,entity,entity_id,field,key,version)
      VALUES (?,'Asset',?,'document',?,1)`, [scope, `${prefix}_${suffix}`, reference]);
    return { reference, key };
  }

  try {
    await catalog.ensureSchema();
    const expired = await seed('expired', 'uploaded_unbound');
    const former = await seed('former', 'available', 7000, 10000);
    const active = await seed('active', 'available', null, null, 'default', 'server_stream', true);
    const floored = await seed('floored', 'available', 7000, 20000);
    const legacy = await seed('legacy', 'uploaded_unbound', null, null, null);
    const direct = await seed('direct', 'uploaded_unbound', null, null, 'default', 'direct');
    const batch = await maintenance.runBatch(actor);
    const deleted = batch.outcomes.filter(outcome => outcome.status === 'deleted');
    if (deleted.length !== 2 || deleted[0].reference.key !== expired.reference ||
        deleted[1].reference.key !== former.reference ||
        batch.outcomes.some(outcome => !['deleted', 'not_eligible'].includes(outcome.status))) {
      throw new Error('completed S3 retention selected wrong objects');
    }
    for (const item of [expired, former]) {
      const row = await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?', [item.reference]);
      if (await storage.head(item.key) !== undefined || row.rows[0].status !== 'deleted') {
        throw new Error('completed S3 retention did not delete eligible object');
      }
    }
    for (const item of [active, floored, legacy, direct]) {
      const row = await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?', [item.reference]);
      if (await storage.head(item.key) === undefined || row.rows[0].status === 'deleted') {
        throw new Error('completed S3 retention deleted protected object');
      }
    }
    console.log('PASS TypeScript real SQLite/S3 completed retention eligibility/conditional delete');
  } finally {
    try { for (const key of objects) await storage.delete(key); }
    finally { await driver.close(); await rm(root, { recursive: true, force: true }); }
  }
}

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
  const conditionalKey = new ObjectKey(`f2/typescript/conditional-delete/${randomUUID()}`);
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
    const refreshed = await storage.getReadUrl(key,
      new ObjectReadUrlOptions(30, 'attachment', 'report.pdf'));
    if (refreshed.url === ticket.url || refreshed.expiresAt.getTime() <= Date.now()) {
      throw new Error('S3 signed URL did not refresh after expiry');
    }
    const refreshedResponse = await fetch(refreshed.url, { headers: { Range: 'bytes=0-7' } });
    if (refreshedResponse.status !== 206 ||
        !Buffer.from(await refreshedResponse.arrayBuffer()).equals(bytes.subarray(0, 8))) {
      throw new Error('S3 refreshed signed Range failed');
    }
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
    if (process.env.TEAQL_S3_TEST_CONDITIONAL_DELETE === '1') {
      const first = await storage.putBytes(conditionalKey, bytes,
        new ObjectPutOptions(bytes.length, 'create_only', 'application/pdf'));
      if (await storage.deleteIfVersion(conditionalKey, '"00000000000000000000000000000000"')
          !== 'version_mismatch' ||
          (await storage.head(conditionalKey))?.etag !== first.etag) {
        throw new Error('S3 conditional delete removed a mismatched generation');
      }
      const replacement = Buffer.from('next immutable generation');
      const second = await storage.putBytes(conditionalKey, replacement,
        new ObjectPutOptions(replacement.length, 'replace', 'text/plain'));
      if (await storage.deleteIfVersion(conditionalKey, first.etag) !== 'version_mismatch' ||
          (await storage.head(conditionalKey))?.etag !== second.etag ||
          !Buffer.from(await storage.getBytes(conditionalKey, 1024)).equals(replacement)) {
        throw new Error('S3 conditional delete removed a replacement generation');
      }
      if (await storage.deleteIfVersion(conditionalKey, second.etag) !== 'deleted' ||
          await storage.head(conditionalKey) !== undefined ||
          await storage.deleteIfVersion(conditionalKey, second.etag) !== 'already_missing') {
        throw new Error('S3 conditional delete result/replay mismatch');
      }
      let wildcardDenied = false;
      try { await storage.deleteIfVersion(conditionalKey, '*'); }
      catch (error) { wildcardDenied = error instanceof StorageError && error.code === 'InvalidInput'; }
      if (!wildcardDenied) throw new Error('S3 conditional delete accepted wildcard version');
      console.log('PASS TypeScript real S3-compatible version-conditional delete/mismatch/replay');
    }
    if (process.env.TEAQL_S3_TEST_BLOB_UPLOAD === '1') {
      await verifyBlobUpload(actor, storage);
      if (process.env.TEAQL_S3_TEST_REAL_IMAGE === '1') {
        await verifyBlobUpload(actor, storage, 'image');
      }
      if (process.env.TEAQL_S3_TEST_REAL_PDF === '1') {
        await verifyBlobUpload(actor, storage, 'pdf');
      }
      if (process.env.TEAQL_S3_TEST_REAL_MEDIA === '1') {
        await verifyBlobUpload(actor, storage, 'mp3');
        await verifyBlobUpload(actor, storage, 'mp4');
      }
      if (process.env.TEAQL_S3_TEST_REAL_OFFICE === '1') {
        await verifyBlobUpload(actor, storage, 'docx');
        await verifyBlobUpload(actor, storage, 'xlsx');
      }
      if (process.env.TEAQL_S3_TEST_REAL_LEGACY_OFFICE === '1') {
        await verifyBlobUpload(actor, storage, 'doc');
        await verifyBlobUpload(actor, storage, 'xls');
      }
    }
    if (process.env.TEAQL_S3_TEST_MAINTENANCE === '1') {
      await verifyExpiredUploadMaintenance(actor, storage);
      await verifyCompletedRetention(actor, storage);
    }
    console.log('PASS TypeScript real S3-compatible replace/read/signed Range/expiry/refresh');
  } finally {
    try {
      await storage.delete(key);
      if (process.env.TEAQL_S3_TEST_CREATE_ONLY === '1') {
        await storage.delete(createKey);
        await storage.delete(raceKey);
      }
      if (process.env.TEAQL_S3_TEST_CONDITIONAL_DELETE === '1') {
        await storage.delete(conditionalKey);
      }
    } finally { provider.close(); }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'S3 integration failure');
  process.exitCode = 1;
});
