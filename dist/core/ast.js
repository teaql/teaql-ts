"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationQuery = exports.SelectQuery = exports.AggregationCacheOptions = exports.OrderBy = exports.SortDirection = void 0;
var SortDirection;
(function (SortDirection) {
    SortDirection["Asc"] = "Asc";
    SortDirection["Desc"] = "Desc";
})(SortDirection || (exports.SortDirection = SortDirection = {}));
class OrderBy {
    constructor(field, expr, direction) {
        this.field = field;
        this.expr = expr;
        this.direction = direction;
    }
    static new(field, direction) {
        return new OrderBy(field, null, direction);
    }
    static expr(expr, direction) {
        return new OrderBy('', expr, direction);
    }
    static asc(field) { return OrderBy.new(field, SortDirection.Asc); }
    static desc(field) { return OrderBy.new(field, SortDirection.Desc); }
}
exports.OrderBy = OrderBy;
class AggregationCacheOptions {
    constructor(enabledValue, cacheExpiredMillis, propagateValue, propagateCacheExpiredMillis) {
        this.enabledValue = enabledValue;
        this.cacheExpiredMillis = cacheExpiredMillis;
        this.propagateValue = propagateValue;
        this.propagateCacheExpiredMillis = propagateCacheExpiredMillis;
    }
    static enabled(cacheExpiredMillis) {
        return new AggregationCacheOptions(true, cacheExpiredMillis, false, 0);
    }
    propagate(cacheExpiredMillis) {
        this.propagateValue = true;
        this.propagateCacheExpiredMillis = cacheExpiredMillis;
        return this;
    }
}
exports.AggregationCacheOptions = AggregationCacheOptions;
class SelectQuery {
    constructor(entity) {
        this.hardLimitValue = 10000;
        this.filterCondition = null;
        this.limitValue = 0;
        this.offsetValue = 0;
        this.orderItems = [];
        this.selectItems = [];
        this.properties = [];
        this.joins = [];
        this.groupByItems = [];
        this.aggregateItems = [];
        this.facets = [];
        this.relations = [];
        this.entity = entity;
        // Local runtime policy must never cross the federation JSON boundary.
        Object.defineProperty(this, 'hardLimitValue', { enumerable: false, writable: true, value: 10000 });
        Object.defineProperty(this, 'continuousPageFetchOptions', { enumerable: false, writable: true, value: undefined });
        Object.defineProperty(this, 'continuousPageRuntimeContext', { enumerable: false, writable: true, value: undefined });
    }
    comment(text) {
        this.commentText = text;
        return this;
    }
    purpose(text) {
        this.purposeText = text;
        return this;
    }
    facetBy(facetName, relationName, request) {
        this.facets.push({ facetName, relationName, query: request.query });
        return this;
    }
    filter(condition) {
        this.filterCondition = condition;
        return this;
    }
    limit(limit) {
        this.limitValue = limit;
        return this;
    }
    /** Override the outer materialized-list ceiling. Most callers should keep 10,000. */
    hardLimit(limit) {
        if (!Number.isSafeInteger(limit) || limit <= 0)
            throw new Error('hardLimit must be a positive integer');
        this.hardLimitValue = limit;
        return this;
    }
    optimizeForContinuousPageFetch() {
        return this.optimizeForContinuousPageFetchWith('default', 600);
    }
    optimizeForContinuousPageFetchWith(namespace, ttlSeconds) {
        if (!namespace?.trim())
            throw new Error('continuous page namespace must not be empty');
        if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0)
            throw new Error('continuous page ttlSeconds must be a positive integer');
        this.continuousPageFetchOptions = { namespace, ttlSeconds };
        return this;
    }
    bindContinuousPageRuntime(runtime) { this.continuousPageRuntimeContext = runtime; return this; }
    localContinuousPageOptions() { return this.continuousPageFetchOptions; }
    localContinuousPageRuntime() { return this.continuousPageRuntimeContext; }
    clearContinuousPageRuntime() { this.continuousPageRuntimeContext = undefined; return this; }
    prepareForList() {
        this.applyListLimit(this.hardLimitValue);
        return this;
    }
    applyListLimit(ceiling) {
        if (!this.limitValue)
            this.limitValue = ceiling;
        if (this.limitValue > ceiling) {
            throw new Error(`QUERY_HARD_LIMIT_EXCEEDED: requested limit ${this.limitValue} exceeds hard limit ${ceiling}`);
        }
        for (const relation of this.relations) {
            relation.query?.applyListLimit(10000);
        }
    }
    offset(offset) {
        this.offsetValue = offset;
        return this;
    }
    relation(name) {
        this.relations.push({ name });
        return this;
    }
    relationQuery(name, query, localKey = 'id', foreignKey = 'id', many = true) {
        this.relations.push({ name, query, localKey, foreignKey, many });
        return this;
    }
    order(orderBy) {
        this.orderItems.push(orderBy);
        return this;
    }
    select(items) {
        this.selectItems.push(...items);
        return this;
    }
    enableAggregationCacheFor(cacheExpiredMillis) {
        this.aggregationCache = AggregationCacheOptions.enabled(cacheExpiredMillis);
        return this;
    }
    propagateAggregationCache(cacheExpiredMillis) {
        if (!this.aggregationCache) {
            this.aggregationCache = AggregationCacheOptions.enabled(0);
        }
        this.aggregationCache.propagate(cacheExpiredMillis);
        return this;
    }
    aggregate(functionName, field, alias) {
        this.aggregateItems.push({ function: functionName, field, alias });
        return this;
    }
    groupBy(item) {
        this.groupByItems.push(item);
        return this;
    }
}
exports.SelectQuery = SelectQuery;
class MutationQuery {
    constructor(entity, action, payload, id, comment) {
        this.entity = entity;
        this.action = action;
        this.payload = payload;
        this.id = id;
        this.comment = comment;
    }
}
exports.MutationQuery = MutationQuery;
//# sourceMappingURL=ast.js.map