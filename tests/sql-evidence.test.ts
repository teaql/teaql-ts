import { UserContext } from '../src/core/context';
import { SelectQuery } from '../src/core/ast';
import Database from 'better-sqlite3';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EntitySchema, SQLExecutionEvidenceStore, TextDiagnosticSQLLogSink,
} from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK } from '../src/core/log-privacy';

const originalLogSetting = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (originalLogSetting === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = originalLogSetting;
});

const schemas: Record<string, EntitySchema> = {
  Person: {
    table: 'person_data',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      name: { columnName: 'name', logicalType: 'text', decode: 'native' },
    },
  },
};

it('persists original SQLite CRUD values while file and custom logs remain redacted on failure', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'teaql-crud-privacy-'));
  const logPath = join(directory, 'runtime.log');
  const evidence = new SQLExecutionEvidenceStore();
  const client = new SQLiteTeaQLClient(join(directory, 'data.db'), schemas)
    .setRuntimeTelemetrySink(evidence)
    .setDiagnosticSQLLogSink(new TextDiagnosticSQLLogSink(line => appendFileSync(logPath, line + '\n')));
  const first = 'PRIVATE-CREATE-CANARY';
  const second = 'PRIVATE-UPDATE-CANARY';
  const failed = 'PRIVATE-FAILURE-CANARY';
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    const created = await client.executeMutation({ entity: 'Person', action: 'Create',
      id: '1', payload: { name: first }, comment: 'create fixture' });
    const read = () => client.executeQuery(new SelectQuery('Person').limit(1)
      .comment('read fixture').purpose('verify persisted values'));
    expect((await read())[0].name).toBe(first);
    const updated = await client.executeMutation({ entity: 'Person', action: 'Update',
      id: '1', version: created.version, payload: { name: second }, comment: 'update fixture' });
    expect((await read())[0].name).toBe(second);
    await expect(client.executeMutation({ entity: 'Person', action: 'Create',
      id: '1', payload: { name: failed }, comment: 'duplicate fixture' })).rejects.toThrow();
    expect((await read())[0].name).toBe(second);
    await client.executeMutation({ entity: 'Person', action: 'Delete', id: '1',
      version: updated.version, payload: {}, comment: 'delete fixture' });
    expect(await read()).toHaveLength(0);
    const log = readFileSync(logPath, 'utf8') + JSON.stringify(evidence.snapshot());
    for (const marker of [first, second, failed]) expect(log).not.toContain(marker);
    for (const operation of ['insert', 'select', 'update']) expect(log).toContain(operation);
  } finally { await client.close(); }
});

it('captures parameterized safe SQL evidence with exact modes', async () => {
  const store = new SQLExecutionEvidenceStore();
  const client = new SQLiteTeaQLClient(':memory:', schemas).setRuntimeTelemetrySink(store);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  const secret = 'secret-customer-value';
  await client.executeMutation({
    entity: 'Person', action: 'Create', id: '1', payload: { name: secret }, comment: 'seed evidence',
  });
  const governedQuery = new SelectQuery('Person').filter({ name: { $eq: secret } })
    .comment('read evidence').purpose('prove parameterized SQL');
  (governedQuery as any).__teaqlTracePath = [
    { level: 0, kind: 'operation', name: 'query' },
    { level: 1, kind: 'request', name: 'Person' },
    { level: 2, kind: 'relation', name: 'Person.organization' },
    { level: 3, kind: 'relation', name: 'Organization.region' },
    { level: 4, kind: 'relation', name: 'Region.country' },
  ];
  await client.executeQuery(governedQuery);

  const entries = store.snapshot();
  expect(entries.some(entry => entry.operation === 'insert')).toBe(true);
  expect(entries.some(entry => entry.operation === 'select')).toBe(true);
  expect(entries.every(entry => !entry.parameterizedSQL.includes(secret))).toBe(true);
  expect(entries.every(entry => entry.parameters.length > 0)).toBe(true);
  expect(JSON.stringify(entries)).not.toContain(secret);
  expect(entries.every(entry => entry.parameters.every(value => value === null))).toBe(true);
  expect(entries.some(entry => entry.resultCount !== undefined)).toBe(true);
  expect(entries.some(entry => entry.affectedRows !== undefined)).toBe(true);
  const select = entries.find(entry => entry.operation === 'select')!;
  expect(select.comment).toBe('read evidence');
  expect(select.purpose).toBe('prove parameterized SQL');
  expect(select.tracePath.map(frame => frame.kind)).toEqual([
    'operation', 'request', 'relation', 'relation', 'relation', 'provider', 'sql',
  ]);

  store.enableSelect();
  await client.executeMutation({
    entity: 'Person', action: 'Create', id: '2', payload: { name: 'ignored' }, comment: 'mode test',
  });
  expect(store.snapshot()).toHaveLength(0);
  store.enableMutation();
  await client.executeQuery(new SelectQuery('Person').comment('ignored query').purpose('mode test'));
  expect(store.snapshot()).toHaveLength(0);
  store.disable();
  expect(store.snapshot()).toHaveLength(0);
  await client.close();
});

