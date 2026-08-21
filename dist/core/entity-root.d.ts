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
    set(key: EntityKey, field: string, value: unknown): void;
    snapshot(): EntityChange[];
    change(key: EntityKey): Readonly<Record<string, unknown>>;
    mergeFrom(other: EntityRoot): void;
    private snapshotVersions;
    rekey(oldKey: EntityKey, newKey: EntityKey): void;
    clearEntity(key: EntityKey): void;
    setOriginalVersion(key: EntityKey, version: number): void;
    originalVersion(key: EntityKey): number | undefined;
    markAsNew(key: EntityKey): void;
    isNew(key: EntityKey): boolean;
    markAsDeleted(key: EntityKey): void;
    isDeleted(key: EntityKey): boolean;
    clearCommitted(): void;
}
//# sourceMappingURL=entity-root.d.ts.map