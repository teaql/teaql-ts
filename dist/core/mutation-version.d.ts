import { CheckException } from './checker';
import { Long } from './long';
/** Ordinary versions remain numbers; wide versions use the existing exact JSON-safe Long. */
export type EntityVersion = number | Long;
export type EntityVersionInput = number | string | bigint;
export type VersionOperation = 'Create' | 'Update' | 'Delete' | 'Recover';
/** Stable, value-free diagnostics. A rounded number can never recover lost bits. */
export declare class MutationVersionError extends CheckException {
    readonly code: 'invalid_type' | 'version_exhausted';
    constructor(code: 'invalid_type' | 'version_exhausted', operation?: string);
}
/** Normalize only exact inputs. Canonical decimal text is also the wide JSON representation. */
export declare function entityVersion(value: unknown): EntityVersion;
/** The same checked transitions as Java/Rust. Creation starts at one, never old+one. */
export declare function nextEntityVersion(operation: VersionOperation, original?: unknown): EntityVersion;
//# sourceMappingURL=mutation-version.d.ts.map