import type { UserContext } from './context';

/** Package-internal capability. This module is intentionally absent from package exports. */
export const contextSchemaCapability: unique symbol = Symbol('teaql.context.schema-capability');

export interface InternalContextSchemaExecutor {
  [contextSchemaCapability](context: UserContext): Promise<void>;
}
