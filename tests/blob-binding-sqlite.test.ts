import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { MutationIntent } from '../src/core/request-intent';
import { BlobBindingAuthorization, SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { BlobRetentionPolicy } from '../src/blob-reference/retention';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

test('SQLite Blob target binding is in the business graph transaction and retains a tombstone', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-blob-binding-'));
  const filename = join(directory, 'catalog.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, {});
  const catalog = new SqlBlobCatalog(driver);
  const context = new UserContext();
  client.setUserContext(context);
  const reference = new BlobRef('blob_asset_1');
  let permitted = true;
  const authorization: BlobBindingAuthorization = {
    scope: () => 'tenant-a',
    authorize: async (_context, target, _previous, next) =>
      permitted && target.entity === 'Asset' && target.entityId === '1' &&
      target.field === 'document' && (next === null || next.equals(reference)),
    currentPolicyOnLease: () => new BlobRetentionPolicy('default', 'server_stream', 3600, 3600),
  };
  const target = { entity: 'Asset', entityId: '1', field: 'document' };
  try {
    await catalog.ensureSchema();
    await driver.query('CREATE TABLE asset (id TEXT PRIMARY KEY, document TEXT)');
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key, scope, object_key, content_version, file_name, content_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [reference.key, 'tenant-a', 'objects/version-1', 'v1', 'asset.pdf',
      'application/pdf', 7, 'uploaded_unbound']);
    await catalog.validateSchema();

    await expect(client.executeGraphSave(new MutationIntent('foreign actor binding'), graph =>
      catalog.bindInGraph(client, graph, new UserContext(),
        { target, next: reference, expectedVersion: 0, nextVersion: 1 }, authorization)))
      .rejects.toThrow('BLOB_BIND_DENIED');
    expect((await driver.query('SELECT key FROM teaql_blob_binding')).rowCount).toBe(0);
    await expect(client.executeGraphSave(new MutationIntent('noncanonical target'), graph =>
      catalog.bindInGraph(client, graph, context,
        { target: { ...target, entityId: '01' }, next: reference,
          expectedVersion: 0, nextVersion: 1 }, authorization)))
      .rejects.toThrow('BLOB_REFERENCE_INVALID');
    expect((await driver.query('SELECT key FROM teaql_blob_binding')).rowCount).toBe(0);

    await expect(client.executeGraphSave(new MutationIntent('ambiguous legacy Blob'), graph =>
      catalog.bindInGraph(client, graph, context,
        { target, next: reference, expectedVersion: 0, nextVersion: 1 }, authorization)))
      .rejects.toThrow('BLOB_BIND_DENIED');
    await driver.query(`UPDATE teaql_blob_catalog SET completed_at_ms = ?,
      policy_profile = 'default', upload_mode = 'server_stream',
      unbound_retention_seconds = 3600, effective_unref_seconds = 3600 WHERE key = ?`,
    [Date.now(), reference.key]);

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
    expect((await driver.query('SELECT status FROM teaql_blob_catalog')).rows[0].status)
      .toBe('available');
    expect((await driver.query('SELECT last_unbound_at_ms FROM teaql_blob_catalog'))
      .rows[0].last_unbound_at_ms).toBeNull();

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
    expect((await driver.query('SELECT last_unbound_at_ms FROM teaql_blob_catalog'))
      .rows[0].last_unbound_at_ms).toBeNull();

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
    const beforeUnbind = Date.now();
    await client.executeGraphSave(new MutationIntent('clear asset Blob'), async graph => {
      await client.withGraphSqlSession(graph, session => session.query(
        'UPDATE asset SET document = NULL WHERE id = ?', ['1']));
      await catalog.bindInGraph(client, graph, context,
        { target, next: null, expectedVersion: 1, nextVersion: 2 }, authorization);
    });
    expect((await driver.query('SELECT key, version FROM teaql_blob_binding')).rows[0])
      .toMatchObject({ key: null, version: 2 });
    const unbound = (await driver.query('SELECT status, last_unbound_at_ms FROM teaql_blob_catalog')).rows[0];
    expect(unbound.status).toBe('available');
    expect(Number(unbound.last_unbound_at_ms)).toBeGreaterThanOrEqual(beforeUnbind);
    expect(Number(unbound.last_unbound_at_ms)).toBeLessThanOrEqual(Date.now());
    await client.executeGraphSave(new MutationIntent('rebind retained Blob'), graph =>
      catalog.bindInGraph(client, graph, context,
        { target, next: reference, expectedVersion: 2, nextVersion: 3 }, authorization));
    expect((await driver.query('SELECT status FROM teaql_blob_catalog')).rows[0].status)
      .toBe('available');
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

test('trusted policy binding uses completion and last-unbind deadlines on the graph SQL owner', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-blob-retention-bind-'));
  const filename = join(directory, 'catalog.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, {});
  let clock = 10_999;
  const catalog = new SqlBlobCatalog(driver, () => clock);
  const actor = new UserContext();
  client.setUserContext(actor);
  const reference = new BlobRef('blob_retention_1');
  const target = { entity: 'Asset', entityId: '1', field: 'document' };
  let policy = new BlobRetentionPolicy('target', 'server_stream', 10, 30, 15);
  const authorization: BlobBindingAuthorization = {
    scope: () => 'tenant-a', authorize: async () => true,
    currentPolicyOnLease: async (_actor, lease) => {
      expect((await lease.query('SELECT 1 AS n')).rows[0].n).toBe(1);
      return policy;
    },
  };
  const bind = (next: BlobRef | null, expectedVersion: number, nextVersion: number) =>
    client.executeGraphSave(new MutationIntent('retention-aware Blob binding'), async graph => {
      await client.withGraphSqlSession(graph, session => session.query(
        'UPDATE asset SET document = ? WHERE id = ?', [next?.key ?? null, '1']));
      return catalog.bindInGraph(client, graph, actor,
        { target, next, expectedVersion, nextVersion }, authorization);
    });
  try {
    await catalog.ensureSchema();
    await driver.query('CREATE TABLE asset (id TEXT PRIMARY KEY, document TEXT)');
    await driver.query("INSERT INTO asset VALUES ('1',NULL)");
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key,scope,object_key,content_version,file_name,content_type,size_bytes,status,
       completed_at_ms,policy_profile,upload_mode,unbound_retention_seconds,effective_unref_seconds)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [reference.key, 'tenant-a', 'objects/retained',
      'version-1', 'report.pdf', 'application/pdf', 1, 'uploaded_unbound', 1000,
      'default', 'server_stream', 10, 20]);
    await expect(client.executeGraphSave(new MutationIntent('missing target policy'), graph =>
      catalog.bindInGraph(client, graph, actor,
        { target, next: reference, expectedVersion: 0, nextVersion: 1 },
        { scope: () => 'tenant-a', authorize: async () => true })))
      .rejects.toThrow('BLOB_BIND_DENIED');
    expect((await driver.query('SELECT key FROM teaql_blob_binding')).rows).toHaveLength(0);

    await bind(reference, 0, 1);
    expect((await driver.query(`SELECT status,last_unbound_at_ms,effective_unref_seconds,
      retention_floor_until_ms FROM teaql_blob_catalog WHERE key = ?`, [reference.key])).rows[0])
      .toMatchObject({ status: 'available', last_unbound_at_ms: null,
        effective_unref_seconds: 30, retention_floor_until_ms: 25_999 });
    await expect(client.executeGraphSave(new MutationIntent('abort policy unbind'), async graph => {
      await catalog.bindInGraph(client, graph, actor,
        { target, next: null, expectedVersion: 1, nextVersion: 2 }, authorization);
      throw new Error('abort graph');
    })).rejects.toThrow('abort graph');
    expect((await driver.query('SELECT last_unbound_at_ms FROM teaql_blob_catalog WHERE key = ?',
      [reference.key])).rows[0].last_unbound_at_ms).toBeNull();

    clock = 12_000;
    await bind(null, 1, 2);
    expect((await driver.query('SELECT last_unbound_at_ms FROM teaql_blob_catalog WHERE key = ?',
      [reference.key])).rows[0].last_unbound_at_ms).toBe(12_000);
    policy = new BlobRetentionPolicy('target', 'server_stream', 1, 1);
    clock = 20_000;
    await bind(reference, 2, 3);
    expect((await driver.query(`SELECT last_unbound_at_ms,effective_unref_seconds,
      retention_floor_until_ms FROM teaql_blob_catalog WHERE key = ?`, [reference.key])).rows[0])
      .toMatchObject({ last_unbound_at_ms: null, effective_unref_seconds: 30,
        retention_floor_until_ms: 25_999 });
    clock = 22_000;
    await bind(null, 3, 4);
    clock = 52_000;
    await expect(bind(reference, 4, 5)).rejects.toThrow('BLOB_REFERENCE_EXPIRED');
    expect((await driver.query('SELECT document FROM asset WHERE id = ?', ['1'])).rows[0].document)
      .toBeNull();

    const expired = new BlobRef('blob_retention_expired');
    await driver.query(`INSERT INTO teaql_blob_catalog
      (key,scope,object_key,content_version,file_name,content_type,size_bytes,status,
       completed_at_ms,policy_profile,upload_mode,unbound_retention_seconds,effective_unref_seconds)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [expired.key, 'tenant-a', 'objects/expired',
      'version-2', 'old.pdf', 'application/pdf', 1, 'uploaded_unbound', 1000,
      'default', 'server_stream', 10, 20]);
    await expect(client.executeGraphSave(new MutationIntent('expired unbound Blob'), graph =>
      catalog.bindInGraph(client, graph, actor,
        { target: { ...target, entityId: '2' }, next: expired,
          expectedVersion: 0, nextVersion: 1 }, authorization)))
      .rejects.toThrow('BLOB_REFERENCE_EXPIRED');
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});
