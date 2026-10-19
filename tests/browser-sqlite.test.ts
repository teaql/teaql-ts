import { UserContext } from '../src/core/context';
import { decimal } from '../src/core/decimal';
import { long } from '../src/core/long';
import { localTime } from '../src/core/local-time';
import { OrderBy, SelectQuery } from '../src/core/ast';
import Database from 'better-sqlite3';
import {
  DelegatingMutationPolicyRegistry,
  MutationPolicyError,
} from '../src/core/mutation-policy';
import {
  BrowserSQLiteDriver,
  BrowserSQLiteTeaQLClient,
  BrowserSQLiteWorkerLike,
} from '../src/sql/browser-sqlite';
import {
  BrowserSQLiteRequest,
  BrowserSQLiteResponse,
} from '../src/sql/browser-sqlite-protocol';
import { EntitySchema } from '../src/sql/core';

class FakeWorker implements BrowserSQLiteWorkerLike {
  readonly requests: BrowserSQLiteRequest[] = [];
  terminated = false;
  private readonly messageListeners = new Set<(event: MessageEvent<BrowserSQLiteResponse>) => void>();
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly database?: Database.Database) {}

  postMessage(message: BrowserSQLiteRequest): void {
    this.requests.push(message);
    queueMicrotask(() => {
      let result: unknown;
      let error: BrowserSQLiteResponse['error'];
      try {
        if (message.operation === 'query') {
          const sql = String(message.payload?.sql ?? '');
          if (this.database) {
            const statement = this.database.prepare(sql);
            const values = (message.payload?.values ?? []) as unknown[];
            if (statement.reader) {
              const rows = statement.all(...values);
              result = { rows, rowCount: rows.length };
            } else {
              const changes = statement.run(...values).changes;
              result = { rows: [], rowCount: changes };
            }
          } else {
            result = sql.startsWith('SELECT')
              ? { rows: [{ id: 1, name: 'Local' }], rowCount: 1 }
              : { rows: [], rowCount: 0 };
          }
        }
        if (message.operation === 'close') this.database?.close();
      } catch (cause) {
        error = { name: 'SQLiteTestWorkerError', message: String(cause) };
      }
      const event = { data: {
        type: 'teaql-browser-sqlite-response', requestId: message.requestId, result, error,
      } } as MessageEvent<BrowserSQLiteResponse>;
      for (const listener of this.messageListeners) listener(event);
    });
  }

  addEventListener(type: 'message' | 'error', listener: any): void {
    if (type === 'message') this.messageListeners.add(listener);
    else this.errorListeners.add(listener);
  }

  removeEventListener(type: 'message' | 'error', listener: any): void {
    if (type === 'message') this.messageListeners.delete(listener);
    else this.errorListeners.delete(listener);
  }

  terminate(): void { this.terminated = true; }
}

