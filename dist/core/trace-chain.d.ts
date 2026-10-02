/** Typed vocabulary shared by SQL routing and independently owned audit lineage. */
export type TraceKind = 'operation' | 'request' | 'relation' | 'entity' | 'provider' | 'sql' | 'comment' | 'purpose' | 'auditReason';
export type TraceNode = Readonly<{
    kind: TraceKind;
    name: string;
    /** Strings/bigints preserve unsigned-64 identities beyond JavaScript's safe integer range. */
    entityId?: string | number | bigint | null;
    detail?: string;
}>;
export type SQLTraceOperation = 'select' | 'insert' | 'update' | 'delete' | 'recover';
export declare function cloneTraceNodes(source: readonly TraceNode[]): readonly TraceNode[];
/** Pure Rust-baseline algorithm. Request validation remains a separate mandatory gate. */
export declare function canonicalSQLTracePath(source: readonly TraceNode[], backend: string, operation: SQLTraceOperation): Readonly<{
    tracePath: readonly TraceNode[];
    comment?: string;
    purpose?: string;
    auditReason?: string;
}>;
export declare function queryTraceSource(entity: string, comment: string, purpose: string): readonly TraceNode[];
//# sourceMappingURL=trace-chain.d.ts.map