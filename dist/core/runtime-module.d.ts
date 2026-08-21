import type { EntitySchema } from '../sql/core';
import type { EntityChecker } from './checker';
export interface RuntimeModuleTarget {
    install(module: RuntimeModule): RuntimeModuleTarget;
}
/** Passive, immutable metadata manifest. It never creates or alters database tables. */
export declare class RuntimeModule {
    readonly schemas: Readonly<Record<string, EntitySchema>>;
    readonly checkers: Readonly<Record<string, EntityChecker>>;
    constructor(schemas?: Record<string, EntitySchema>, checkers?: Record<string, EntityChecker>);
    and(other: RuntimeModule): RuntimeModule;
}
//# sourceMappingURL=runtime-module.d.ts.map