describe('BrowserSQLiteDriver', () => {
  test('uses exact signed-i64 SQL predicates through the worker boundary', async () => {
    const worker = new FakeWorker(new Database(':memory:'));
    const schemas: Record<string, EntitySchema> = { Probe: { table: 'scalar_probe', columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      quantity: { columnName: 'quantity', logicalType: 'long', decode: 'long' },
      startsAt: { columnName: 'starts_at', logicalType: 'time', decode: 'time' },
    } } };
    const client = await BrowserSQLiteTeaQLClient.open(worker, schemas);
    try {
      await new UserContext().insertResource('dataService', client).ensureSchema();
      for (const [quantity, startsAt] of [
        ['-9223372036854775808', '00:00:00'],
        ['2', '12:30:00.1'],
        ['9007199254740993', '23:59:59.123456'],
        ['9223372036854775807', '01:02:03'],
      ]) {
        await client.executeMutation({ entity: 'Probe', action: 'Create',
          payload: { quantity: long(quantity), startsAt: localTime(startsAt) },
          comment: 'create exact browser scalar' });
      }
      const ordered = await client.executeQuery<any>(new SelectQuery('Probe')
        .order(OrderBy.asc('quantity')).limit(10)
        .comment('order browser scalar').purpose('verify exact Long order'));
      expect(ordered.map(row => row.quantity)).toEqual([
        '-9223372036854775808', '2', '9007199254740993', '9223372036854775807',
      ]);
      const matched = await client.executeQuery<any>(new SelectQuery('Probe')
        .filter({ quantity: { $gt: long('9007199254740992') },
          startsAt: { $eq: localTime('23:59:59.123456') } })
        .comment('filter browser scalar').purpose('verify exact Long and Time'));
      expect(matched.map(row => row.quantity)).toEqual(['9007199254740993']);
      expect(ordered.find(row => row.quantity === '2')?.startsAt).toBe('12:30:00.100000');
      expect(worker.requests.some(request => String(request.payload?.sql)
        .includes('CAST("quantity" AS INTEGER)'))).toBe(true);
    } finally { await client.close(); }
  });

  test('declares exact Decimal as TEXT and rejects JS number binding', async () => {
    const worker = new FakeWorker();
    const driver = await BrowserSQLiteDriver.open(worker);
    const amount = { columnName: 'amount', logicalType: 'decimal' as const, decode: 'decimal' as const };
    await driver.ensureSchema({ Payment: { table: 'payments', columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      amount,
    } } });
    expect(worker.requests.some(request =>
      String(request.payload?.sql).includes('ADD COLUMN "amount" TEXT'))).toBe(true);
    expect(driver.encode(decimal('123456789012.3456789'), amount)).toBe('123456789012.3456789');
    expect(() => driver.encode(3.5, amount)).toThrow(/Decimal requires/);
    await driver.close();
  });

  test('legacy numeric Decimal can still order and filter, while exact Decimal fails closed', async () => {
    const worker = new FakeWorker(new Database(':memory:'));
    const schemas: Record<string, EntitySchema> = { Probe: { table: 'decimal_probe', columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      amount: { columnName: 'amount', logicalType: 'decimal', decode: 'number' },
    } } };
    const client = await BrowserSQLiteTeaQLClient.open(worker, schemas);
    try {
      await new UserContext().insertResource('dataService', client).ensureSchema();
      expect(worker.requests.some(request => String(request.payload?.sql)
        .includes('ADD COLUMN "amount" NUMERIC'))).toBe(true);
      for (const amount of [20, 3.5, 129.95]) {
        await client.executeMutation({ entity: 'Probe', action: 'Create',
          payload: { amount }, comment: 'seed legacy browser amount' });
      }
      const rows = await client.executeQuery<any>(new SelectQuery('Probe')
        .filter({ amount: { $gte: 3.5 } }).order(OrderBy.asc('amount')).limit(10)
        .comment('order legacy amounts').purpose('preserve old browser example'));
      expect(rows.map(row => row.amount)).toEqual([3.5, 20, 129.95]);
      expect(worker.requests.some(request => String(request.payload?.sql)
        .includes('"amount" >= ?'))).toBe(true);
    } finally { await client.close(); }

    const exactClient = await BrowserSQLiteTeaQLClient.open(new FakeWorker(), {
      Probe: { ...schemas.Probe, columns: { ...schemas.Probe.columns,
        amount: { columnName: 'amount', logicalType: 'decimal', decode: 'decimal' },
      } },
    });
    try {
      await expect(exactClient.executeQuery(new SelectQuery('Probe')
        .order(OrderBy.asc('amount')).limit(10)
        .comment('order exact browser amount').purpose('require an exact comparison')))
        .rejects.toThrow('EXACT_DECIMAL_UNSUPPORTED');
    } finally { await exactClient.close(); }
  });

  test('defaults to a deterministic in-memory database', async () => {
    const worker = new FakeWorker();
    const driver = await BrowserSQLiteDriver.open(worker);

    expect(worker.requests[0]).toMatchObject({
      operation: 'open',
      payload: { storage: 'memory', databaseName: 'teaql-browser.sqlite3' },
    });
    await driver.close();
    expect(worker.terminated).toBe(true);
  });

  test('supports explicit OPFS and buffered stream compatibility', async () => {
    const worker = new FakeWorker();
    const driver = await BrowserSQLiteDriver.open(worker, {
      storage: 'opfs', databaseName: 'demo.sqlite3', terminateWorkerOnClose: false,
    });

    const rows: unknown[] = [];
    for await (const row of driver.stream('SELECT id, name FROM demo')) rows.push(row);
    expect(rows).toEqual([{ id: 1, name: 'Local' }]);
    expect(worker.requests[0].payload).toMatchObject({ storage: 'opfs', databaseName: 'demo.sqlite3' });
    await driver.close();
    expect(worker.terminated).toBe(false);
  });

  test('serializes a transaction and rolls it back on failure', async () => {
    const worker = new FakeWorker();
    const driver = await BrowserSQLiteDriver.open(worker);

    await expect(driver.transaction(async session => {
      await session.query('UPDATE demo SET name = ?', ['Changed']);
      throw new Error('reject mutation');
    })).rejects.toThrow('reject mutation');

    expect(worker.requests.filter(request => request.operation === 'query')
      .map(request => request.payload?.sql)).toEqual([
        'BEGIN IMMEDIATE', 'UPDATE demo SET name = ?', 'ROLLBACK',
      ]);
    await driver.close();
  });

  test('reset invalidates schema state and explicitly reconciles it again', async () => {
    const worker = new FakeWorker();
    const client = await BrowserSQLiteTeaQLClient.open(worker, {});
    const context = new UserContext().insertResource('dataService', client);
    client.setUserContext(context);

    await context.ensureSchema();
    await client.reset(context);

    expect(worker.requests.filter(request => request.operation === 'reset')).toHaveLength(1);
    expect(worker.requests.filter(request =>
      request.operation === 'query' && String(request.payload?.sql).includes('teaql_id_space'),
    )).toHaveLength(2);
    await client.close();
  });

  test('rejects path-like database names', async () => {
    await expect(BrowserSQLiteDriver.open(new FakeWorker(), {
      databaseName: '../outside.sqlite3',
    })).rejects.toThrow('simple file name');
  });

  test.each(['memory', 'opfs'] as const)(
    '%s profile applies Mutation Policy before sending SQL to the worker',
    async storage => {
      const worker = new FakeWorker();
      const client = await BrowserSQLiteTeaQLClient.open(worker, {}, { storage });
      const context = new UserContext().withMutationPolicyRegistry(
        new DelegatingMutationPolicyRegistry(() => ({
          identity: { policyId: 'browser-demo', version: '1', fingerprint: 'sha256:demo' },
          review: () => ({ verdict: 'deny', code: 'DEMO_DENIED', message: 'disabled' }),
        })),
      );
      client.setUserContext(context);
      const queriesBefore = worker.requests.filter(request => request.operation === 'query').length;

      await expect(client.executeMutation({
        entity: 'Demo', action: 'Create', payload: { name: 'blocked' }, comment: 'demo',
      })).rejects.toThrow(MutationPolicyError);
      expect(worker.requests.filter(request => request.operation === 'query')).toHaveLength(queriesBefore);
      await client.close();
    },
  );
});
