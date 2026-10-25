export type SmartListRecord = Record<string, unknown>;
/**
 * TeaQL's typed list boundary. Besides array ergonomics it preserves query
 * metadata so adding facets, summaries, or totals does not require an API change.
 */
export declare class SmartList<T> extends Array<T> {
    static get [Symbol.species](): ArrayConstructor;
    totalCount?: number;
    aggregations: SmartListRecord;
    summary: SmartListRecord;
    facets: Record<string, SmartList<SmartListRecord>>;
    isLoaded: boolean;
    constructor(data?: Iterable<T> | number, options?: {
        totalCount?: number;
        aggregations?: SmartListRecord;
        summary?: SmartListRecord;
        facets?: Record<string, SmartList<SmartListRecord>>;
        isLoaded?: boolean;
    });
    static empty<T>(): SmartList<T>;
    get data(): SmartList<T>;
    withTotalCount(totalCount: number): this;
    withFacet(name: string, facet: SmartList<SmartListRecord>): this;
    facet(name: string): SmartList<SmartListRecord> | undefined;
    totalCountOrLength(): number;
    /** Native map/filter return Array; these dedicated operations return SmartList. */
    mapSmart<U>(mapper: (item: T, index: number) => U): SmartList<U>;
    filterSmart(predicate: (item: T, index: number) => boolean): SmartList<T>;
    flatMapSmart<U>(mapper: (item: T, index: number) => Iterable<U>): SmartList<U>;
    get(index: number): T | undefined;
    set(index: number, value: T): boolean;
    first(): T | undefined;
    last(): T | undefined;
    mergeBy<K>(incoming: Iterable<T>, key: (item: T) => K): void;
    identityMap<K>(key: (item: T) => K): Map<K, T>;
    groupBy<K>(key: (item: T) => K): Map<K, T[]>;
    ids(this: SmartList<T & {
        id?: unknown;
    }>): unknown[];
    mapById(this: SmartList<T & {
        id?: unknown;
    }>): Map<unknown, T>;
    versions(this: SmartList<T & {
        version?: unknown;
    }>): unknown[];
    removeFacet(name: string): SmartList<SmartListRecord> | undefined;
    takeFacets(): Record<string, SmartList<SmartListRecord>>;
}
//# sourceMappingURL=smart-list.d.ts.map