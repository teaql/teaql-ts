import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec, BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { EntityRoot } from '../src/core/entity-root';
import { MutationIntent } from '../src/core/request-intent';
import { installRuntimeCapability } from '../src/core/runtime-capability';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { SqliteBlobMutationParticipant } from '../src/blob-reference/mutation-participant';
import type { EntitySchema } from '../src/sql/core';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

const schema: EntitySchema = { table: 'asset', columns: {
  id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
  version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
  document: { columnName: 'document', logicalType: 'text', decode: 'string', nullable: true,
    blob: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default') },
  legacyDocument: { columnName: 'legacy_document', modelName: 'legacy_document',
    logicalType: 'text', decode: 'string', nullable: true,
    blob: new BlobFieldSpec('Asset', 'legacy_document', ['doc'], true, 'default') },
} };

test('native binding keeps canonical model field when the TS member differs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-native-blob-name-'));
  const filename = join(directory, 'runtime.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, { Asset: schema });
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext().insertResource('dataService', client);
  const reference = new BlobRef('blob_native_legacy');
  installRuntimeCapability(context, { name: 'blob.v1', assertReady: () => undefined });
  context.insertResource('blobMutationParticipant',
    new SqliteBlobMutationParticipant(catalog, {
      scope: () => 'tenant-a', authorize: async () => true,
    }));
  client.setUserContext(context);
  try {
    await catalog.ensureSchema();
    await context.ensureSchema();
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      reference.key, 'tenant-a', 'objects/legacy', 'v1', 'legacy.doc',
      'application/msword', 7, 'uploaded_unbound',
    ]);
    await client.executeGraphSave(new MutationIntent('create canonical Blob field'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Create',
        id: '1', payload: { legacyDocument: reference } })));
    expect((await driver.query('SELECT legacy_document FROM asset WHERE id = ?', ['1'])).rows[0])
      .toMatchObject({ legacy_document: reference.key });
    expect((await driver.query('SELECT field, key FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ field: 'legacy_document', key: reference.key });
    await client.executeGraphSave(new MutationIntent('clear canonical Blob field'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 1, payload: { legacy_document: null } })));
    expect((await driver.query('SELECT field, key FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ field: 'legacy_document', key: null });
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('allocated ledger key binds a Blob inside its outer graph and rolls back with the owner', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-native-blob-ledger-'));
  const filename = join(directory, 'runtime.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, { Asset: schema });
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext().insertResource('dataService', client);
  const reference = new BlobRef('blob_native_ledger');
  installRuntimeCapability(context, { name: 'blob.v1', assertReady: () => undefined });
  context.insertResource('blobMutationParticipant',
    new SqliteBlobMutationParticipant(catalog, {
      scope: () => 'tenant-a', authorize: async () => true,
    }));
  client.setUserContext(context);
  const provisional = { entity: 'Asset', id: -1 };
  const save = async (fail: boolean) => {
    const ledger = new EntityRoot();
    ledger.markAsNew(provisional);
    ledger.set(provisional, 'document', reference);
    return client.executeGraphSave(new MutationIntent('save outer ledger'), async graph => {
      const created = await client.executeMutation(graph.request({
        entity: 'Asset', action: 'Create', ledgerRoot: ledger, ledgerKey: provisional,
        payload: Object.freeze({ ...ledger.change(provisional) }),
      }));
      expect(created.id).toMatch(/^[1-9][0-9]*$/);
      ledger.rekey(provisional, { entity: 'Asset', id: created.id });
      expect(ledger.change({ entity: 'Asset', id: created.id }).document).toEqual(reference);
      await client.withGraphSqlSession(graph, async sql => {
        const bound = await sql.query('SELECT key FROM teaql_blob_binding WHERE entity_id = ?',
          [created.id]);
        expect(bound.rows[0].key).toBe(reference.key);
      });
      if (fail) throw new Error('outer owner rejected');
      return created.id;
    });
  };
  try {
    await catalog.ensureSchema();
    await context.ensureSchema();
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      reference.key, 'tenant-a', 'objects/ledger', 'v1', 'ledger.pdf',
      'application/pdf', 7, 'uploaded_unbound',
    ]);
    await expect(save(true)).rejects.toThrow('outer owner rejected');
    expect((await driver.query('SELECT id FROM asset')).rows).toHaveLength(0);
    expect((await driver.query('SELECT key FROM teaql_blob_binding')).rows).toHaveLength(0);
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [reference.key])).rows[0].status).toBe('uploaded_unbound');

    const id = await save(false);
    expect((await driver.query('SELECT document FROM asset WHERE id = ?', [id])).rows[0].document)
      .toBe(reference.key);
    expect((await driver.query('SELECT key FROM teaql_blob_binding WHERE entity_id = ?',
      [id])).rows[0].key).toBe(reference.key);
    expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
      [reference.key])).rows[0].status).toBe('available');
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('native create/update/delete automatically maintains SQLite binding in the same graph', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-native-blob-'));
  const filename = join(directory, 'runtime.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, { Asset: schema });
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext().insertResource('dataService', client);
  const reference = new BlobRef('blob_native_asset_1');
  let permitted = true;
  const authorization = {
    scope: () => 'tenant-a',
    authorize: async () => permitted,
  };
  installRuntimeCapability(context, { name: 'blob.v1', assertReady: () => undefined });
  context.insertResource('blobMutationParticipant',
    new SqliteBlobMutationParticipant(catalog, authorization));
  client.setUserContext(context);
  try {
    await catalog.ensureSchema();
    await context.ensureSchema();
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [reference.key, 'tenant-a', 'objects/native-1', 'v1', 'asset.pdf',
      'application/pdf', 7, 'available']);

    const created = await client.executeGraphSave(new MutationIntent('create native Blob asset'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Create', id: '1',
        payload: { document: reference } })));
    expect(created.version).toBe(1);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: reference.key, version: 1 });

    context.removeResource('blobMutationParticipant');
    await expect(client.executeGraphSave(new MutationIntent('missing native participant'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Create',
        id: '2', payload: { document: reference } }))))
      .rejects.toThrow('BLOB_CAPABILITY_MISSING');
    expect((await driver.query('SELECT id FROM asset WHERE id = ?', ['2'])).rowCount).toBe(0);
    context.insertResource('blobMutationParticipant',
      new SqliteBlobMutationParticipant(catalog, authorization));

    const foreign = new BlobRef('blob_other_scope');
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [foreign.key, 'tenant-b', 'objects/foreign', 'v1', 'foreign.pdf',
      'application/pdf', 7, 'available']);
    await expect(client.executeGraphSave(new MutationIntent('wrong-scope native bind'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 1, payload: { document: foreign } }))))
      .rejects.toThrow('BLOB_BIND_DENIED');
    expect((await driver.query('SELECT document, version FROM asset WHERE id = ?', ['1'])).rows[0])
      .toMatchObject({ document: reference.key, version: 1 });

    permitted = false;
    await expect(client.executeGraphSave(new MutationIntent('revoked native clear'), async graph => {
      await expect(client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 1, payload: { document: null } })))
        .rejects.toThrow('BLOB_BIND_DENIED');
    })).rejects.toThrow('GRAPH_TRANSACTION_ROLLBACK_ONLY');
    expect((await driver.query('SELECT document, version FROM asset WHERE id = ?', ['1'])).rows[0])
      .toMatchObject({ document: reference.key, version: 1 });
    permitted = true;

    const cleared = await client.executeGraphSave(new MutationIntent('clear native Blob asset'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 1, payload: { document: null } })));
    expect(cleared.version).toBe(2);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: null, version: 2 });

    const rebound = await client.executeGraphSave(new MutationIntent('rebind native Blob asset'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 2, payload: { document: reference } })));
    expect(rebound.version).toBe(3);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: reference.key, version: 3 });

    await driver.query('UPDATE teaql_blob_binding SET key = NULL WHERE entity_id = ?', ['1']);
    await expect(client.executeGraphSave(new MutationIntent('corrupt previous binding'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Delete',
        id: '1', version: 3, payload: {} }))))
      .rejects.toThrow('BLOB_BIND_DENIED');
    expect((await driver.query('SELECT version FROM asset WHERE id = ?', ['1'])).rows[0].version)
      .toBe(3);
    await driver.query('UPDATE teaql_blob_binding SET key = ? WHERE entity_id = ?',
      [reference.key, '1']);

    const deleted = await client.executeGraphSave(new MutationIntent('delete native Blob asset'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Delete',
        id: '1', version: 3, payload: {} })));
    expect(deleted.deleted).toBe(true);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: null, version: 4 });
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});
