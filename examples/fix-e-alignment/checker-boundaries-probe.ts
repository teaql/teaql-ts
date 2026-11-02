import { CheckException, decimal, EntityChecker, FixedBusinessClock, RuntimeModule, TeaQLNotLoadedError, UserContext } from '../../src';
import { checkResultToWire, CheckResult } from '../../src/core/i18n';
import { JsonFieldNamingProfile } from '../../src/core/object-location';
import { createWireEntityMetadata, normalizeWireInput, retainSubmittedPaths, WireInputError } from '../../src/core/wire-fields';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import { GENERATED_RUNTIME_MODULE } from 'generated/runtime-module';
import Database from 'better-sqlite3';

const clock = new Date('2032-02-29T10:15:30Z');
const profiles: JsonFieldNamingProfile[] = ['camelCase', 'snake_case', 'PascalCase'];

/** Normal generated saves; private driver access is observation, never business writes. */
export async function verifyCheckerBoundaries(filename: string): Promise<void> {
  const round = Number(process.env.TEAQL_FIX_E_ROUND);
  expect([1, 2]).toContain(round);
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(clock));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const driver = (client as any).driver;
  const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction');
  const exec = jest.spyOn(driver.database as Database.Database, 'exec');
  const allocation = jest.spyOn(driver, 'nextId'), policy = jest.spyOn(context, 'enterMutationPolicy');
  const review = jest.fn(() => undefined);
  context.withMutationPolicyRegistry({resolve: review});
  let auditStart = 0, checkerCalls = 0, fix: 'none' | 'required-null' | 'min-zero' | 'repair' = 'none';
  const observations: Array<Record<string, unknown>> = [];
  const record = (name: string, details: Record<string, unknown>) => {
    const value = {round, case: name, passed: true, ...details};
    observations.push(value); process.stdout.write('CORE_TS_CHECKER_BOUNDARY_CASE=' + JSON.stringify(value) + '\n');
  };
  const effects = () => ({queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
    begins: exec.mock.calls.filter(call => /^BEGIN\b/i.test(call[0])).length,
    commits: exec.mock.calls.filter(call => /^COMMIT\b/i.test(call[0])).length,
    rollbacks: exec.mock.calls.filter(call => /^ROLLBACK\b/i.test(call[0])).length,
    allocations: allocation.mock.calls.length, policies: policy.mock.calls.length,
    reviews: review.mock.calls.length, audits: client.auditTrace.length - auditStart,
    mutations: query.mock.calls.filter(call => /^\s*(?:INSERT INTO|UPDATE|DELETE FROM)\s+(?:tenant_data|purchase_order_data|order_item_data)\b/i
      .test(String(call[0]).replace(/"/g, ''))).length});
  const zero = {queries: 0, transactions: 0, begins: 0, commits: 0, rollbacks: 0,
    allocations: 0, policies: 0, reviews: 0, audits: 0, mutations: 0};
  const reset = () => {query.mockClear(); transaction.mockClear(); exec.mockClear(); allocation.mockClear();
    policy.mockClear(); review.mockClear(); auditStart = client.auditTrace.length; checkerCalls = 0;};
  const physical = () => {
    const db = new Database(filename, {readonly: true, fileMustExist: true});
    try {return {
      tenant_data: db.prepare('SELECT id,name,version FROM tenant_data ORDER BY id').all(),
      purchase_order_data: db.prepare('SELECT id,tenant,contact_phone,internal_note,create_time,update_time,version FROM purchase_order_data ORDER BY id').all(),
      order_item_data: db.prepare('SELECT id,purchase_order,tenant,product_name,unit_price,create_time,update_time,version FROM order_item_data ORDER BY id').all(),
    };} finally {db.close();}
  };
  const owner = (phone = '5550100') => Q.purchaseOrders().comment('Prepare a bounded Checker fixture')
    .purpose('Verify admission through generated audited graph saves').newEntity(context).updateContactPhone(phone);
  const item = (valid = true) => {
    const value = Q.orderItems().comment('Prepare a generated Checker child')
      .purpose('Verify post-Fix business values without application SQL').newEntity(context).updateUnitPrice(decimal(valid ? '10.00' : '0'));
    if (valid) value.updateProductName('Boundary item');
    return value;
  };
  const expectRejected = async (save: () => Promise<unknown>, rule: string, path: string, entity: string) => {
    const before = physical(); reset(); let failure: unknown;
    try {await save();} catch (error) {failure = error;}
    expect(failure).toBeInstanceOf(CheckException);
    const results = [...(failure as CheckException).violations];
    const matching = results.find(value => value.ruleId === rule && value.location.modelPath() === path);
    expect(matching).toBeDefined(); expect(matching!.entityType).toBe(entity);
    expect(effects()).toEqual(zero); expect(physical()).toEqual(before);
    expect(context.getResource('fixTime')).toBeUndefined();
    return {result: matching!, results, effects: effects(), checkerCalls};
  };
  try {
    await context.ensureSchema();
    const delegates = GENERATED_RUNTIME_MODULE.checkers;
    const wrappers: Record<string, EntityChecker> = {};
    for (const [name, delegate] of Object.entries(delegates)) wrappers[name] = {checkAndFix(ctx, mutation, results) {
      checkerCalls++;
      expect(ctx.requireResource<Date>('fixTime').getTime()).toBe(clock.getTime());
      if (name === 'OrderItem') {
        if (fix === 'required-null') mutation.payload.product_name = null;
        if (fix === 'min-zero') mutation.payload.unit_price = decimal('0');
        if (fix === 'repair') {mutation.payload.product_name = 'Fixed child'; mutation.payload.unit_price = decimal('12.34');}
      }
      const before = effects(); delegate.checkAndFix(ctx, mutation, results); expect(effects()).toEqual(before);
    }};
    client.install(new RuntimeModule({}, wrappers));

    // Module installation is independent of DDL/bootstrap; use a separate empty store.
    const isolatedContext = new UserContext().withBusinessClock(new FixedBusinessClock(clock))
      .withActiveRoot({entity: 'Tenant', id: '1'});
    const isolated = new SQLiteTeaQLClient(filename + '.no-schema.sqlite').setUserContext(isolatedContext);
    isolatedContext.insertResource('dataService', isolated);
    const isolatedDriver = (isolated as any).driver;
    const isolatedQuery = jest.spyOn(isolatedDriver, 'query'), isolatedTransaction = jest.spyOn(isolatedDriver, 'transaction');
    const isolatedSchema = jest.spyOn(isolatedContext, 'ensureSchema');
    let isolatedChecks = 0;
    try {
      const checkers: Record<string, EntityChecker> = {};
      for (const [name, delegate] of Object.entries(delegates)) checkers[name] = {checkAndFix(ctx, mutation, results) {
        isolatedChecks++; delegate.checkAndFix(ctx, mutation, results);
      }};
      isolated.install(new RuntimeModule({}, checkers));
      await isolatedDriver.query('SELECT 1 AS calibration'); expect(isolatedQuery).toHaveBeenCalledTimes(1);
      isolatedQuery.mockClear();
      const missing = Q.purchaseOrders().comment('Prepare invalid data without installing schema')
        .purpose('Require module Checkers before any database mutation').newEntity(isolatedContext);
      await expect(missing.auditAs('Reject required input in a schema-free store').save(isolatedContext)).rejects.toThrow(CheckException);
      expect(isolatedChecks).toBeGreaterThan(0); expect(isolatedQuery).not.toHaveBeenCalled();
      expect(isolatedTransaction).not.toHaveBeenCalled(); expect(isolatedSchema).not.toHaveBeenCalled();
      const db = new Database(filename + '.no-schema.sqlite', {readonly: true, fileMustExist: true});
      try {expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([]);} finally {db.close();}
      record('module-checker-without-schema', {schemaCalled: false, tables: 0, providerCalls: 0,
        installedCheckers: Object.keys(delegates).sort(), checkerCalls: isolatedChecks});
    } finally {isolatedQuery.mockRestore(); isolatedTransaction.mockRestore(); isolatedSchema.mockRestore(); await isolated.close();}

    const parent = owner(), child = item(); parent.orderItemList().push(child); reset();
    await parent.auditAs('Calibrate a valid generated graph through one provider transaction').save(context);
    expect(effects()).toMatchObject({transactions: 1, begins: 1, commits: 1, rollbacks: 0, allocations: 2, mutations: 2, audits: 2});
    expect(effects().queries).toBeGreaterThan(0); expect(effects().policies).toBeGreaterThan(0);
    expect(effects().reviews).toBeGreaterThan(0); expect(checkerCalls).toBeGreaterThan(0);
    record('exact-provider-calibration', {parentID: Number(parent.id), childID: Number(child.id), effects: effects(), checkerCalls});

    const orphan = item();
    const required = await expectRejected(() => orphan.auditAs('Reject an omitted required parent association').save(context),
      'required', 'purchase_order', 'OrderItem');
    record('required-relation', {wire: checkResultToWire(required.result), effects: required.effects, checkerCalls: required.checkerCalls});

    for (const absent of ['internal_note', 'contact_phone', 'create_time', 'update_time']) {
      const selected = Q.purchaseOrdersWithMinimalFields().withIdIs(parent.id!)
        .selectTenantWith(Q.tenantsWithMinimalFields().limit(1).comment('Select ownership without unrelated root fields'));
      if (absent !== 'internal_note') selected.selectInternalNote();
      if (absent !== 'contact_phone') selected.selectContactPhone();
      if (absent !== 'create_time') selected.selectCreateTime();
      if (absent !== 'update_time') selected.selectUpdateTime();
      const root = (await Q.tenantsWithMinimalFields().withIdIs('1')
        .selectPurchaseOrderListWith(selected.limit(1).comment('Omit exactly one business field, not the managed root FK'))
        .limit(1).comment('Load a partial non-root object under one untouched ancestor')
        .purpose('Distinguish completeness from root ownership failure').executeForList(context))[0];
      const partial = root.purchaseOrderList()[0];
      expect(String(E.purchaseOrder(partial).tenantId().eval())).toBe('1');
      if (absent === 'contact_phone') partial.updateInternalNote('Rejected partial change');
      else partial.updateContactPhone('5550101');
      const rejected = await expectRejected(() => root.auditAs('Reject an incomplete modified descendant').save(context),
        'invalid_type', 'purchase_order_list[0].' + absent, 'PurchaseOrder');
      expect(rejected.result.location.segments).toEqual([{kind: 'property', name: 'purchase_order_list'}, {kind: 'index', index: 0}, {kind: 'property', name: absent}]);
      record('nonroot-partial-' + absent, {loadedRoot: 1, absentField: absent, effects: rejected.effects,
        wire: checkResultToWire(rejected.result), checkerCalls: rejected.checkerCalls});
    }

    const complete = (await Q.purchaseOrders().withIdIs(parent.id!)
      .selectTenantWith(Q.tenantsWithMinimalFields().limit(1).comment('Keep the untouched associated root partial'))
      .limit(1).comment('Load a complete owner with a sparse unchanged relation')
      .purpose('Only actually modified objects need every modeled field').executeForList(context))[0];
    expect(() => E.purchaseOrder(complete).tenant().name().eval()).toThrow(TeaQLNotLoadedError);
    complete.updateContactPhone('5550102'); reset();
    await complete.auditAs('Save the complete owner without requiring unrelated root fields').save(context);
    expect(effects()).toMatchObject({transactions: 1, begins: 1, commits: 1, rollbacks: 0, allocations: 0, mutations: 1, audits: 1});
    record('untouched-partial-target', {parentID: Number(parent.id), parentVersion: complete.version, effects: effects()});

    for (const mode of ['required-null', 'min-zero'] as const) {
      const graph = owner(), leaf = item(); graph.orderItemList().push(leaf); fix = mode;
      const rejected = await expectRejected(() => graph.auditAs('Validate the actual customer-Fix result').save(context),
        mode === 'required-null' ? 'required' : 'min', 'order_item_list[0].' + (mode === 'required-null' ? 'product_name' : 'unit_price'), 'OrderItem');
      expect(E.orderItem(leaf).productName().eval()).toBe('Boundary item');
      expect(String(E.orderItem(leaf).unitPrice().eval())).toBe(String(decimal('10.00')));
      record('post-fix-' + mode, {effects: rejected.effects, wire: checkResultToWire(rejected.result),
        originalInputRetained: true, checkerCalls: rejected.checkerCalls}); fix = 'none';
    }
    const repaired = owner(), repairedChild = item(false);
    const originalChild = (repairedChild as any)._root.change({entity: 'OrderItem', id: (repairedChild as any)._ledgerId});
    expect(originalChild).not.toHaveProperty('product_name');
    expect(String(E.orderItem(repairedChild).unitPrice().eval())).toBe('0');
    repaired.orderItemList().push(repairedChild); fix = 'repair'; reset();
    await repaired.auditAs('Persist only the repaired required and range values').save(context); fix = 'none';
    expect(effects()).toMatchObject({transactions: 1, begins: 1, commits: 1, rollbacks: 0, allocations: 2, mutations: 2, audits: 2});
    const repairedEffects = effects();
    const repairedRows = (await Q.orderItems().withIdIs(repairedChild.id!).limit(1)
      .comment('Read the actual repaired business values').purpose('Verify customer Fix reaches persistence').executeForList(context));
    expect(E.orderItem(repairedRows[0]).productName().eval()).toBe('Fixed child');
    expect(String(E.orderItem(repairedRows[0]).unitPrice().eval())).toBe('12.34');
    record('post-fix-repair', {parentID: Number(repaired.id), childID: Number(repairedChild.id), storedName: 'Fixed child', storedPrice: '12.34',
      originalMissingRequired: true, originalPrice: '0', effects: repairedEffects});

    // The runtime's public object-local adapter, then an explicit generated setter
    // allow-list and save. This is not a recursive HTTP/TFP adapter test.
    const fields = Object.values(GENERATED_RUNTIME_MODULE.schemas.PurchaseOrder.columns)
      .map(column => column.modelName ?? column.columnName);
    for (const [index, profile] of profiles.entries()) {
      const metadata = createWireEntityMetadata('PurchaseOrder', fields, profile, {contact_phone: ['legacy/phone~']});
      const canonical = metadata.fields.contact_phone.wireName;
      const inputCases: Array<[string, Record<string, unknown>]> = [
        ['accepted-input-alias', {'legacy/phone~': null}],
        ['input-unknown', {'unknown/field~': 'no'}],
        ['input-equal-forward', {[canonical]: 'same', 'legacy/phone~': 'same'}],
        ['input-equal-reverse', {'legacy/phone~': 'same', [canonical]: 'same'}],
        ['input-unequal-forward', {[canonical]: 'first', 'legacy/phone~': 'second'}],
        ['input-unequal-reverse', {'legacy/phone~': 'first', [canonical]: 'second'}],
        ['wire-positive-control', {[canonical]: '55509' + round + index}],
      ];
      for (const [name, input] of inputCases) {
        const before = physical(); reset(); let mapperCalls = 0, saveCalls = 0, failure: unknown;
        let normalized: ReturnType<typeof normalizeWireInput> | undefined;
        let created: ReturnType<typeof owner> | undefined;
        try {
          const envelope = JSON.parse(JSON.stringify({'payload/order': input}));
          normalized = normalizeWireInput(envelope['payload/order'], metadata, '/payload~1order');
          mapperCalls++; created = owner();
          Reflect.apply(created.updateContactPhone, created, [normalized.values.contact_phone]);
          saveCalls++; await created.auditAs('Save an admitted object-local JSON input through generated APIs').save(context);
        } catch (error) {failure = error;}
        if (name === 'accepted-input-alias') {
          expect(failure).toBeInstanceOf(CheckException); expect(normalized).toBeDefined();
          const results = retainSubmittedPaths([...(failure as CheckException).violations], normalized!);
          const result = results.find(value => value.ruleId === 'required' && value.location.modelPath() === 'contact_phone');
          expect(result).toBeDefined(); const wires: Record<string, unknown> = {};
          for (const outputProfile of profiles) {
            const wire = checkResultToWire(result!, outputProfile);
            expect(wire.sourceInstancePath).toBe('/payload~1order/legacy~1phone~0');
            expect(wire.instancePath).toBe('/' + createWireEntityMetadata('PurchaseOrder', ['contact_phone'], outputProfile).fields.contact_phone.wireName);
            expect(wire.inputValue).toBeUndefined(); wires[outputProfile] = wire;
          }
          expect(effects()).toEqual(zero); expect(physical()).toEqual(before);
          record(name, {profile, wires, mapperCalls, saveCalls, checkerCalls, effects: effects()});
        } else if (name === 'wire-positive-control') {
          expect(failure).toBeUndefined(); expect(effects()).toMatchObject({transactions: 1, mutations: 1, audits: 1});
          record(name, {profile, id: Number(created!.id), mapperCalls, saveCalls, checkerCalls, effects: effects()});
        } else {
          expect(failure).toBeInstanceOf(WireInputError);
          expect((failure as WireInputError).code).toBe(name === 'input-unknown' ? 'WIRE_UNKNOWN_FIELD' : 'WIRE_FIELD_COLLISION');
          const pointer = name === 'input-unknown' ? '/payload~1order/unknown~1field~0'
            : '/payload~1order/' + (name.endsWith('forward') ? 'legacy~1phone~0' : canonical);
          expect((failure as WireInputError).instancePath).toBe(pointer);
          expect(mapperCalls).toBe(0); expect(saveCalls).toBe(0); expect(checkerCalls).toBe(0);
          expect(effects()).toEqual(zero); expect(physical()).toEqual(before);
          record(name, {profile, code: (failure as WireInputError).code, pointer, mapperCalls, saveCalls, checkerCalls, effects: effects()});
        }
      }
    }
    expect(observations).toHaveLength(32);
    process.stdout.write('CORE_TS_CHECKER_BOUNDARY_RESULT=' + JSON.stringify({language: 'typescript', passed: true,
      round, observations: observations.length, physical: physical(), objectLocalWireAdapter: true, recursiveHttpOrTfpAccepted: false}) + '\n');
  } finally {
    query.mockRestore(); transaction.mockRestore(); exec.mockRestore(); allocation.mockRestore(); policy.mockRestore();
    await client.close();
  }
}
