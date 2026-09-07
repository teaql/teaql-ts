/** Local UI-search normalization. This is deliberately not a federation decoder. */
import { OrderBy, SelectQuery } from './ast';
export type SearchValueType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'timestamp' | 'decimal';
export interface SearchModel {
  fields: Readonly<Record<string, SearchValueType>>;
  relations: Readonly<Record<string, string>>;
}
export interface DynamicSearchWarning {
  code: 'DYNAMIC_SEARCH_UNKNOWN_FIELD';
  entity: string;
  clause: 'FILTER' | 'ORDER_BY';
  fieldPath: string;
}
export interface DynamicSearchInput {
  filter?: Record<string, unknown>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
}

/** Trusted application adapters compile canonical model paths using native query APIs. */
export interface DynamicSearchBindings {
  filter(path: string, predicate: unknown): unknown;
  order(path: string, direction: 'asc' | 'desc'): OrderBy;
}

/** Add validated search clauses to an existing scoped query; never replace its policies. */
export function mergeDynamicSearch(
  base: SelectQuery,
  source: unknown,
  models: Readonly<Record<string, SearchModel>>,
  bindings: DynamicSearchBindings,
  warn: (warning: DynamicSearchWarning) => void = warning => console.warn(warning),
): { query: SelectQuery; warnings: DynamicSearchWarning[] } {
  const normalized = normalizeDynamicSearch(source, base.entity, models, () => {});
  const filters = Object.entries(normalized.search.filter ?? {})
    .map(([path, predicate]) => bindings.filter(path, predicate));
  const orders = (normalized.search.orderBy ?? []).map(order => bindings.order(order.field, order.direction));
  if (filters.some(filter => !object(filter))) throw new Error('Invalid trusted search filter binding');
  if (orders.some(order => !(order instanceof OrderBy))) throw new Error('Invalid trusted search order binding');
  const query = base.clone();
  // Native providers also accept legacy generated _filters; retain those constraints explicitly.
  const legacy = (base as SelectQuery & { _filters?: unknown[] })._filters ?? [];
  const existing = [...legacy, ...(base.filterCondition ? [base.filterCondition] : [])];
  if (filters.length || legacy.length) query.filter({ $and: [...existing, ...filters] });
  // Append rather than replace stable default ordering. The application owns primary sort policy.
  query.orderItems.push(...orders);
  normalized.warnings.forEach(warning => warn({ ...warning }));
  return { query, warnings: normalized.warnings };
}
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const operators = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$notIn', '$contains']);

/**
 * Metadata, resource limits and warning sink must come from trusted application setup.
 * No caller-supplied context, limits, SQL, subqueries or arbitrary AST are accepted.
 * Returned clauses still require the normal query authorization/execution pipeline.
 */
export function normalizeDynamicSearch(
  source: string | unknown,
  entity: string,
  models: Readonly<Record<string, SearchModel>>,
  warn: (warning: DynamicSearchWarning) => void = warning => console.warn(warning),
  maxClauses = 100,
): { search: DynamicSearchInput; warnings: DynamicSearchWarning[] } {
  if (!Number.isSafeInteger(maxClauses) || maxClauses < 1) throw new Error('Invalid search limit');
  if (!own(models, entity)) throw new Error('Unknown search entity');
  let input: unknown;
  try { input = typeof source === 'string' ? JSON.parse(source) : source; }
  catch { throw new Error('Dynamic search requires valid JSON'); }
  if (!object(input) || Object.keys(input).some(key => !['filter', 'orderBy'].includes(key))) {
    throw new Error('Unsupported dynamic search input or control');
  }
  if (input.filter !== undefined && !object(input.filter)) throw new Error('Invalid search filter');
  if (input.orderBy !== undefined && !Array.isArray(input.orderBy)) throw new Error('Invalid search ordering');
  const filters = Object.entries((input.filter ?? {}) as Record<string, unknown>);
  const orders = (input.orderBy ?? []) as unknown[];
  if (filters.length + orders.length > maxClauses) throw new Error('Dynamic search exceeds clause limit');
  const warnings: DynamicSearchWarning[] = [];
  const search: DynamicSearchInput = { filter: Object.create(null), orderBy: [] };

  function fieldType(path: string): SearchValueType | undefined {
    const segments = path.split('.');
    if (segments.length > 16 || segments.some(s => !s || s.startsWith('$') || forbidden.has(s))) {
      throw new Error('Invalid dynamic search field path');
    }
    let model = models[entity];
    for (const segment of segments.slice(0, -1)) {
      if (!own(model.relations, segment)) return undefined;
      const target = model.relations[segment];
      if (!own(models, target)) throw new Error('Invalid trusted search relation metadata');
      model = models[target];
    }
    const field = segments[segments.length - 1];
    return own(model.fields, field) ? model.fields[field] : undefined;
  }
  function missing(path: string, clause: DynamicSearchWarning['clause']) {
    warnings.push({ code: 'DYNAMIC_SEARCH_UNKNOWN_FIELD', entity, clause, fieldPath: path });
  }
  function scalar(value: unknown, type: SearchValueType) {
    if (value === null) return;
    const valid = type === 'date'
      ? typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-')
        && Number.isFinite(Date.parse(value + 'T00:00:00Z'))
        && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
      : type === 'decimal'
      ? (typeof value === 'string' && /^[+-]?\d+(?:\.\d+)?$/.test(value))
        || (typeof value === 'number' && Number.isFinite(value))
      : type === 'integer' || type === 'timestamp' ? typeof value === 'number' && Number.isSafeInteger(value)
      : type === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : typeof value === type;
    if (!valid) throw new Error('Invalid value for known search field');
  }
  for (const [path, predicate] of filters) {
    const entries = object(predicate) ? Object.entries(predicate) : [['$eq', predicate]];
    if (entries.length !== 1 || !operators.has(entries[0][0] as string)) {
      throw new Error('Unsupported or malformed dynamic search operator');
    }
    const [operator, value] = entries[0];
    if ((operator === '$in' || operator === '$notIn') && (!Array.isArray(value) || value.length > 1000)) {
      throw new Error('Invalid or oversized search value list');
    }
    const type = fieldType(path);
    if (type === undefined) { missing(path, 'FILTER'); continue; }
    if (operator === '$contains' && type !== 'string') throw new Error('String operator requires a string field');
    if (Array.isArray(value)) {
      if (operator !== '$in' && operator !== '$notIn') throw new Error('Unexpected search value list');
      value.forEach(item => scalar(item, type));
    } else scalar(value, type);
    search.filter![path] = { [operator as string]: Array.isArray(value) ? [...value] : value };
  }
  for (const order of orders) {
    if (!object(order) || Object.keys(order).some(key => !['field', 'direction'].includes(key))
        || typeof order.field !== 'string' || !['asc', 'desc'].includes(order.direction as string)) {
      throw new Error('Invalid dynamic search ordering');
    }
    if (fieldType(order.field) === undefined) { missing(order.field, 'ORDER_BY'); continue; }
    search.orderBy!.push({ field: order.field, direction: order.direction as 'asc' | 'desc' });
  }
  // Publish diagnostics only after all fatal validation completes; never log source values.
  warnings.forEach(warning => warn({ ...warning }));
  return { search, warnings };
}
