import {readFileSync} from 'node:fs';
import {decimal, FixedBusinessClock, UserContext} from '../../src';
import {Q} from 'generated/generated/Q';
import {E} from 'generated/generated/E';
import {TeaQLClient} from 'generated/teaql-ts';
import {GENERATED_RUNTIME_MODULE} from 'generated/runtime-module';

test('a failed file-backed child Delete keeps its intent and retries on the same graph', async () => {
  const round = Number(process.env.TEAQL_FIX_E_ROUND);
  const filename = process.env.TEAQL_FIX_E_DB! + '.delete-retry.json';
  const context = new UserContext().withActiveRoot({entity: 'Tenant', id: '1'})
    .withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new TeaQLClient(filename).install(GENERATED_RUNTIME_MODULE).setUserContext(context);
  context.insertResource('dataService', client);
  const parent = (await Q.purchaseOrders().comment('Prepare the file-backed Delete owner')
    .purpose('Verify rollback retains child intent without updating its parent')
    .newEntity(context)).updateContactPhone('5550142');
  const child = (await Q.orderItems().comment('Prepare the file-backed Delete child')
    .purpose('Verify loaded Delete values are not field-write intent')
    .newEntity(context)).updateProductName('Delete retry round ' + round).updateUnitPrice(decimal('12.34'));
  parent.orderItemList().push(child);
  await parent.auditAs('Create the Delete rollback baseline').save(context);
  const baseline = readFileSync(filename), audits = client.auditTrace.length;
  const root = (child as any)._root, key = {entity: 'OrderItem', id: (child as any)._ledgerId};
  const execute = client.executeMutation.bind(client);
  const fault = new Error('injected failure after a real file-backed child Delete');
  const mutations = jest.spyOn(client, 'executeMutation');
  const persist = jest.spyOn(client as any, 'persist');
  child.markForDeletion();
  mutations.mockImplementationOnce(async request => {await execute(request); throw fault;});
  try {
    await expect(parent.auditAs('Attempt child deletion with an injected rollback').save(context)).rejects.toBe(fault);
    const rollback = {fileUnchanged: readFileSync(filename).equals(baseline),
      auditDelta: client.auditTrace.length - audits, persistCalls: persist.mock.calls.length,
      pendingDelete: root.isDeleted(key), ledgerFields: Object.keys(root.change(key)),
      parentVersion: E.purchaseOrder(parent).version().eval(), childVersion: E.orderItem(child).version().eval(),
      originalVersion: root.originalVersion(key), scopeReleased: context.getResource('fixTime') === undefined};
    const reloaded = new TeaQLClient(filename).install(GENERATED_RUNTIME_MODULE).setUserContext(context);
    context.insertResource('dataService', reloaded);
    const rows = await Q.orderItems().withIdIs(child.id!).limit(1).comment('Independently read the rolled-back child')
      .purpose('Check the file still has the live version').executeForList(context);
    expect(rows).toHaveLength(1); expect(E.orderItem(rows[0]).version().eval()).toBe(1);
    context.insertResource('dataService', client);
    mutations.mockImplementation(execute); mutations.mockClear(); persist.mockClear();
    let retryError: unknown;
    try {await parent.auditAs('Retry deletion of the same child without reloading the graph').save(context);}
    catch (error) {retryError = error;}
    const facts = {round, rollback, retryError: retryError instanceof Error ? retryError.message : retryError ?? null,
      retryMutations: mutations.mock.calls.length, retryPersists: persist.mock.calls.length,
      auditDelta: client.auditTrace.length - audits, parentVersion: E.purchaseOrder(parent).version().eval(),
      childVersion: E.orderItem(child).version().eval()};
    process.stdout.write('CORE_TS_FILE_DELETE_RETRY=' + JSON.stringify(facts) + '\n');
    expect(rollback).toEqual({fileUnchanged: true, auditDelta: 0, persistCalls: 0, pendingDelete: true,
      ledgerFields: [], parentVersion: 1, childVersion: 1, originalVersion: 1, scopeReleased: true});
    if (retryError) throw retryError;
    expect(facts).toMatchObject({retryMutations: 1, retryPersists: 1, auditDelta: 1, parentVersion: 1, childVersion: -2});
    expect(root.hasPending(key)).toBe(false);
    const stored = JSON.parse(readFileSync(filename, 'utf8')).data;
    expect(stored.PurchaseOrder[parent.id!].version).toBe(1);
    expect(stored.OrderItem[child.id!].version).toBe(-2);
    expect(stored.OrderItem[child.id!].product_name ?? stored.OrderItem[child.id!].productName).toBe('Delete retry round ' + round);
    const visible = await Q.orderItems().withIdIs(child.id!).limit(1).comment('Check committed tombstone visibility')
      .purpose('Verify successful retry hides the deleted child').executeForList(context);
    expect(visible).toHaveLength(0);
    mutations.mockClear(); persist.mockClear();
    await expect(parent.auditAs('Reject deleting an already committed tombstone').save(context)).rejects.toMatchObject({
      violations: expect.arrayContaining([expect.objectContaining({ruleId: 'invalid_type'})]),
    });
    expect(mutations).not.toHaveBeenCalled(); expect(persist).not.toHaveBeenCalled();
    expect(client.auditTrace).toHaveLength(audits + 1);
  } finally {mutations.mockRestore(); persist.mockRestore();}
});
