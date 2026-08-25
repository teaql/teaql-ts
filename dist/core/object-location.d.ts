export type ObjectLocationSegment = {
    readonly kind: 'property';
    readonly name: string;
} | {
    readonly kind: 'index';
    readonly index: number;
};
/** A casing-neutral location expressed with canonical KSML property names. */
export declare class ObjectLocation {
    readonly segments: readonly ObjectLocationSegment[];
    private constructor();
    static root(): ObjectLocation;
    static property(name: string): ObjectLocation;
    property(name: string): ObjectLocation;
    index(index: number): ObjectLocation;
    modelPath(): string;
    nativePath(): string;
    instancePath(): string;
    toString(): string;
    private render;
}
//# sourceMappingURL=object-location.d.ts.map