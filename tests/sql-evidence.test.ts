import { SelectQuery } from '../src/core/ast';
import { EntitySchema, SQLExecutionEvidenceStore } from '../src/sql/core';
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
  await client.ensureSchema();
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

it('soft deletes and returns the authoritative negative version', async () => {
  const client = new SQLiteTeaQLClient(':memory:', schemas);
  await client.ensureSchema();
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
  await client.ensureSchema();
  await client.executeMutation({
    entity: 'Person', action: 'Create', payload: { name: 'Ada' }, comment: 'create',
  });
  const rows = await client.executeQuery(
    new SelectQuery('Person').select(['id']).comment('minimal read').purpose('verify projection'),
  );
  expect(rows).toEqual([{ id: '1', version: 1 }]);
  await client.close();
});
