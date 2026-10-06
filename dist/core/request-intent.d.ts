import type { MutationQuery, SelectQuery } from './ast';
import { TraceNode, MutationTraceScope } from './trace-chain';
import type { EntityKey } from './entity-root';
import type { SQLLogBindingSource } from './log-privacy';
import { LoadedScalarSnapshot } from './loaded-scalar-snapshot';
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
//# sourceMappingURL=request-intent.d.ts.map