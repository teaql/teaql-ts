import { OrderBy, SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, TeaQLSqlDriver } from '../src/sql/core';

class Driver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  calls: Array<{ sql: string; values: any[] }> = [];
  rows = [5, 4, 3, 2, 1].map(id => ({ id, version: 1, name: `ORDER-${id}` }));
  idOnlyCalls = 0;
  idQueryDelay = 0;
  async query(sql: string, values: any[] = []) {
    this.calls.push({ sql, values });
    if (!sql.includes('"name"')) {
      this.idOnlyCalls += 1;
      if (this.idQueryDelay) await new Promise(resolve => setTimeout(resolve, this.idQueryDelay));
      return { rows: this.rows.map(({ id }) => ({ id })), rowCount: this.rows.length };
    }
    const requested = new Set(values.slice(0, -1).map(value => Number(value)));
    const rows = sql.includes(' IN ')
      ? this.rows.filter(row => requested.has(row.id))
      : this.rows.slice(0, Number(values[values.length - 1] ?? this.rows.length));
    return { rows: [...rows].reverse(), rowCount: rows.length };
  }
  async *stream(): AsyncIterable<any> { /* unused */ }
  identifier(value: string) { return `"${value}"`; }
  placeholder(index: number) { return `$${index}`; }
  encode(value: any) { return value; }
  contains(column: string, placeholder: string) { return `${column} LIKE ${placeholder}`; }
  aggregateFunction(name: string) { return name.toUpperCase(); }
  async ensureSchema() {}
  async transaction<T>(work: (session: any) => Promise<T>): Promise<T> { return work(this); }
  async nextId() { return '1'; }
  async ensureIdFloor() {}
  async close() {}
}

class Client extends AbstractSQLTeaQLClient {
  constructor(public driver: Driver) {
    super(driver, { Order: { table: 'orders', columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'number' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      name: { columnName: 'name', logicalType: 'text', decode: 'string' },
    } } });
  }
}

test('ID set pagination builds once, jumps arbitrarily, and restores retained order', async () => {
  const driver = new Driver();
  const client = new Client(driver);
  const context = new UserContext();
  context.userIdentifier = 'tenant:user';

  const page = (offset: number) => client.executeQuery(context.prepareQuery(
    new SelectQuery('Order')
      .order(OrderBy.desc('id')).offset(offset).limit(2)
      .comment('load order page').purpose('verify ID set pagination')
      .optimizePaginationWithIdSetConfig('orders', 60, 100),
  ));

  expect((await page(2)).map(row => row.id)).toEqual([3, 2]);
  expect(context.idSetPaginationPlan).toBe('ID_SET_BUILD');
  expect(context.idSetPaginationCount).toBe(5);
  expect((await page(0)).map(row => row.id)).toEqual([5, 4]);
  expect(context.idSetPaginationPlan).toBe('ID_SET_HIT');
  expect(driver.calls).toHaveLength(3);
});

test('ID set pagination reports overflow as a lower bound and visibly falls back', async () => {
  const driver = new Driver(); const client = new Client(driver); const context = new UserContext();
  await client.executeQuery(context.prepareQuery(new SelectQuery('Order')
    .order(OrderBy.desc('id')).offset(0).limit(2).comment('overflow').purpose('overflow')
    .optimizePaginationWithIdSetConfig('overflow', 60, 3)));
  expect(context.idSetPaginationPlan).toBe('ID_SET_FALLBACK_LIMIT_EXCEEDED');
  expect(context.idSetPaginationCount).toBe(4);
  expect(context.idSetPaginationCountAccuracy).toBe('LOWER_BOUND');
});

test('ID set pagination retains an empty exact result', async () => {
  const driver = new Driver(); driver.rows = [];
  const client = new Client(driver); const context = new UserContext();
  const query = () => new SelectQuery('Order').order(OrderBy.desc('id')).offset(0).limit(2)
    .comment('empty').purpose('empty').optimizePaginationWithIdSetConfig('empty', 60, 10);
  expect(await client.executeQuery(context.prepareQuery(query()))).toEqual([]);
  expect(context.idSetPaginationCount).toBe(0);
  expect(await client.executeQuery(context.prepareQuery(query()))).toEqual([]);
  expect(context.idSetPaginationPlan).toBe('ID_SET_HIT');
  expect(driver.idOnlyCalls).toBe(1);
});

