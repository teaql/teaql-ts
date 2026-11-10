/** Trusted generated model vocabulary, shared by instances, never inferred from input. */
export declare class MutationFieldLayout {
    #private;
    readonly entity: string;
    constructor(entity: string, fields: readonly string[], immutable?: Readonly<Record<string, string>>);
    /** Admission must run before an equal value can disappear from pending intent. */
    validate(values: Readonly<Record<string, unknown>>, updating?: boolean): void;
}
//# sourceMappingURL=mutation-field-layout.d.ts.map