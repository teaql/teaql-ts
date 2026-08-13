import { OrderBy, SelectQuery } from '../src/core/ast';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

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
  it('enforces the formal runtime hard limit at the SQL list boundary', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
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

  it('applies nested limit independently to every parent', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
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
