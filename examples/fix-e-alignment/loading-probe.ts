import { CheckException, TeaQLNotLoadedError, UserContext } from '../../src';
import { E } from 'generated/generated/E';
import { Q } from 'generated/generated/Q';

export async function verifyLoading(context: UserContext,
    orderId: Parameters<ReturnType<typeof Q.purchaseOrders>['withIdIs']>[0]): Promise<void> {
  const rows = await Q.purchaseOrders().withIdIs(orderId)
    .selectTenantWith(Q.tenantsWithMinimalFields().withIdIs('2').limit(1)
      .comment("Load only a different tenant's detail"))
    .limit(1).comment('Keep the selected FK when target detail is filtered out')
    .purpose('Verify filtered target detail is NotLoaded rather than loaded null').executeForList(context);
  expect(rows).toHaveLength(1);
  const owner = rows[0];
  expect(String(E.purchaseOrder(owner).tenantId().eval())).toBe('1');
  let detail: ReturnType<TeaQLNotLoadedError['toWire']> | undefined;
  try { E.purchaseOrder(owner).tenant().name().eval(); }
  catch (error) {
    if (!(error instanceof TeaQLNotLoadedError)) throw error;
    detail = error.toWire();
    expect(detail.code).toBe('NOT_LOADED');
    expect(detail.attemptedInstancePath).toBe('/tenant/name');
  }
  expect(detail).toBeDefined();
  owner.updateContactPhone('5550102');
  await owner.auditAs('Change only the complete owner').save(context);
  const complete = await Q.purchaseOrders().withIdIs(orderId).limit(1)
    .comment('Reload the successful owner update')
    .purpose('Verify untouched partial targets do not prevent saving the owner').executeForList(context);
  expect(complete).toHaveLength(1);
  expect(E.purchaseOrder(complete[0]).contactPhone().eval()).toBe('5550102');
  const version = E.purchaseOrder(complete[0]).version().eval();
  const partial = await Q.purchaseOrdersWithMinimalFields().withIdIs(orderId).limit(1)
    .comment('Load an identity-only owner')
    .purpose('Reject changes to an incomplete owner before persistence').executeForList(context);
  expect(partial).toHaveLength(1);
  partial[0].updateContactPhone('5550103');
  let rejected = false;
  try { await partial[0].auditAs('Attempt to modify an incomplete owner').save(context); }
  catch (error) {
    if (!(error instanceof CheckException)) throw error;
    expect(error.violations.some(result => result.ruleId === 'invalid_type')).toBe(true);
    rejected = true;
  }
  expect(rejected).toBe(true);
  const unchanged = await Q.purchaseOrders().withIdIs(orderId).limit(1)
    .comment('Reload after the rejected incomplete mutation')
    .purpose('Verify persisted values and optimistic version remain unchanged').executeForList(context);
  expect(unchanged).toHaveLength(1);
  expect(E.purchaseOrder(unchanged[0]).contactPhone().eval()).toBe('5550102');
  expect(E.purchaseOrder(unchanged[0]).version().eval()).toEqual(version);
  process.stdout.write('CORE_LOAD_EXAMPLE=' + JSON.stringify({
    language: 'typescript', passed: true, foreignKeyPreserved: true, filteredDetailNotLoaded: detail,
    untouchedPartialTargetSave: true, modifiedPartialOwnerRejected: true, rejectedVersionUnchanged: true,
  }) + '\n');
}
