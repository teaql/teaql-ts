import { mergeDynamicSearch, SearchModel } from '../src/core/dynamic-search';
import { OrderBy, SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { RuntimeModule } from '../src/core/runtime-module';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

const models: Record<string, SearchModel> = {
  Order: {fields: {id: 'integer', name: 'string', tenant: 'integer', customer: 'integer'}, relations: {customer: 'Customer'}},
  Customer: {fields: {id: 'integer', name: 'string', tenant: 'integer'}, relations: {}},
};
const numberColumn = (name: string) => ({columnName: name, logicalType: 'integer' as const, decode: 'number' as const});
const schemas: Record<string, EntitySchema> = Object.fromEntries(['Order', 'Customer'].map(entity => [entity, {
  table: entity.toLowerCase() + '_data',
  columns: {id: numberColumn('id'), version: numberColumn('version'), tenant: numberColumn('tenant'),
    name: {columnName: 'name', logicalType: 'text', decode: 'native'},
    ...(entity === 'Order' ? {customer: numberColumn('customer')} : {})},
}])) as Record<string, EntitySchema>;

test('unknown clauses disappear while real SQLite execution retains tenant scope and nested sibling', async () => {
  const client = new SQLiteTeaQLClient(':memory:', {}).install(new RuntimeModule(schemas)) as SQLiteTeaQLClient;
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const tenant of [1, 2]) {
      const customer = await client.executeMutation({entity: 'Customer', action: 'Create',
        payload: {name: 'Ada', tenant}, comment: 'seed scoped search fixture'});
      await client.executeMutation({entity: 'Order', action: 'Create',
        payload: {name: 'matched', tenant, customer: Number(customer.id)}, comment: 'seed scoped order'});
    }
    const base = new SelectQuery('Order').filter({tenant: {$eq: 1}}).limit(10)
      .comment('what: read scoped orders').purpose('why: verify dynamic search');
    base.orderItems.push(OrderBy.asc('id'));
    const before = JSON.stringify(base);
    const warn = jest.fn();
    const {query, warnings} = mergeDynamicSearch(base, {filter: {
      removed: 'SECRET', 'missing.name': 'SECRET', 'customer.removed': 'SECRET',
      'customer.name': {$eq: 'Ada'}, name: {$eq: 'matched'},
    }, orderBy: [{field: 'removed', direction: 'desc'}]}, models, {
      filter: (path, predicate) => {
        if (path === 'customer.name') {
          const child = new SelectQuery('Customer').filter({$and: [
            {tenant: {$eq: 1}}, {version: {$gte: 1}}, {name: predicate},
          ]});
          return {customer: {$inSubquery: {query: child, field: 'id'}}};
        }
        return {[path]: predicate};
      },
      order: (path, direction) => direction === 'asc' ? OrderBy.asc(path) : OrderBy.desc(path),
    }, warn);
    const rows = await client.executeQuery(query);
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant).toBe(1);
    expect(query.limitValue).toBe(10);
    expect(query.orderItems).toEqual(base.orderItems);
    expect(JSON.stringify(base)).toBe(before);
    expect(warnings).toHaveLength(4);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET');
  } finally { await client.close(); }
});

test('binding failure cannot mutate scoped query or publish partial warnings', () => {
  const base = new SelectQuery('Order').filter({tenant: 1}).limit(10);
  const before = JSON.stringify(base);
  const warn = jest.fn();
  expect(() => mergeDynamicSearch(base, {filter: {removed: 'secret', name: 'ok'}}, models, {
    filter: () => { throw new Error('unsupported trusted binding'); }, order: () => OrderBy.asc('id'),
  }, warn)).toThrow();
  expect(JSON.stringify(base)).toBe(before);
  expect(warn).not.toHaveBeenCalled();
});
