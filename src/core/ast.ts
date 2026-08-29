import { Value } from './value';
import { SmartList } from './smart-list';

export enum SortDirection {
  Asc = 'Asc',
  Desc = 'Desc'
}

export class OrderBy {
  constructor(
    public field: string,
    public expr: any | null,
    public direction: SortDirection
  ) {}

  static new(field: string, direction: SortDirection): OrderBy {
    return new OrderBy(field, null, direction);
  }

  static expr(expr: any, direction: SortDirection): OrderBy {
    return new OrderBy('', expr, direction);
  }

  static asc(field: string): OrderBy { return OrderBy.new(field, SortDirection.Asc); }
  static desc(field: string): OrderBy { return OrderBy.new(field, SortDirection.Desc); }
}

export class AggregationCacheOptions {
  constructor(
    public enabledValue: boolean,
    public cacheExpiredMillis: number,
    public propagateValue: boolean,
    public propagateCacheExpiredMillis: number
  ) {}

  static enabled(cacheExpiredMillis: number): AggregationCacheOptions {
    return new AggregationCacheOptions(true, cacheExpiredMillis, false, 0);
  }

  propagate(cacheExpiredMillis: number): AggregationCacheOptions {
    this.propagateValue = true;
    this.propagateCacheExpiredMillis = cacheExpiredMillis;
    return this;
  }
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

export class SelectQuery {
  private hardLimitValue: number = 10_000;
  private continuousPageFetchOptions?: { namespace: string; ttlSeconds: number };
  private continuousPageRuntimeContext?: any;
  private idSetPaginationOptions?: { namespace: string; ttlSeconds: number; maxIds: number };
  private idSetPaginationRuntimeContext?: any;
  public entity: string;
  public filterCondition: any | null = null;
  public limitValue: number = 0;
  public offsetValue: number = 0;
  public orderItems: OrderBy[] = [];
  public selectItems: string[] = [];
  public properties: string[] = [];
  public joins: any[] = [];
  public groupByItems: string[] = [];
  public aggregateItems: any[] = [];
  public aggregationCache?: AggregationCacheOptions;
  public facets: FacetRequest[] = [];
  public relations: Array<{
    name: string;
    query?: SelectQuery;
    localKey?: string;
    foreignKey?: string;
    many?: boolean;
  }> = [];
  public relationAggregates: RelationAggregate[] = [];
  public commentText?: string;
  public purposeText?: string;
  
  constructor(entity: string) {
    this.entity = entity;
    // Local runtime policy must never cross the federation JSON boundary.
    Object.defineProperty(this, 'hardLimitValue', { enumerable: false, writable: true, value: 10_000 });
    Object.defineProperty(this, 'continuousPageFetchOptions', { enumerable: false, writable: true, value: undefined });
    Object.defineProperty(this, 'continuousPageRuntimeContext', { enumerable: false, writable: true, value: undefined });
    Object.defineProperty(this, 'idSetPaginationOptions', { enumerable: false, writable: true, value: undefined });
    Object.defineProperty(this, 'idSetPaginationRuntimeContext', { enumerable: false, writable: true, value: undefined });
  }

  comment(text: string): this {
    this.commentText = text;
    return this;
  }

  purpose(text: string): this {
    this.purposeText = text;
    return this;
  }

  facetBy(
    facetName: string,
    relationName: string,
    request: QuerySelection,
    includeAllFacets = true,
  ): this {
    this.facets.push({
      facetName,
      relationName,
      query: request.toQuery(),
      includeAllFacets,
    });
    return this;
  }

  clone(): SelectQuery {
    const copy = new SelectQuery(this.entity);
    copy.filterCondition = this.filterCondition;
    copy.limitValue = this.limitValue;
    copy.offsetValue = this.offsetValue;
    copy.orderItems = [...this.orderItems];
    copy.selectItems = [...this.selectItems];
    copy.properties = [...this.properties];
    copy.joins = [...this.joins];
    copy.groupByItems = [...this.groupByItems];
    copy.aggregateItems = this.aggregateItems.map(item => ({ ...item }));
    copy.aggregationCache = this.aggregationCache;
    copy.facets = this.facets.map(facet => ({ ...facet, query: facet.query.clone() }));
    copy.relations = this.relations.map(relation => ({
      ...relation,
      query: relation.query?.clone(),
    }));
    copy.relationAggregates = this.relationAggregates.map(aggregate => ({
      ...aggregate,
      query: aggregate.query.clone(),
    }));
    copy.commentText = this.commentText;
    copy.purposeText = this.purposeText;
    copy.idSetPaginationOptions = this.idSetPaginationOptions;
    copy.idSetPaginationRuntimeContext = this.idSetPaginationRuntimeContext;
    return copy;
  }

  filter(condition: any): this {
    this.filterCondition = condition;
    return this;
  }

  limit(limit: number): this {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error('QUERY_INVALID_LIMIT: limit must be a positive safe integer');
    }
    this.limitValue = limit;
    return this;
  }

