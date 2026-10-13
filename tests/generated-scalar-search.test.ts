import { SelectQuery, OrderBy } from '../src/core/ast';
import { mergeGeneratedScalarSearch, GeneratedSearchModel } from '../src/core/dynamic-search';
import { RuntimeModule } from '../src/core/runtime-module';
import { UserContext } from '../src/core/context';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

const models: Record<string, GeneratedSearchModel> = {
  Invoice: {
    fields: {referenceCode: 'string', reference_code: 'string', totalAmount: 'decimal', active: 'boolean', owner: 'integer', payload: 'unsupported'},
    relations: {owner: 'Owner'},
    queryFields: {referenceCode: 'referenceCode', reference_code: 'referenceCode', totalAmount: 'totalAmount', active: 'active', owner: 'owner'},
  },
  Owner: {fields: {name: 'string'}, relations: {}, queryFields: {name: 'name'}},
};

test('generated scalar search applies every valid sibling and preserves scope, order and ownership', async () => {
  const columns = {
    id: {columnName: 'id', logicalType: 'integer' as const, decode: 'number' as const},
    version: {columnName: 'version', logicalType: 'integer' as const, decode: 'number' as const},
    tenant: {columnName: 'tenant', logicalType: 'integer' as const, decode: 'number' as const},
    referenceCode: {columnName: 'reference_code', logicalType: 'text' as const, decode: 'native' as const},
    totalAmount: {columnName: 'total_amount', logicalType: 'decimal' as const, decode: 'number' as const},
    active: {columnName: 'active', logicalType: 'boolean' as const, decode: 'native' as const},
  };
  const client = new SQLiteTeaQLClient(':memory:', {}).install(new RuntimeModule({Invoice: {table: 'invoice_data', columns}})) as SQLiteTeaQLClient;
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const [tenant, referenceCode, totalAmount, active] of [[1, 'KEEP-1', 100, true], [1, 'KEEP-2', 20, true], [2, 'KEEP-3', 100, true]]) {
      await client.executeMutation({entity: 'Invoice', action: 'Create', payload: {tenant, referenceCode, totalAmount, active}, comment: 'seed scalar search'});
    }
    const base = new SelectQuery('Invoice').filter({tenant: {$eq: 1}}).select(['id', 'referenceCode']).limit(4)
      .order(OrderBy.asc('id')).comment('load scoped invoices').purpose('verify generated scalar search');
    const before = JSON.stringify(base), warnings = jest.fn();
    const input = {filter: {reference_code: {$contains: 'KEEP'}, totalAmount: {$gte: '50.00'}, active: true, removed: 'PRIVATE'},
      orderBy: [{field: 'reference_code', direction: 'desc'}]};
    const {query} = mergeGeneratedScalarSearch(base, input, models, warnings);
    input.filter.reference_code.$contains = 'changed';
    expect(JSON.stringify(base)).toBe(before);
    expect(query.limitValue).toBe(4);
    expect(query.commentText).toBe(base.commentText);
    expect(query.purposeText).toBe(base.purposeText);
    expect(query.orderItems.map(order => order.field)).toEqual(['id', 'referenceCode']);
    const rows = await client.executeQuery(query);
    expect(rows.map(row => row.referenceCode)).toEqual(['KEEP-1']);
    expect(warnings).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warnings.mock.calls)).not.toContain('PRIVATE');
  } finally { await client.close(); }
});

test('known relation paths require trusted bindings and fail atomically instead of being dropped', () => {
  const base = new SelectQuery('Invoice').filter({tenant: 1}).limit(4);
  const before = JSON.stringify(base), warnings = jest.fn();
  expect(() => mergeGeneratedScalarSearch(base, {filter: {removed: 'secret', 'owner.name': 'Ada'}}, models, warnings))
    .toThrow('trusted relation binding');
  expect(JSON.stringify(base)).toBe(before);
  expect(warnings).not.toHaveBeenCalled();
});

test.each([{filter: {active: 'true'}}, {filter: {totalAmount: {$contains: '1'}}},
  {filter: {referenceCode: {$rawSQL: 'true'}}}, {filter: {}, context: {actor: 'admin'}},
  {filter: {payload: null}}, {orderBy: [{field: 'payload', direction: 'asc'}]},
  {filter: {referenceCode: {$contains: null}}}, {filter: {totalAmount: {$gt: null}}}])(
  'invalid known values and trusted controls remain fatal: %j', input => {
    const base = new SelectQuery('Invoice').filter({tenant: 1});
    expect(() => mergeGeneratedScalarSearch(base, input, models)).toThrow();
    expect(base.filterCondition).toEqual({tenant: 1});
  });
