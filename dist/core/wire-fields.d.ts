import { JsonFieldNamingProfile } from './object-location';
import type { CheckResult } from './i18n';
export interface WireFieldMetadata {
    readonly canonicalName: string;
    readonly wireName: string;
    readonly aliases: readonly string[];
}
export interface WireEntityMetadata {
    readonly entityType: string;
    readonly profile: JsonFieldNamingProfile;
    readonly fields: Readonly<Record<string, WireFieldMetadata>>;
}
export interface NormalizedWireInput {
    /** Values keyed only by canonical KSML property names. */
    readonly values: Readonly<Record<string, unknown>>;
    /** Exact submitted RFC 6901 pointer, retained only for accepted aliases. */
    readonly sourceInstancePaths: Readonly<Record<string, string>>;
}
export declare class WireInputError extends Error {
    readonly code: 'WIRE_UNKNOWN_FIELD' | 'WIRE_FIELD_COLLISION';
    readonly instancePath: string;
    constructor(code: 'WIRE_UNKNOWN_FIELD' | 'WIRE_FIELD_COLLISION', instancePath: string, message: string);
}
export declare function createWireEntityMetadata(entityType: string, canonicalFields: readonly string[], profile?: JsonFieldNamingProfile, aliases?: Readonly<Record<string, readonly string[]>>): WireEntityMetadata;
/**
 * Normalize one JSON object before checker or mutation execution.
 *
 * No serializer naming policy is consulted. The generated field map is the
 * complete authority, and two submitted spellings for one canonical field are
 * always rejected, even when their values happen to be equal.
 */
export declare function normalizeWireInput(input: Readonly<Record<string, unknown>>, metadata: WireEntityMetadata, parentPointer?: string): NormalizedWireInput;
/** Render canonical mutation values to the selected external profile. */
export declare function encodeWireOutput(values: Readonly<Record<string, unknown>>, metadata: WireEntityMetadata): Readonly<Record<string, unknown>>;
/** Add submitted alias provenance to checker results without changing location identity. */
export declare function retainSubmittedPaths(results: readonly CheckResult[], normalized: NormalizedWireInput): CheckResult[];
//# sourceMappingURL=wire-fields.d.ts.map