test('ID set pagination coalesces concurrent misses and isolates principal identity', async () => {
  const driver = new Driver(); driver.idQueryDelay = 20;
  const client = new Client(driver); const context = new UserContext(); context.userIdentifier = 'alice';
  const query = () => new SelectQuery('Order').order(OrderBy.desc('id')).offset(0).limit(2)
    .comment('concurrent').purpose('concurrent').optimizePaginationWithIdSetConfig('shared', 60, 10);
  await Promise.all([
    client.executeQuery(context.prepareQuery(query())),
    client.executeQuery(context.prepareQuery(query())),
  ]);
  expect(driver.idOnlyCalls).toBe(1);
  context.userIdentifier = 'bob';
  await client.executeQuery(context.prepareQuery(query()));
  expect(driver.idOnlyCalls).toBe(2);
});

test('ID set pagination isolates active root and data-service identity', async () => {
  const driver = new Driver(); const client = new Client(driver);
  const context = new UserContext().insertResource('dataService', { name: 'source-a' })
    .withActiveRoot({ entity: 'Platform', id: 1 });
  const query = () => new SelectQuery('Order').order(OrderBy.desc('id')).offset(0).limit(2)
    .comment('scope').purpose('scope').optimizePaginationWithIdSetConfig('scope', 60, 10);
  await client.executeQuery(context.prepareQuery(query()));
  context.withActiveRoot({ entity: 'Platform', id: 2 });
  await client.executeQuery(context.prepareQuery(query()));
  context.insertResource('dataService', { name: 'source-b' });
  await client.executeQuery(context.prepareQuery(query()));
  expect(driver.idOnlyCalls).toBe(3);
});

test('ID set pagination does not shift another ID into a retained page after deletion', async () => {
  const driver = new Driver(); const client = new Client(driver); const context = new UserContext();
  const page = (offset: number) => client.executeQuery(context.prepareQuery(new SelectQuery('Order')
    .order(OrderBy.desc('id')).offset(offset).limit(2).comment('snapshot').purpose('snapshot')
    .optimizePaginationWithIdSetConfig('snapshot', 60, 10)));
  await page(0);
  driver.rows = driver.rows.filter(row => row.id !== 3);
  expect((await page(2)).map(row => row.id)).toEqual([2]);
  expect(context.idSetPaginationPlan).toBe('ID_SET_HIT');
});

test('ID set pagination rejects unsupported aggregate shapes without changing the query', async () => {
  const driver = new Driver(); const client = new Client(driver); const context = new UserContext();
  await client.executeQuery(context.prepareQuery(new SelectQuery('Order')
    .aggregate('Count', 'id', 'count').limit(2).comment('aggregate').purpose('aggregate')
    .optimizePaginationWithIdSetConfig('aggregate', 60, 10)));
  expect(context.idSetPaginationPlan).toBe('ID_SET_FALLBACK_UNSUPPORTED_SHAPE');
  expect(context.idSetPaginationCountAccuracy).toBe('UNKNOWN');
});

test('ID set pagination appends the canonical ID tie-breaker', async () => {
  const driver = new Driver(); const client = new Client(driver); const context = new UserContext();
  await client.executeQuery(context.prepareQuery(new SelectQuery('Order')
    .order(OrderBy.desc('name')).offset(0).limit(2).comment('tie breaker').purpose('tie breaker')
    .optimizePaginationWithIdSetConfig('tie-breaker', 60, 10)));
  expect(driver.calls[0].sql).toMatch(/ORDER BY "name" DESC, "id" ASC/);
});

test('ID set pagination rebuilds after TTL expiry', async () => {
  const driver = new Driver(); const client = new Client(driver); const context = new UserContext();
  const query = () => new SelectQuery('Order').order(OrderBy.desc('id')).offset(0).limit(2)
    .comment('ttl').purpose('ttl').optimizePaginationWithIdSetConfig('ttl', 1, 10);
  await client.executeQuery(context.prepareQuery(query()));
  await new Promise(resolve => setTimeout(resolve, 1_050));
  await client.executeQuery(context.prepareQuery(query()));
  expect(driver.idOnlyCalls).toBe(2);
  expect(context.idSetPaginationPlan).toBe('ID_SET_BUILD');
});

test('ID set pagination store failure falls back without changing business rows', async () => {
  const driver = new Driver(); const client = new Client(driver);
  const context = new UserContext().installIdSetPaginationStore({
    get() { throw new Error('store unavailable'); },
    put() { throw new Error('store unavailable'); },
  });
  const rows = await client.executeQuery(context.prepareQuery(new SelectQuery('Order')
    .order(OrderBy.desc('id')).offset(0).limit(2).comment('fallback').purpose('fallback')
    .optimizePaginationWithIdSetConfig('unavailable', 60, 10)));
  expect(context.idSetPaginationPlan).toBe('ID_SET_FALLBACK_STORE_UNAVAILABLE');
  expect(rows.map(row => row.id).sort((a, b) => b - a)).toEqual([5, 4]);
});
