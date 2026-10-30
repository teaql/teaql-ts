import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobReferenceModule } from '../src/blob-reference/module';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { SqliteBlobUploadService } from '../src/blob-reference/upload-service';
import { SqliteBlobMutationParticipant } from '../src/blob-reference/mutation-participant';
import { SqlBlobResponseContributor } from '../src/blob-reference/read-service';
import { SqliteBlobMaintenanceService } from '../src/blob-reference/maintenance-service';
import { UserContext } from '../src/core/context';
import { FileObjectStorage } from '../src/object-storage/file';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

test('BlobReferenceModule installs passively and checks explicit schema readiness', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-module-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const client = new SQLiteTeaQLClient(join(root, 'catalog.sqlite'), {});
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
  const maintenance = new SqliteBlobMaintenanceService(catalog,
    { scope: () => 'tenant-a', canMaintain: async () => false });
  const module = new BlobReferenceModule(catalog, upload, mutation, response, maintenance);
  const context = new UserContext().insertResource('dataService', client);
  client.setUserContext(context);
  try {
    module.install(context);
    expect(context.getResource('blobUploadService')).toBe(upload);
    expect(context.getResource('blobMutationParticipant')).toBe(mutation);
    expect(context.getResource('blobMaintenanceService')).toBe(maintenance);
    await expect(module.ready(context)).rejects.toThrow('BLOB_CAPABILITY_MISSING');
    context.withObjectStorage(new FileObjectStorage(join(root, 'objects'), randomBytes(32)));
    await expect(module.ready(context)).rejects.toThrow('BLOB_SCHEMA_MISSING');
    await catalog.ensureSchema();
    await expect(module.ready(context)).resolves.toBeUndefined();
    expect(verifierReady).toHaveBeenCalledTimes(1);
    expect(() => module.install(context)).toThrow('BLOB_CAPABILITY_MISSING');
  } finally {
    await client.close();
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['upload', 'mutation', 'response', 'maintenance'] as const)(
  'BlobReferenceModule rejects a %s service connected to another catalog', async component => {
    const root = await mkdtemp(join(tmpdir(), 'teaql-blob-module-mismatch-'));
    const firstDriver = new SQLiteDriver(join(root, 'first.sqlite'));
    const secondDriver = new SQLiteDriver(join(root, 'second.sqlite'));
    const first = new SqlBlobCatalog(firstDriver), second = new SqlBlobCatalog(secondDriver);
    const selected = (name: string) => component === name ? second : first;
    const verifierReady = jest.fn(async () => {});
    try {
      const upload = new SqliteBlobUploadService(selected('upload'), {
        scope: () => 'tenant-a', field: () => { throw new Error('not used'); },
        authorize: async () => false,
        currentOnLease: async () => { throw new Error('not used'); },
      }, { verify: async () => { throw new Error('not used'); }, validateReady: verifierReady }, 1000);
      const mutation = new SqliteBlobMutationParticipant(selected('mutation'), {
        scope: () => 'tenant-a', authorize: async () => false,
      });
      const response = new SqlBlobResponseContributor(selected('response'), { authorize: async () => false });
      const maintenance = new SqliteBlobMaintenanceService(selected('maintenance'),
        { scope: () => 'tenant-a', canMaintain: async () => false });
      expect(() => new BlobReferenceModule(first, upload, mutation, response, maintenance))
        .toThrow('BLOB_CAPABILITY_MISSING');
      expect(verifierReady).not.toHaveBeenCalled();
      for (const driver of [firstDriver, secondDriver]) {
        expect((await driver.query("SELECT name FROM sqlite_master WHERE name LIKE 'teaql_blob_%'")).rows)
          .toEqual([]);
      }
    } finally {
      await firstDriver.close();
      await secondDriver.close();
      await rm(root, { recursive: true, force: true });
    }
  });

test('BlobReferenceModule permits catalog wrappers sharing the same physical driver', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-blob-module-alias-'));
  const driver = new SQLiteDriver(join(root, 'catalog.sqlite'));
  const client = new SQLiteTeaQLClient(join(root, 'catalog.sqlite'), {});
  const catalog = new SqlBlobCatalog(driver), alias = new SqlBlobCatalog(driver);
  const upload = new SqliteBlobUploadService(alias, {
    scope: () => 'tenant-a', field: () => { throw new Error('not used'); },
    authorize: async () => false,
    currentOnLease: async () => { throw new Error('not used'); },
  }, { verify: async () => { throw new Error('not used'); } }, 1000);
  const module = new BlobReferenceModule(catalog, upload,
    new SqliteBlobMutationParticipant(alias, { scope: () => 'tenant-a', authorize: async () => false }),
    new SqlBlobResponseContributor(alias, { authorize: async () => false }),
    new SqliteBlobMaintenanceService(alias, { scope: () => 'tenant-a', canMaintain: async () => false }));
  const context = new UserContext().withObjectStorage(new FileObjectStorage(join(root, 'objects'), randomBytes(32)))
    .insertResource('dataService', client);
  client.setUserContext(context);
  try {
    module.install(context);
    await catalog.ensureSchema();
    await expect(module.ready(context)).resolves.toBeUndefined();
  } finally {
    await client.close();
    await driver.close();
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['missing-owner', 'other-file', 'separate-memory'] as const)(
  'BlobReferenceModule readiness rejects %s before verifier activation', async mismatch => {
    const root = await mkdtemp(join(tmpdir(), 'teaql-blob-module-owner-'));
    const driver = new SQLiteDriver(mismatch === 'separate-memory' ? ':memory:' : join(root, 'catalog.sqlite'));
    const client = mismatch === 'missing-owner' ? undefined :
      new SQLiteTeaQLClient(mismatch === 'separate-memory' ? ':memory:' : join(root, 'other.sqlite'), {});
    const catalog = new SqlBlobCatalog(driver);
    const verifierReady = jest.fn(async () => {});
    const upload = new SqliteBlobUploadService(catalog, {
      scope: () => 'tenant-a', field: () => { throw new Error('not used'); },
      authorize: async () => false,
      currentOnLease: async () => { throw new Error('not used'); },
    }, { verify: async () => { throw new Error('not used'); }, validateReady: verifierReady }, 1000);
    const module = new BlobReferenceModule(catalog, upload,
      new SqliteBlobMutationParticipant(catalog, { scope: () => 'tenant-a', authorize: async () => false }),
      new SqlBlobResponseContributor(catalog, { authorize: async () => false }));
    const context = new UserContext().withObjectStorage(new FileObjectStorage(join(root, 'objects'), randomBytes(32)));
    if (client) { context.insertResource('dataService', client); client.setUserContext(context); }
    try {
      module.install(context);
      await catalog.ensureSchema();
      await expect(module.ready(context)).rejects.toThrow('BLOB_CAPABILITY_MISSING');
      expect(verifierReady).not.toHaveBeenCalled();
    } finally {
      await client?.close();
      await driver.close();
      await rm(root, { recursive: true, force: true });
    }
  });

test.each(['foreign-module', 'synthetic-capability'] as const)(
  'BlobReferenceModule readiness rejects %s before activating another installation', async scenario => {
    const root = await mkdtemp(join(tmpdir(), 'teaql-blob-module-identity-'));
    const filename = join(root, 'catalog.sqlite');
    const driver = new SQLiteDriver(filename), client = new SQLiteTeaQLClient(filename, {});
    const catalog = new SqlBlobCatalog(driver);
    const verifierReady = jest.fn(async () => {});
    const upload = new SqliteBlobUploadService(catalog, {
      scope: () => 'tenant-a', field: () => { throw new Error('not used'); },
      authorize: async () => false,
      currentOnLease: async () => { throw new Error('not used'); },
    }, { verify: async () => { throw new Error('not used'); }, validateReady: verifierReady }, 1000);
    const assemble = () => new BlobReferenceModule(catalog, upload,
      new SqliteBlobMutationParticipant(catalog, { scope: () => 'tenant-a', authorize: async () => false }),
      new SqlBlobResponseContributor(catalog, { authorize: async () => false }));
    const module = assemble(), foreign = assemble();
    const context = new UserContext().withObjectStorage(new FileObjectStorage(join(root, 'objects'), randomBytes(32)))
      .insertResource('dataService', client);
    client.setUserContext(context);
    try {
      module.install(context);
      await catalog.ensureSchema();
      const capability = context.getResource('teaql.runtime.capability:blob.v1');
      if (scenario === 'synthetic-capability')
        context.insertResource('teaql.runtime.capability:blob.v1', { name: 'blob.v1', assertReady: () => {} });
      await expect((scenario === 'foreign-module' ? foreign : module).ready(context))
        .rejects.toThrow('BLOB_CAPABILITY_MISSING');
      expect(verifierReady).not.toHaveBeenCalled();
      context.insertResource('teaql.runtime.capability:blob.v1', capability);
      await module.ready(context);
      expect(verifierReady).toHaveBeenCalledTimes(1);
    } finally {
      await client.close();
      await driver.close();
      await rm(root, { recursive: true, force: true });
    }
  });
