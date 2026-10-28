import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { ObjectByteStream, ObjectContent, ObjectKey, ObjectMetadata,
  ObjectPutOptions, ObjectReadUrl, ObjectReadUrlOptions, ObjectStorageProvider,
  StorageError, StorageInvocation } from '../src/core/object-storage';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobRetentionPolicy } from '../src/blob-reference/retention';
import { SqliteBlobMaintenanceService } from '../src/blob-reference/maintenance-service';
import { SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { FileObjectStorage, SqliteFencedFileObjectStorage } from '../src/object-storage/file';
import { SQLiteDriver } from '../src/sql/sqlite';

class ConditionalStore implements ObjectStorageProvider {
  readonly objects = new Map<string, { bytes: Buffer; etag: string; contentType: string }>();
  blindDeletes = 0;
  conditionalDeletes = 0;
  beforeConditionalDelete?: (key: ObjectKey) => void;
  beforeHead?: () => Promise<void>;
  private sequence = 0;
  replace(key: ObjectKey, bytes: Buffer, contentType = 'application/pdf'): string {
    const etag = `"generation-${++this.sequence}"`;
    this.objects.set(key.value, { bytes, etag, contentType });
    return etag;
  }
  async put(_: StorageInvocation, key: ObjectKey, content: ObjectByteStream,
            options: ObjectPutOptions): Promise<ObjectMetadata> {
    const parts: Buffer[] = [];
    for await (const part of content) parts.push(Buffer.from(part));
    const bytes = Buffer.concat(parts);
    if (bytes.length !== options.size) throw new StorageError('InvalidInput');
    if (options.mode === 'create_only' && this.objects.has(key.value)) throw new StorageError('Conflict');
    const etag = this.replace(key, bytes, options.contentType);
    return new ObjectMetadata(key, bytes.length, options.contentType, etag);
  }
  async head(_: StorageInvocation, key: ObjectKey): Promise<ObjectMetadata | undefined> {
    await this.beforeHead?.();
    const current = this.objects.get(key.value);
    return current && new ObjectMetadata(key, current.bytes.length, current.contentType, current.etag);
  }
  async get(_: StorageInvocation, key: ObjectKey): Promise<ObjectContent> {
    const current = this.objects.get(key.value);
    if (!current) throw new StorageError('NotFound');
    return new ObjectContent(new ObjectMetadata(key, current.bytes.length, current.contentType, current.etag),
      (async function* () { yield current.bytes; })(), async () => {});
  }
  async delete(_: StorageInvocation, key: ObjectKey): Promise<void> {
    this.blindDeletes++;
    this.objects.delete(key.value);
  }
  async deleteIfVersion(_: StorageInvocation, key: ObjectKey, version: string) {
    this.conditionalDeletes++;
    this.beforeConditionalDelete?.(key);
    const current = this.objects.get(key.value);
    if (!current) return 'already_missing' as const;
    if (current.etag !== version) return 'version_mismatch' as const;
    this.objects.delete(key.value);
    return 'deleted' as const;
  }
  async getReadUrl(_: StorageInvocation, _key: ObjectKey,
                   _options: ObjectReadUrlOptions): Promise<ObjectReadUrl> {
    throw new StorageError('Unsupported');
  }
}

const bytes = Buffer.from('%PDF-1.7\nreal test bytes\n%%EOF');
const target = { entity: 'Asset', entityId: null, field: 'document' };

async function fixture(policy?: BlobRetentionPolicy) {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-maintenance-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  await catalog.ensureSchema();
  const provider = new ConditionalStore();
  const actor = new UserContext().withObjectStorage(provider).withObjectStorageObserver(() => {});
  let clock = 1_700_000_000_000, allowed = true, scope = 'tenant-a';
  const upload = new SqliteBlobUploadService(catalog, {
    scope: () => scope,
    field: () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'),
    authorize: async () => true,
    currentOnLease: async () => ({ scope,
      field: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default'), allowed: true, policy }),
  }, { verify: async (source) => {
    const parts: Buffer[] = [];
    for await (const block of source) parts.push(Buffer.from(block));
    const content = Buffer.concat(parts);
    return { sizeBytes: content.length, sha256: createHash('sha256').update(content).digest('hex'),
      contentType: 'application/pdf' };
  } }, 1000, 1, () => clock);
  const maintenance = new SqliteBlobMaintenanceService(catalog, {
    scope: () => scope, canMaintain: async () => allowed,
  }, 100, () => clock);
  return {
    root, driver, catalog, provider, actor, upload, maintenance,
    get clock() { return clock; }, set clock(value: number) { clock = value; },
    set allowed(value: boolean) { allowed = value; },
    get scope() { return scope; }, set scope(value: string) { scope = value; },
    async begin(replayKey: string) {
      return upload.begin(actor, target, { fileName: 'report.pdf', declaredSize: bytes.length }, replayKey);
    },
    async objectKey(reference: string) {
      const row = await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?', [reference]);
      return new ObjectKey(String(row.rows[0].object_key));
    },
    async status(reference: string) {
      const row = await driver.query('SELECT status, content_version FROM teaql_blob_catalog WHERE key = ?', [reference]);
      return row.rows[0];
    },
    async close() { await driver.close(); await rm(root, { recursive: true, force: true }); },
  };
}

test('maintenance is explicit, authorized, outside graph SQL, and leaves legacy completed rows untouched', async () => {
  const f = await fixture();
  try {
    const missing = await f.begin('missing');
    f.clock = missing.expiresAt.getTime();
    f.allowed = false;
    await expect(f.maintenance.runBatch(f.actor)).rejects.toThrow('BLOB_MAINTENANCE_DENIED');
    expect((await f.status(missing.reference.key)).status).toBe('initiated');
    f.allowed = true;
    await expect(f.driver.transaction(async () => f.maintenance.runBatch(f.actor)))
      .rejects.toThrow('BLOB_TRANSACTION_REQUIRED');
    const fileActor = new UserContext().withObjectStorage(new FileObjectStorage(join(f.root, 'file'), randomBytes(32)));
    await expect(f.maintenance.runBatch(fileActor)).rejects.toThrow('BLOB_CAPABILITY_MISSING');
    const first = await f.maintenance.runBatch(f.actor);
    expect(first.outcomes).toMatchObject([{ status: 'already_missing' }]);
    expect((await f.status(missing.reference.key)).status).toBe('deleted');
    await expect(f.upload.begin(f.actor, target, { fileName: 'report.pdf', declaredSize: bytes.length }, 'missing'))
      .rejects.toThrow('BLOB_UPLOAD_EXPIRED');

    const written = await f.begin('written');
    await f.upload.write(f.actor, written.uploadId, (async function* () { yield bytes; })());
    const objectKey = await f.objectKey(written.reference.key);
    await f.catalog.validateSchema();
    expect(missing.reference.key).not.toBe(written.reference.key);
    const before = await f.driver.query('SELECT key, object_key FROM teaql_blob_catalog WHERE key IN (?, ?)',
      [missing.reference.key, written.reference.key]);
    expect(before.rows).toHaveLength(2);
    expect(before.rows[0].object_key).not.toBe(before.rows[1].object_key);
    const duplicate = await f.driver.query('UPDATE teaql_blob_catalog SET object_key = ? WHERE key = ?',
      [objectKey.value, missing.reference.key]).then(result => result, () => undefined);
    if (duplicate) {
      const after = await f.driver.query('SELECT key, object_key FROM teaql_blob_catalog WHERE key IN (?, ?)',
        [missing.reference.key, written.reference.key]);
      throw new Error(`catalog unique key update succeeded: changed=${duplicate.rowCount}, ` +
        `rows=${after.rows.length}, equal=${after.rows[0]?.object_key === after.rows[1]?.object_key}`);
    }
    f.clock = written.expiresAt.getTime();
    const deleted = await f.maintenance.runBatch(f.actor);
    expect(deleted.outcomes).toMatchObject([{ status: 'deleted' }]);
    expect((await f.status(written.reference.key)).status).toBe('deleted');
    expect(f.provider.objects.has(objectKey.value)).toBe(false);
    expect(f.provider.blindDeletes).toBe(0);

    const completed = await f.begin('completed');
    await f.upload.write(f.actor, completed.uploadId, (async function* () { yield bytes; })());
    await f.upload.complete(f.actor, completed.uploadId);
    f.clock = completed.expiresAt.getTime();
    expect((await f.maintenance.runBatch(f.actor)).outcomes).toHaveLength(0);
    expect((await f.status(completed.reference.key)).status).toBe('uploaded_unbound');
    expect(f.provider.blindDeletes).toBe(0);
    await f.driver.query('DROP INDEX teaql_blob_catalog_object_key');
    await expect(f.maintenance.runBatch(f.actor)).rejects.toThrow('BLOB_SCHEMA_MISSING');
  } finally { await f.close(); }
});

test('expired direct upload rows stay untouched until quiescence is proven', async () => {
  const f = await fixture();
  try {
    for (const [name, state, status] of [
      ['direct-initiated', 'initiated', 'initiated'],
      ['direct-written', 'written', 'initiated'],
      ['direct-deleting', 'initiated', 'deleting'],
    ] as const) {
      const upload = await f.begin(name);
      const key = await f.objectKey(upload.reference.key);
      f.provider.replace(key, bytes);
      await f.driver.query('UPDATE teaql_blob_catalog SET upload_mode = ?, status = ? WHERE key = ?',
        ['direct', status, upload.reference.key]);
      await f.driver.query('UPDATE teaql_blob_upload SET state = ? WHERE key = ?',
        [state, upload.reference.key]);
    }
    f.clock += 1_001_000;
    expect(await f.catalog.deletionCandidates('tenant-a', '', f.clock, 100)).toEqual([]);
    expect(await f.catalog.expiredUploadDeletionCandidates('tenant-a', '', f.clock, 100)).toEqual([]);
    const result = await f.maintenance.runBatch(f.actor);
    expect(result.outcomes).toEqual([]);
    expect(f.provider.objects.size).toBe(3);
    expect(f.provider.conditionalDeletes).toBe(0);
  } finally { await f.close(); }
});

test('a failed catalog acknowledgement resumes without deleting a newer generation', async () => {
  const f = await fixture();
  try {
    const uploaded = await f.begin('crash-recovery');
    await f.upload.write(f.actor, uploaded.uploadId, (async function* () { yield bytes; })());
    const key = await f.objectKey(uploaded.reference.key);
    f.clock = uploaded.expiresAt.getTime();
    await f.driver.query(`CREATE TRIGGER reject_deletion BEFORE UPDATE OF status ON teaql_blob_catalog
      WHEN NEW.status = 'deleted' BEGIN SELECT RAISE(ABORT, 'private trigger'); END`);
    const failed = await f.maintenance.runBatch(f.actor);
    expect(failed.outcomes).toMatchObject([{ status: 'failed', error: 'BLOB_CATALOG_FAILED' }]);
    expect((await f.status(uploaded.reference.key)).status).toBe('deleting');
    expect(f.provider.objects.has(key.value)).toBe(false);
    await f.driver.query('DROP TRIGGER reject_deletion');
    expect((await f.maintenance.runBatch(f.actor)).outcomes).toMatchObject([{ status: 'already_missing' }]);
    expect((await f.status(uploaded.reference.key)).status).toBe('deleted');

    const stale = await f.begin('stale-generation');
    await f.upload.write(f.actor, stale.uploadId, (async function* () { yield bytes; })());
    const staleKey = await f.objectKey(stale.reference.key);
    f.clock = stale.expiresAt.getTime();
    f.provider.beforeConditionalDelete = keyToReplace => {
      f.provider.beforeConditionalDelete = undefined;
      f.provider.replace(keyToReplace, Buffer.from('new content'));
    };
    expect((await f.maintenance.runBatch(f.actor)).outcomes).toMatchObject([
      { status: 'version_conflict', error: 'BLOB_IDEMPOTENCY_CONFLICT' },
    ]);
    expect((await f.status(stale.reference.key)).status).toBe('deleting');
    expect(f.provider.objects.get(staleKey.value)?.bytes.toString()).toBe('new content');
    expect((await f.maintenance.runBatch(f.actor)).outcomes).toMatchObject([
      { status: 'version_conflict' },
    ]);
    expect(f.provider.blindDeletes).toBe(0);
  } finally { await f.close(); }
});

test('real SQLite and fenced File recover failed receipt and partial deletion', async () => {
  const f = await fixture();
  const fileRoot = join(f.root, 'fenced-files');
  const file = new SqliteFencedFileObjectStorage(fileRoot, randomBytes(32));
  const actor = new UserContext().withObjectStorage(file).withObjectStorageObserver(() => {});
  const store = actor.objectStorage('real File maintenance');
  const maintenance = new SqliteBlobMaintenanceService(f.catalog,
    { scope: () => 'tenant-a', canMaintain: () => true }, 100, () => f.clock);
  const put = async (key: ObjectKey, mode: 'create_only' | 'replace') =>
    store.putBytes(key, bytes, new ObjectPutOptions(bytes.length, mode, 'application/pdf'));
  try {
    const pending = await f.begin('file-receipt-failure');
    const key = await f.objectKey(pending.reference.key);
    await put(key, 'create_only');
    f.clock = pending.expiresAt.getTime();
    await f.driver.query(`CREATE TRIGGER reject_file_receipt BEFORE UPDATE OF status ON teaql_blob_catalog
      WHEN NEW.status = 'deleted' BEGIN SELECT RAISE(ABORT, 'private trigger'); END`);
    expect((await maintenance.runBatch(actor)).outcomes).toMatchObject([
      { status: 'failed', error: 'BLOB_CATALOG_FAILED' },
    ]);
    expect(await store.head(key)).toBeUndefined();
    await f.driver.query('DROP TRIGGER reject_file_receipt');
    expect((await maintenance.runBatch(actor)).outcomes).toMatchObject([
      { status: 'already_missing' },
    ]);

    const stale = await f.begin('file-stale-version');
    const staleKey = await f.objectKey(stale.reference.key);
    const old = await put(staleKey, 'create_only');
    await f.driver.query('UPDATE teaql_blob_catalog SET content_version = ? WHERE key = ?',
      [old.etag, stale.reference.key]);
    await f.driver.query("UPDATE teaql_blob_upload SET state = 'written', written_etag = ? WHERE key = ?",
      [old.etag, stale.reference.key]);
    const newer = await put(staleKey, 'replace');
    f.clock = stale.expiresAt.getTime();
    expect((await maintenance.runBatch(actor)).outcomes).toMatchObject([
      { status: 'version_conflict' },
    ]);
    expect((await store.head(staleKey))?.etag).toBe(newer.etag);

    const partial = await f.begin('file-partial-removal');
    const partialKey = await f.objectKey(partial.reference.key);
    const written = await put(partialKey, 'create_only');
    await f.driver.query('UPDATE teaql_blob_catalog SET content_version = ? WHERE key = ?',
      [written.etag, partial.reference.key]);
    await f.driver.query("UPDATE teaql_blob_upload SET state = 'written', written_etag = ? WHERE key = ?",
      [written.etag, partial.reference.key]);
    const hash = createHash('sha256').update(partialKey.value).digest('hex');
    await unlink(join(fileRoot, hash.slice(0, 2), hash, `data-${written.etag!.split('.')[1]}`));
    f.clock = partial.expiresAt.getTime();
    const recovered = await maintenance.runBatch(actor);
    expect(recovered.outcomes).toContainEqual(expect.objectContaining({ status: 'deleted' }));
    expect(await store.head(partialKey)).toBeUndefined();
  } finally { await f.close(); }
});

test('real fenced File collects policy-backed completed and formerly bound Blobs at their deadlines', async () => {
  const f = await fixture(new BlobRetentionPolicy('default', 'server_stream', 10, 20));
  const file = new SqliteFencedFileObjectStorage(join(f.root, 'retained-files'), randomBytes(32));
  const actor = new UserContext().withObjectStorage(file).withObjectStorageObserver(() => {});
  const store = actor.objectStorage('retention maintenance test');
  const maintenance = new SqliteBlobMaintenanceService(f.catalog,
    { scope: () => 'tenant-a', canMaintain: () => true }, 100, () => f.clock);
  const started = f.clock;
  const completed = async (replay: string) => {
    const upload = await f.upload.begin(actor, target,
      { fileName: 'report.pdf', declaredSize: bytes.length }, replay);
    await f.upload.write(actor, upload.uploadId, (async function* () { yield bytes; })());
    await f.upload.complete(actor, upload.uploadId);
    return { reference: upload.reference, key: await f.objectKey(upload.reference.key) };
  };
  try {
    const unbound = await completed('retained-unbound');
    const formerlyBound = await completed('retained-formerly-bound');
    const bound = await completed('retained-active');
    const legacy = await completed('retained-legacy');
    const direct = await completed('retained-direct');
    await f.driver.query(`UPDATE teaql_blob_catalog SET status = 'available',
      last_unbound_at_ms = ?, effective_unref_seconds = 20,
      retention_floor_until_ms = ? WHERE key = ?`,
    [started, started + 30_000, formerlyBound.reference.key]);
    await f.driver.query(`UPDATE teaql_blob_catalog SET status = 'available',
      last_unbound_at_ms = ? WHERE key = ?`, [started, bound.reference.key]);
    await f.driver.query(`INSERT INTO teaql_blob_binding
      (scope,entity,entity_id,field,key,version) VALUES (?,?,?,?,?,?)`,
    ['tenant-a', 'Asset', 'active', 'document', bound.reference.key, 1]);
    await f.driver.query(`UPDATE teaql_blob_catalog SET policy_profile = NULL,
      upload_mode = NULL, unbound_retention_seconds = NULL, effective_unref_seconds = NULL
      WHERE key = ?`, [legacy.reference.key]);
    await f.driver.query(`UPDATE teaql_blob_catalog SET upload_mode = 'direct' WHERE key = ?`,
      [direct.reference.key]);

    f.clock = started + 9_999;
    expect((await maintenance.runBatch(actor)).outcomes).toHaveLength(0);
    expect(await store.head(unbound.key)).toBeDefined();
    f.clock = started + 10_000;
    expect(await f.catalog.expiredUploadDeletionCandidates('tenant-a', '', f.clock, 100))
      .toHaveLength(0);
    expect(await f.catalog.claimExpiredUploadDeletion('tenant-a', unbound.reference.key, f.clock))
      .toBeUndefined();
    const first = await maintenance.runBatch(actor);
    expect(first.outcomes).toMatchObject([{ reference: unbound.reference, status: 'deleted' }]);
    expect(await store.head(unbound.key)).toBeUndefined();
    expect(await store.head(formerlyBound.key)).toBeDefined();

    f.clock = started + 30_000;
    const candidates = await f.catalog.deletionCandidates('tenant-a', '', f.clock, 100);
    expect(candidates).toContain(formerlyBound.reference.key);
    const race = await completed('retained-candidate-bind-race');
    f.clock = started + 40_000;
    expect(await f.catalog.deletionCandidates('tenant-a', '', f.clock, 100))
      .toContain(race.reference.key);
    await f.driver.query(`INSERT INTO teaql_blob_binding
      (scope,entity,entity_id,field,key,version) VALUES (?,?,?,?,?,?)`,
    ['tenant-a', 'Asset', 'raced', 'document', race.reference.key, 1]);
    expect(await f.catalog.claimDeletion('tenant-a', race.reference.key, f.clock)).toBeUndefined();
    const second = await maintenance.runBatch(actor);
    expect(second.outcomes).toMatchObject([
      { reference: formerlyBound.reference, status: 'deleted' },
    ]);
    for (const protectedBlob of [bound, legacy, direct, race]) {
      expect(await store.head(protectedBlob.key)).toBeDefined();
    }
    expect((await f.driver.query(`SELECT status FROM teaql_blob_catalog WHERE key = ?`,
      [race.reference.key])).rows[0].status).toBe('uploaded_unbound');
  } finally { await f.close(); }
});

test('completed File collection retries a failed receipt and fences a replacement generation', async () => {
  const f = await fixture(new BlobRetentionPolicy('default', 'server_stream', 1, 2));
  const file = new SqliteFencedFileObjectStorage(join(f.root, 'completed-retry'), randomBytes(32));
  const actor = new UserContext().withObjectStorage(file).withObjectStorageObserver(() => {});
  const store = actor.objectStorage('completed retry test');
  const maintenance = new SqliteBlobMaintenanceService(f.catalog,
    { scope: () => 'tenant-a', canMaintain: () => true }, 100, () => f.clock);
  const upload = async (replay: string) => {
    const begun = await f.upload.begin(actor, target,
      { fileName: 'report.pdf', declaredSize: bytes.length }, replay);
    await f.upload.write(actor, begun.uploadId, (async function* () { yield bytes; })());
    await f.upload.complete(actor, begun.uploadId);
    return { reference: begun.reference, key: await f.objectKey(begun.reference.key) };
  };
  try {
    const failedReceipt = await upload('completed-failed-receipt');
    const replaced = await upload('completed-replaced-generation');
    const newer = await store.putBytes(replaced.key, bytes,
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf'));
    f.clock += 1000;
    await f.driver.query(`CREATE TRIGGER reject_completed_receipt
      BEFORE UPDATE OF status ON teaql_blob_catalog
      WHEN NEW.status = 'deleted' BEGIN SELECT RAISE(ABORT, 'private trigger'); END`);
    const first = await maintenance.runBatch(actor);
    expect(first.outcomes).toContainEqual(expect.objectContaining({
      reference: failedReceipt.reference, status: 'failed', error: 'BLOB_CATALOG_FAILED',
    }));
    expect(first.outcomes).toContainEqual(expect.objectContaining({
      reference: replaced.reference, status: 'version_conflict',
    }));
    expect(await store.head(failedReceipt.key)).toBeUndefined();
    expect((await store.head(replaced.key))?.etag).toBe(newer.etag);
    await f.driver.query('DROP TRIGGER reject_completed_receipt');
    const retry = await maintenance.runBatch(actor);
    expect(retry.outcomes).toContainEqual(expect.objectContaining({
      reference: failedReceipt.reference, status: 'already_missing',
    }));
    expect(retry.outcomes).toContainEqual(expect.objectContaining({
      reference: replaced.reference, status: 'version_conflict',
    }));
    expect((await f.status(failedReceipt.reference.key)).status).toBe('deleted');
    expect((await f.status(replaced.reference.key)).status).toBe('deleting');
    expect((await store.head(replaced.key))?.etag).toBe(newer.etag);
  } finally { await f.close(); }
});

test('a committed deleting claim fences a late upload write before object I/O', async () => {
  const f = await fixture();
  try {
    const pending = await f.begin('claim-race');
    const expires = pending.expiresAt.getTime();
    f.clock = expires;
    let entered!: () => void, release!: () => void;
    const atHead = new Promise<void>(resolve => { entered = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    f.provider.beforeHead = async () => { entered(); await resume; };
    const collecting = f.maintenance.runBatch(f.actor);
    await atHead;
    expect((await f.status(pending.reference.key)).status).toBe('deleting');
    f.clock = expires - 1;
    await expect(f.upload.write(f.actor, pending.uploadId,
      (async function* () { yield bytes; })())).rejects.toThrow('BLOB_IDEMPOTENCY_CONFLICT');
    expect(f.provider.objects.has((await f.objectKey(pending.reference.key)).value)).toBe(false);
    f.clock = expires;
    release();
    expect((await collecting).outcomes).toMatchObject([{ status: 'already_missing' }]);
    expect((await f.status(pending.reference.key)).status).toBe('deleted');
  } finally { await f.close(); }
});

test('maintenance cursors keep bounded batches within the current scope', async () => {
  const f = await fixture();
  try {
    const one = await f.begin('cursor-one');
    const two = await f.begin('cursor-two');
    f.clock = two.expiresAt.getTime();
    const bounded = new SqliteBlobMaintenanceService(f.catalog,
      { scope: () => f.scope, canMaintain: async () => true }, 1, () => f.clock);
    const first = await bounded.runBatch(f.actor);
    expect(first.outcomes).toHaveLength(1);
    expect(first.next?.toString()).toBe('BlobMaintenanceCursor[masked]');
    const second = await bounded.runBatch(f.actor, first.next);
    expect(second.outcomes).toHaveLength(1);
    expect(new Set([first.outcomes[0].reference.key, second.outcomes[0].reference.key]))
      .toEqual(new Set([one.reference.key, two.reference.key]));
    f.scope = 'tenant-b';
    await expect(bounded.runBatch(f.actor, first.next)).rejects.toThrow('BLOB_MAINTENANCE_DENIED');
  } finally { await f.close(); }
});