  optimizeForContinuousPageFetch(): this {
    return this.optimizeForContinuousPageFetchWith('default', 600);
  }

  optimizeForContinuousPageFetchWith(namespace: string, ttlSeconds: number): this {
    if (!namespace?.trim()) throw new Error('continuous page namespace must not be empty');
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error('continuous page ttlSeconds must be a positive integer');
    this.continuousPageFetchOptions = { namespace, ttlSeconds };
    return this;
  }

  bindContinuousPageRuntime(runtime: any): this { this.continuousPageRuntimeContext = runtime; return this; }
  localContinuousPageOptions(): { namespace: string; ttlSeconds: number } | undefined { return this.continuousPageFetchOptions; }
  localContinuousPageRuntime(): any { return this.continuousPageRuntimeContext; }
  clearContinuousPageRuntime(): this { this.continuousPageRuntimeContext = undefined; return this; }

  optimizePaginationWithIdSet(): this {
    return this.optimizePaginationWithIdSetConfig('default', 600, 3_000_000);
  }

  optimizePaginationWithIdSetConfig(namespace: string, ttlSeconds: number, maxIds: number): this {
    if (!namespace?.trim()) throw new Error('ID set namespace must not be empty');
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error('ID set ttlSeconds must be a positive integer');
    if (!Number.isSafeInteger(maxIds) || maxIds <= 0) throw new Error('ID set maxIds must be a positive integer');
    this.idSetPaginationOptions = { namespace, ttlSeconds, maxIds };
    return this;
  }

  bindIdSetPaginationRuntime(runtime: any): this { this.idSetPaginationRuntimeContext = runtime; return this; }
  localIdSetPaginationOptions(): { namespace: string; ttlSeconds: number; maxIds: number } | undefined { return this.idSetPaginationOptions; }
  localIdSetPaginationRuntime(): any { return this.idSetPaginationRuntimeContext; }
  clearIdSetPaginationRuntime(): this { this.idSetPaginationRuntimeContext = undefined; return this; }

  prepareForList(): this {
    if (!Number.isSafeInteger(this.offsetValue) || this.offsetValue < 0) {
      throw new Error('QUERY_INVALID_OFFSET: offset must be a non-negative safe integer');
    }
    if (this.limitValue && (!Number.isSafeInteger(this.limitValue) || this.limitValue < 1)) {
      throw new Error('QUERY_INVALID_LIMIT: limit must be a positive safe integer');
    }
    this.applyListLimit(this.hardLimitValue);
    return this;
  }

  forExactCount(alias = '__teaql_total'): SelectQuery {
    const count = new SelectQuery(this.entity);
    count.filterCondition = this.filterCondition;
    count.commentText = this.commentText;
    count.purposeText = this.purposeText;
    count.aggregate('Count', 'id', alias);
    return count;
  }

  private applyListLimit(ceiling: number): void {
    if (!this.limitValue) this.limitValue = ceiling;
    if (this.limitValue > ceiling) {
      throw new Error(`QUERY_HARD_LIMIT_EXCEEDED: requested limit ${this.limitValue} exceeds hard limit ${ceiling}`);
    }
    for (const relation of this.relations) {
      relation.query?.applyListLimit(10_000);
    }
  }

  offset(offset: number): this {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error('QUERY_INVALID_OFFSET: offset must be a non-negative safe integer');
    }
    this.offsetValue = offset;
    return this;
  }

  relation(name: string): this {
    this.relations.push({ name });
    return this;
  }

  relationQuery(
    name: string,
    query: SelectQuery,
    localKey = 'id',
    foreignKey = 'id',
    many = true
  ): this {
    this.relations.push({ name, query, localKey, foreignKey, many });
    return this;
  }

  relationAggregate(
    relationName: string,
    alias: string,
    query: SelectQuery,
    singleResult = true,
  ): this {
    this.relationAggregates.push({ relationName, alias, query, singleResult });
    return this;
  }

  order(orderBy: OrderBy): this {
    this.orderItems.push(orderBy);
    return this;
  }

  select(items: string[]): this {
    this.selectItems.push(...items);
    return this;
  }

  enableAggregationCacheFor(cacheExpiredMillis: number): this {
    this.aggregationCache = AggregationCacheOptions.enabled(cacheExpiredMillis);
    return this;
  }

  propagateAggregationCache(cacheExpiredMillis: number): this {
    if (!this.aggregationCache) {
      this.aggregationCache = AggregationCacheOptions.enabled(0);
    }
    this.aggregationCache.propagate(cacheExpiredMillis);
    return this;
  }

  aggregate(functionName: string, field: string, alias: string): this {
    this.aggregateItems.push({ function: functionName, field, alias });
    return this;
  }

  groupBy(item: string): this {
    this.groupByItems.push(item);
    return this;
  }
}

export class MutationQuery {
  constructor(
    public entity: string,
    public action: "Create" | "Update" | "Delete",
    public payload: any,
    public id?: any,
    public comment?: string,
    public expectedVersion?: number,
  ) {}
}
