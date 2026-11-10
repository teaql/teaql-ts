"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ContextSchemaProvider_bootstrap, _ContextSchemaProvider_installed, _ContextSchemaProvider_pending, _ContextSchemaProvider_tail;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextSchemaProvider = void 0;
const runtime_module_1 = require("./runtime-module");
const schema_capability_1 = require("./schema-capability");
const entity_creation_1 = require("./entity-creation");
/** Provider SPI: the only executable entry point is UserContext.ensureSchema().
 * Protected hooks cannot be called by an application workspace. No model data
 * is synthesized here; an installed generated Mutation program owns seeding. */
class ContextSchemaProvider {
    constructor() {
        _ContextSchemaProvider_bootstrap.set(this, {});
        _ContextSchemaProvider_installed.set(this, false);
        _ContextSchemaProvider_pending.set(this, 0);
        _ContextSchemaProvider_tail.set(this, Promise.resolve());
    }
    installBootstrap(bootstrap) {
        if (__classPrivateFieldGet(this, _ContextSchemaProvider_pending, "f"))
            throw new Error('SCHEMA_INSTALL_DURING_RECONCILIATION');
        const merged = (0, runtime_module_1.mergeRuntimeBootstrap)(__classPrivateFieldGet(this, _ContextSchemaProvider_bootstrap, "f"), bootstrap);
        __classPrivateFieldSet(this, _ContextSchemaProvider_bootstrap, merged, "f");
        __classPrivateFieldSet(this, _ContextSchemaProvider_installed, true, "f");
    }
    async [(_ContextSchemaProvider_bootstrap = new WeakMap(), _ContextSchemaProvider_installed = new WeakMap(), _ContextSchemaProvider_pending = new WeakMap(), _ContextSchemaProvider_tail = new WeakMap(), schema_capability_1.contextSchemaCapability)](context) {
        var _a, _b;
        if (context.requireResource('dataService') !== this)
            throw new Error('SCHEMA_CONTEXT_PROVIDER_MISMATCH');
        if (!__classPrivateFieldGet(this, _ContextSchemaProvider_installed, "f"))
            throw new Error('SCHEMA_RUNTIME_MODULE_REQUIRED');
        const bootstrap = __classPrivateFieldGet(this, _ContextSchemaProvider_bootstrap, "f");
        if (!bootstrap.ensure && (bootstrap.defaultDomainRoot || bootstrap.constants?.length)) {
            throw new Error('SCHEMA_GENERATED_BOOTSTRAP_REQUIRED');
        }
        const predecessor = __classPrivateFieldGet(this, _ContextSchemaProvider_tail, "f");
        let release;
        __classPrivateFieldSet(this, _ContextSchemaProvider_tail, new Promise(resolve => { release = resolve; }), "f");
        __classPrivateFieldSet(this, _ContextSchemaProvider_pending, (_a = __classPrivateFieldGet(this, _ContextSchemaProvider_pending, "f"), _a++, _a), "f");
        await predecessor;
        let restore, actor, category;
        let captured = false, failed = false, failure;
        try {
            actor = context.getResource('bootstrapActor');
            category = context.getResource('bootstrapCategory');
            captured = true;
            restore = this.enterSchemaContext(context);
            if (typeof restore !== 'function')
                throw new TypeError('SCHEMA_CONTEXT_RESTORE_REQUIRED');
            // DDL is not an entity mutation; the bootstrap audit identity applies only
            // after physical reconciliation and before the generated Mutation program.
            await this.ensurePhysicalSchema(context);
            context.insertResource('bootstrapActor', 'teaql-generated-bootstrap');
            context.insertResource('bootstrapCategory', 'runtime-bootstrap');
            await (0, entity_creation_1.runGeneratedBootstrap)(context, bootstrap, async () => { await bootstrap.ensure?.(context); });
        }
        catch (error) {
            failed = true;
            failure = error;
        }
        finally {
            const cleanup = (work) => {
                try {
                    work();
                }
                catch (error) {
                    if (!failed) {
                        failed = true;
                        failure = error;
                    }
                }
            };
            if (captured) {
                cleanup(() => { if (actor === undefined)
                    context.removeResource('bootstrapActor');
                else
                    context.insertResource('bootstrapActor', actor); });
                cleanup(() => { if (category === undefined)
                    context.removeResource('bootstrapCategory');
                else
                    context.insertResource('bootstrapCategory', category); });
            }
            if (typeof restore === 'function')
                cleanup(restore);
            __classPrivateFieldSet(this, _ContextSchemaProvider_pending, (_b = __classPrivateFieldGet(this, _ContextSchemaProvider_pending, "f"), _b--, _b), "f");
            release();
        }
        if (failed)
            throw failure;
    }
}
exports.ContextSchemaProvider = ContextSchemaProvider;
//# sourceMappingURL=context-schema-provider.js.map