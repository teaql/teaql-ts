import { UserContext } from './teaql-ts';
import { Q } from './generated/Q';
import { Platform } from './generated/models/Platform';
import { OrderStatus } from './generated/models/OrderStatus';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.platforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Platform.teaqlBootstrapNew('1');
    domainRoot.updateName("Commerce Test Platform");
    await domainRoot.auditAs('create generated Domain Root Platform').save(context);
  }
  context.withActiveRoot({ entity: 'Platform', id: domainRoot.id! });
  let constantOrderStatus1001 = (await Q.orderStatuses().withIdIs("1001").comment('what: locate generated constant OrderStatus(1001)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantOrderStatus1001) {
    constantOrderStatus1001 = OrderStatus.teaqlBootstrapNew("1001");
    constantOrderStatus1001.updatePlatform(domainRoot);
    constantOrderStatus1001.updateName("New");
    constantOrderStatus1001.updateCode("NEW");
    constantOrderStatus1001.updateColor("#94A3B8");
    constantOrderStatus1001.updateDisplayOrder(1);
    await constantOrderStatus1001.auditAs('create model constant OrderStatus(1001)').save(context);
  } else {
    let changed = false;
    if (String((constantOrderStatus1001.platform as any)?.id ?? constantOrderStatus1001.platform) !== String(domainRoot.id)) { constantOrderStatus1001.updatePlatform(domainRoot); changed = true; }
    if (constantOrderStatus1001.name !== "New") { constantOrderStatus1001.updateName("New"); changed = true; }
    if (constantOrderStatus1001.code !== "NEW") { constantOrderStatus1001.updateCode("NEW"); changed = true; }
    if (constantOrderStatus1001.color !== "#94A3B8") { constantOrderStatus1001.updateColor("#94A3B8"); changed = true; }
    if (constantOrderStatus1001.displayOrder !== 1) { constantOrderStatus1001.updateDisplayOrder(1); changed = true; }
    if (changed) await constantOrderStatus1001.auditAs('reconcile model constant OrderStatus(1001)').save(context);
  }
  let constantOrderStatus1002 = (await Q.orderStatuses().withIdIs("1002").comment('what: locate generated constant OrderStatus(1002)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantOrderStatus1002) {
    constantOrderStatus1002 = OrderStatus.teaqlBootstrapNew("1002");
    constantOrderStatus1002.updatePlatform(domainRoot);
    constantOrderStatus1002.updateName("Paid");
    constantOrderStatus1002.updateCode("PAID");
    constantOrderStatus1002.updateColor("#22C55E");
    constantOrderStatus1002.updateDisplayOrder(2);
    await constantOrderStatus1002.auditAs('create model constant OrderStatus(1002)').save(context);
  } else {
    let changed = false;
    if (String((constantOrderStatus1002.platform as any)?.id ?? constantOrderStatus1002.platform) !== String(domainRoot.id)) { constantOrderStatus1002.updatePlatform(domainRoot); changed = true; }
    if (constantOrderStatus1002.name !== "Paid") { constantOrderStatus1002.updateName("Paid"); changed = true; }
    if (constantOrderStatus1002.code !== "PAID") { constantOrderStatus1002.updateCode("PAID"); changed = true; }
    if (constantOrderStatus1002.color !== "#22C55E") { constantOrderStatus1002.updateColor("#22C55E"); changed = true; }
    if (constantOrderStatus1002.displayOrder !== 2) { constantOrderStatus1002.updateDisplayOrder(2); changed = true; }
    if (changed) await constantOrderStatus1002.auditAs('reconcile model constant OrderStatus(1002)').save(context);
  }
  let constantOrderStatus1003 = (await Q.orderStatuses().withIdIs("1003").comment('what: locate generated constant OrderStatus(1003)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantOrderStatus1003) {
    constantOrderStatus1003 = OrderStatus.teaqlBootstrapNew("1003");
    constantOrderStatus1003.updatePlatform(domainRoot);
    constantOrderStatus1003.updateName("Cancelled");
    constantOrderStatus1003.updateCode("CANCELLED");
    constantOrderStatus1003.updateColor("#EF4444");
    constantOrderStatus1003.updateDisplayOrder(3);
    await constantOrderStatus1003.auditAs('create model constant OrderStatus(1003)').save(context);
  } else {
    let changed = false;
    if (String((constantOrderStatus1003.platform as any)?.id ?? constantOrderStatus1003.platform) !== String(domainRoot.id)) { constantOrderStatus1003.updatePlatform(domainRoot); changed = true; }
    if (constantOrderStatus1003.name !== "Cancelled") { constantOrderStatus1003.updateName("Cancelled"); changed = true; }
    if (constantOrderStatus1003.code !== "CANCELLED") { constantOrderStatus1003.updateCode("CANCELLED"); changed = true; }
    if (constantOrderStatus1003.color !== "#EF4444") { constantOrderStatus1003.updateColor("#EF4444"); changed = true; }
    if (constantOrderStatus1003.displayOrder !== 3) { constantOrderStatus1003.updateDisplayOrder(3); changed = true; }
    if (changed) await constantOrderStatus1003.auditAs('reconcile model constant OrderStatus(1003)').save(context);
  }
}
