import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { MutationIntent } from '../src/core/request-intent';
import { BlobBindingAuthorization, SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

test('SQLite Blob target binding is in the business graph transaction and retains a tombstone', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-blob-binding-'));
  const filename = join(directory, 'catalog.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, {});
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext();
  const reference = new BlobRef('blob_asset_1');
  let permitted = true;
  const authorization: BlobBindingAuthorization = {
    scope: () => 'tenant-a',
    authorize: async (_context, target, _previous, next) =>
      permitted && target.entity === 'Asset' && target.entityId === '1' &&
      target.field === 'document' && (next === null || next.equals(reference)),
  };
  const target = { entity: 'Asset', entityId: '1', field: 'document' };
  try {
    await catalog.ensureSchema();
    await driver.query('CREATE TABLE asset (id TEXT PRIMARY KEY, document TEXT)');
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [reference.key, 'tenant-a', 'objects/version-1', 'v1', 'asset.pdf',
      'application/pdf', 7, 'available']);
    await catalog.validateSchema();

    await client.executeGraphSave(new MutationIntent('create asset and bind Blob'), async graph => {
      await client.withGraphSqlSession(graph, session => session.query(
        'INSERT INTO asset(id, document) VALUES (?, ?)', ['1', reference.key]));
      expect(await catalog.bindInGraph(client, graph, context,
        { target, next: reference, expectedVersion: 0, nextVersion: 1 }, authorization)).toBe(1);
    });
    expect((await driver.query('SELECT document FROM asset WHERE id = ?', ['1'])).rows[0].document)
      .toBe(reference.key);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: reference.key, version: 1 });

    await expect(client.executeGraphSave(new MutationIntent('rolled-back unbind'), async graph => {
      await client.withGraphSqlSession(graph, session => session.query(
        'UPDATE asset SET document = NULL WHERE id = ?', ['1']));
      await catalog.bindInGraph(client, graph, context,
        { target, next: null, expectedVersion: 1, nextVersion: 2 }, authorization);
      throw new Error('abort business save');
    })).rejects.toThrow('abort business save');
    expect((await driver.query('SELECT document FROM asset WHERE id = ?', ['1'])).rows[0].document)
      .toBe(reference.key);
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: reference.key, version: 1 });

    await expect(client.executeGraphSave(new MutationIntent('caught stale binding'), async graph => {
      await client.withGraphSqlSession(graph, session => session.query(
        'UPDATE asset SET document = NULL WHERE id = ?', ['1']));
      await expect(catalog.bindInGraph(client, graph, context,
        { target, next: null, expectedVersion: 0, nextVersion: 2 }, authorization))
        .rejects.toThrow('BLOB_BIND_DENIED');
    })).rejects.toThrow('GRAPH_TRANSACTION_ROLLBACK_ONLY');
    expect((await driver.query('SELECT document FROM asset WHERE id = ?', ['1'])).rows[0].document)
      .toBe(reference.key);

    permitted = false;
    await expect(client.executeGraphSave(new MutationIntent('revoked write'), graph =>
      catalog.bindInGraph(client, graph, context,
        { target, next: null, expectedVersion: 1, nextVersion: 2 }, authorization)))
      .rejects.toThrow('BLOB_BIND_DENIED');
    permitted = true;
    await client.executeGraphSave(new MutationIntent('clear asset Blob'), async graph => {
      await client.withGraphSqlSession(graph, session => session.query(
        'UPDATE asset SET document = NULL WHERE id = ?', ['1']));
      await catalog.bindInGraph(client, graph, context,
        { target, next: null, expectedVersion: 1, nextVersion: 2 }, authorization);
    });
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: null, version: 2 });
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('readiness rejects the earlier binding schema that cannot retain unbound versions', async () => {
  const driver = new SQLiteDriver(':memory:');
  const catalog = new SqlBlobCatalog(driver);
  try {
    await catalog.ensureSchema();
    await driver.query('DROP TABLE teaql_blob_binding');
    await driver.query(`CREATE TABLE teaql_blob_binding (
      scope TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
      field TEXT NOT NULL, key TEXT NOT NULL, version BIGINT NOT NULL,
      PRIMARY KEY (scope, entity, entity_id, field))`);
    await expect(catalog.validateSchema()).rejects.toThrow('BLOB_SCHEMA_MISSING');
  } finally { await driver.close(); }
});
