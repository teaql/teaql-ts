import { SmartList } from './smart-list';
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
export interface TeaQLPage<T> {
    data: SmartList<T>;
    totalCount: number;
    offset: number;
    limit: number;
}
export interface QuerySelection {
    toQuery(): SelectQuery;
}
export interface FacetRequest {
    facetName: string;
    relationName: string;
    query: SelectQuery;
    includeAllFacets: boolean;
}
export interface RelationAggregate {
    relationName: string;
    alias: string;
    query: SelectQuery;
    singleResult: boolean;
}
export declare class SelectQuery {
    private hardLimitValue;
    private continuousPageFetchOptions?;
    private continuousPageRuntimeContext?;
    private idSetPaginationOptions?;
    private idSetPaginationRuntimeContext?;
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
    facets: FacetRequest[];
    relations: Array<{
        name: string;
        query?: SelectQuery;
        localKey?: string;
        foreignKey?: string;
        many?: boolean;
    }>;
    relationAggregates: RelationAggregate[];
    commentText?: string;
    purposeText?: string;
    constructor(entity: string);
    comment(text: string): this;
    purpose(text: string): this;
    facetBy(facetName: string, relationName: string, request: QuerySelection, includeAllFacets?: boolean): this;
    clone(): SelectQuery;
    filter(condition: any): this;
    limit(limit: number): this;
    optimizeForContinuousPageFetch(): this;
    optimizeForContinuousPageFetchWith(namespace: string, ttlSeconds: number): this;
    bindContinuousPageRuntime(runtime: any): this;
    localContinuousPageOptions(): {
        namespace: string;
        ttlSeconds: number;
    } | undefined;
    localContinuousPageRuntime(): any;
    clearContinuousPageRuntime(): this;
    optimizePaginationWithIdSet(): this;
    optimizePaginationWithIdSetConfig(namespace: string, ttlSeconds: number, maxIds: number): this;
    bindIdSetPaginationRuntime(runtime: any): this;
    localIdSetPaginationOptions(): {
        namespace: string;
        ttlSeconds: number;
        maxIds: number;
    } | undefined;
    localIdSetPaginationRuntime(): any;
    clearIdSetPaginationRuntime(): this;
    prepareForList(): this;
    forExactCount(alias?: string): SelectQuery;
    private applyListLimit;
    offset(offset: number): this;
    relation(name: string): this;
    relationQuery(name: string, query: SelectQuery, localKey?: string, foreignKey?: string, many?: boolean): this;
    relationAggregate(relationName: string, alias: string, query: SelectQuery, singleResult?: boolean): this;
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
    expectedVersion?: number | undefined;
    constructor(entity: string, action: "Create" | "Update" | "Delete", payload: any, id?: any, comment?: string | undefined, expectedVersion?: number | undefined);
}
//# sourceMappingURL=ast.d.ts.map