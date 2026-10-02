export type EntityId = string | number | bigint;
export type EntityKey = Readonly<{
    entity: string;
    id: EntityId;
}>;
export type EntityChange = Readonly<{
    key: EntityKey;
    values: Readonly<Record<string, unknown>>;
}>;
/** Pending mutation ledger shared by one generated object graph. */
export declare class EntityRoot {
    private readonly changes;
    private readonly originalVersions;
    private readonly newKeys;
    private readonly deletedKeys;
    private readonly traces;
    /** A complete per-entity lineage replaces, rather than extends, graph fallback. */
    setTraceChain(key: EntityKey, nodes: readonly TraceNode[]): void;
    traceChain(key: EntityKey): readonly TraceNode[] | undefined;
    set(key: EntityKey, field: string, value: unknown): void;
    snapshot(): EntityChange[];
    change(key: EntityKey): Readonly<Record<string, unknown>>;
    mergeFrom(other: EntityRoot): void;
    /** Import one explicitly reached entity, never its foreign graph or ownership. */
    mergeEntityFrom(other: EntityRoot, key: EntityKey): void;
    hasPending(key: EntityKey): boolean;
    private snapshotVersions;
    rekey(oldKey: EntityKey, newKey: EntityKey): void;
    clearEntity(key: EntityKey): void;
    private requireMatchingVersion;
    setOriginalVersion(key: EntityKey, version: number): void;
    /** @internal Accept only the authoritative result after this key committed. */
    acceptCommittedVersion(key: EntityKey, version: number): void;
    originalVersion(key: EntityKey): number | undefined;
    markAsNew(key: EntityKey): void;
    isNew(key: EntityKey): boolean;
    markAsDeleted(key: EntityKey): void;
    isDeleted(key: EntityKey): boolean;
    clearCommitted(): void;
}
import { TraceNode } from './trace-chain';
//# sourceMappingURL=entity-root.d.ts.map