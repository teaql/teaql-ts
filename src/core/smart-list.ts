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
    data: Iterable<T> = [],
    options: {
      totalCount?: number;
      aggregations?: SmartListRecord;
      summary?: SmartListRecord;
      facets?: Record<string, SmartList<SmartListRecord>>;
      isLoaded?: boolean;
    } = {},
  ) {
    super(...data);
    Object.setPrototypeOf(this, SmartList.prototype);
    this.totalCount = options.totalCount;
    this.aggregations = options.aggregations ?? {};
    this.summary = options.summary ?? {};
    this.facets = options.facets ?? {};
    this.isLoaded = options.isLoaded ?? true;
  }

  static empty<T>(): SmartList<T> {
    return new SmartList<T>([], { isLoaded: false });
  }

  get data(): SmartList<T> {
    return this;
  }

  withTotalCount(totalCount: number): this {
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
}
