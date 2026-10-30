import { BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import {
  ObjectContent, ObjectKey, ObjectMetadata, ObjectPutOptions,
  ObjectReadUrl, ObjectReadUrlOptions, ObjectStorageProvider, StorageInvocation,
} from '../src/core/object-storage';
import { ViewPreparationService } from '../src/core/view-preparation';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { SqlBlobResponseContributor } from '../src/blob-reference/read-service';
import { SQLiteDriver } from '../src/sql/sqlite';

class ReadStore implements ObjectStorageProvider {
  seenKey?: string;
  async put(_invocation: StorageInvocation, _key: ObjectKey,
            _content: AsyncIterable<Uint8Array>, _options: ObjectPutOptions): Promise<ObjectMetadata> {
    throw new Error('not used');
  }
  async get(): Promise<ObjectContent> { throw new Error('not used'); }
  async head(): Promise<ObjectMetadata | undefined> { throw new Error('not used'); }
  async delete(): Promise<void> { throw new Error('not used'); }
  async getReadUrl(_invocation: StorageInvocation, key: ObjectKey,
                   options: ObjectReadUrlOptions): Promise<ObjectReadUrl> {
    this.seenKey = key.value;
    expect(options.contentDisposition).toContain('asset.pdf');
    return new ObjectReadUrl('https://files.example.invalid/read/asset',
      new Date(Date.now() + options.seconds * 1000));
  }
}

test('current SQLite catalog binding gates detached Blob URL projection', async () => {
  const driver = new SQLiteDriver(':memory:');
  const catalog = new SqlBlobCatalog(driver);
  const store = new ReadStore();
  const reference = new BlobRef('blob_asset_1');
  try {
    await expect(catalog.validateSchema()).rejects.toThrow('BLOB_SCHEMA_MISSING');
    await catalog.ensureSchema();
    await catalog.validateSchema();
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key,scope,object_key,content_version,file_name,content_type,size_bytes,status)
      VALUES (?,?,?,?,?,?,?,?)`, [reference.key, 'tenant-a', 'objects/asset-1', 'etag-1',
        'asset.pdf', 'application/pdf', 123, 'available']);
    await driver.query(`INSERT INTO teaql_blob_binding
      (scope,entity,entity_id,field,key,version) VALUES (?,?,?,?,?,?)`,
    ['tenant-a', 'Asset', '1', 'document', reference.key, 4]);

    let permitted = true;
    let version = 4;
    const context = new UserContext().withObjectStorage(store)
      .insertResource('responseGraphAuthorizer', { authorize: async () => ({
        presentation: { document: reference },
        blobSlots: [{ path: ['document'], entity: 'Asset', entityId: '1', field: 'document',
          scope: 'tenant-a', bindingVersion: version, reference }],
      }) })
      .insertResource('blobResponseContributor', new SqlBlobResponseContributor(catalog, {
        authorize: async () => permitted,
      }));
    const service = new ViewPreparationService();
    const prepared = await service.prepare(context, { document: reference },
      { mode: 'ordinary', businessOutcome: 'read_only' });
    expect(prepared.presentation).toEqual({ document: 'https://files.example.invalid/read/asset' });
    expect(store.seenKey).toBe('objects/asset-1');

    permitted = false;
    await expect(service.prepare(context, { document: reference },
      { mode: 'ordinary', businessOutcome: 'read_only' }))
      .rejects.toMatchObject({ code: 'BLOB_READ_DENIED' });
    permitted = true;
    version = 3;
    await expect(service.prepare(context, { document: reference },
      { mode: 'ordinary', businessOutcome: 'committed' }))
      .rejects.toMatchObject({ code: 'BLOB_READ_DENIED', businessState: 'committed' });
  } finally { await driver.close(); }
});
