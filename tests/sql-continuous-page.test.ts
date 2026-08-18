import { OrderBy, SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, TeaQLSqlDriver } from '../src/sql/core';

class Driver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  calls: Array<{ sql: string; values: any[] }> = [];
  async query(sql: string, values: any[] = []) { this.calls.push({ sql, values }); const start = this.calls.length === 1 ? 100 : 90; return { rows: Array.from({ length: 10 }, (_, i) => ({ id: start - i })), rowCount: 10 }; }
  async *stream(): AsyncIterable<any> { /* unused */ }
  identifier(value: string) { return `"${value}"`; }
  placeholder(index: number) { return `$${index}`; }
  encode(value: any) { return value; }
  contains(column: string, placeholder: string) { return `${column} LIKE ${placeholder}`; }
  aggregateFunction(name: string) { return name.toUpperCase(); }
  async ensureSchema() {}
  async transaction<T>(work: (session: any) => Promise<T>): Promise<T> { return work(this); }
  async nextId() { return '1'; }
  async close() {}
}
class Client extends AbstractSQLTeaQLClient { constructor(public d: Driver) { super(d, { Order: { table: 'orders', columns: { id: { columnName: 'id', logicalType: 'integer', decode: 'number' } } } }); } }

test.each([[OrderBy.desc('id'), '<'], [OrderBy.asc('id'), '>']])('continuous page uses seek for %s', async (order, operator) => {
  const driver = new Driver(); const client = new Client(driver); const context = new UserContext(); context.userIdentifier = 'tenant:user';
  for (const offset of [0, 10]) {
    const query = new SelectQuery('Order').order(order as OrderBy).offset(offset).limit(10).purpose('browse').comment('orders').optimizeForContinuousPageFetchWith('orders', 60);
    await client.executeQuery(context.prepareQuery(query));
  }
  expect(context.continuousPagePlan).toBe('CURSOR_SEEK');
  expect(driver.calls[1].sql).not.toContain('OFFSET');
  expect(driver.calls[1].sql).toContain(operator);
});
