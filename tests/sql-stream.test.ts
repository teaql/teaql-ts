import { UserContext } from '../src/core/context';
import { OrderBy, SelectQuery } from '../src/core/ast';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';
import { PostgreSQLDriver } from '../src/sql/postgres';
import { MySQLDriver } from '../src/sql/mysql';

const schemas: Record<string, EntitySchema> = {
  Order: {
    table: 'orders',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
    },
  },
};

describe('SQLite true streaming query', () => {
  it('yields bounded chunks from the statement iterator', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await client.ensureSchema(new UserContext());
    for (let id = 1; id <= 5; id++) {
      await client.executeMutation({
        entity: 'Order', action: 'Create', id: String(id), payload: {}, comment: 'seed stream fixture',
      });
    }
    const query = new SelectQuery('Order')
      .comment('stream orders')
      .purpose('verify cursor streaming')
      .order(OrderBy.asc('id'));
    const chunks: any[][] = [];
    for await (const chunk of client.executeForStream(query, 2)) chunks.push(chunk);
    expect(chunks.map(chunk => chunk.length)).toEqual([2, 2, 1]);
    expect(chunks.flat().map(row => row.id)).toEqual(['1', '2', '3', '4', '5']);
    await client.close();
  });

  it('rejects missing governance and invalid chunk sizes at iteration time', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    await client.ensureSchema(new UserContext());
    const consume = async (stream: AsyncIterable<any[]>) => {
      for await (const _chunk of stream) { /* consume */ }
    };
    await expect(consume(client.executeForStream(new SelectQuery('Order'), 10)))
      .rejects.toThrow(/purpose and comment/);
    const query = new SelectQuery('Order').comment('invalid size').purpose('verify validation');
    await expect(consume(client.executeForStream(query, 0))).rejects.toThrow(/positive integer/);
    await client.close();
  });
});

describe('real SQL driver streams', () => {
  it.each([
    ['PostgreSQL', 'TEAQL_TEST_POSTGRES_URL', (url: string) => new PostgreSQLDriver(url),
      'SELECT id FROM (VALUES (1), (2), (3), (4), (5)) AS fixture(id) ORDER BY id'],
    ['MySQL', 'TEAQL_TEST_MYSQL_URL', (url: string) => new MySQLDriver(url),
      'SELECT id FROM (SELECT 1 id UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) fixture ORDER BY id'],
  ] as const)('streams rows from %s', async (_name, envName, createDriver, sql) => {
    const url = process.env[envName];
    if (!url) return;
    const driver = createDriver(url);
    const ids: number[] = [];
    try {
      for await (const row of driver.stream(sql)) ids.push(Number(row.id));
    } finally {
      await driver.close();
    }
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });
});
