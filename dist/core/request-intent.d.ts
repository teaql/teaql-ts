import type { MutationQuery, SelectQuery } from './ast';
import { TraceNode } from './trace-chain';
export type RequestKind = 'query' | 'mutation';
/** Stable, value-free request-boundary diagnostics. */
export declare class RequestIntentError extends Error {
    readonly code: 'REQUEST_COMMENT_REQUIRED' | 'QUERY_PURPOSE_REQUIRED';
    readonly field: 'comment' | 'purpose';
    readonly requestKind: RequestKind;
    constructor(code: 'REQUEST_COMMENT_REQUIRED' | 'QUERY_PURPOSE_REQUIRED', field: 'comment' | 'purpose', requestKind: RequestKind);
}
export declare class QueryIntent {
    #private;
    constructor(comment: unknown, purpose: unknown);
    get comment(): string;
    get purpose(): string;
}
export declare class MutationIntent {
    #private;
    constructor(comment: unknown);
    get comment(): string;
    get auditReason(): string;
    readbackIntent(): QueryIntent;
}
/**
 * Request intent is owned separately from the mutable query builder. A snapshot
 * retains local, non-enumerable pagination capabilities without serializing them.
 */
export declare class QueryRequest<T extends object = SelectQuery> {
    #private;
    constructor(query: T, intent?: QueryIntent);
    get intent(): QueryIntent;
    get query(): T;
    get comment(): string;
    get purpose(): string;
    get traceSource(): readonly TraceNode[];
    /** Runtime derivation preserves this invocation's source across builder clones. */
    withQuery<Q extends object>(query: Q): QueryRequest<Q>;
    /** Append one local relation and its qualified property; never accept caller frames. */
    derive<Q extends object>(query: Q, relation: string): QueryRequest<Q>;
}
/** A batch also needs this root envelope; child comments are not a fallback. */
export declare class MutationRequest<T extends object = MutationQuery> {
    #private;
    constructor(mutation: T, intent?: MutationIntent);
    get intent(): MutationIntent;
    get mutation(): T;
    get comment(): string;
}
//# sourceMappingURL=request-intent.d.ts.map