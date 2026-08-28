import { UserContext } from '../src/core/context';
import { OrderBy, SelectQuery } from '../src/core/ast';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';
import { executeRelationFacets } from '../src/core/facet';

const schemas: Record<string, EntitySchema> = {
  Order: {
    table: 'orders',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
    },
    relations: {
      lines: { targetEntity: 'OrderLine', localKey: 'id', foreignKey: 'orderId', many: true },
    },
  },
  OrderLine: {
    table: 'orderline',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      orderId: { columnName: 'order_id', logicalType: 'integer', decode: 'string' },
      name: { columnName: 'name', logicalType: 'text', decode: 'native' },
    },
  },
};

describe('SQLite relation loading', () => {
  it('counts the exact filtered set without page, order, projection, or relations', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const id of ['11', '12', '13', '14', '15', '16']) {
      await client.executeMutation({ entity: 'Order', action: 'Create', id, payload: {}, comment: 'seed page' });
    }
    const query = new SelectQuery('Order')
      .filter({ id: { $lte: '15' } }).order(OrderBy.asc('id')).offset(2).limit(2)
      .relationQuery('lines', new SelectQuery('OrderLine'))
      .purpose('render page').comment('list filtered orders');
    const rows = await client.executeQuery<any>(query);
    const total = await client.executeCount(query);
    expect(rows.map(row => row.id)).toEqual(['13', '14']);
    expect(total).toBe(5);
    const countSql = client.sqlTrace[client.sqlTrace.length - 1];
    expect(countSql).toContain('COUNT(');
    expect(countSql).not.toContain(' ORDER BY ');
    expect(countSql).not.toContain(' OFFSET ');
    await client.close();
  });
  it('enforces the formal runtime hard limit at the SQL list boundary', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    const query = new SelectQuery('Order').purpose('test hard limit').comment('bounded list');

    await client.executeQuery(query);

    expect(query.limitValue).toBe(10_000);
    expect(client.sqlTrace[client.sqlTrace.length - 1]).toContain(' LIMIT ');
    await expect(client.executeQuery(
      new SelectQuery('Order')
        .purpose('test hard limit rejection')
        .comment('reject oversized list')
        .limit(10_001),
    )).rejects.toThrow('QUERY_HARD_LIMIT_EXCEEDED');
    await client.close();
  });

  it('enforces runtime governance and sends immutable audit events to the app sink', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    await expect(client.executeQuery(new SelectQuery('Order'))).rejects.toThrow(/purpose and comment/);
    await expect(client.executeMutation({ entity: 'Order', action: 'Create', payload: {} }))
      .rejects.toThrow(/audit reason/);
    const sink: Readonly<Record<string, unknown>>[] = [];
    client.setAuditSink(event => { sink.push(event); });
    await client.executeMutation({ entity: 'Order', action: 'Create', id: '10', payload: {}, comment: 'create governed order' });
    expect(client.auditTrace).toHaveLength(1);
    expect(sink).toHaveLength(1);
    expect(Object.isFrozen(sink[0])).toBe(true);
    expect(sink[0].reason).toBe('create governed order');
    await client.close();
  });

  it('executes inclusive range and IN predicates in SQL', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const id of ['11', '12', '13']) {
      await client.executeMutation({ entity: 'Order', action: 'Create', id, payload: {}, comment: 'seed order' });
    }
    const rows = await client.executeQuery<any>(
      new SelectQuery('Order').purpose('test range').comment('range query').filter({
        $and: [
          { id: { $in: ['11', '12', '99'] } },
          { id: { $gte: '11' } },
          { id: { $lte: '12' } },
        ],
      }).order(OrderBy.asc('id')),
    );
    expect(rows.map(row => row.id)).toEqual(['11', '12']);
    const sql = client.sqlTrace[client.sqlTrace.length - 1];
    expect(sql).toContain(' IN (');
    expect(sql).toContain(' >= ');
    expect(sql).toContain(' <= ');
    await client.close();
  });

  it('registers Soundex during ensureSchema and executes SoundingLike on SQLite', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const [id, name] of [['101', 'Robert'], ['102', 'Rupert'], ['103', 'Alice']]) {
      await client.executeMutation({ entity: 'OrderLine', action: 'Create', id, payload: { name }, comment: 'seed phonetic query' });
    }
    const rows = await client.executeQuery<any>(
      new SelectQuery('OrderLine').purpose('test phonetic query').comment('execute registered soundex')
        .filter({ name: { $soundLike: 'Robert' } }).order(OrderBy.asc('id')),
    );
    expect(rows.map(row => row.name)).toEqual(['Robert', 'Rupert']);
    await client.close();
  });

  it('computes relation facet membership with grouped SQL and include-all semantics', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const id of ['11', '12', '13']) {
      await client.executeMutation({ entity: 'Order', action: 'Create', id, payload: {}, comment: 'seed order facet' });
    }
    for (const [id, orderId, name] of [
      ['101', '11', 'Riverside one'], ['102', '11', 'Riverside two'], ['103', '12', 'Other'],
    ]) {
      await client.executeMutation({
        entity: 'OrderLine', action: 'Create', id, payload: { orderId, name }, comment: 'seed line facet',
      });
    }
    const outer = new SelectQuery('OrderLine')
      .purpose('render order facet').comment('count Riverside lines')
      .filter({ name: { $contains: 'Riverside' } });
    outer.facetBy('orders', 'orderId', {
      toQuery: () => new SelectQuery('Order').aggregate('Count', 'id', 'lineCount')
        .purpose('render order facet').comment('load order facet values'),
    });

    const facets = await executeRelationFacets(client, query => query, outer, outer.facets);
    expect(facets.orders.map(row => [row.id, row.lineCount])).toEqual([
      ['11', 2], ['12', 0], ['13', 0],
    ]);
    expect(client.sqlTrace.some(sql => sql.includes('GROUP BY') && sql.includes('COUNT('))).toBe(true);
    await client.close();
  });

  it('applies nested limit independently to every parent', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const orderId of ['11', '12']) {
      await client.executeMutation({ entity: 'Order', action: 'Create', id: orderId, payload: {}, comment: 'seed order' });
      for (let index = 1; index <= 5; index++) {
        const id = `${orderId}${index}`;
        await client.executeMutation({
          entity: 'OrderLine',
          action: 'Create',
          id,
          payload: { orderId, name: `line-${id}` },
          comment: 'seed line',
        });
      }
    }
    const query = new SelectQuery('Order').purpose('test relations').comment('relation query')
      .order(OrderBy.asc('id'))
      .relationQuery('lines', new SelectQuery('OrderLine').order(OrderBy.desc('id')).limit(3));

    const rows = await client.executeQuery<any>(query);

    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.lines.length)).toEqual([3, 3]);
    expect(rows.flatMap(row => row.lines).every(
      (line: any) => line.__teaql_partition_rank === undefined,
    )).toBe(true);
    await client.close();
  });
});
