/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
export declare class LoadedScalarSnapshot {
    #private;
    constructor(values?: Record<string, unknown>);
    /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
    values(): Readonly<Record<string, unknown>>;
}
//# sourceMappingURL=loaded-scalar-snapshot.d.ts.map