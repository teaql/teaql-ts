export type SmartListRecord = Record<string, unknown>;

/**
 * TeaQL's typed list boundary. Besides array ergonomics it preserves query
 * metadata so adding facets, summaries, or totals does not require an API change.
 */
export class SmartList<T> extends Array<T> {
  static get [Symbol.species](): ArrayConstructor {
    return Array;
  }

  totalCount?: number;
  aggregations: SmartListRecord;
  summary: SmartListRecord;
  facets: Record<string, SmartList<SmartListRecord>>;
  isLoaded: boolean;

  constructor(
    data: Iterable<T> | number = [],
    options: {
      totalCount?: number;
      aggregations?: SmartListRecord;
      summary?: SmartListRecord;
      facets?: Record<string, SmartList<SmartListRecord>>;
      isLoaded?: boolean;
    } = {},
  ) {
    super();
    if (typeof data === 'number') this.length = data;
    else for (const item of data) super.push(item);
    Object.setPrototypeOf(this, SmartList.prototype);
    if (options.totalCount !== undefined) validateCount(options.totalCount);
    this.totalCount = options.totalCount;
    // Constructor metadata is owned recursively; entity row references are retained.
    this.aggregations = cloneMetadata(options.aggregations ?? {});
    this.summary = cloneMetadata(options.summary ?? {});
    this.facets = cloneMetadata(options.facets ?? {});
    this.isLoaded = options.isLoaded ?? true;
  }

  static empty<T>(): SmartList<T> {
    return new SmartList<T>([], { isLoaded: false });
  }

  get data(): SmartList<T> {
    return this;
  }

  withTotalCount(totalCount: number): this {
    validateCount(totalCount);
    this.totalCount = totalCount;
    return this;
  }

  withFacet(name: string, facet: SmartList<SmartListRecord>): this {
    this.facets[name] = facet;
    return this;
  }

  facet(name: string): SmartList<SmartListRecord> | undefined {
    return this.facets[name];
  }

  totalCountOrLength(): number {
    return this.totalCount ?? this.length;
  }

  /** Native map/filter return Array; these dedicated operations return SmartList. */
  mapSmart<U>(mapper: (item: T, index: number) => U): SmartList<U> {
    return new SmartList(Array.from(this, mapper), {
      totalCount: this.totalCount, aggregations: this.aggregations,
      summary: this.summary, facets: this.facets, isLoaded: this.isLoaded,
    });
  }

  filterSmart(predicate: (item: T, index: number) => boolean): SmartList<T> {
    return new SmartList(this.filter(predicate), { isLoaded: this.isLoaded });
  }

  flatMapSmart<U>(mapper: (item: T, index: number) => Iterable<U>): SmartList<U> {
    return new SmartList(this.flatMap((item, index) => Array.from(mapper(item, index))), { isLoaded: this.isLoaded });
  }

  get(index: number): T | undefined {
    return Number.isInteger(index) && index >= 0 && index < this.length ? this[index] : undefined;
  }

  set(index: number, value: T): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return false;
    this[index] = value;
    return true;
  }

  first(): T | undefined { return this.get(0); }
  last(): T | undefined { return this.get(this.length - 1); }

  mergeBy<K>(incoming: Iterable<T>, key: (item: T) => K): void {
    const positions = new Map<K, number>();
    this.forEach((item, index) => positions.set(key(item), index));
    for (const item of incoming) {
      const itemKey = key(item), position = positions.get(itemKey);
      if (position !== undefined) this[position] = item;
      else { positions.set(itemKey, this.length); this.push(item); }
    }
  }

  identityMap<K>(key: (item: T) => K): Map<K, T> {
    return new Map(Array.from(this, item => [key(item), item]));
  }

  groupBy<K>(key: (item: T) => K): Map<K, T[]> {
    const groups = new Map<K, T[]>();
    for (const item of this) {
      const itemKey = key(item), values = groups.get(itemKey) ?? [];
      values.push(item); groups.set(itemKey, values);
    }
    return groups;
  }

  ids(this: SmartList<T & { id?: unknown }>): unknown[] {
    return Array.from(this, item => item.id ?? null);
  }

  mapById(this: SmartList<T & { id?: unknown }>): Map<unknown, T> {
    const result = new Map<unknown, T>();
    for (const item of this) if (item.id !== undefined && item.id !== null) result.set(item.id, item);
    return result;
  }

  versions(this: SmartList<T & { version?: unknown }>): unknown[] {
    return Array.from(this, item => item.version ?? null);
  }

  removeFacet(name: string): SmartList<SmartListRecord> | undefined {
    const result = this.facets[name]; delete this.facets[name]; return result;
  }

  takeFacets(): Record<string, SmartList<SmartListRecord>> {
    const result = this.facets; this.facets = {}; return result;
  }
}

function validateCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('totalCount must be an exact non-negative safe integer');
}

function cloneMetadata<T>(value: T): T {
  if (value instanceof SmartList) return value.mapSmart(cloneMetadata) as T;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(cloneMetadata) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneMetadata(item)])) as T;
  }
  return value;
}
