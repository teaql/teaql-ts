/** Stable catalog identity. A Key is never a read URL or an authorization credential. */
export declare class BlobRef {
    #private;
    private static readonly KEY;
    constructor(key: string);
    get key(): string;
    static fromJSON(value: unknown): BlobRef;
    static fromSQL(value: unknown): BlobRef;
    equals(other: unknown): boolean;
    /** Generic JSON output must go through an authorized prepared view. */
    toJSON(): never;
    toString(): string;
}
/** Trusted model restrictions; the server-selected profile may narrow them further. */
export declare class BlobFieldSpec {
    static readonly CAPABILITY = "blob.v1";
    readonly protocolVersion = "blob.v1";
    readonly maxFiles = 1;
    readonly entity: string;
    readonly field: string;
    readonly allowedExtensions: readonly string[];
    readonly allowedContentTypes: readonly string[];
    readonly nullable: boolean;
    readonly policyProfile: string;
    constructor(entity: string, field: string, extensions: Iterable<string>, nullable: boolean, policyProfile: string);
}
//# sourceMappingURL=blob-ref.d.ts.map