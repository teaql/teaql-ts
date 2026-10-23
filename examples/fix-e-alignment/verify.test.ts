import { FixedBusinessClock, TeaQLNotLoadedError, UserContext } from '../../src';
import { E } from 'generated/generated/E';
import { Q } from 'generated/generated/Q';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';

test('unmodified generated Q/E and audited SQLite saves consume the local Business Clock', async () => {
  const first = new Date('2032-02-29T10:15:30.000Z');
  const second = new Date('2032-03-01T11:16:31.000Z');
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(first));
  const client = new SQLiteTeaQLClient(':memory:').setUserContext(context);
  context.insertResource('dataService', client);
  const diagnostics: ReturnType<TeaQLNotLoadedError['toWire']>[] = [];
  const missing = (read: () => unknown, location: string, attempted: string, expression: string) => {
    try { read(); }
    catch (error) {
      if (!(error instanceof TeaQLNotLoadedError)) throw error;
      const wire = error.toWire();
      expect(wire.code).toBe('NOT_LOADED');
      expect(wire.instancePath).toBe(location);
      expect(wire.attemptedInstancePath).toBe(attempted);
      expect(wire.expressionWithBrokenPoint).toBe(expression);
      expect(wire.expressionWithBrokenPoint.match(/<broken>/g)).toHaveLength(1);
      expect(error.message).not.toContain('PRIVATE-FALLBACK');
      diagnostics.push(wire);
      return;
    }
    throw new Error('NotLoaded must not be treated as null or fallback');
  };
  try {
    await context.ensureSchema();
    const order = Q.purchaseOrders().comment('Prepare the synthetic clock fixture')
      .purpose('Verify generated Fix and expression diagnostics').newEntity(context);
    order.updateContactPhone('5550100');
    const saved = await order.auditAs('Create the synthetic Fix order').save(context);
    expect(new Date(E.purchaseOrder(saved).createTime().eval()!).getTime()).toBe(first.getTime());
    expect(new Date(E.purchaseOrder(saved).updateTime().eval()!).getTime()).toBe(first.getTime());
    expect(String(E.purchaseOrder(saved).tenantId().eval())).toBe('1');
    expect(E.purchaseOrder(saved).internalNote().orElse('fallback')).toBe('fallback');

    const partial = (await Q.purchaseOrders().withIdIs(saved.id!).limit(1)
      .comment('Load scalar fields without eager relations').purpose('Verify E requires explicit relation loading')
      .executeForList(context))[0];
    expect(String(E.purchaseOrder(partial).tenantId().eval())).toBe('1');
    missing(() => E.purchaseOrder(partial).tenant().name().eval(), '/tenant', '/tenant/name',
      'E.purchaseOrder(<root>).tenant()<broken>.name().eval()');
    missing(() => E.purchaseOrder(partial).tenant().purchaseOrderList().first().tenant().name().eval(),
      '/tenant', '/tenant/purchaseOrderList/0/tenant/name',
      'E.purchaseOrder(<root>).tenant()<broken>.purchaseOrderList().first().tenant().name().eval()');
    missing(() => E.purchaseOrder(partial).orderItemList().get(2).productName().eval(),
      '/orderItemList', '/orderItemList/2/productName',
      'E.purchaseOrder(<root>).orderItemList()<broken>.get(2).productName().eval()');
    missing(() => E.purchaseOrder(partial).tenant().name().orElse('PRIVATE-FALLBACK'),
      '/tenant', '/tenant/name',
      'E.purchaseOrder(<root>).tenant()<broken>.name().orElse(<fallback>)');

    context.withBusinessClock(new FixedBusinessClock(second));
    const loaded = (await Q.purchaseOrders().withIdIs(saved.id!).limit(1)
      .comment('Reload the complete order before changing it')
      .purpose('Verify update Fix preserves the original create time').executeForList(context))[0];
    loaded.updateContactPhone('5550101');
    await loaded.auditAs('Update the synthetic Fix order').save(context);
    const persisted = (await Q.purchaseOrders().withIdIs(saved.id!).limit(1)
      .comment('Reload the persisted update').purpose('Verify Business Clock values using E')
      .executeForList(context))[0];
    expect(new Date(E.purchaseOrder(persisted).createTime().eval()!).getTime()).toBe(first.getTime());
    expect(new Date(E.purchaseOrder(persisted).updateTime().eval()!).getTime()).toBe(second.getTime());
    expect(E.purchaseOrder(persisted).contactPhone().eval()).toBe('5550101');
    expect(context.getResource('fixTime')).toBeUndefined();
    process.stdout.write('FIX_E_EXAMPLE=' + JSON.stringify({ language: 'typescript', passed: true,
      normalGeneratedSave: true, createTimePreserved: true, updateTimeAdvanced: true,
      declaredContextRootInjected: true, diagnostics }) + '\n');
  } finally { client.close(); }
});
