import type { EntitySchema } from '../sql/core';
export interface RuntimeModuleTarget {
    install(module: RuntimeModule): RuntimeModuleTarget;
}
/** Passive, immutable metadata manifest. It never creates or alters database tables. */
export declare class RuntimeModule {
    readonly schemas: Readonly<Record<string, EntitySchema>>;
    constructor(schemas?: Record<string, EntitySchema>);
    and(other: RuntimeModule): RuntimeModule;
}
//# sourceMappingURL=runtime-module.d.ts.map