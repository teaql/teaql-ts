import { Value } from './value';

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

export class SelectQuery {
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
  public facets: any[] = [];
  public commentText?: string;
  public purposeText?: string;
  
  constructor(entity: string) {
    this.entity = entity;
  }

  comment(text: string): this {
    this.commentText = text;
    return this;
  }

  purpose(text: string): this {
    this.purposeText = text;
    return this;
  }

  facetBy(facetName: string, relationName: string, request: any): this {
    this.facets.push({ facetName, relationName, query: request.query });
    return this;
  }

  filter(condition: any): this {
    this.filterCondition = condition;
    return this;
  }

  limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): this {
    this.offsetValue = offset;
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
    public comment?: string
  ) {}
}

export class MutationBuilder {
  private commentText?: string;

  constructor(
    private entity: string,
    private action: "Create" | "Update" | "Delete",
    private payload: any,
    private id?: any
  ) {}

  auditAs(c: string): this {
    this.commentText = c;
    return this;
  }

  async execute(ctx: any): Promise<any> {
    const mutation = new MutationQuery(this.entity, this.action, this.payload, this.id, this.commentText);
    return ctx.client.executeMutation(mutation);
  }
}
