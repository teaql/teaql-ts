import { UserContext } from './context';
import type { EntityKey, EntityRoot } from './entity-root';
import type { RuntimeBootstrap } from './runtime-module';
/** Stable, value-free diagnostic. Never includes data or Context resources. */
export declare class EntityCreationError extends Error {
    readonly code = "ENTITY_CREATION_CONTEXT_REQUIRED";
    constructor();
}
/** Core provenance, separate from each graph's mutation ledger and from JSON. */
export declare class EntityCreation {
    static create<T extends object>(context: UserContext, entity: string, construct: (id: string) => T): Promise<T>;
    /** @internal Only an installed model's fixed IDs inside Context.ensureSchema. */
    static bootstrap<T extends object>(context: UserContext, entity: string, value: unknown, construct: (id: string) => T): T;
    /** @internal Provider/JSON hydration is never insert intent. */
    static hydrated<T extends object>(value: T): T;
    /** Pure admission: must run before provider, Fix, clock or mutation callbacks. */
    static requireMutation(value: object, key: EntityKey, nativeId: unknown, action: string, root: EntityRoot, pending: boolean): void;
}
/** Package-internal: not exported from the public package entry point. */
export declare function runGeneratedBootstrap(context: UserContext, bootstrap: RuntimeBootstrap, work: () => Promise<void>): Promise<void>;
//# sourceMappingURL=entity-creation.d.ts.map