import { UserContext } from '../src/core/context';
import { SelectQuery } from '../src/core/ast';
import Database from 'better-sqlite3';
import {
  EntitySchema, SQLExecutionEvidenceStore, TextDiagnosticSQLLogSink,
} from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

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

it('captures parameterized safe SQL evidence with exact modes', async () => {
  const store = new SQLExecutionEvidenceStore();
  const client = new SQLiteTeaQLClient(':memory:', schemas).setRuntimeTelemetrySink(store);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  const secret = 'secret-customer-value';
  await client.executeMutation({
    entity: 'Person', action: 'Create', id: '1', payload: { name: secret }, comment: 'seed evidence',
  });
  await client.executeQuery(new SelectQuery('Person').filter({ name: { $eq: secret } })
    .comment('read evidence').purpose('prove parameterized SQL'));

  const entries = store.snapshot();
  expect(entries.some(entry => entry.operation === 'insert')).toBe(true);
  expect(entries.some(entry => entry.operation === 'select')).toBe(true);
  expect(entries.every(entry => !entry.parameterizedSQL.includes(secret))).toBe(true);
  expect(entries.every(entry => entry.parameters.length > 0)).toBe(true);
  expect(entries.some(entry => entry.debugSQL.includes(`'${secret}'`))).toBe(true);
  expect(entries.some(entry => entry.resultCount !== undefined)).toBe(true);
  expect(entries.some(entry => entry.affectedRows !== undefined)).toBe(true);

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

it('emits copy-paste SQL only through the explicit diagnostic sink', async () => {
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
  const rendered = selectLog!.split('\n').slice(1).join('\n');
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
