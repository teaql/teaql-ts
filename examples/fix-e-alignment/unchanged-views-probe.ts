import { FixedBusinessClock, TeaQLNotLoadedError, UserContext } from '../../src';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import Database from 'better-sqlite3';

export const unchangedViewCases = [
  'sparse-null-forward', 'complete-independent-other', 'empty-reverse',
  'rollback-after-write', 'rollback-before-commit',
] as const;
export type UnchangedViewCase = typeof unchangedViewCases[number];

/** Business preparation uses Q/E/mutation; spies and readonly SQL are test oracles. */
export async function verifyUnchangedView(filename: string, scenario: UnchangedViewCase): Promise<void> {
  const round = Number(process.env.TEAQL_FIX_E_ROUND);
  if (![1, 2].includes(round)) throw new Error('An explicit retained-example round is required');
  const createdAt = new Date(Date.parse('2032-02-29T10:15:30Z') + (round - 1) * 86400000);
  const updatedAt = new Date(createdAt.getTime() + 7200000);
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(createdAt));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const driver = (client as any).driver;
  const actualQuery = driver.query.bind(driver), actualExec = driver.database.exec.bind(driver.database);
  const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction');
  const exec = jest.spyOn(driver.database as Database.Database, 'exec');
  const allocation = jest.spyOn(driver, 'nextId'), policy = jest.spyOn(context, 'enterMutationPolicy');
  const review = jest.fn(() => undefined); context.withMutationPolicyRegistry({resolve: review});
  let auditStart = client.auditTrace.length;
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
  const zero = {queries: 0, transactions: 0, begins: 0, commits: 0, rollbacks: 0,
    allocations: 0, policyLookups: 0, policyReviews: 0, audits: 0, mutations: 0, rootLookups: 0};
  const reset = () => {
    query.mockClear(); transaction.mockClear(); exec.mockClear(); allocation.mockClear();
    policy.mockClear(); review.mockClear(); auditStart = client.auditTrace.length;
  };
  const physical = (id: unknown) => {
    const oracle = new Database(filename, {readonly: true, fileMustExist: true});
    try {return oracle.prepare('SELECT id,version,contact_phone,internal_note,create_time,update_time FROM purchase_order_data WHERE id = ?').get(id);}
    finally {oracle.close();}
  };
  try {
    await context.ensureSchema(); reset();
    const original = Q.purchaseOrders().comment('Prepare the unchanged-view graph fixture')
      .purpose('Verify no-op geometry and genuine transaction rollback through generated APIs').newEntity(context)
      .updateContactPhone('5550800').updateInternalNote(null);
    await original.auditAs('Create one unchanged-view control').save(context);
    const id = original.id!;
    await Q.tenants().withIdIs('1').limit(1).comment('Calibrate root SELECT observation')
      .purpose('Prove the root-lookup spy observes real provider work').executeForList(context);
    const calibrationFailure = new Error('owned rollback observer calibration');
    await expect(driver.transaction(async () => {throw calibrationFailure;})).rejects.toBe(calibrationFailure);
    const calibration = effects();
    for (const value of Object.values(calibration)) expect(value).toBeGreaterThan(0);

    const sparse = scenario === 'sparse-null-forward';
    let request = sparse ? Q.purchaseOrdersWithMinimalFields().selectContactPhone().selectInternalNote() : Q.purchaseOrders();
    if (scenario === 'empty-reverse') {
      request = request.selectOrderItemListWith(Q.orderItemsWithMinimalFields().limit(1)
        .comment('Load an explicitly empty child list'));
    } else {
      request = request.selectTenantWith(Q.tenantsWithMinimalFields().limit(1)
        .comment('Load a sparse forward edge without the target name'));
    }
    const row = (await request.withIdIs(id).limit(1).comment('Load the bounded original object view')
      .purpose('Retain selected nulls, sparse fields and explicit relation geometry across saves').executeForList(context))[0];
    expect(row).toBeDefined();
    const key = {entity: 'PurchaseOrder', id: (row as any)._ledgerId};
    const pending = () => (row as any)._root.change(key);
    const root = (row as any)._root;
    const geometry = () => {
      expect(E.purchaseOrder(row).internalNote().eval()).toBeNull();
      const json = JSON.parse(JSON.stringify(row)); expect(json).toHaveProperty('internalNote', null);
      if (sparse) {
        expect(() => E.purchaseOrder(row).createTime().eval()).toThrow(TeaQLNotLoadedError);
        expect(json).not.toHaveProperty('createTime');
      }
      if (scenario === 'empty-reverse') {
        expect(E.purchaseOrder(row).orderItemList().size().eval()).toBe(0);
        expect(json).toHaveProperty('orderItemList', []);
      } else {
        expect(String(E.purchaseOrder(row).tenantId().eval())).toBe('1');
        expect(String(E.purchaseOrder(row).tenant().eval()!.id)).toBe('1');
        expect(() => E.purchaseOrder(row).tenant().name().eval()).toThrow(TeaQLNotLoadedError);
        expect(json.tenant).not.toHaveProperty('name');
      }
      return JSON.stringify({keys: Object.keys(json).sort(), tenant: json.tenant, children: json.orderItemList});
    };
    const beforeGeometry = geometry(), beforeJSON = JSON.stringify(row), beforeStorage = physical(id);
    const baselineVersion = root.originalVersion(key); expect(baselineVersion).toBe(1);
    let other: typeof row | undefined;
    if (scenario === 'complete-independent-other') {
      other = (await Q.purchaseOrders().withIdIs(id).limit(1).comment('Load a separate mutable view')
        .purpose('A no-op must not consume another view mutation ledger').executeForList(context))[0];
      expect(other).not.toBe(row); other.updateInternalNote('another view remains pending');
    }
    const otherPending = () => other ? (other as any)._root.change({entity: 'PurchaseOrder', id: (other as any)._ledgerId}) : undefined;
    const beforeOther = JSON.stringify(otherPending());
    context.withBusinessClock(new FixedBusinessClock(updatedAt));
    const rollback = scenario.startsWith('rollback-');
    if (!rollback) {
      row.updateContactPhone('5550899').updateContactPhone('5550800'); reset();
      await row.auditAs('Save a restored field without refreshing the object view').save(context);
      const observed = effects(); expect(observed).toEqual(zero);
      expect(JSON.stringify(row)).toBe(beforeJSON); expect(geometry()).toBe(beforeGeometry);
      expect((row as any)._root).toBe(root); expect(pending()).toEqual({});
      expect(root.originalVersion(key)).toBe(baselineVersion); expect(row.version).toBe(1);
      expect(JSON.stringify(otherPending())).toBe(beforeOther); expect(physical(id)).toEqual(beforeStorage);
      process.stdout.write('CORE_TS_UNCHANGED_VIEW_CASE=' + JSON.stringify({scenario, round, id: String(id),
        passed: true, effects: observed, calibration, geometryRetained: true, selectedNullRetained: true,
        independentIntentRetained: true, sameLedger: true, version: row.version, physical: physical(id)}) + '\n');
      return;
    }

    row.updateContactPhone('5550801');
    const failure = new Error('owned transaction fault: ' + scenario);
    let injected = 0, uncommitted: unknown;
    const observeWritten = () => {
      uncommitted = driver.database.prepare('SELECT contact_phone,version FROM purchase_order_data WHERE id = ?').get(id);
      expect(uncommitted).toEqual({contact_phone: '5550801', version: 2});
      injected++; throw failure;
    };
    if (scenario === 'rollback-after-write') {
      query.mockImplementation(async (sql: unknown, values: unknown) => {
        const result = await actualQuery(sql, values);
        if (/^\s*UPDATE\s+purchase_order_data\b/i.test(String(sql).replace(/"/g, ''))) observeWritten();
        return result;
      });
    } else {
      exec.mockImplementation((sql: string) => {if (/^COMMIT\b/i.test(sql)) observeWritten(); return actualExec(sql);});
    }
    reset();
    await expect(row.auditAs('Roll back a real write without losing the original view or retry intent').save(context)).rejects.toBe(failure);
    const denied = effects();
    expect(injected).toBe(1); expect(denied).toMatchObject({transactions: 1, begins: 1, rollbacks: 1, mutations: 1, audits: 0});
    expect(physical(id)).toEqual(beforeStorage); expect(geometry()).toBe(beforeGeometry);
    expect(row.version).toBe(1); expect((row as any)._root).toBe(root);
    expect(root.originalVersion(key)).toBe(baselineVersion); expect(pending()).toHaveProperty('contact_phone', '5550801');
    expect(E.purchaseOrder(row).contactPhone().eval()).toBe('5550801');
    const retainedIntent = {...pending()};
    query.mockImplementation(actualQuery); exec.mockImplementation(actualExec); reset();
    await row.auditAs('Retry the same rolled-back object without querying or rebasing it').save(context);
    const accepted = effects();
    expect(accepted).toMatchObject({queries: 2, transactions: 1, begins: 1, commits: 1, rollbacks: 0,
      mutations: 1, audits: 1, allocations: 0, policyLookups: 1, policyReviews: 1, rootLookups: 0});
    expect(row.version).toBe(2); expect(pending()).toEqual({}); expect(root.originalVersion(key)).toBe(2);
    expect(E.purchaseOrder(row).contactPhone().eval()).toBe('5550801');
    expect(new Date(E.purchaseOrder(row).updateTime().eval()!).getTime()).toBe(updatedAt.getTime());
    expect(physical(id)).toEqual({id: Number(id), version: 2, contact_phone: '5550801', internal_note: null,
      create_time: createdAt.getTime(), update_time: updatedAt.getTime()});
    process.stdout.write('CORE_TS_UNCHANGED_VIEW_CASE=' + JSON.stringify({scenario, round, id: String(id), passed: true,
      calibration, injected, uncommitted, denied, accepted, retainedIntent, geometryRetained: true,
      sameObjectRetry: true, originalOptimisticVersionRetained: true, physical: physical(id)}) + '\n');
  } finally {
    query.mockRestore(); transaction.mockRestore(); exec.mockRestore(); allocation.mockRestore(); policy.mockRestore();
    await client.close();
  }
}
