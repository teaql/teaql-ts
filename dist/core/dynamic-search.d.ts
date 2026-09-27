/** Local UI-search normalization. This is deliberately not a federation decoder. */
import { OrderBy, SelectQuery } from './ast';
export type SearchValueType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'timestamp' | 'decimal';
export interface SearchModel {
    fields: Readonly<Record<string, SearchValueType>>;
    relations: Readonly<Record<string, string>>;
}
export interface DynamicSearchWarning {
    code: 'DYNAMIC_SEARCH_UNKNOWN_FIELD';
    entity: string;
    clause: 'FILTER' | 'ORDER_BY';
    fieldPath: string;
}
export interface DynamicSearchInput {
    filter?: Record<string, unknown>;
    orderBy?: Array<{
        field: string;
        direction: 'asc' | 'desc';
    }>;
}
/** Trusted application adapters compile canonical model paths using native query APIs. */
export interface DynamicSearchBindings {
    filter(path: string, predicate: unknown): unknown;
    order(path: string, direction: 'asc' | 'desc'): OrderBy;
}
/** Add validated search clauses to an existing scoped query; never replace its policies. */
export declare function mergeDynamicSearch(base: SelectQuery, source: unknown, models: Readonly<Record<string, SearchModel>>, bindings: DynamicSearchBindings, warn?: (warning: DynamicSearchWarning) => void): {
    query: SelectQuery;
    warnings: DynamicSearchWarning[];
};
/**
 * Metadata, resource limits and warning sink must come from trusted application setup.
 * No caller-supplied context, limits, SQL, subqueries or arbitrary AST are accepted.
 * Returned clauses still require the normal query authorization/execution pipeline.
 */
export declare function normalizeDynamicSearch(source: string | unknown, entity: string, models: Readonly<Record<string, SearchModel>>, warn?: (warning: DynamicSearchWarning) => void, maxClauses?: number): {
    search: DynamicSearchInput;
    warnings: DynamicSearchWarning[];
};
//# sourceMappingURL=dynamic-search.d.ts.map