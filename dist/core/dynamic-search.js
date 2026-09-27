"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDynamicSearch = exports.mergeDynamicSearch = void 0;
/** Local UI-search normalization. This is deliberately not a federation decoder. */
const ast_1 = require("./ast");
/** Add validated search clauses to an existing scoped query; never replace its policies. */
function mergeDynamicSearch(base, source, models, bindings, warn = warning => console.warn(warning)) {
    const normalized = normalizeDynamicSearch(source, base.entity, models, () => { });
    const filters = Object.entries(normalized.search.filter ?? {})
        .map(([path, predicate]) => bindings.filter(path, predicate));
    const orders = (normalized.search.orderBy ?? []).map(order => bindings.order(order.field, order.direction));
    if (filters.some(filter => !object(filter)))
        throw new Error('Invalid trusted search filter binding');
    if (orders.some(order => !(order instanceof ast_1.OrderBy)))
        throw new Error('Invalid trusted search order binding');
    const query = base.clone();
    // Native providers also accept legacy generated _filters; retain those constraints explicitly.
    const legacy = base._filters ?? [];
    const existing = [...legacy, ...(base.filterCondition ? [base.filterCondition] : [])];
    if (filters.length || legacy.length)
        query.filter({ $and: [...existing, ...filters] });
    // Append rather than replace stable default ordering. The application owns primary sort policy.
    query.orderItems.push(...orders);
    normalized.warnings.forEach(warning => warn({ ...warning }));
    return { query, warnings: normalized.warnings };
}
exports.mergeDynamicSearch = mergeDynamicSearch;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const operators = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$notIn', '$contains']);
/**
 * Metadata, resource limits and warning sink must come from trusted application setup.
 * No caller-supplied context, limits, SQL, subqueries or arbitrary AST are accepted.
 * Returned clauses still require the normal query authorization/execution pipeline.
 */
function normalizeDynamicSearch(source, entity, models, warn = warning => console.warn(warning), maxClauses = 100) {
    if (!Number.isSafeInteger(maxClauses) || maxClauses < 1)
        throw new Error('Invalid search limit');
    if (!own(models, entity))
        throw new Error('Unknown search entity');
    let input;
    try {
        input = typeof source === 'string' ? JSON.parse(source) : source;
    }
    catch {
        throw new Error('Dynamic search requires valid JSON');
    }
    if (!object(input) || Object.keys(input).some(key => !['filter', 'orderBy'].includes(key))) {
        throw new Error('Unsupported dynamic search input or control');
    }
    if (input.filter !== undefined && !object(input.filter))
        throw new Error('Invalid search filter');
    if (input.orderBy !== undefined && !Array.isArray(input.orderBy))
        throw new Error('Invalid search ordering');
    const filters = Object.entries((input.filter ?? {}));
    const orders = (input.orderBy ?? []);
    if (filters.length + orders.length > maxClauses)
        throw new Error('Dynamic search exceeds clause limit');
    const warnings = [];
    const search = { filter: Object.create(null), orderBy: [] };
    function fieldType(path) {
        const segments = path.split('.');
        if (segments.length > 16 || segments.some(s => !s || s.startsWith('$') || forbidden.has(s))) {
            throw new Error('Invalid dynamic search field path');
        }
        let model = models[entity];
        for (const segment of segments.slice(0, -1)) {
            if (!own(model.relations, segment))
                return undefined;
            const target = model.relations[segment];
            if (!own(models, target))
                throw new Error('Invalid trusted search relation metadata');
            model = models[target];
        }
        const field = segments[segments.length - 1];
        return own(model.fields, field) ? model.fields[field] : undefined;
    }
    function missing(path, clause) {
        warnings.push({ code: 'DYNAMIC_SEARCH_UNKNOWN_FIELD', entity, clause, fieldPath: path });
    }
    function scalar(value, type) {
        if (value === null)
            return;
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
        if (!valid)
            throw new Error('Invalid value for known search field');
    }
    for (const [path, predicate] of filters) {
        const entries = object(predicate) ? Object.entries(predicate) : [['$eq', predicate]];
        if (entries.length !== 1 || !operators.has(entries[0][0])) {
            throw new Error('Unsupported or malformed dynamic search operator');
        }
        const [operator, value] = entries[0];
        if ((operator === '$in' || operator === '$notIn') && (!Array.isArray(value) || value.length > 1000)) {
            throw new Error('Invalid or oversized search value list');
        }
        const type = fieldType(path);
        if (type === undefined) {
            missing(path, 'FILTER');
            continue;
        }
        if (operator === '$contains' && type !== 'string')
            throw new Error('String operator requires a string field');
        if (Array.isArray(value)) {
            if (operator !== '$in' && operator !== '$notIn')
                throw new Error('Unexpected search value list');
            value.forEach(item => scalar(item, type));
        }
        else
            scalar(value, type);
        search.filter[path] = { [operator]: Array.isArray(value) ? [...value] : value };
    }
    for (const order of orders) {
        if (!object(order) || Object.keys(order).some(key => !['field', 'direction'].includes(key))
            || typeof order.field !== 'string' || !['asc', 'desc'].includes(order.direction)) {
            throw new Error('Invalid dynamic search ordering');
        }
        if (fieldType(order.field) === undefined) {
            missing(order.field, 'ORDER_BY');
            continue;
        }
        search.orderBy.push({ field: order.field, direction: order.direction });
    }
    // Publish diagnostics only after all fatal validation completes; never log source values.
    warnings.forEach(warning => warn({ ...warning }));
    return { search, warnings };
}
exports.normalizeDynamicSearch = normalizeDynamicSearch;
//# sourceMappingURL=dynamic-search.js.map