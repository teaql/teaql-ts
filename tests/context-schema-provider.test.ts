import {ContextSchemaProvider, RuntimeModule, UserContext} from '../src';
import * as publicRuntime from '../src';
import {contextSchemaCapability} from '../src/core/schema-capability';
import type {RuntimeBootstrap} from '../src/core/runtime-module';

class Provider extends ContextSchemaProvider {
  context?: UserContext;
  physicalCalls = 0;
  physical?: (context: UserContext) => Promise<void>;
  restoreFailure?: Error;
  install(module: RuntimeModule): this { this.installBootstrap(module.bootstrap); return this; }
  protected enterSchemaContext(context: UserContext): () => void {
    const old = this.context; this.context = context;
    return () => { this.context = old; if (this.restoreFailure) throw this.restoreFailure; };
  }
  protected async ensurePhysicalSchema(context: UserContext): Promise<void> {
    this.physicalCalls++; expect(this.context).toBe(context); await this.physical?.(context);
  }
}
function setup(bootstrap: RuntimeBootstrap = {}) {
  const provider = new Provider().install(new RuntimeModule({}, {}, bootstrap));
  const context = new UserContext().insertResource('dataService', provider)
    .insertResource('bootstrapActor', 'prior actor').insertResource('bootstrapCategory', 'prior category');
  return {provider, context};
}
function restored(context: UserContext) {
  expect(context.getResource('bootstrapActor')).toBe('prior actor');
  expect(context.getResource('bootstrapCategory')).toBe('prior category');
}
function workspaceAPI(provider: Provider, context: UserContext) {
  // @ts-expect-error The executable schema method belongs only to Context.
  void provider.ensureSchema;
  // @ts-expect-error Provider implementation hooks are not workspace APIs.
  void provider.ensurePhysicalSchema;
  // @ts-expect-error Module/bootstrap registration is provider-protected.
  void provider.installBootstrap;
  // @ts-expect-error Workspace Context has no descriptor/module overload.
  context.ensureSchema([]);
}
void workspaceAPI;

