import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobFieldSpec, BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { EntityRoot } from '../src/core/entity-root';
import { MutationIntent } from '../src/core/request-intent';
import { installRuntimeCapability } from '../src/core/runtime-capability';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobRetentionPolicy } from '../src/blob-reference/retention';
import { SqliteBlobMutationParticipant } from '../src/blob-reference/mutation-participant';
import type { EntitySchema } from '../src/sql/core';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

const currentPolicyOnLease = () => new BlobRetentionPolicy('default', 'server_stream', 3600, 3600);
async function markPolicyBacked(driver: SQLiteDriver, key: string): Promise<void> {
  const now = Date.now();
  await driver.query(`UPDATE teaql_blob_catalog SET completed_at_ms = ?,
    last_unbound_at_ms = CASE WHEN status = 'available' THEN ? ELSE NULL END,
    policy_profile = 'default', upload_mode = 'server_stream',
    unbound_retention_seconds = 3600, effective_unref_seconds = 3600 WHERE key = ?`,
  [now, now, key]);
}

const schema: EntitySchema = { table: 'asset', columns: {
  id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
  version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
  document: { columnName: 'document', logicalType: 'text', decode: 'string', nullable: true,
    blob: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default') },
  legacyDocument: { columnName: 'legacy_document', modelName: 'legacy_document',
    logicalType: 'text', decode: 'string', nullable: true,
    blob: new BlobFieldSpec('Asset', 'legacy_document', ['doc'], true, 'default') },
} };

test('an unloaded Blob field survives an ordinary-field ledger update without rebinding', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-native-blob-unloaded-'));
  const filename = join(directory, 'runtime.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, { Asset: { ...schema, columns: {
    ...schema.columns,
    caption: { columnName: 'caption', logicalType: 'text', decode: 'string', nullable: true },
  } } });
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext().insertResource('dataService', client);
  const reference = new BlobRef('blob_native_unloaded');
  const authorize = jest.fn(async () => true);
  installRuntimeCapability(context, { name: 'blob.v1', assertReady: () => undefined });
  context.insertResource('blobMutationParticipant', new SqliteBlobMutationParticipant(catalog, {
    scope: () => 'tenant-a', authorize, currentPolicyOnLease,
  }));
  client.setUserContext(context);
  try {
    await catalog.ensureSchema();
    await context.ensureSchema();
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [reference.key, 'tenant-a', 'objects/unloaded',
      'v1', 'unloaded.pdf', 'application/pdf', 7, 'uploaded_unbound']);
    await markPolicyBacked(driver, reference.key);
    await client.executeGraphSave(new MutationIntent('create asset with Blob'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Create',
        id: '1', payload: { document: reference, caption: 'before' } })));
    const binding = (await driver.query('SELECT * FROM teaql_blob_binding')).rows;
    const object = (await driver.query('SELECT * FROM teaql_blob_catalog')).rows;
    authorize.mockClear();

    const ledger = new EntityRoot();
    const key = { entity: 'Asset', id: '1' };
    ledger.set(key, 'caption', 'after');
    expect(ledger.change(key)).toEqual({ caption: 'after' });
    await client.executeGraphSave(new MutationIntent('update caption with unloaded Blob'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 1, ledgerRoot: ledger, ledgerKey: key,
        payload: Object.freeze({ ...ledger.change(key) }) })));

    expect((await driver.query('SELECT document, caption, version FROM asset')).rows)
      .toEqual([{ document: reference.key, caption: 'after', version: 2 }]);
    expect((await driver.query('SELECT * FROM teaql_blob_binding')).rows).toEqual(binding);
    expect((await driver.query('SELECT * FROM teaql_blob_catalog')).rows).toEqual(object);
    expect(authorize).not.toHaveBeenCalled();

    await client.executeGraphSave(new MutationIntent('explicitly clear loaded Blob'),
      graph => client.executeMutation(graph.request({ entity: 'Asset', action: 'Update',
        id: '1', version: 2, payload: { document: null } })));
    expect(authorize).toHaveBeenCalledTimes(1);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: null, version: 3 });
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});

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
      scope: () => 'tenant-a', authorize: async () => true, currentPolicyOnLease,
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
    await markPolicyBacked(driver, reference.key);
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

