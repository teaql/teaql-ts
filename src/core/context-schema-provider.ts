import type {UserContext} from './context';
import {mergeRuntimeBootstrap, RuntimeBootstrap} from './runtime-module';
import {contextSchemaCapability} from './schema-capability';
import {runGeneratedBootstrap} from './entity-creation';

/** Provider SPI: the only executable entry point is UserContext.ensureSchema().
 * Protected hooks cannot be called by an application workspace. No model data
 * is synthesized here; an installed generated Mutation program owns seeding. */
export abstract class ContextSchemaProvider {
  #bootstrap: RuntimeBootstrap = {};
  #installed = false;
  #pending = 0;
  #tail: Promise<void> = Promise.resolve();

  protected installBootstrap(bootstrap: RuntimeBootstrap): void {
    if (this.#pending) throw new Error('SCHEMA_INSTALL_DURING_RECONCILIATION');
    const merged = mergeRuntimeBootstrap(this.#bootstrap, bootstrap);
    this.#bootstrap = merged;
    this.#installed = true;
  }
  protected abstract enterSchemaContext(context: UserContext): () => void;
  protected abstract ensurePhysicalSchema(context: UserContext): Promise<void>;

  async [contextSchemaCapability](context: UserContext): Promise<void> {
    if (context.requireResource('dataService') !== this) throw new Error('SCHEMA_CONTEXT_PROVIDER_MISMATCH');
    if (!this.#installed) throw new Error('SCHEMA_RUNTIME_MODULE_REQUIRED');
    const bootstrap = this.#bootstrap;
    if (!bootstrap.ensure && (bootstrap.defaultDomainRoot || bootstrap.constants?.length)) {
      throw new Error('SCHEMA_GENERATED_BOOTSTRAP_REQUIRED');
    }
    const predecessor = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>(resolve => { release = resolve; });
    this.#pending++;
    await predecessor;
    let restore: (() => void) | undefined, actor: unknown, category: unknown;
    let captured = false, failed = false, failure: unknown;
    try {
      actor = context.getResource('bootstrapActor');
      category = context.getResource('bootstrapCategory');
      captured = true;
      restore = this.enterSchemaContext(context);
      if (typeof restore !== 'function') throw new TypeError('SCHEMA_CONTEXT_RESTORE_REQUIRED');
      // DDL is not an entity mutation; the bootstrap audit identity applies only
      // after physical reconciliation and before the generated Mutation program.
      await this.ensurePhysicalSchema(context);
      context.insertResource('bootstrapActor', 'teaql-generated-bootstrap');
      context.insertResource('bootstrapCategory', 'runtime-bootstrap');
      await runGeneratedBootstrap(context, bootstrap, async () => {await bootstrap.ensure?.(context);});
    } catch (error) { failed = true; failure = error; }
    finally {
      const cleanup = (work: () => void) => {
        try { work(); } catch (error) { if (!failed) { failed = true; failure = error; } }
      };
      if (captured) {
        cleanup(() => { if (actor === undefined) context.removeResource('bootstrapActor'); else context.insertResource('bootstrapActor', actor); });
        cleanup(() => { if (category === undefined) context.removeResource('bootstrapCategory'); else context.insertResource('bootstrapCategory', category); });
      }
      if (typeof restore === 'function') cleanup(restore);
      this.#pending--;
      release();
    }
    if (failed) throw failure;
  }
}