it('enables query and mutation logs by default and disables them independently', async () => {
  const output: string[] = [];
  const client = new SQLiteTeaQLClient(':memory:', schemas)
    .setDiagnosticSQLLogSink(new TextDiagnosticSQLLogSink(line => output.push(line)));
  await new UserContext().insertResource('dataService', client).ensureSchema();
  await client.executeMutation({
    entity: 'Person', action: 'Create', id: '1', payload: { name: 'Ada' }, comment: 'seed',
  });
  await client.executeQuery(new SelectQuery('Person').comment('read').purpose('verify defaults'));
  expect(output.some(line => line.includes('[insert]'))).toBe(true);
  expect(output.some(line => line.includes('[select]'))).toBe(true);

  output.length = 0;
  client.setQueryLoggingEnabled(false);
  await client.executeQuery(new SelectQuery('Person').comment('hidden').purpose('query off'));
  await client.executeMutation({
    entity: 'Person', action: 'Update', id: '1', version: 1,
    payload: { name: 'Grace' }, comment: 'mutation remains on',
  });
  expect(output.some(line => line.includes('[select]'))).toBe(false);
  expect(output.some(line => line.includes('[update]'))).toBe(true);

  output.length = 0;
  client.setQueryLoggingEnabled(true).setMutationLoggingEnabled(false);
  await client.executeMutation({
    entity: 'Person', action: 'Update', id: '1', version: 2,
    payload: { name: 'Lin' }, comment: 'mutation off',
  });
  await client.executeQuery(new SelectQuery('Person').comment('visible').purpose('query on'));
  expect(output.some(line => line.includes('[update]'))).toBe(false);
  expect(output.some(line => line.includes('[select]'))).toBe(true);
  await client.close();
});

it('emits both SQL forms only with the exact plaintext debug acknowledgement', async () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const output: string[] = [];
  const client = new SQLiteTeaQLClient(':memory:', schemas)
    .setDiagnosticSQLLogSink(new TextDiagnosticSQLLogSink(line => output.push(line)));
  await new UserContext().insertResource('dataService', client).ensureSchema();
  const name = "O'Brien 学校";
  await client.executeMutation({
    entity: 'Person', action: 'Create', id: '1', payload: { name }, comment: 'seed diagnostic fixture',
  });
  const preparedRows = await client.executeQuery(
    new SelectQuery('Person').filter({ name: { $eq: name } })
      .comment('what: copy paste diagnostic ? marker')
      .purpose('why: prove exact operator SQL'),
  );
  const selectLog = output.find(line => line.includes('[select]'));
  expect(selectLog).toBeDefined();
  expect(selectLog).toContain('Parameterized SQL:');
  expect(selectLog).toContain('comment=what: copy paste diagnostic ? marker');
  expect(selectLog).toContain('purpose=why: prove exact operator SQL');
  const rendered = selectLog!.split('Debug SQL: ')[1];
  expect(rendered).toContain("O''Brien 学校");

  const verification = new Database(':memory:');
  verification.exec('CREATE TABLE person_data (id INTEGER PRIMARY KEY, version INTEGER, name TEXT)');
  verification.prepare('INSERT INTO person_data VALUES (?, ?, ?)').run(1, 1, name);
  const copiedRows = verification.prepare(rendered).all();
  expect(copiedRows).toHaveLength(preparedRows.length);
  verification.close();

  client.setDiagnosticSQLLogSink(undefined);
  output.length = 0;
  await client.executeQuery(new SelectQuery('Person').filter({ name: { $eq: name } })
    .comment('disabled diagnostic').purpose('prove values are not logged'));
  expect(output).toEqual([]);
  await client.close();
});

it('soft deletes and returns the authoritative negative version', async () => {
  const client = new SQLiteTeaQLClient(':memory:', schemas);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  const created = await client.executeMutation({
    entity: 'Person', action: 'Create', payload: { name: 'Ada' }, comment: 'create',
  });
  const deleted = await client.executeMutation({
    entity: 'Person', action: 'Delete', id: created.id, version: created.version,
    payload: {}, comment: 'delete',
  });
  expect(deleted.version).toBe(-2);
  expect(deleted.persistedRecord?.version).toBe(-2);
  expect(await client.executeQuery(
    new SelectQuery('Person').comment('read').purpose('verify soft delete'),
  )).toHaveLength(0);
  await client.close();
});

it('honors projections while always retaining id and version', async () => {
  const client = new SQLiteTeaQLClient(':memory:', schemas);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  await client.executeMutation({
    entity: 'Person', action: 'Create', payload: { name: 'Ada' }, comment: 'create',
  });
  const rows = await client.executeQuery(
    new SelectQuery('Person').select(['id']).comment('minimal read').purpose('verify projection'),
  );
  expect(rows).toEqual([{ id: '1', version: 1 }]);
  await client.close();
});