test('legacy nullable Blob rows require old business values to match binding facts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-native-blob-legacy-before-'));
  const filename = join(directory, 'runtime.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, { Asset: schema });
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext().insertResource('dataService', client);
  installRuntimeCapability(context, { name: 'blob.v1', assertReady: () => undefined });
  context.insertResource('blobMutationParticipant',
    new SqliteBlobMutationParticipant(catalog, {
      scope: () => 'tenant-a', authorize: async () => true, currentPolicyOnLease,
    }));
  client.setUserContext(context);
  try {
    await catalog.ensureSchema();
    await context.ensureSchema();
    for (const [id, key] of [['10', null], ['11', 'blob_old_orphan'],
                             ['12', null], ['13', 'blob_business_old']] as const) {
      await driver.query('INSERT INTO asset(id,version,document) VALUES (?,?,?)', [id, 1, key]);
    }
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key,scope,object_key,content_version,file_name,content_type,size_bytes,status)
      VALUES (?,?,?,?,?,?,?,?)`, ['blob_catalog_other', 'tenant-a', 'objects/catalog-other',
      'v1', 'other.pdf', 'application/pdf', 7, 'available']);
    await driver.query(`INSERT INTO teaql_blob_binding
      (scope,entity,entity_id,field,key,version) VALUES (?,?,?,?,?,?)`,
    ['tenant-a', 'Asset', '13', 'document', 'blob_catalog_other', 1]);
    const save = (action: 'Update' | 'Delete', id: string) =>
      client.executeGraphSave(new MutationIntent('legacy nullable Blob mutation'),
        graph => client.executeMutation(graph.request({ entity: 'Asset', action, id,
          version: 1, ...(action === 'Update' ? { payload: { document: null } } : {}) })));

    await expect(save('Update', '11')).rejects.toThrow('BLOB_BIND_DENIED');
    await expect(save('Delete', '11')).rejects.toThrow('BLOB_BIND_DENIED');
    await expect(save('Update', '13')).rejects.toThrow('BLOB_BIND_DENIED');
    expect((await driver.query('SELECT id,version,document FROM asset WHERE id IN (?,?)',
      ['11', '13'])).rows).toEqual([
      { id: 11, version: 1, document: 'blob_old_orphan' },
      { id: 13, version: 1, document: 'blob_business_old' },
    ]);
    expect((await driver.query('SELECT key,version FROM teaql_blob_binding')).rows)
      .toEqual([{ key: 'blob_catalog_other', version: 1 }]);

    await save('Update', '12');
    expect((await driver.query('SELECT key,version FROM teaql_blob_binding WHERE entity_id = ?',
      ['12'])).rows).toEqual([]);
    await save('Delete', '10');
    expect((await driver.query('SELECT id FROM asset WHERE id = ?', ['10'])).rows).toHaveLength(1);
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
      scope: () => 'tenant-a', authorize: async () => true, currentPolicyOnLease,
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
    await markPolicyBacked(driver, reference.key);
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

test('two allocated graph rows and three Blob fields roll back on late denial or outer rejection', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-native-blob-multi-graph-'));
  const filename = join(directory, 'runtime.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, { Asset: schema });
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext().insertResource('dataService', client);
  const firstDocument = new BlobRef('blob_multi_first_pdf');
  const secondDocument = new BlobRef('blob_multi_second_pdf');
  const secondLegacy = new BlobRef('blob_multi_second_doc');
  let allowLegacy = true;
  installRuntimeCapability(context, { name: 'blob.v1', assertReady: () => undefined });
  context.insertResource('blobMutationParticipant',
    new SqliteBlobMutationParticipant(catalog, {
      scope: () => 'tenant-a',
      authorize: async (_actor, target) => target.field !== 'legacy_document' || allowLegacy,
      currentPolicyOnLease,
    }));
  client.setUserContext(context);

  const save = async (rejectOuter: boolean) => {
    const ledger = new EntityRoot();
    const firstKey = { entity: 'Asset', id: -1 };
    const secondKey = { entity: 'Asset', id: -2 };
    ledger.markAsNew(firstKey);
    ledger.markAsNew(secondKey);
    ledger.set(firstKey, 'document', firstDocument);
    ledger.set(secondKey, 'document', secondDocument);
    ledger.set(secondKey, 'legacyDocument', secondLegacy);
    return client.executeGraphSave(new MutationIntent('save two allocated Blob rows'), async graph => {
      const first = await client.executeMutation(graph.request({
        entity: 'Asset', action: 'Create', ledgerRoot: ledger, ledgerKey: firstKey,
        payload: Object.freeze({ ...ledger.change(firstKey) }),
      }));
      ledger.rekey(firstKey, { entity: 'Asset', id: first.id });
      const second = await client.executeMutation(graph.request({
        entity: 'Asset', action: 'Create', ledgerRoot: ledger, ledgerKey: secondKey,
        payload: Object.freeze({ ...ledger.change(secondKey) }),
      }));
      ledger.rekey(secondKey, { entity: 'Asset', id: second.id });
      expect(ledger.change({ entity: 'Asset', id: second.id }))
        .toMatchObject({ document: secondDocument, legacyDocument: secondLegacy });
      await client.withGraphSqlSession(graph, async sql => {
        const rows = await sql.query('SELECT key FROM teaql_blob_binding WHERE entity_id IN (?, ?)',
          [first.id, second.id]);
        expect(rows.rows.map(row => row.key).sort())
          .toEqual([firstDocument.key, secondDocument.key, secondLegacy.key].sort());
      });
      if (rejectOuter) throw new Error('outer owner rejected multi-entity graph');
      return { first: first.id, second: second.id };
    });
  };
  const assertUncommitted = async () => {
    expect((await driver.query('SELECT id FROM asset')).rows).toHaveLength(0);
    expect((await driver.query('SELECT key FROM teaql_blob_binding')).rows).toHaveLength(0);
    for (const reference of [firstDocument, secondDocument, secondLegacy]) {
      expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
        [reference.key])).rows[0].status).toBe('uploaded_unbound');
    }
  };
  try {
    await catalog.ensureSchema();
    await context.ensureSchema();
    for (const [reference, name, type] of [
      [firstDocument, 'first.pdf', 'application/pdf'],
      [secondDocument, 'second.pdf', 'application/pdf'],
      [secondLegacy, 'second.doc', 'application/msword'],
    ] as const) {
      await driver.query(`INSERT INTO teaql_blob_catalog
        (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        reference.key, 'tenant-a', `objects/${reference.key}`, 'v1', name, type, 7,
        'uploaded_unbound',
      ]);
      await markPolicyBacked(driver, reference.key);
    }

    allowLegacy = false;
    await expect(save(false)).rejects.toThrow('BLOB_BIND_DENIED');
    await assertUncommitted();
    allowLegacy = true;
    await expect(save(true)).rejects.toThrow('outer owner rejected multi-entity graph');
    await assertUncommitted();

    const ids = await save(false);
    expect((await driver.query('SELECT document FROM asset WHERE id = ?', [ids.first])).rows[0].document)
      .toBe(firstDocument.key);
    expect((await driver.query('SELECT document, legacy_document FROM asset WHERE id = ?',
      [ids.second])).rows[0])
      .toMatchObject({ document: secondDocument.key, legacy_document: secondLegacy.key });
    expect((await driver.query('SELECT key FROM teaql_blob_binding')).rows.map(row => row.key).sort())
      .toEqual([firstDocument.key, secondDocument.key, secondLegacy.key].sort());
    for (const reference of [firstDocument, secondDocument, secondLegacy]) {
      expect((await driver.query('SELECT status FROM teaql_blob_catalog WHERE key = ?',
        [reference.key])).rows[0].status).toBe('available');
    }
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
    currentPolicyOnLease,
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
    await markPolicyBacked(driver, reference.key);

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