test('schema registration is passive and has no named public execution or exported symbol', () => {
  const ensure = jest.fn(async () => {}), {provider} = setup({ensure});
  expect(provider.physicalCalls).toBe(0); expect(ensure).not.toHaveBeenCalled();
  expect('ensureSchema' in provider).toBe(false); expect('contextSchemaCapability' in publicRuntime).toBe(false);
});
test('Context calls physical schema before generated Mutation bootstrap with scoped provenance', async () => {
  const events: string[] = [];
  const {provider, context} = setup({ensure: async ctx => {
    expect(ctx).toBe(context); expect(provider.context).toBe(ctx);
    expect(ctx.getResource('bootstrapActor')).toBe('teaql-generated-bootstrap');
    expect(ctx.getResource('bootstrapCategory')).toBe('runtime-bootstrap'); events.push('bootstrap');
  }});
  provider.physical = async ctx => { restored(ctx); events.push('physical'); };
  await context.ensureSchema(); expect(events).toEqual(['physical', 'bootstrap']); restored(context); expect(provider.context).toBeUndefined();
});
test('an uninstalled provider fails closed before physical execution', async () => {
  const provider = new Provider(), context = new UserContext().insertResource('dataService', provider);
  await expect(context.ensureSchema()).rejects.toThrow('SCHEMA_RUNTIME_MODULE_REQUIRED'); expect(provider.physicalCalls).toBe(0);
});
test('a missing provider retains the existing actionable Context failure', () => {
  expect(() => new UserContext().ensureSchema()).toThrow('Required UserContext resource is missing: dataService');
});
test('the private invocation rejects a Context bound to another provider', async () => {
  const {provider} = setup(), other = new UserContext().insertResource('dataService', {});
  await expect(provider[contextSchemaCapability](other)).rejects.toThrow('SCHEMA_CONTEXT_PROVIDER_MISMATCH'); expect(provider.physicalCalls).toBe(0);
});
test.each(['root', 'constants'])('metadata-only %s cannot fall back to generic data insertion', async kind => {
  const metadata = kind === 'root' ? {defaultDomainRoot: {entity: 'Platform', id: '1'}} : {constants: [{entity: 'Status', id: '1001'}]};
  const {provider, context} = setup(metadata);
  await expect(context.ensureSchema()).rejects.toThrow('SCHEMA_GENERATED_BOOTSTRAP_REQUIRED'); expect(provider.physicalCalls).toBe(0); restored(context);
});
test('concurrent callers are serialized and the execution Context never crosses scopes', async () => {
  let release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; }), seen: UserContext[] = [];
  const {provider, context} = setup({ensure: async ctx => { seen.push(ctx); if (seen.length === 1) await barrier; expect(provider.context).toBe(ctx); }});
  const second = new UserContext().insertResource('dataService', provider), a = context.ensureSchema(), b = second.ensureSchema();
  await Promise.resolve(); await Promise.resolve();
  expect(() => provider.install(new RuntimeModule())).toThrow('SCHEMA_INSTALL_DURING_RECONCILIATION');
  release(); await Promise.all([a,b]); expect(seen).toEqual([context,second]); expect(provider.physicalCalls).toBe(2);
  restored(context); expect(second.getResource('bootstrapActor')).toBeUndefined(); expect(second.getResource('bootstrapCategory')).toBeUndefined(); expect(provider.context).toBeUndefined();
});
test('physical failure preserves its identity, restores Context and releases the next invocation', async () => {
  const ensure = jest.fn(async () => {}), {provider, context} = setup({ensure}), failure = new Error('physical failure');
  provider.physical = async () => { throw failure; };
  await expect(context.ensureSchema()).rejects.toBe(failure); expect(ensure).not.toHaveBeenCalled(); restored(context); expect(provider.context).toBeUndefined();
  provider.physical = undefined; await context.ensureSchema(); expect(ensure).toHaveBeenCalledTimes(1); expect(provider.physicalCalls).toBe(2);
});
test('generated-program failure restores Context and releases the next invocation', async () => {
  const failure = new Error('generated failure'); let fail = true;
  const {provider, context} = setup({ensure: async () => { if (fail) throw failure; }});
  await expect(context.ensureSchema()).rejects.toBe(failure); restored(context); expect(provider.context).toBeUndefined();
  fail = false; await context.ensureSchema(); expect(provider.physicalCalls).toBe(2); restored(context);
});
test('cleanup failure cannot replace an original execution error or strand the queue', async () => {
  const failure = new Error('original bootstrap failure'), cleanup = new Error('restore failure'); let fail = true;
  const {provider, context} = setup({ensure: async () => { if (fail) throw failure; }}); provider.restoreFailure = cleanup;
  await expect(context.ensureSchema()).rejects.toBe(failure); restored(context);
  fail = false; await expect(context.ensureSchema()).rejects.toBe(cleanup); expect(provider.physicalCalls).toBe(2); restored(context);
});
test('composed generated programs execute in order without registration-time effects', async () => {
  const seen: string[] = [], {provider, context} = setup({ensure: async () => { seen.push('first'); }});
  provider.install(new RuntimeModule({}, {}, {ensure: async () => { seen.push('second'); }})); expect(seen).toEqual([]);
  await context.ensureSchema(); expect(seen).toEqual(['first','second']);
});
test('conflicting Domain Roots reject atomically before an installed program can be replaced', async () => {
  const ensure = jest.fn(async () => {}), {provider, context} = setup({defaultDomainRoot:{entity:'Platform',id:'1'},ensure});
  expect(() => provider.install(new RuntimeModule({}, {}, {defaultDomainRoot:{entity:'Platform',id:'2'}}))).toThrow('different Default Domain Roots');
  await context.ensureSchema(); expect(ensure).toHaveBeenCalledTimes(1);
});
test('the coordinator never reads system/business time or invents model data', async () => {
  const now = jest.fn(() => new Date(0)), {provider,context} = setup(); context.withBusinessClock({now});
  await context.ensureSchema(); expect(now).not.toHaveBeenCalled(); expect(provider.physicalCalls).toBe(1); restored(context);
});
