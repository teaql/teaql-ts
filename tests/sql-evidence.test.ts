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
