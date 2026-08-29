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
  QueryRecord: {
    table: 'query_record',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      requiredText: { columnName: 'required_text', logicalType: 'text', decode: 'native' },
      optionalText: { columnName: 'optional_text', logicalType: 'text', decode: 'native' },
      requiredInteger: { columnName: 'required_integer', logicalType: 'integer', decode: 'number' },
      optionalLong: { columnName: 'optional_long', logicalType: 'integer', decode: 'string' },
      requiredDecimal: { columnName: 'required_decimal', logicalType: 'decimal', decode: 'string' },
      requiredFloat: { columnName: 'required_float', logicalType: 'double', decode: 'number' },
      requiredDouble: { columnName: 'required_double', logicalType: 'double', decode: 'number' },
      requiredDate: { columnName: 'required_date', logicalType: 'date', decode: 'date' },
      requiredTime: { columnName: 'required_time', logicalType: 'integer', decode: 'number' },
      requiredTimestamp: { columnName: 'required_timestamp', logicalType: 'datetime', decode: 'date' },
      active: { columnName: 'active', logicalType: 'boolean', decode: 'native' },
      reviewed: { columnName: 'reviewed', logicalType: 'boolean', decode: 'native' },
    },
  },
};

describe('SQLite relation loading', () => {
  it('executes the complete scalar fixture including nullable boolean on SQLite', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    const rows = [
      ['1', 'Alpha', 'optional', 42, '42000000000', '42.125', 42.5, 42.75, '2026-08-29', 34_200_000, '2026-08-29T09:30:00.000Z', true, false],
      ['2', 'Beta', null, 7, null, '7.500', 7.5, 7.75, '2026-08-30', 36_000_000, '2026-08-30T10:00:00.000Z', false, null],
      ['3', 'Gamma', 'tail', 99, '99000000000', '99.875', 99.5, 99.75, '2026-08-31', 37_800_000, '2026-08-31T10:30:00.000Z', true, true],
    ] as const;
    for (const [id, requiredText, optionalText, requiredInteger, optionalLong,
      requiredDecimal, requiredFloat, requiredDouble, requiredDate, requiredTime,
      requiredTimestamp, active, reviewed] of rows) {
      await client.executeMutation({
        entity: 'QueryRecord', action: 'Create', id,
        payload: {
          requiredText, optionalText, requiredInteger, optionalLong, requiredDecimal,
          requiredFloat, requiredDouble, requiredDate: new Date(`${requiredDate}T00:00:00.000Z`),
          requiredTime, requiredTimestamp: new Date(requiredTimestamp), active, reviewed,
        },
        comment: 'seed complete query scalar fixture',
      });
    }

    const query = (filter: Record<string, unknown>) => client.executeQuery<any>(
      new SelectQuery('QueryRecord').filter(filter)
        .comment('what: execute complete scalar predicate')
        .purpose('why: retain Query conformance evidence')
        .order(OrderBy.asc('id')),
    );
    expect((await query({ requiredText: { $eq: 'Alpha' } })).map(row => row.id)).toEqual(['1']);
    expect((await query({ requiredText: { $ne: 'Alpha' } })).map(row => row.id)).toEqual(['2', '3']);
    expect((await query({ requiredText: { $in: ['Alpha', 'Gamma'] } })).map(row => row.id)).toEqual(['1', '3']);
    expect((await query({ requiredText: { $startsWith: 'Al' } })).map(row => row.id)).toEqual(['1']);
    expect((await query({ requiredText: { $endsWith: 'ma' } })).map(row => row.id)).toEqual(['3']);
    expect((await query({ requiredText: { $contains: 'et' } })).map(row => row.id)).toEqual(['2']);
    expect((await query({ requiredInteger: { $between: [40, 100] } })).map(row => row.id)).toEqual(['1', '3']);
    expect((await query({ requiredDecimal: { $gt: '50' } })).map(row => row.id)).toEqual(['3']);
    expect((await query({ requiredFloat: { $lte: 7.5 } })).map(row => row.id)).toEqual(['2']);
    expect((await query({ requiredDouble: { $gte: 99.75 } })).map(row => row.id)).toEqual(['3']);
    expect((await query({ requiredDate: { $between: [new Date('2026-08-30T00:00:00.000Z'), new Date('2026-08-31T00:00:00.000Z')] } })).map(row => row.id)).toEqual(['2', '3']);
    expect((await query({ requiredTime: { $gt: 36_000_000 } })).map(row => row.id)).toEqual(['3']);
    expect((await query({ requiredTimestamp: { $lt: new Date('2026-08-30T12:00:00.000Z') } })).map(row => row.id)).toEqual(['1', '2']);
    expect((await query({ optionalText: { $isNull: true } })).map(row => row.id)).toEqual(['2']);
    expect((await query({ optionalLong: { $isNull: false } })).map(row => row.id)).toEqual(['1', '3']);
    expect((await query({ active: { $eq: false } })).map(row => row.id)).toEqual(['2']);
    expect((await query({ reviewed: { $eq: true } })).map(row => row.id)).toEqual(['3']);
    expect((await query({ reviewed: { $eq: false } })).map(row => row.id)).toEqual(['1']);
    expect((await query({ reviewed: { $isNull: true } })).map(row => row.id)).toEqual(['2']);
    await client.close();
  });

  it('executes positive and negative relation subqueries with bound values', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await new UserContext().insertResource('dataService', client).ensureSchema();
    await client.executeMutation({ entity: 'Order', action: 'Create', id: '1', payload: {}, comment: 'seed first order' });
    await client.executeMutation({ entity: 'Order', action: 'Create', id: '2', payload: {}, comment: 'seed second order' });
    await client.executeMutation({ entity: 'Order', action: 'Create', id: '3', payload: {}, comment: 'seed empty order' });
    await client.executeMutation({ entity: 'OrderLine', action: 'Create', id: '11', payload: { orderId: '1', name: 'included' }, comment: 'seed included line' });
    await client.executeMutation({ entity: 'OrderLine', action: 'Create', id: '12', payload: { orderId: '2', name: 'excluded' }, comment: 'seed excluded line' });
    await client.executeMutation({ entity: 'OrderLine', action: 'Create', id: '13', payload: { orderId: null, name: 'orphan' }, comment: 'seed orphan line' });
    const firstOrder = new SelectQuery('Order').filter({ id: { $eq: '1' } });

    const included = await client.executeQuery<any>(
      new SelectQuery('OrderLine')
        .filter({ orderId: { $inSubquery: { query: firstOrder, field: 'id' } } })
        .comment('what: select lines of first order')
        .purpose('why: verify positive relation predicate'),
    );
    const excluded = await client.executeQuery<any>(
      new SelectQuery('OrderLine')
        .filter({ orderId: { $notInSubquery: { query: firstOrder, field: 'id' } } })
        .comment('what: exclude lines of first order')
        .purpose('why: verify negative relation predicate'),
    );

    expect(included.map(row => row.name)).toEqual(['included']);
    expect(excluded.map(row => row.name)).toEqual(['excluded']);

    const lineIds = async (filter: Record<string, unknown>) => (await client.executeQuery<any>(
      new SelectQuery('OrderLine').filter(filter).order(OrderBy.asc('id'))
        .comment('what: execute complete forward relation predicate')
        .purpose('why: retain complete relation fixture evidence'),
    )).map(row => row.id);
    const orderIds = async (filter: Record<string, unknown>) => (await client.executeQuery<any>(
      new SelectQuery('Order').filter(filter).order(OrderBy.asc('id'))
        .comment('what: execute complete reverse relation predicate')
        .purpose('why: retain complete relation fixture evidence'),
    )).map(row => row.id);
    expect(await lineIds({ orderId: { $isNull: false } })).toEqual(['11', '12']);
    expect(await lineIds({ orderId: { $isNull: true } })).toEqual(['13']);
    expect(await lineIds({ orderId: { $inSubquery: { query: firstOrder, field: 'id' } } })).toEqual(['11']);
    expect(await lineIds({ orderId: { $notInSubquery: { query: firstOrder, field: 'id' } } })).toEqual(['12']);

    const allLines = new SelectQuery('OrderLine');
    expect(await orderIds({ id: { $inSubquery: { query: allLines, field: 'orderId' } } })).toEqual(['1', '2']);
    expect(await orderIds({ id: { $notInSubquery: { query: allLines, field: 'orderId' } } })).toEqual(['3']);
    expect(client.sqlTrace.some(sql => sql.includes(' IN (SELECT '))).toBe(true);
    expect(client.sqlTrace.some(sql => sql.includes(' NOT IN (SELECT '))).toBe(true);
    await client.close();
  });

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
