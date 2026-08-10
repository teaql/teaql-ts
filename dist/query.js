"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectQuery = exports.AggregationCacheOptions = exports.OrderBy = exports.SortDirection = void 0;
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
        this.filterCondition = null;
        this.limitValue = 0;
        this.offsetValue = 0;
        this.orderItems = [];
        this.selectItems = [];
        this.properties = [];
        this.joins = [];
        this.groupByItems = [];
        this.aggregateItems = [];
        this.entity = entity;
    }
    filter(condition) {
        this.filterCondition = condition;
        return this;
    }
    limit(limit) {
        this.limitValue = limit;
        return this;
    }
    offset(offset) {
        this.offsetValue = offset;
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
}
exports.SelectQuery = SelectQuery;
//# sourceMappingURL=query.js.map