export type ObjectLocationSegment = {
    readonly kind: 'property';
    readonly name: string;
} | {
    readonly kind: 'index';
    readonly index: number;
};
export type JsonFieldNamingProfile = 'camelCase' | 'snake_case' | 'PascalCase';
export declare function renderJsonFieldName(name: string, profile: JsonFieldNamingProfile): string;
/** A casing-neutral location expressed with canonical KSML property names. */
export declare class ObjectLocation {
    readonly segments: readonly ObjectLocationSegment[];
    private constructor();
    static root(): ObjectLocation;
    static property(name: string): ObjectLocation;
    property(name: string): ObjectLocation;
    index(index: number): ObjectLocation;
    prefixedBy(prefix: ObjectLocation): ObjectLocation;
    modelPath(): string;
    nativePath(): string;
    instancePath(profile?: JsonFieldNamingProfile): string;
    toString(): string;
    private render;
}
//# sourceMappingURL=object-location.d.ts.map