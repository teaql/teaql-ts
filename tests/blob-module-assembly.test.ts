import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobReferenceModule } from '../src/blob-reference/module';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { SqliteBlobMutationParticipant } from '../src/blob-reference/mutation-participant';
import { SqlBlobResponseContributor } from '../src/blob-reference/read-service';
import { UserContext } from '../src/core/context';
import { FileObjectStorage } from '../src/object-storage/file';
import { SQLiteDriver } from '../src/sql/sqlite';

test('BlobReferenceModule installs passively and checks explicit schema readiness', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-module-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const catalog = new SqlBlobCatalog(driver);
  const verifierReady = jest.fn(async () => {});
  const upload = new SqliteBlobUploadService(catalog, {
    scope: () => 'tenant-a', field: () => { throw new Error('not used'); },
    authorize: async () => false,
    currentOnLease: async () => { throw new Error('not used'); },
  }, { verify: async () => { throw new Error('not used'); }, validateReady: verifierReady }, 1000);
  const mutation = new SqliteBlobMutationParticipant(catalog, {
    scope: () => 'tenant-a', authorize: async () => false,
  });
  const response = new SqlBlobResponseContributor(catalog, { authorize: async () => false });
  const module = new BlobReferenceModule(catalog, upload, mutation, response);
  const context = new UserContext();
  try {
    module.install(context);
    expect(context.getResource('blobUploadService')).toBe(upload);
    expect(context.getResource('blobMutationParticipant')).toBe(mutation);
    await expect(module.ready(context)).rejects.toThrow('BLOB_CAPABILITY_MISSING');
    context.withObjectStorage(new FileObjectStorage(join(root, 'objects'), randomBytes(32)));
    await expect(module.ready(context)).rejects.toThrow('BLOB_SCHEMA_MISSING');
    await catalog.ensureSchema();
    await expect(module.ready(context)).resolves.toBeUndefined();
    expect(verifierReady).toHaveBeenCalledTimes(1);
    expect(() => module.install(context)).toThrow('BLOB_CAPABILITY_MISSING');
  } finally {
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});
