import {startBrowserSQLiteWorker} from '../src/sql/browser-sqlite-worker';
import {BrowserSQLiteRequest, BrowserSQLiteResponse} from '../src/sql/browser-sqlite-protocol';
import {WasmScalarFunction} from '../src/sql/sqlite-wasm-scalars';

const mockDatabases: MockDatabase[] = [];
let mockRegistrationFailure = false;
class MockDatabase {
  readonly functions = new Map<string, WasmScalarFunction>();
  closed = false;
  constructor(readonly filename: string, readonly flags: string) {mockDatabases.push(this);}
  createFunction(fn: WasmScalarFunction): void {
    if (mockRegistrationFailure) throw new Error('registration failed');
    this.functions.set(fn.name, fn);
  }
  exec(input: string | {sql: string}): unknown[] {
    if (typeof input !== 'string' && input.sql === 'FAIL') throw new Error('statement failed');
    return [];
  }
  changes(): number {return 0;}
  close(): void {this.closed = true;}
}

jest.mock('@sqlite.org/sqlite-wasm', () => ({
  __esModule: true,
  default: jest.fn(async () => ({
    capi: {sqlite3_js_aggregate_context: (context: number) => context},
    oo1: {DB: MockDatabase, OpfsDb: MockDatabase},
  })),
}));

function fixture() {
  let listener: (event: MessageEvent<BrowserSQLiteRequest>) => void;
  let sequence = 0;
  const pending = new Map<number, (response: BrowserSQLiteResponse) => void>();
  startBrowserSQLiteWorker({scope: {
    addEventListener(_type, handler) {listener = handler;},
    postMessage(response) {pending.get(response.requestId)!(response); pending.delete(response.requestId);},
  }});
  return (operation: BrowserSQLiteRequest['operation'], payload?: Record<string, unknown>) =>
    new Promise<BrowserSQLiteResponse>(resolve => {
      const requestId = ++sequence;
      pending.set(requestId, resolve);
      listener({data: {type: 'teaql-browser-sqlite-request', requestId, operation, payload}} as MessageEvent<BrowserSQLiteRequest>);
    });
}

beforeEach(() => {mockDatabases.length = 0; mockRegistrationFailure = false;});

test.each(['memory', 'opfs'])('%s does not enable SQLite raw SQL console tracing', async storage => {
  const request = fixture();
  expect((await request('open', {storage})).error).toBeUndefined();
  const db = mockDatabases[0];
  expect(db.flags).toBe('c');
  expect([...db.functions.keys()].sort()).toEqual([
    'teaql_decimal_cmp', 'teaql_decimal_max', 'teaql_decimal_min',
    'teaql_decimal_order_key', 'teaql_decimal_sum',
  ]);
  expect((await request('close')).error).toBeUndefined();
  expect(db.closed).toBe(true);
});

test.each(['SELECT 1', 'FAIL'])('statement completion releases aggregate state: %s', async sql => {
  const request = fixture();
  await request('open');
  const sum = mockDatabases[0].functions.get('teaql_decimal_sum')!;
  sum.xStep!(17, '9007199254740993.10');
  const response = await request('query', {sql});
  expect(response.error?.message).toBe(sql === 'FAIL' ? 'statement failed' : undefined);
  expect(sum.xFinal!(17)).toBeNull();
  expect((await request('query', {sql: 'SELECT 2'})).error).toBeUndefined();
  await request('close');
});

test('reopen closes the old database and releases its aggregate state', async () => {
  const request = fixture();
  await request('open');
  const old = mockDatabases[0], sum = old.functions.get('teaql_decimal_sum')!;
  sum.xStep!(17, '100.00');
  await request('open', {storage: 'opfs'});
  expect(old.closed).toBe(true);
  expect(sum.xFinal!(17)).toBeNull();
  expect(mockDatabases[1].flags).toBe('c');
  await request('close');
});

test('failed function registration closes the database rather than leaving a partial provider', async () => {
  const request = fixture();
  mockRegistrationFailure = true;
  expect((await request('open')).error?.message).toBe('registration failed');
  expect(mockDatabases[0].closed).toBe(true);
  expect((await request('query', {sql: 'SELECT 1'})).error?.message).toBe('Browser SQLite database is not open');
  mockRegistrationFailure = false;
  expect((await request('open')).error).toBeUndefined();
  await request('close');
});
