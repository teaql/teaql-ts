import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { executeRelationFacets } from '../src/core/facet';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';
import { QueryRequest } from '../src/core/request-intent';

const schemas: Record<string, EntitySchema> = {
  Bucket: { table: 'np_bucket', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
  }, relations: { entries: { targetEntity: 'Entry', localKey: 'id', foreignKey: 'bucket', many: true } } },
  Entry: { table: 'np_entry', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
    bucket: { columnName: 'bucket', logicalType: 'integer', decode: 'string' },
  }, relations: { bucket: { targetEntity: 'Bucket', localKey: 'bucket', foreignKey: 'id', many: false } } },
};
const query = (entity: string) => new SelectQuery(entity)
  .comment('inspect complete nested population').purpose('prevent silent statistical truncation');

test('nested population preparation preserves only explicit business pages', () => {
  const child = query('Entry');
  query('Bucket').relationQuery('entries', child).prepareForList();
  expect(child.limitValue).toBeFalsy();
  const bounded = query('Entry').limit(2);
  query('Bucket').relationQuery('entries', bounded).prepareForList();
  expect(bounded.limitValue).toBe(2);
});

test('nested population has all 10003 details, statistical groups and facet options', async () => {
  const client = new SQLiteTeaQLClient(':memory:', schemas);
  client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    // Populate through the runtime mutation API, not an application SQL shortcut.
    for (let id = 1; id <= 10003; id++) {
      await client.executeMutation({ entity: 'Bucket', action: 'Create', id: String(id), payload: {}, comment: 'seed nested domain' });
      await client.executeMutation({ entity: 'Entry', action: 'Create', id: String(id), payload: { bucket: '1' }, comment: 'seed nested contribution' });
    }
    const root = query('Bucket').filter({ id: { $eq: '1' } }).limit(1)
      .relationQuery('entries', query('Entry'));
    const rows = await client.executeQuery<any>(root);
    expect(rows[0].entries).toHaveLength(10003);
    const related = query('Bucket').filter({ id: { $eq: '1' } }).limit(1)
      .relationAggregate('entries', 'n', query('Entry').aggregate('Count', 'id', 'n'));
    expect((await client.executeQuery<any>(related))[0].n).toBe(10003);
    const grouped = new QueryRequest(query('Bucket').limit(1))
      .derive(query('Entry').groupBy('id').aggregate('Count', 'id', 'n'), 'entries').query;
    const groups = await client.executeQuery<any>(grouped);
    expect(groups).toHaveLength(10003);
    expect(groups.reduce((n: number, row: any) => n + row.n, 0)).toBe(10003);
    expect(await client.executeQuery(query('Entry'))).toHaveLength(10000);
    expect((await client.executeQuery<any>(query('Bucket').filter({ id: { $eq: '1' } }).limit(1)
      .relationQuery('entries', query('Entry').limit(2))))[0].entries).toHaveLength(2);
    const outer = query('Entry').limit(1);
    outer.facetBy('buckets', 'bucket', { toQuery: () => query('Bucket').aggregate('Count', 'id', 'n') });
    const facets = await executeRelationFacets(client, q => q, outer, outer.facets);
    expect(facets.buckets).toHaveLength(10003);
  } finally { await client.close(); }
}, 120000);
