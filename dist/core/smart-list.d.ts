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
}
//# sourceMappingURL=smart-list.d.ts.map