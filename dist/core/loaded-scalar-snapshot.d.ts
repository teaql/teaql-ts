/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
export declare class LoadedScalarSnapshot {
    #private;
    constructor(values?: Record<string, unknown>);
    /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
    values(): Readonly<Record<string, unknown>>;
    /** @internal Generated hydration stores provenance outside entity/JSON state. */
    static captureFor(entity: object, values: Record<string, unknown>): LoadedScalarSnapshot;
    /** @internal Mutation uses the loaded values, not already-edited properties. */
    static forEntity(entity: object): LoadedScalarSnapshot | undefined;
    /** @internal Rollback restores provenance together with authoritative entity state. */
    static restoreFor(entity: object, snapshot: LoadedScalarSnapshot | undefined): void;
}
//# sourceMappingURL=loaded-scalar-snapshot.d.ts.map