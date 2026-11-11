import type { EntityKey, EntityRoot } from './entity-root';
import { EntityVersion, EntityVersionInput } from './mutation-version';
import { CheckException } from './checker';
/** Stable, value-free conflict; paths remain canonical Checker locations. */
export declare class LoadedEntityIdentityError extends CheckException {
    readonly code = "ENTITY_VERSION_CONFLICT";
    constructor(field: 'id' | 'version');
}
/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
export declare class LoadedScalarSnapshot {
    #private;
    constructor(values?: Record<string, unknown>, key?: EntityKey, version?: EntityVersionInput, origin?: 'hydrated' | 'creationBaseline');
    /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
    values(): Readonly<Record<string, unknown>>;
    get origin(): 'hydrated' | 'creationBaseline';
    get persistedVersion(): EntityVersion | undefined;
    /** @internal Exact canonical top-level difference for detached preparation. */
    changedField(values: Readonly<Record<string, unknown>>): string | undefined;
    /** Validate even read-only nodes, before root attachment or FK normalization. */
    validateNativeIdentity(key: EntityKey, nativeID: unknown, nativeVersion: unknown): void;
    /** Normalize restored intent first. Clean old views may observe an advanced
     * ledger, but a dirty old view must never borrow its newer committed version. */
    validateMutationVersion(root: EntityRoot, key: EntityKey): void;
    /** @internal Generated hydration stores provenance outside entity/JSON state. */
    static captureFor(entity: object, values: Record<string, unknown>, key?: EntityKey, version?: EntityVersionInput, origin?: 'hydrated' | 'creationBaseline'): LoadedScalarSnapshot;
    /** @internal Mutation uses the loaded values, not already-edited properties. */
    static forEntity(entity: object): LoadedScalarSnapshot | undefined;
    /** @internal Rollback restores provenance together with authoritative entity state. */
    static restoreFor(entity: object, snapshot: LoadedScalarSnapshot | undefined): void;
    /** @internal Called only after model-field admission, before completeness and Fix. */
    discardRestoredFields(root: EntityRoot, key: EntityKey, restore?: (values: Readonly<Record<string, unknown>>) => void): void;
}
//# sourceMappingURL=loaded-scalar-snapshot.d.ts.map