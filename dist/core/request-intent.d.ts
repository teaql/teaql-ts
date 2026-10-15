import type { MutationQuery, SelectQuery } from './ast';
import { TraceNode, MutationTraceScope } from './trace-chain';
import type { EntityKey } from './entity-root';
import type { SQLLogBindingSource } from './log-privacy';
import { LoadedScalarSnapshot } from './loaded-scalar-snapshot';
export type QueryOperation = Readonly<{
    kind: 'named-count' | 'facet' | 'relation-count' | 'relation-select' | 'aggregate' | 'pagination';
    /** Exact generator-supplied native method; absent for a low-level runtime operation. */
    method?: string;
    alias?: string;
    relation?: string;
}>;
/** One native literal renderer for all count/facet aliases. Never parse SQL. */
export declare function queryOperationComment(operation: QueryOperation): string;
declare const requestBindingToken: unique symbol;
type QueryBinding = {
    [requestBindingToken]: true;
    parent?: QueryRequest<any>;
    comment: string;
    name: string;
    operation?: QueryOperation;
    source: readonly TraceNode[];
    invocation?: object;
};
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
    constructor(query: T, intent?: QueryIntent, binding?: QueryBinding);
    get intent(): QueryIntent;
    get query(): T;
    get comment(): string;
    get purpose(): string;
    get traceSource(): readonly TraceNode[];
    get parentRequest(): QueryRequest<any> | undefined;
    get rootRequest(): QueryRequest<any>;
    get requestName(): string;
    get operation(): QueryOperation | undefined;
    get traceChain(): readonly TraceNode[];
    /** Runtime derivation preserves this invocation's source across builder clones. */
    withQuery<Q extends object>(query: Q): QueryRequest<Q>;
    /** A real operation child need not execute SQL itself; descendants retain it. */
    deriveOperation<Q extends object>(query: Q, operation: QueryOperation): QueryRequest<Q>;
    /** Local description for work created by the framework, never a root authorization. */
    deriveHelper<Q extends object>(query: Q, comment: string): QueryRequest<Q>;
    /** Preserve the Q-operation parent and the actual nested request's own comment. */
    derive<Q extends object>(query: Q, relation: string, operation?: QueryOperation): QueryRequest<Q>;
    /** Aggregates execute their operation; an anonymous template is not a value load. */
    deriveAggregate<Q extends object>(query: Q, relation: string, operation: QueryOperation): QueryRequest<Q>;
    /** Bind a framework helper or value query below an existing operation parent. */
    deriveChild<Q extends object>(query: Q, relation?: string, defaultComment?: string, requestName?: string): QueryRequest<Q>;
}
/** A batch also needs this root envelope; child comments are not a fallback. */
export declare class MutationRequest<T extends object = MutationQuery> {
    #private;
    constructor(mutation: T, intent?: MutationIntent);
    get intent(): MutationIntent;
    get mutation(): T;
    get comment(): string;
    /** @internal Generated hydration/commit provenance, never a wire field. */
    withLoadedSnapshot(snapshot: LoadedScalarSnapshot): this;
    /** @internal Does not become part of the write payload or policy input. */
    loadedValues(): Readonly<Record<string, unknown>>;
    /** Runtime-owned execution capability; raw mutation fields cannot forge it. */
    get graphSession(): GraphMutationSession | undefined;
    scopeFor(key: EntityKey): MutationTraceScope;
    traceFor(key: EntityKey): readonly TraceNode[];
    /** Safe event projection; internal policy intent is never mutated. */
    auditProjection(key: EntityKey, payload: unknown, bindings?: SQLLogBindingSource): Readonly<{
        reason: string;
        mutationLineage: readonly TraceNode[];
    }>;
}
/** One explicit graph invocation, never a Context-owned trace stack. */
export declare class GraphMutationSession {
    #private;
    constructor(intent: MutationIntent);
    get intent(): MutationIntent;
    request<T extends object>(mutation: T, parent?: MutationTraceScope, localComment?: string): MutationRequest<T>;
    /** @internal Preflight snapshots bind provenance for all siblings before SQL. */
    captureLogBindings(source: SQLLogBindingSource): void;
    /** @internal Never put this raw provenance on a wire or log record. */
    get logBindings(): SQLLogBindingSource | undefined;
}
/** Database committed; retrying this operation as a rolled-back write is unsafe. */
export declare class GraphCommittedError extends Error {
    readonly cause: unknown;
    readonly committed = true;
    constructor(cause: unknown);
}
export {};
//# sourceMappingURL=request-intent.d.ts.map