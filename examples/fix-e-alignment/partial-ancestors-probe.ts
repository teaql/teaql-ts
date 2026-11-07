import { CheckException, decimal, FixedBusinessClock, TeaQLNotLoadedError, UserContext } from '../../src';
import { checkResultToWire } from '../../src/core/i18n';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import Database from 'better-sqlite3';

/** Generated Q/E and audited save; no generated implementations are edited. */
export async function verifyPartialAncestors(filename: string): Promise<void> {
  const createdAt = new Date('2032-02-29T10:15:30Z');
  const updatedAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(createdAt));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const driver = (client as any).driver;
  const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction');
  const allocation = jest.spyOn(driver, 'nextId'), policy = jest.spyOn(context, 'enterMutationPolicy');
  const review = jest.fn(() => undefined);
  context.withMutationPolicyRegistry({resolve: review});
  let auditStart = 0;
  const effects = () => ({queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
    allocations: allocation.mock.calls.length, policies: policy.mock.calls.length, reviews: review.mock.calls.length,
    audits: client.auditTrace.length - auditStart,
    mutations: query.mock.calls.filter(call => /^\s*(?:INSERT INTO|UPDATE|DELETE FROM)\s+(?:tenant_data|purchase_order_data|order_item_data)\b/i
      .test(String(call[0]).replace(/"/g, ''))).length});
  const reset = () => {query.mockClear(); transaction.mockClear(); allocation.mockClear();
    policy.mockClear(); review.mockClear(); auditStart = client.auditTrace.length;};
  const zero = {queries: 0, transactions: 0, allocations: 0, policies: 0, reviews: 0, audits: 0, mutations: 0};
  try {
    await context.ensureSchema();
    reset();
    const order = (await Q.purchaseOrders().comment('Prepare the partial-ancestor fixture')
      .purpose('Validate only modified business objects for graph saves').newEntity(context))
      .updateContactPhone('5550600').updateInternalNote(null);
    const child = (await Q.orderItems().comment('Prepare one complete leaf')
      .purpose('Use the generated relation and audited save').newEntity(context))
      .updateProductName('Partial graph original').updateUnitPrice(decimal('10.00'));
    order.orderItemList().push(child);
    const reservations = effects();
    expect(reservations.transactions).toBe(2); expect(reservations.allocations).toBe(2);
    expect(reservations.mutations).toBe(0); expect(reservations.audits).toBe(0);
    reset();
    await order.auditAs('Create the partial-ancestor graph').save(context);
    const calibration = effects();
    expect(calibration.transactions).toBe(1); expect(calibration.allocations).toBe(0);
    expect(calibration.mutations).toBe(2); expect(calibration.audits).toBe(2);
    expect(calibration.policies).toBeGreaterThan(0); expect(calibration.reviews).toBeGreaterThan(0);
    if (!order.id) throw new Error('the saved order has no real identity');
    const orderId = order.id, active = context.requireActiveRoot('Tenant');
    const seeded = (await Q.purchaseOrders().withIdIs(orderId)
      .selectOrderItemListWith(Q.orderItems().limit(1).comment('Read the persisted fixture leaf'))
      .limit(1).comment('Read the saved graph identity').purpose('Do not infer a child ID from allocation order')
      .executeForList(context))[0];
    expect(E.purchaseOrder(seeded).orderItemList().size().eval()).toBe(1);
    const childId = E.purchaseOrder(seeded).orderItemList().first().id().eval();
    if (!childId) throw new Error('the saved leaf has no real identity');
    const load = async (complete: boolean) => {
      const leaf = (complete ? Q.orderItems() : Q.orderItemsWithMinimalFields()).withIdIs(childId)
        .limit(1).comment(complete ? 'Load every scalar of the modified leaf' : 'Load an incomplete modified leaf');
      const root = (await Q.tenantsWithMinimalFields().withIdIs(String(active.id))
        .selectPurchaseOrderListWith(Q.purchaseOrdersWithMinimalFields().withIdIs(orderId)
          .selectOrderItemListWith(leaf).limit(1).comment('Keep the untouched parent partial'))
        .limit(1).comment('Load two untouched partial ancestors above one leaf')
        .purpose('Exercise Q E JSON and graph mutation in one bounded example').executeForList(context))[0];
      expect(root).toBeDefined(); expect(E.tenant(root).purchaseOrderList().size().eval()).toBe(1);
      const parent = root.purchaseOrderList()[0];
      expect(E.purchaseOrder(parent).orderItemList().size().eval()).toBe(1);
      return {root, parent, leaf: parent.orderItemList()[0]};
    };
    const graph = await load(true);
    const empty = (await Q.purchaseOrdersWithMinimalFields().withIdIs(orderId)
      .selectOrderItemListWith(Q.orderItemsWithMinimalFields().withIdIs('0').limit(1)
        .comment('Explicitly select an empty child list'))
      .limit(1).comment('Distinguish selected empty from an unselected reverse relation')
      .purpose('Native JSON must preserve relation availability without querying').executeForList(context))[0];
    expect(E.purchaseOrder(empty).orderItemList().size().eval()).toBe(0);
    reset();
    const missing = (read: () => unknown, pointer: string) => {
      let failure: unknown; try {read();} catch (error) {failure = error;}
      expect(failure).toBeInstanceOf(TeaQLNotLoadedError);
      expect((failure as TeaQLNotLoadedError).toWire().instancePath).toBe(pointer);
    };
    missing(() => E.tenant(graph.root).name().eval(), '/name');
    missing(() => E.tenant(graph.root).purchaseOrderList().first().contactPhone().eval(), '/purchaseOrderList/0/contactPhone');
    expect(String(E.orderItem(graph.leaf).unitPrice().eval())).toBe(String(decimal('10.00')));
    const json = JSON.parse(JSON.stringify(graph.root));
    expect(json).not.toHaveProperty('name'); expect(json.purchaseOrderList).toHaveLength(1);
    expect(json).not.toHaveProperty('orderItemList');
    expect(json.purchaseOrderList[0]).not.toHaveProperty('contactPhone');
    expect(json.purchaseOrderList[0].orderItemList).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(empty)).orderItemList).toEqual([]);
    expect(effects()).toEqual(zero); const guardEffects = effects();
    context.withBusinessClock(new FixedBusinessClock(updatedAt));
    graph.leaf.updateProductName('Partial graph updated');
    await graph.root.auditAs('Save the complete modified leaf through untouched partial ancestors').save(context);
    const saveEffects = effects();
    expect(saveEffects.transactions).toBe(1); expect(saveEffects.allocations).toBe(0);
    expect(saveEffects.mutations).toBe(1); expect(saveEffects.audits).toBe(1);
    expect(saveEffects.policies).toBeGreaterThan(0); expect(saveEffects.reviews).toBeGreaterThan(0);
    const physical = () => {
      const db = new Database(filename, {readonly: true, fileMustExist: true});
      try {return {
        roots: db.prepare('SELECT id,name,version FROM tenant_data ORDER BY id').all(),
        parents: db.prepare('SELECT id,tenant,contact_phone,internal_note,version,create_time,update_time FROM purchase_order_data WHERE id = ?').all(orderId),
        leaves: db.prepare('SELECT id,purchase_order,tenant,product_name,unit_price,version,create_time,update_time FROM order_item_data WHERE id = ?').all(childId),
      };} finally {db.close();}
    };
    const stored = physical();
    expect(stored.roots).toEqual([{id: Number(active.id), name: 'Tenant Name', version: 1}]);
    expect(stored.parents).toEqual([expect.objectContaining({id: Number(orderId), tenant: Number(active.id), contact_phone: '5550600', internal_note: null,
      version: 1, create_time: createdAt.getTime(), update_time: createdAt.getTime()})]);
    expect(stored.leaves).toEqual([expect.objectContaining({id: Number(childId), purchase_order: Number(orderId), tenant: Number(active.id),
      product_name: 'Partial graph updated', unit_price: String(decimal('10.00')), version: 2,
      create_time: createdAt.getTime(), update_time: updatedAt.getTime()})]);
    const partial = await load(false);
    partial.leaf.updateProductName('Rejected partial leaf');
    const key = {entity: 'OrderItem', id: (partial.leaf as any)._ledgerId};
    const pending = () => JSON.stringify((partial.leaf as any)._root.change(key));
    const before = pending(), rejections: unknown[][] = [], rejectionEffects: Array<ReturnType<typeof effects>> = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      reset(); let failure: unknown;
      try {await partial.root.auditAs('Reject the incomplete modified leaf before any provider work').save(context);}
      catch (error) {failure = error;}
      expect(failure).toBeInstanceOf(CheckException);
      const violations = (failure as CheckException).violations.map(result => checkResultToWire(result));
      expect(violations.length).toBeGreaterThan(0);
      for (const violation of violations) {
        expect(violation.ruleId).toBe('invalid_type'); expect(violation.entityType).toBe('OrderItem');
        expect(violation.instancePath).toMatch(/^\/purchaseOrderList\/0\/orderItemList\/0\//);
      }
      expect(effects()).toEqual(zero); expect(pending()).toBe(before); expect(physical()).toEqual(stored);
      rejections.push(violations); rejectionEffects.push(effects());
    }
    process.stdout.write('CORE_TS_PARTIAL_ANCESTORS_RESULT=' + JSON.stringify({language: 'typescript', passed: true,
      orderId: String(orderId), leafId: String(childId), ancestorVersions: [1, 1], leafVersion: 2, calibration, guardEffects, saveEffects,
      cases: ['partial-ancestor-guards-and-JSON-no-I/O', 'complete-leaf-saved-through-two-untouched-partial-ancestors',
        'partial-leaf-rejected-twice-before-provider-with-intent-retained'], rejections, rejectionEffects,
      intentRetained: true, selectedEmptySerialized: true, unselectedListOmitted: true, generatedImplementationsModified: false}) + '\n');
  } finally {
    query.mockRestore(); transaction.mockRestore(); allocation.mockRestore(); policy.mockRestore(); await client.close();
  }
}
