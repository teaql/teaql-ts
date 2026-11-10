import type { UserContext } from './context';
import { RuntimeBootstrap } from './runtime-module';
import { contextSchemaCapability } from './schema-capability';
/** Provider SPI: the only executable entry point is UserContext.ensureSchema().
 * Protected hooks cannot be called by an application workspace. No model data
 * is synthesized here; an installed generated Mutation program owns seeding. */
export declare abstract class ContextSchemaProvider {
    #private;
    protected installBootstrap(bootstrap: RuntimeBootstrap): void;
    protected abstract enterSchemaContext(context: UserContext): () => void;
    protected abstract ensurePhysicalSchema(context: UserContext): Promise<void>;
    [contextSchemaCapability](context: UserContext): Promise<void>;
}
//# sourceMappingURL=context-schema-provider.d.ts.map