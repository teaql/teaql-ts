import { CheckException, decimal, FixedBusinessClock, UserContext } from '../../src';
import { EntityChecker } from '../../src/core/checker';
import { ContextEntityRef, ContextRootError } from '../../src/core/context';
import { checkResultToWire } from '../../src/core/i18n';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import { TeaQLClient } from 'generated/teaql-ts';
import { GENERATED_RUNTIME_MODULE } from 'generated/runtime-module';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

/** Application-owned boundary probe; generated sources stay byte-for-byte frozen. */
export async function verifyContextRoot(filename: string): Promise<void> {
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  // Installing the generated metadata must not select a request's active root.
  expect(context.getResource('activeRoot')).toBeUndefined();
  const driver = (client as any).driver;
  try {
    await context.ensureSchema();
    const active = context.requireActiveRoot('Tenant');
    expect(BigInt(active.id)).toBeGreaterThan(0n);
    const schemas = (client as any).schemas;
    const rootMember = Object.entries(schemas.PurchaseOrder.columns).find(([, column]) => (column as any).modelName === 'tenant')![0];
    expect(rootMember).toBeTruthy();
    const rootTable = schemas.Tenant.table as string;
    const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction');
    const allocation = jest.spyOn(driver, 'nextId');
    const policy = jest.spyOn(context, 'enterMutationPolicy'), review = jest.fn(() => undefined);
    context.withMutationPolicyRegistry({resolve: review});
    const rootLookups = () => query.mock.calls.filter(call => String(call[0]).replace(/"/g, '')
      .includes('FROM ' + rootTable)).length;
    let auditStart = client.auditTrace.length;
    const effects = () => ({queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
      allocations: allocation.mock.calls.length, policies: policy.mock.calls.length, reviews: review.mock.calls.length,
      audits: client.auditTrace.length - auditStart, rootLookups: rootLookups()});
    const reset = () => { query.mockClear(); transaction.mockClear(); allocation.mockClear();
      policy.mockClear(); review.mockClear(); auditStart = client.auditTrace.length; };
    const fixObservations: Array<Record<string, unknown>> = [];
    const checkers = (client as any).checkers as Record<string, EntityChecker>;
    for (const entity of ['PurchaseOrder', 'OrderItem']) {
      const delegate = checkers[entity]; expect(delegate).toBeDefined();
      checkers[entity] = {checkAndFix(ctx, mutation, results) {
        const before = effects();
        try {delegate.checkAndFix(ctx, mutation, results);} finally {
          expect(effects()).toEqual(before);
          const value = mutation.payload.tenant, loaded = mutation.loadedValues?.tenant;
          const descriptor = Object.getOwnPropertyDescriptor(mutation, 'loadedValues');
          fixObservations.push({entity, operation: mutation.action, rootPresent: value !== undefined && value !== null,
            root: value === undefined || value === null ? null : String(value?.id ?? value),
            loadedRoot: loaded == null ? null : String(loaded?.id ?? loaded),
            readOnlyLoadedValues: Boolean(descriptor && !descriptor.enumerable && !descriptor.writable && Object.isFrozen(mutation.loadedValues)),
            instant: ctx.getResource<Date>('fixTime')!.getTime(), ioDuringFix: 0});
        }
      }};
    }
    await Q.tenants().withIdIs(active.id as string).limit(1).comment('Calibrate the context-root lookup observer')
      .purpose('Prove the real SQL observer detects a root SELECT').executeForList(context);
    const queryCalibration = effects(); expect(queryCalibration.queries).toBeGreaterThan(0); expect(queryCalibration.rootLookups).toBeGreaterThan(0);
    const owner = async () => (await Q.purchaseOrders().comment('Prepare a context-root admission boundary')
      .purpose('Derive ownership from trusted runtime context').newEntity(context)).updateContactPhone('5550980');
    const parent = (await owner()), child = (await Q.orderItems().comment('Prepare a context-bound graph child')
      .purpose('Verify root Fix at every modified graph node').newEntity(context))
      .updateProductName('Context root child').updateUnitPrice(decimal('10.00'));
    parent.orderItemList().push(child);
    expect('updateTenantId' in parent).toBe(false); expect('updateTenantId' in child).toBe(false);
    reset(); await parent.auditAs('Persist the valid context-bound parent and child').save(context);
    const calibration = effects();
    expect(calibration.transactions).toBe(1); expect(calibration.allocations).toBe(0); expect(calibration.audits).toBe(2);
    expect(calibration.policies).toBeGreaterThan(0); expect(calibration.reviews).toBeGreaterThan(0); expect(calibration.rootLookups).toBe(0);
    expect(String(E.purchaseOrder(parent).tenantId().eval())).toBe(String(active.id));
    expect(String(E.orderItem(child).tenantId().eval())).toBe(String(active.id));
    const physical = () => {
      const db = new Database(filename, {readonly: true, fileMustExist: true});
      try {return {owners: db.prepare(`SELECT id,version,tenant FROM "${schemas.PurchaseOrder.table}" ORDER BY id`).all(),
        children: db.prepare(`SELECT id,version,tenant,purchase_order FROM "${schemas.OrderItem.table}" ORDER BY id`).all()};}
      finally {db.close();}
    };
    const cases: Array<Record<string, unknown>> = [];
    const root = (value?: ContextEntityRef) => value ? context.insertResource('activeRoot', value) : context.removeResource('activeRoot');
    const reject = async (name: string, row: Awaited<ReturnType<typeof owner>>, expectedRule: string) => {
      const before = physical(); reset(); let failure: unknown;
      try {await row.auditAs('Reject the synthetic ' + name + ' root violation').save(context);} catch (error) {failure = error;}
      const counts = effects(), violations = failure instanceof CheckException ? failure.violations : [];
      const matching = violations.find(v => v.ruleId === expectedRule && v.location.modelPath() === 'tenant');
      const contextFailure = expectedRule === 'context_root' && failure instanceof ContextRootError
        && failure.expectedType === 'Tenant' ? failure : undefined;
      const unchanged = JSON.stringify(physical()) === JSON.stringify(before);
      const passed = Boolean(matching || contextFailure) && Object.values(counts).every(v => v === 0) && unchanged;
      const value = {case: name, passed, expectedRule, matchedRule: Boolean(matching || contextFailure),
        errorType: failure instanceof Error ? failure.name : null, effects: counts, physicalStateUnchanged: unchanged,
        ...(contextFailure ? {contextError: {reason: contextFailure.reason, expectedType: contextFailure.expectedType}} : {}),
        ...(matching ? {wire: checkResultToWire(matching)} : {})};
      cases.push(value); process.stdout.write('CORE_TS_ROOT_CASE=' + JSON.stringify(value) + '\n');
    };
    root(); await reject('missing-root', (await owner()), 'context_root');
    root({entity: 'UnrelatedRoot', id: active.id}); await reject('type-mismatch', (await owner()), 'context_root');
    for (const [name, id] of [['zero-number', 0], ['zero-string', '0'], ['zero-bigint', 0n], ['negative-number', -1]] as const) {
      root({entity: 'Tenant', id}); await reject(name, (await owner()), 'context_root');
    }
    root(active);
    const conflict = (await owner());
    Reflect.set(conflict, rootMember, String(BigInt(active.id) + 1n));
    (conflict as any)._root.set({entity: 'PurchaseOrder', id: (conflict as any)._ledgerId}, 'tenant', String(BigInt(active.id) + 1n));
    await reject('explicit-root-mismatch', conflict, 'context_root_mismatch');
    const load = async () => (await Q.purchaseOrders().withIdIs(parent.id!).limit(1)
      .comment('Load the complete root-ownership baseline').purpose('Reject moving an existing owner').executeForList(context))[0];
    const loaded = await load(); expect(loaded).toBeDefined();
    (loaded as any)._root.set({entity: 'PurchaseOrder', id: (loaded as any)._ledgerId}, 'tenant', String(BigInt(active.id) + 1n));
    await reject('update-root-mismatch', loaded, 'context_root_mismatch');
    const other = (await load()).updateContactPhone('5550981');
    root({entity: 'Tenant', id: String(BigInt(active.id) + 1n)});
    await reject('update-wrong-context', other, 'context_root_mismatch');
    root(active);
    const transfer = (await load()).updateContactPhone('5550982');
    Reflect.set(transfer, rootMember, String(BigInt(active.id) + 1n));
    (transfer as any)._root.set({entity: 'PurchaseOrder', id: (transfer as any)._ledgerId}, 'tenant', String(BigInt(active.id) + 1n));
    root({entity: 'Tenant', id: String(BigInt(active.id) + 1n)});
    await reject('update-context-and-root', transfer, 'context_root_mismatch');
    root(active);
    const missingUpdate = (await load()).updateContactPhone('5550983');
    root(); await reject('update-missing-root', missingUpdate, 'context_root');
    root(active);
    const deleted = (await load()).markForDeletion();
    root({entity: 'Tenant', id: String(BigInt(active.id) + 2n)});
    await reject('delete-wrong-context', deleted, 'context_root_mismatch');
    root(active);
    const result = {language: 'typescript', passed: cases.every(v => v.passed), failures: cases.filter(v => !v.passed).map(v => v.case),
      cases, parentId: parent.id, childId: child.id, activeRoot: String(active.id), calibration, queryCalibration, fixObservations,
      noPublicRootUpdater: true, moduleInstallationChoosesRoot: false, queryAuthorizationInferred: false, newEntityBeforeReturnAccepted: false};
    process.stdout.write('CORE_TS_ROOT_RESULT=' + JSON.stringify(result) + '\n'); expect(result.passed).toBe(true);
    query.mockRestore(); transaction.mockRestore(); allocation.mockRestore(); policy.mockRestore();
  } finally {await client.close();}
}

/** The generated file-backed client must consume the same protected baseline. */
export async function verifyFileContextRoot(filename: string): Promise<void> {
  const context = new UserContext().withActiveRoot({entity: 'Tenant', id: '1'})
    .withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new TeaQLClient(filename).install(GENERATED_RUNTIME_MODULE).setUserContext(context);
  context.insertResource('dataService', client);
  const owner = async () => (await Q.purchaseOrders().comment('Prepare file-backed root ownership admission')
    .purpose('Verify both generated client implementations enforce the same context boundary')
    .newEntity(context)).updateContactPhone('5550984');
  const row = (await owner()); await row.auditAs('Create the file-backed root baseline').save(context);
  const persist = jest.spyOn(client as any, 'persist');
  const calibration = {persistCalls: persist.mock.calls.length};
  // The spy starts after the baseline. A second valid save calibrates it.
  row.updateContactPhone('5550985'); await row.auditAs('Calibrate file-backed persistence').save(context);
  calibration.persistCalls = persist.mock.calls.length; expect(calibration.persistCalls).toBeGreaterThan(0);
  const cases: Array<Record<string, unknown>> = [];
  const reject = async (name: string, target: Awaited<ReturnType<typeof owner>>, expected: string) => {
    const before = readFileSync(filename), audit = client.auditTrace.length; persist.mockClear(); let failure: unknown;
    try {await target.auditAs('Reject file-backed ' + name).save(context);} catch (error) {failure = error;}
    const typed = failure instanceof ContextRootError && failure.expectedType === 'Tenant' && expected === 'context_root';
    const violation = failure instanceof CheckException ? failure.violations.find(v => v.ruleId === expected && v.location.modelPath() === 'tenant') : undefined;
    const effects = {persistCalls: persist.mock.calls.length, audits: client.auditTrace.length - audit};
    const unchanged = readFileSync(filename).equals(before), passed = Boolean(typed || violation) && !effects.persistCalls && !effects.audits && unchanged;
    const result = {case: name, passed, expectedRule: expected, matchedRule: Boolean(typed || violation), effects,
      physicalStateUnchanged: unchanged, errorType: failure instanceof Error ? failure.name : null};
    cases.push(result); process.stdout.write('CORE_TS_ROOT_FILE_CASE=' + JSON.stringify(result) + '\n');
  };
  try {
    context.withActiveRoot({entity: 'Tenant', id: 0}); await reject('zero-root', (await owner()), 'context_root');
    const load = async () => (await Q.purchaseOrders().withIdIs(row.id!).limit(1)
      .comment('Load the complete file-backed baseline').purpose('Use actual hydration provenance for ownership').executeForList(context))[0];
    context.withActiveRoot({entity: 'Tenant', id: '2'});
    await reject('update-wrong-context', (await load()).updateContactPhone('5550986'), 'context_root_mismatch');
    const transferred = (await load()).updateContactPhone('5550987');
    const schemas = (client as any).schemas;
    const member = Object.entries(schemas.PurchaseOrder.columns).find(([, column]) => (column as any).modelName === 'tenant')![0];
    Reflect.set(transferred, member, '2');
    (transferred as any)._root.set({entity: 'PurchaseOrder', id: (transferred as any)._ledgerId}, 'tenant', '2');
    await reject('update-context-and-root', transferred, 'context_root_mismatch');
    const missing = (await load()).updateContactPhone('5550988'); context.removeResource('activeRoot');
    await reject('update-missing-root', missing, 'context_root');
    context.withActiveRoot({entity: 'Tenant', id: '3'});
    await reject('delete-wrong-context', (await load()).markForDeletion(), 'context_root_mismatch');
    const result = {language: 'typescript', passed: cases.every(v => v.passed), cases,
      failures: cases.filter(v => !v.passed).map(v => v.case), calibration,
      queryAuthorizationInferred: false, newEntityBeforeReturnAccepted: false};
    process.stdout.write('CORE_TS_ROOT_FILE_RESULT=' + JSON.stringify(result) + '\n'); expect(result.passed).toBe(true);
  } finally {persist.mockRestore();}
}
