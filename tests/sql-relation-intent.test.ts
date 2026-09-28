import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK, projectSQLLog } from '../src/core/log-privacy';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionMetadata, SqlQueryResult } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

const column = (columnName: string, integer = false) => ({ columnName,
  logicalType: integer ? 'integer' as const : 'text' as const,
  decode: integer ? 'string' as const : 'native' as const, logPolicy: 'plain' as const });
const schemas: Record<string, EntitySchema> = {
  Customer: { table: 'customer_data', auditMaskFields: ['name'], columns: {
    id: column('id', true), version: column('version', true), name: column('name'), password: column('password'),
  }, relations: { orders: { targetEntity: 'Order', localKey: 'id', foreignKey: 'customerId', many: true } } },
  Order: { table: 'order_data', auditMaskFields: ['name'], columns: {
    id: column('id', true), version: column('version', true), customerId: column('customer_id', true), name: column('name'),
  }, relations: { lines: { targetEntity: 'Line', localKey: 'id', foreignKey: 'orderId', many: true } } },
  Line: { table: 'line_data', columns: {
    id: column('id', true), version: column('version', true), orderId: column('order_id', true),
  } },
};
class Driver extends SQLiteDriver {
  failingTable?: string;
  readonly failure = new Error('DRIVER-CANARY');
  readonly reads: Array<{ sql: string; values: any[] }> = [];
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (sql.startsWith('SELECT')) {
      this.reads.push({ sql, values: [...values] });
      if (this.failingTable && sql.includes(this.failingTable)) throw this.failure;
    }
    return super.query(sql, values);
  }
  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    this.reads.push({ sql, values: [...values] });
    yield* super.stream(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  readonly dispatched: string[] = [];
  constructor(driver: Driver) { super(driver, schemas); }
  override async executeQuery<T = any>(query: any): Promise<T[]> {
    this.dispatched.push(query.entity);
    return super.executeQuery<T>(query);
  }
}
async function fixture() {
  const driver = new Driver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  for (const [entity, payload] of [
    ['Customer', { name: 'Riverside', password: 'PASSWORD-CANARY' }],
    ['Order', { customerId: '1', name: 'Lakeside' }],
    ['Line', { orderId: '1' }],
  ] as const) await client.executeMutation({ entity, action: 'Create', id: '1', payload, comment: 'seed relation fixture' });
  const logs: SQLExecutionMetadata[] = [];
  client.setDiagnosticSQLLogSink({ write: entry => logs.push(entry) });
  driver.reads.length = 0;
  return { client, driver, logs };
}
const previous = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = previous;
});

const cases = ['batch', 'probe', 'window', 'aggregate', 'nested', 'stream'].flatMap(shape =>
  [false, true].flatMap(debug => [false, true].map(failure => ({ shape, debug, failure }))));
test.each(cases)('relation intent $shape debug=$debug failure=$failure', async ({ shape, debug, failure }) => {
  const f = await fixture();
  try {
    if (debug) process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
    if (failure) f.driver.failingTable = shape === 'nested' ? 'line_data' : 'order_data';
    const query = new SelectQuery('Customer').filter({ name: { $eq: 'Riverside' }, password: { $eq: 'PASSWORD-CANARY' } })
      .limit(1).comment('what: load Riverside PASSWORD-CANARY details').purpose('why: verify derived query intent');
    const child = new SelectQuery('Order');
    if (shape === 'probe') child.limit(1).topNProbeParentThreshold(32);
    if (shape === 'window') child.limit(1).topNProbeParentThreshold(0);
    if (shape === 'nested') child.filter({ name: { $eq: 'Lakeside' } }).relationQuery('lines', new SelectQuery('Line').limit(2));
    if (shape === 'aggregate') query.relationAggregate('orders', 'count', child);
    else if (shape === 'batch') query.relation('orders');
    else query.relationQuery('orders', child);
    const execute = async () => {
      if (shape !== 'stream') return f.client.executeQuery(query);
      const rows: any[] = [];
      for await (const chunk of f.client.executeForStream(query, 1)) rows.push(...chunk);
      return rows;
    };
    if (failure) await expect(execute()).rejects.toBe(f.driver.failure);
    else expect(await execute()).toHaveLength(1);
    expect(f.client.dispatched).toEqual(shape === 'stream' ? ['Order']
      : shape === 'nested' ? ['Customer', 'Order', 'Line'] : ['Customer', 'Order']);
    expect(f.logs).toHaveLength(shape === 'nested' ? 3 : 2);
    const entry = f.logs.find(item => item.parameterizedSQL.includes(shape === 'nested' ? 'line_data' : 'order_data'))!;
    expect(entry.comment).toContain('what: load');
    expect(entry.purpose).toBe('why: verify derived query intent');
    expect(entry.executionOutcome).toBe(failure ? 'failure' : 'success');
    expect(entry.comment?.includes('Riverside')).toBe(debug);
    expect(JSON.stringify(f.logs)).not.toContain('PASSWORD-CANARY');
    if (!debug) expect(JSON.stringify(f.logs)).not.toContain('Riverside');
    expect(entry.debugSQL).toContain(shape === 'nested' ? 'line_data' : 'order_data');
    expect(entry.parameters).toHaveLength(f.driver.reads[f.driver.reads.length - 1].values.length);
    expect(f.driver.reads[0].values).toContain('PASSWORD-CANARY');
    if (shape === 'batch') expect(entry.parameterizedSQL).toContain(' IN (');
    if (shape === 'window') expect(entry.parameterizedSQL).toMatch(/ROW_NUMBER\(\) OVER/i);
    if (shape === 'probe') {
      expect(entry.parameterizedSQL).not.toContain(' IN (');
      expect(entry.parameterizedSQL).not.toMatch(/ROW_NUMBER/i);
    }
    delete process.env[PLAINTEXT_LOG_ENV];
    expect(JSON.stringify(projectSQLLog(entry))).not.toMatch(/Riverside|PASSWORD-CANARY/);
    f.driver.failingTable = undefined;
    await f.client.executeQuery(new SelectQuery('Customer').limit(1)
      .comment('what: independent Riverside').purpose('why: verify provenance isolation'));
    expect(f.logs[f.logs.length - 1].comment).toBe('what: independent Riverside');
  } finally { await f.client.close(); }
});
