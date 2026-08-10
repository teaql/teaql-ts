export declare enum SortDirection {
    Asc = "Asc",
    Desc = "Desc"
}
export declare class OrderBy {
    field: string;
    expr: any | null;
    direction: SortDirection;
    constructor(field: string, expr: any | null, direction: SortDirection);
    static new(field: string, direction: SortDirection): OrderBy;
    static expr(expr: any, direction: SortDirection): OrderBy;
    static asc(field: string): OrderBy;
    static desc(field: string): OrderBy;
}
export declare class AggregationCacheOptions {
    enabledValue: boolean;
    cacheExpiredMillis: number;
    propagateValue: boolean;
    propagateCacheExpiredMillis: number;
    constructor(enabledValue: boolean, cacheExpiredMillis: number, propagateValue: boolean, propagateCacheExpiredMillis: number);
    static enabled(cacheExpiredMillis: number): AggregationCacheOptions;
    propagate(cacheExpiredMillis: number): AggregationCacheOptions;
}
export declare class SelectQuery {
    entity: string;
    filterCondition: any | null;
    limitValue: number;
    offsetValue: number;
    orderItems: OrderBy[];
    selectItems: string[];
    properties: string[];
    joins: any[];
    groupByItems: string[];
    aggregateItems: any[];
    aggregationCache?: AggregationCacheOptions;
    facets: any[];
    constructor(entity: string);
    facetBy(facetName: string, relationName: string, request: any): this;
    filter(condition: any): this;
    limit(limit: number): this;
    offset(offset: number): this;
    order(orderBy: OrderBy): this;
    select(items: string[]): this;
    enableAggregationCacheFor(cacheExpiredMillis: number): this;
    propagateAggregationCache(cacheExpiredMillis: number): this;
    aggregate(functionName: string, field: string, alias: string): this;
    groupBy(item: string): this;
}
export declare class MutationQuery {
    entity: string;
    action: "Create" | "Update" | "Delete";
    payload: any;
    id?: any;
    comment?: string | undefined;
    constructor(entity: string, action: "Create" | "Update" | "Delete", payload: any, id?: any, comment?: string | undefined);
}
//# sourceMappingURL=ast.d.ts.map