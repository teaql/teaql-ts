import type { EntitySchema } from '../sql/core';
import type { EntityChecker } from './checker';
import type { UserContext } from './context';
export type BootstrapEntity = Readonly<{
    entity: string;
    id: string;
    values?: Readonly<Record<string, unknown>>;
}>;
export type RuntimeBootstrap = Readonly<{
    defaultDomainRoot?: BootstrapEntity;
    constants?: readonly BootstrapEntity[];
    /** Generated typed Mutation program. Application workspaces cannot replace it. */
    ensure?: (context: UserContext) => Promise<void>;
}>;
export declare function mergeRuntimeBootstrap(left: RuntimeBootstrap, right: RuntimeBootstrap): RuntimeBootstrap;
export interface RuntimeModuleTarget {
    install(module: RuntimeModule): RuntimeModuleTarget;
}
/** Passive, immutable metadata manifest. It never creates or alters database tables. */
export declare class RuntimeModule {
    readonly schemas: Readonly<Record<string, EntitySchema>>;
    readonly checkers: Readonly<Record<string, EntityChecker>>;
    readonly bootstrap: RuntimeBootstrap;
    readonly requiredCapabilities: readonly string[];
    constructor(schemas?: Record<string, EntitySchema>, checkers?: Record<string, EntityChecker>, bootstrap?: RuntimeBootstrap, requiredCapabilities?: readonly string[]);
    withRequiredCapabilities(...capabilities: string[]): RuntimeModule;
    and(other: RuntimeModule): RuntimeModule;
}
//# sourceMappingURL=runtime-module.d.ts.map