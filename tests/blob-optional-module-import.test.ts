test('Blob module can be imported before the optional SQLite adapter is installed', () => {
  jest.isolateModules(() => {
    jest.mock('../src/sql/sqlite', () => {
      throw new Error('eager SQLite adapter import');
    });
    const { BlobReferenceModule } = require('../src/blob-reference/module');
    const { SqliteBlobFileGenerationSweepService } = require('../src/blob-reference/file-generation-maintenance');
    expect(typeof BlobReferenceModule).toBe('function');
    expect(typeof SqliteBlobFileGenerationSweepService).toBe('function');
  });
});
