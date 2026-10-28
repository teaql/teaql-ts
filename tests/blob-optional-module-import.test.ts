test('Blob module can be imported before the optional SQLite adapter is installed', () => {
  jest.isolateModules(() => {
    jest.mock('../src/sql/sqlite', () => {
      throw new Error('eager SQLite adapter import');
    });
    const { BlobReferenceModule } = require('../src/blob-reference/module');
    const { SqlBlobCatalog } = require('../src/blob-reference/sql-catalog');
    const { SqliteBlobMaintenanceService } = require('../src/blob-reference/maintenance-service');
    const { SqliteBlobFileGenerationSweepService } = require('../src/blob-reference/file-generation-maintenance');
    expect(typeof BlobReferenceModule).toBe('function');
    expect(typeof SqliteBlobFileGenerationSweepService).toBe('function');

    const ownerless = new SqlBlobCatalog({ databaseKind: 'sqlite' });
    const authorization = { scope: () => 'tenant-a', canMaintain: () => true };
    expect(() => new SqliteBlobMaintenanceService(ownerless, authorization))
      .toThrow('BLOB_POLICY_INVALID');
    expect(() => new SqliteBlobFileGenerationSweepService(ownerless, authorization, true))
      .toThrow('BLOB_POLICY_INVALID');
  });
});
