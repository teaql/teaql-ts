import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { ObjectKey, ObjectPutOptions } from '../src/core/object-storage';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobMaintenanceCursor } from '../src/blob-reference/maintenance-service';
import { SqliteBlobFileGenerationSweepService } from '../src/blob-reference/file-generation-maintenance';
import { BlobRetentionPolicy } from '../src/blob-reference/retention';
import { SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { FileObjectStorage, SqliteFencedFileObjectStorage } from '../src/object-storage/file';
import { SQLiteDriver } from '../src/sql/sqlite';

const bytes = Buffer.from('%PDF-1.7\nfile generation sweep\n%%EOF');
const source = () => (async function* () { yield bytes; })();

class FailOnceFileStorage extends SqliteFencedFileObjectStorage {
  failNextSweep = false;
  override async sweepOldGenerations(key: ObjectKey): Promise<number> {
    if (this.failNextSweep) { this.failNextSweep = false; throw new Error('transient File failure'); }
    return super.sweepOldGenerations(key);
  }
}

test('catalog-scoped File sweep covers deleted rows, preserves current versions and pages safely', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-file-catalog-sweep-'));
  const fileRoot = join(root, 'objects');
  await mkdir(fileRoot, { mode: 0o700 });
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const provider = new FailOnceFileStorage(fileRoot, randomBytes(32));
  const actor = new UserContext().withObjectStorage(provider).withObjectStorageObserver(() => {});
  const store = actor.objectStorage('catalog generation sweep test');
  let scope = 'tenant-a', allowed = true;
  const field = () => new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default');
  const upload = new SqliteBlobUploadService(catalog, {
    scope: () => scope, field, authorize: async () => true,
    currentOnLease: async () => ({ scope, field: field(), allowed: true,
      policy: new BlobRetentionPolicy('default', 'server_stream', 86400, 604800) }),
  }, { verify: async input => {
    const parts: Buffer[] = [];
    for await (const chunk of input) parts.push(Buffer.from(chunk));
    const content = Buffer.concat(parts);
    return { sizeBytes: content.length, sha256: createHash('sha256').update(content).digest('hex'),
      contentType: 'application/pdf' };
  } }, 1000);
  const sweep = new SqliteBlobFileGenerationSweepService(catalog, {
    scope: () => scope, canMaintain: () => allowed,
  }, true, 1);
  const begin = async (name: string) => {
    const session = await upload.begin(actor,
      { entity: 'Asset', entityId: null, field: 'document' },
      { fileName: 'report.pdf', declaredSize: bytes.length }, name);
    await upload.write(actor, session.uploadId, source());
    await upload.complete(actor, session.uploadId);
    const rows = await driver.query('SELECT object_key FROM teaql_blob_catalog WHERE key = ?',
      [session.reference.key]);
    return { reference: session.reference, objectKey: new ObjectKey(String(rows.rows[0].object_key)) };
  };
  try {
    await catalog.ensureSchema();
    const deleted = await begin('first');
    const live = await begin('second');
    const replacement = Buffer.from('current replacement generation');
    const deletedCurrent = await store.putBytes(deleted.objectKey, replacement,
      new ObjectPutOptions(replacement.length, 'replace', 'text/plain'));
    await store.putBytes(live.objectKey, replacement,
      new ObjectPutOptions(replacement.length, 'replace', 'text/plain'));
    expect(await store.deleteIfVersion(deleted.objectKey, deletedCurrent.etag!)).toBe('deleted');
    // A terminal catalog row remains after collection; its old immutable File
    // generation still needs a later, separately authorized sweep.
    await driver.query("UPDATE teaql_blob_catalog SET status = 'deleted' WHERE key = ?",
      [deleted.reference.key]);
    scope = 'tenant-b';
    const other = await begin('other-tenant');
    scope = 'tenant-a';
    expect(() => new SqliteBlobFileGenerationSweepService(catalog,
      { scope: () => scope, canMaintain: () => true }, false)).toThrow('BLOB_POLICY_INVALID');
    allowed = false;
    await expect(sweep.runBatch(actor, provider)).rejects.toThrow('BLOB_MAINTENANCE_DENIED');
    allowed = true;
    await expect(sweep.runBatch(actor, provider, BlobMaintenanceCursor.next('tenant-b', '')))
      .rejects.toThrow('BLOB_MAINTENANCE_DENIED');
    await expect(driver.transaction(async () => sweep.runBatch(actor, provider)))
      .rejects.toThrow('BLOB_TRANSACTION_REQUIRED');
    const wrong = new SqliteFencedFileObjectStorage(fileRoot, randomBytes(32));
    await expect(sweep.runBatch(actor, wrong)).rejects.toThrow('BLOB_CAPABILITY_MISSING');
    await expect(sweep.runBatch(actor, new FileObjectStorage(fileRoot, randomBytes(32)) as any))
      .rejects.toThrow('BLOB_CAPABILITY_MISSING');

    provider.failNextSweep = true;
    expect((await sweep.runBatch(actor, provider)).outcomes).toMatchObject([
      { status: 'failed', error: 'BLOB_STORE_FAILED' },
    ]);

    const seen = [];
    let cursor: BlobMaintenanceCursor | undefined;
    do {
      const batch = await sweep.runBatch(actor, provider, cursor);
      seen.push(...batch.outcomes);
      cursor = batch.next;
    } while (cursor);
    expect(seen).toHaveLength(2);
    expect(seen.map(outcome => outcome.status)).toEqual(['swept', 'swept']);
    expect(seen.map(outcome => outcome.removedGenerations)).toEqual([1, 1]);
    expect(await store.head(deleted.objectKey)).toBeUndefined();
    expect(Buffer.from(await store.getBytes(live.objectKey, 1000))).toEqual(replacement);
    expect(await provider.sweepOldGenerations(deleted.objectKey)).toBe(0);
    expect(await provider.sweepOldGenerations(live.objectKey)).toBe(0);
    expect(await store.head(other.objectKey)).toBeDefined();
    expect((await sweep.runBatch(actor, provider)).outcomes.every(outcome =>
      outcome.removedGenerations === 0)).toBe(true);
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});
