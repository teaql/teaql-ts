import { UserContext } from '../src/core/context';
import {
  BrowserSQLiteDriver,
  BrowserSQLiteTeaQLClient,
  BrowserSQLiteWorkerLike,
} from '../src/sql/browser-sqlite';
import {
  BrowserSQLiteRequest,
  BrowserSQLiteResponse,
} from '../src/sql/browser-sqlite-protocol';

class FakeWorker implements BrowserSQLiteWorkerLike {
  readonly requests: BrowserSQLiteRequest[] = [];
  terminated = false;
  private readonly messageListeners = new Set<(event: MessageEvent<BrowserSQLiteResponse>) => void>();
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>();

  postMessage(message: BrowserSQLiteRequest): void {
    this.requests.push(message);
    queueMicrotask(() => {
      let result: unknown;
      if (message.operation === 'query') {
        const sql = String(message.payload?.sql ?? '');
        result = sql.startsWith('SELECT')
          ? { rows: [{ id: 1, name: 'Local' }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      const event = { data: {
        type: 'teaql-browser-sqlite-response', requestId: message.requestId, result,
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
});
