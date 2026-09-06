import { normalizeDynamicSearch, SearchModel } from '../src/core/dynamic-search';

const models: Record<string, SearchModel> = {
  Order: { fields: { id: 'integer', name: 'string', amount: 'number' }, relations: { customer: 'Customer' } },
  Customer: { fields: { name: 'string' }, relations: {} },
};

test('DYN-WARN-001 through 006: complete unknown clauses vanish, siblings remain, no values leak', () => {
  const warn = jest.fn();
  const result = normalizeDynamicSearch({ filter: {
    removed: 'SECRET', 'missing.name': 'SECRET', 'customer.removed': 'SECRET', name: 'valid',
  }, orderBy: [{ field: 'removed', direction: 'asc' }, { field: 'id', direction: 'desc' }] }, 'Order', models, warn);
  expect(result.search.filter).toEqual({ name: { $eq: 'valid' } });
  expect(result.search.orderBy).toEqual([{ field: 'id', direction: 'desc' }]);
  expect(result.warnings.map(w => w.fieldPath)).toEqual(['removed', 'missing.name', 'customer.removed', 'removed']);
  expect(result.warnings.every(w => w.code === 'DYNAMIC_SEARCH_UNKNOWN_FIELD' && w.entity === 'Order')).toBe(true);
  expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET');
});

test('valid nested fields are retained without partial relation construction', () => {
  expect(normalizeDynamicSearch({filter: {'customer.name': {$contains: 'Ada'}}}, 'Order', models).search.filter)
    .toEqual({'customer.name': {$contains: 'Ada'}});
});

test('DYN-WARN-007: malformed input and context injection are fatal', () => {
  for (const input of ['{', '[]', 'null', '{} {}', '{"tenant":1}', '{"hardLimit":999999}', '{"policy":{}}']) {
    expect(() => normalizeDynamicSearch(input, 'Order', models)).toThrow();
  }
});

test('operator, known-field conversion, resource limits and dangerous paths stay fatal', () => {
  for (const input of [
    {filter: {removed: {$invented: 1}}}, {filter: {amount: 'not numeric'}},
    {filter: {id: 1.5}}, {filter: {'constructor.name': 'x'}},
    {filter: {name: {$in: 'not-array'}}}, {orderBy: [{field: 'name', direction: 'sideways'}]},
  ]) expect(() => normalizeDynamicSearch(input, 'Order', models)).toThrow();
  expect(() => normalizeDynamicSearch({filter: {name: 'a', amount: 1}}, 'Order', models, jest.fn(), 1)).toThrow();
});

test('fatal sibling produces neither input mutations nor partial warning emissions', () => {
  const warn = jest.fn();
  const source = {filter: {removed: 'secret', amount: 'bad'}};
  const before = JSON.stringify(source);
  expect(() => normalizeDynamicSearch(source, 'Order', models, warn)).toThrow();
  expect(warn).not.toHaveBeenCalled();
  expect(JSON.stringify(source)).toBe(before);
});

test('date, millisecond timestamp and decimal validation retain exact values', () => {
  const typed: Record<string, SearchModel> = {Ledger: {fields: {
    date: 'date', created: 'timestamp', amount: 'decimal',
  }, relations: {}}};
  const result = normalizeDynamicSearch({filter: {date: '2024-02-29', created: 1709164800000,
    amount: '9007199254740993.01'}}, 'Ledger', typed);
  expect(result.search.filter!.amount).toEqual({$eq: '9007199254740993.01'});
  for (const filter of [{date: '2025-02-29'}, {date: '0000-01-01'}, {created: '2024-02-29'}, {created: 1.5},
    {amount: 'NaN'}, {amount: Infinity}]) {
    expect(() => normalizeDynamicSearch({filter}, 'Ledger', typed)).toThrow();
  }
});
