import { CheckException, decimal, FixedBusinessClock, TeaQLNotLoadedError, UserContext } from '../../src';
import { checkResultToWire } from '../../src/core/i18n';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import Database from 'better-sqlite3';

/** Application-owned regression; all business preparation uses generated Q/E/save. */
export async function verifyPartialRoot(filename: string): Promise<void> {
  const createdAt = new Date('2032-04-01T10:15:30Z');
  const updatedAt = new Date(createdAt.getTime() + 86400000);
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(createdAt));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const driver = (client as any).driver;
  const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction');
  const exec = jest.spyOn(driver.database as Database.Database, 'exec');
  const allocation = jest.spyOn(driver, 'nextId'), policy = jest.spyOn(context, 'enterMutationPolicy');
  const review = jest.fn(() => undefined);
  context.withMutationPolicyRegistry({resolve: review});
  let auditStart = 0;
  const effects = () => ({
    queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
    begins: exec.mock.calls.filter(call => /^BEGIN\b/i.test(call[0])).length,
    commits: exec.mock.calls.filter(call => /^COMMIT\b/i.test(call[0])).length,
    rollbacks: exec.mock.calls.filter(call => /^ROLLBACK\b/i.test(call[0])).length,
    allocations: allocation.mock.calls.length, policyLookups: policy.mock.calls.length,
    policyReviews: review.mock.calls.length, audits: client.auditTrace.length - auditStart,
    mutations: query.mock.calls.filter(call => /^\s*(?:INSERT INTO|UPDATE|DELETE FROM)\s+(?:tenant_data|purchase_order_data|order_item_data)\b/i
      .test(String(call[0]).replace(/"/g, ''))).length,
    rootLookups: query.mock.calls.filter(call => /\bFROM\s+tenant_data\b/i.test(String(call[0]).replace(/"/g, ''))).length,
  });
  const reset = () => {
    query.mockClear(); transaction.mockClear(); exec.mockClear(); allocation.mockClear();
    policy.mockClear(); review.mockClear(); auditStart = client.auditTrace.length;
  };
  const zero = {queries: 0, transactions: 0, begins: 0, commits: 0, rollbacks: 0,
    allocations: 0, policyLookups: 0, policyReviews: 0, audits: 0, mutations: 0, rootLookups: 0};
  const physical = () => {
    const db = new Database(filename, {readonly: true, fileMustExist: true});
    try { return {
      tenant_data: db.prepare('SELECT id,version,name FROM tenant_data ORDER BY id').all(),
      purchase_order_data: db.prepare('SELECT id,version,tenant,contact_phone,internal_note,create_time,update_time FROM purchase_order_data ORDER BY id').all(),
      order_item_data: db.prepare('SELECT id,version,tenant,purchase_order,product_name,unit_price,create_time,update_time FROM order_item_data ORDER BY id').all(),
    }; } finally { db.close(); }
  };
  try {
    await context.ensureSchema();
    const active = context.requireActiveRoot('Tenant');
    reset();
    const other = (await Q.tenants().comment('Prepare another persisted domain root')
      .purpose('Test wrong context with a real root, not an invented ID').newEntity(context))
      .updateName('Independent partial root');
    await other.auditAs('Create an independent root for managed-root verification').save(context);
    expect(other.id).toBeTruthy(); expect(String(other.id)).not.toBe(String(active.id));
    const order = (await Q.purchaseOrders().comment('Prepare the managed partial-ancestor fixture')
      .purpose('Verify ownership through an unchanged sparse graph').newEntity(context))
      .updateContactPhone('5550801').updateInternalNote(null);
    const child = (await Q.orderItems().comment('Prepare the complete managed leaf')
      .purpose('Persist a leaf owned by the original domain root').newEntity(context))
      .updateProductName('Managed partial original').updateUnitPrice(decimal('10.00'));
    order.orderItemList().push(child);
    await order.auditAs('Create the owned graph for partial-ancestor admission').save(context);
    expect(order.id).toBeTruthy(); expect(child.id).toBeTruthy();
    const orderId = order.id!, childId = child.id!;
    await Q.tenants().withIdIs(String(other.id)).limit(1).comment('Calibrate root SELECT observation')
      .purpose('Prove that admission would detect provider root lookups').executeForList(context);
    const rollback = new Error('intentional observer calibration');
    await expect(driver.transaction(async () => { throw rollback; })).rejects.toBe(rollback);
    const calibration = effects();
    for (const count of Object.values(calibration)) expect(count).toBeGreaterThan(0);
    const root = (await Q.tenantsWithMinimalFields().withIdIs(String(active.id))
      .selectPurchaseOrderListWith(Q.purchaseOrdersWithMinimalFields().withIdIs(orderId)
        .selectOrderItemListWith(Q.orderItems().withIdIs(childId).limit(1)
          .comment('Load the complete leaf, including its unchanged owner'))
        .limit(1).comment('Keep the unmodified parent partial'))
      .limit(1).comment('Load two partial ancestors above the owned complete leaf')
      .purpose('Prove admission checks unchanged loaded ownership at a deep graph node')
      .executeForList(context))[0];
    expect(E.tenant(root).purchaseOrderList().size().eval()).toBe(1);
    const parent = root.purchaseOrderList()[0];
    expect(E.purchaseOrder(parent).orderItemList().size().eval()).toBe(1);
    const leaf = parent.orderItemList()[0];
    expect(String(E.orderItem(leaf).tenantId().eval())).toBe(String(active.id));
    const sparse = () => {
      for (const read of [() => E.tenant(root).name().eval(), () => E.purchaseOrder(parent).contactPhone().eval()]) {
        let error: unknown; try { read(); } catch (caught) { error = caught; }
        expect(error).toBeInstanceOf(TeaQLNotLoadedError);
      }
      const value = JSON.parse(JSON.stringify(root));
      expect(value).not.toHaveProperty('name');
      expect(value.purchaseOrderList[0]).not.toHaveProperty('contactPhone');
      return JSON.stringify({rootVersion: root.version, parentVersion: parent.version,
        keys: Object.keys(value).sort(), parentKeys: Object.keys(value.purchaseOrderList[0]).sort()});
    };
    const projection = sparse(), beforeStorage = physical();
    context.withBusinessClock(new FixedBusinessClock(updatedAt));
    leaf.updateProductName('Managed partial retry');
    const key = {entity: 'OrderItem', id: (leaf as any)._ledgerId};
    const pending = () => JSON.stringify((leaf as any)._root.change(key));
    const intent = pending(); expect(JSON.parse(intent)).not.toHaveProperty('tenant');
    context.insertResource('activeRoot', {entity: 'Tenant', id: other.id!});
    const denials: Array<Record<string, unknown>> = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      reset(); let failure: unknown;
      try { await root.auditAs('Reject the complete leaf under another active root').save(context); }
      catch (error) { failure = error; }
      const denied = effects(), storageUnchanged = JSON.stringify(physical()) === JSON.stringify(beforeStorage);
      const observation = {attempt, effects: denied, intentRetained: pending() === intent,
        sparseViewUnchanged: sparse() === projection, storageUnchanged,
        violations: failure instanceof CheckException ? failure.violations.map(result => checkResultToWire(result)) : []};
      denials.push(observation);
      process.stdout.write('CORE_TS_PARTIAL_ROOT_DENIAL=' + JSON.stringify(observation) + '\n');
      expect(failure).toBeInstanceOf(CheckException); expect(denied).toEqual(zero);
      expect(observation.intentRetained && observation.sparseViewUnchanged && storageUnchanged).toBe(true);
      expect(observation.violations).toEqual([expect.objectContaining({ruleId: 'context_root_mismatch', entityType: 'OrderItem',
        instancePath: '/purchaseOrderList/0/orderItemList/0/tenant', message: 'Context-bound root must match the active context'})]);
    }
    context.insertResource('activeRoot', active); reset();
    await root.auditAs('Save the same complete leaf under its original active root').save(context);
    const acceptedEffects = effects();
    expect(acceptedEffects).toEqual({...zero, queries: 2, transactions: 1, begins: 1, commits: 1,
      policyLookups: 1, policyReviews: 1, audits: 1, mutations: 1});
    expect((leaf as any)._root.change(key)).toEqual({}); expect(sparse()).toBe(projection);
    const stored = physical();
    expect(stored.purchase_order_data.find((row: any) => String(row.id) === String(orderId))).toEqual({
      id: Number(orderId), version: 1, tenant: Number(active.id), contact_phone: '5550801', internal_note: null,
      create_time: createdAt.getTime(), update_time: createdAt.getTime()});
    expect(stored.order_item_data.find((row: any) => String(row.id) === String(childId))).toEqual({
      id: Number(childId), version: 2, tenant: Number(active.id), purchase_order: Number(orderId),
      product_name: 'Managed partial retry', unit_price: '10.00', create_time: createdAt.getTime(), update_time: updatedAt.getTime()});
    process.stdout.write('CORE_TS_PARTIAL_ROOT_RESULT=' + JSON.stringify({language: 'typescript', passed: true,
      orderId: String(orderId), leafId: String(childId), activeRootId: String(active.id), otherRootId: String(other.id),
      calibration, denials, acceptedEffects, ancestorVersions: [root.version, parent.version], leafVersion: leaf.version,
      sameGraphRetry: true, intentClearedAfterCommit: true, generatedImplementationsModified: false}) + '\n');
  } finally {
    query.mockRestore(); transaction.mockRestore(); exec.mockRestore(); allocation.mockRestore(); policy.mockRestore();
    await client.close();
  }
}
