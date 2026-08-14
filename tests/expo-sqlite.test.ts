import Database from 'better-sqlite3';
import { MutationQuery, OrderBy, SelectQuery } from '../src/core/ast';
import {
  ExpoSQLiteBindValue,
  ExpoSQLiteDatabaseLike,
  ExpoSQLiteExecuteResult,
  ExpoSQLiteStatement,
  ExpoSQLiteTeaQLClient,
} from '../src/sql/expo-sqlite';
import { EntitySchema } from '../src/sql/core';

class TestExpoResult<T>
  implements ExpoSQLiteExecuteResult<T> {
  private index = 0;

  constructor(
    private readonly rows: T[],
    public readonly changes: number,
  ) {}

  async getAllAsync(): Promise<T[]> {
    return [...this.rows];
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.index >= this.rows.length) return { done: true, value: undefined };
    return { done: false, value: this.rows[this.index++] };
  }
}

class TestExpoStatement implements ExpoSQLiteStatement {
  constructor(private readonly statement: Database.Statement) {}

  async executeAsync<T = Record<string, unknown>>(
    values: ExpoSQLiteBindValue[],
  ): Promise<ExpoSQLiteExecuteResult<T>> {
    if (this.statement.reader) {
      return new TestExpoResult(this.statement.all(...values) as T[], 0);
    }
    const result = this.statement.run(...values);
    return new TestExpoResult<T>([], result.changes);
  }

  async finalizeAsync(): Promise<void> {
    // better-sqlite3 finalizes statements with their owning connection.
  }
}

class TestExpoDatabase implements ExpoSQLiteDatabaseLike {
  private readonly database = new Database(':memory:');
  public closed = false;

  async execAsync(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async prepareAsync(sql: string): Promise<ExpoSQLiteStatement> {
    return new TestExpoStatement(this.database.prepare(sql));
  }

  async withExclusiveTransactionAsync(
    work: (transaction: ExpoSQLiteDatabaseLike) => Promise<void>,
  ): Promise<void> {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      await work(this);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    this.database.close();
    this.closed = true;
  }
}

const schemas: Record<string, EntitySchema> = {
  Order: {
    table: 'orders',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      name: { columnName: 'name', logicalType: 'text', decode: 'native' },
      active: { columnName: 'active', logicalType: 'boolean', decode: 'native' },
    },
  },
};

describe('Expo SQLite TeaQL driver', () => {
  it('ensures schema, persists governed mutations, and queries real SQLite', async () => {
    const database = new TestExpoDatabase();
    const client = new ExpoSQLiteTeaQLClient(database, schemas);

    await expect(client.executeMutation(
      new MutationQuery('Order', 'Create', { name: 'unsafe' }),
    )).rejects.toThrow(/audit reason/);

    const created = await client.executeMutation(
      new MutationQuery(
        'Order', 'Create', { name: 'first', active: true }, undefined,
        'create local order',
      ),
    );
    expect(created).toEqual({ success: true, id: '1000', version: 1 });

    const rows = await client.executeQuery<any>(
      new SelectQuery('Order')
        .comment('render local orders')
        .purpose('browse order history')
        .order(OrderBy.asc('id')),
    );
    expect(rows).toEqual([{ id: '1000', version: 1, name: 'first', active: true }]);
    expect(client.auditTrace[0].reason).toBe('create local order');

    await client.close();
    expect(database.closed).toBe(true);
  });

  it('uses optimistic versions, hard limits, and true async cursor streaming', async () => {
    const database = new TestExpoDatabase();
    const client = new ExpoSQLiteTeaQLClient(database, schemas);
    for (let index = 1; index <= 5; index++) {
      await client.executeMutation(new MutationQuery(
        'Order', 'Create', { name: `order-${index}`, active: true },
        String(index), 'seed local order',
      ));
    }

    await expect(client.executeMutation({
      entity: 'Order', action: 'Update', id: '1', version: 99,
      payload: { name: 'stale' }, comment: 'reject stale update',
    })).rejects.toThrow(/Optimistic lock/);

    expect(() => new SelectQuery('Order').limit(10_001).prepareForList())
      .toThrow(/QUERY_HARD_LIMIT_EXCEEDED/);

    const chunks: any[][] = [];
    const query = new SelectQuery('Order')
      .comment('stream local orders')
      .purpose('render a long local list')
      .order(OrderBy.asc('id'));
    for await (const chunk of client.executeForStream(query, 2)) chunks.push(chunk);
    expect(chunks.map(chunk => chunk.length)).toEqual([2, 2, 1]);
    expect(chunks.flat().map(row => row.id)).toEqual(['1', '2', '3', '4', '5']);
    await client.close();
  });
});
