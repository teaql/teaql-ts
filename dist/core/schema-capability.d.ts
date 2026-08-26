import type { UserContext } from './context';
/** Package-internal capability. This module is intentionally absent from package exports. */
export declare const contextSchemaCapability: unique symbol;
export interface InternalContextSchemaExecutor {
    [contextSchemaCapability](context: UserContext): Promise<void>;
}
//# sourceMappingURL=schema-capability.d.ts.map