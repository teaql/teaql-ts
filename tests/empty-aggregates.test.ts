import { OrderBy, SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { executeRelationFacets } from '../src/core/facet';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

// #236 EA-01..08: SQL null is a present aggregate, not zero or NotLoaded.
const schemas: Record<string, EntitySchema> = {
  Bucket: { table: 'ea_bucket', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
  }, relations: { entries: { targetEntity: 'Entry', localKey: 'id', foreignKey: 'bucket', many: true } } },
  Entry: { table: 'ea_entry', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
    bucket: { columnName: 'bucket', logicalType: 'integer', decode: 'string' },
    amount: { columnName: 'amount', logicalType: 'integer', decode: 'number' },
  } },
};
const bounded = (entity: string) => new SelectQuery(entity).limit(10)
  .comment('inspect empty aggregate semantics').purpose('verify EA-01 through EA-08');
const totals = () => bounded('Entry').aggregate('Count', 'id', 'rows')
  .aggregate('Count', 'amount', 'values').aggregate('Sum', 'amount', 'total');

test('empty aggregates preserve null, zero, buckets and JSON on real SQLite', async () => {
  const client = new SQLiteTeaQLClient(':memory:', schemas);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const id of ['1', '2', '3', '4']) {
      await client.executeMutation({ entity: 'Bucket', action: 'Create', id, payload: {}, comment: 'seed aggregate bucket' });
    }
    for (const [index, bucket, amount] of [[1, '1', 4], [2, '1', -4], [3, '2', null],
      [4, '2', null], [5, '3', null], [6, '3', 2], [7, '3', -1], [8, '3', null]] as const) {
      await client.executeMutation({ entity: 'Entry', action: 'Create', id: String(index),
        payload: { bucket, amount }, comment: 'seed aggregate boundary value' });
    }
    for (const [bucket, expected] of [
      ['4', { rows: 0, values: 0, total: null }],
      ['2', { rows: 2, values: 0, total: null }],
      ['3', { rows: 4, values: 2, total: 1 }],
      ['1', { rows: 2, values: 2, total: 0 }],
      [null, { rows: 8, values: 4, total: 1 }],
    ] as const) {
      const query = totals();
      if (bucket) query.filter({ bucket: { $eq: bucket } });
      const before = JSON.stringify(query);
      const rows = await client.executeQuery<any>(query);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject(expected);
      expect(JSON.parse(JSON.stringify(rows[0]))).toMatchObject(expected);
      expect(Object.prototype.hasOwnProperty.call(rows[0], 'total')).toBe(true);
      const explicitDefault = rows[0].total ?? 0;
      expect(explicitDefault).toBe(expected.total ?? 0);
      expect(rows[0].total).toBe(expected.total);
      expect(JSON.stringify(query)).toBe(before);
    }
    const grouped = await client.executeQuery(totals().filter({ bucket: { $eq: '4' } }).groupBy('bucket'));
    expect(grouped).toHaveLength(0);
    const relationQuery = bounded('Bucket').order(OrderBy.asc('id'))
      .relationAggregate('entries', 'entryCount', bounded('Entry').aggregate('Count', 'id', 'count'))
      .relationAggregate('entries', 'entryTotal', bounded('Entry').aggregate('Sum', 'amount', 'sum'));
    const parents = await client.executeQuery<any>(relationQuery);
    expect(parents.map(row => [row.id, row.entryCount, row.entryTotal])).toEqual([
      ['1', 2, 0], ['2', 2, null], ['3', 4, 1], ['4', 0, null],
    ]);
    const outer = bounded('Entry');
    outer.facetBy('buckets', 'bucket', { toQuery: () => bounded('Bucket').order(OrderBy.asc('id'))
      .aggregate('Count', 'id', 'entryCount').aggregate('Sum', 'amount', 'entryTotal') });
    const before = JSON.stringify(outer);
    const facets = await executeRelationFacets(client, query => query, outer, outer.facets);
    expect(facets.buckets.map(row => [row.id, row.entryCount, row.entryTotal])).toEqual([
      ['1', 2, 0], ['2', 2, null], ['3', 4, 1], ['4', 0, null],
    ]);
    expect(JSON.stringify(outer)).toBe(before);
    console.log('EMPTY_AGGREGATES_PASS typescript sqlite EA-01..08');
  } finally {
    await client.close();
  }
});

test('fallback facet provider distinguishes no contributions from genuine zero', async () => {
  const outer = bounded('Entry');
  outer.facetBy('buckets', 'bucket', { toQuery: () => bounded('Bucket')
    .aggregate('Count', 'amount', 'valueCount').aggregate('Sum', 'amount', 'total') });
  const service = { executeQuery: async (query: SelectQuery) => query.entity === 'Bucket'
    ? [{ id: '1' }, { id: '2' }, { id: '3' }]
    : [{ bucket: '1', amount: 4 }, { bucket: '1', amount: -4 }, { bucket: '2', amount: null }] };
  const facets = await executeRelationFacets(service, query => query, outer, outer.facets);
  expect(facets.buckets.map(row => [row.id, row.valueCount, row.total])).toEqual([
    ['1', 2, 0], ['2', 0, null], ['3', 0, null],
  ]);
  expect(JSON.parse(JSON.stringify(facets.buckets[2]))).toMatchObject({ valueCount: 0, total: null });
});
