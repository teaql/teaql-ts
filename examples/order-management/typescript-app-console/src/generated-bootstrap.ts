import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { CommercePlatform } from './generated/models/CommercePlatform';
import { OrderStatus } from './generated/models/OrderStatus';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.commercePlatforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = CommercePlatform.teaqlBootstrapNew(context, '1');
    domainRoot.updateName("Northwind Demo");
    await domainRoot.auditAs('create generated Domain Root CommercePlatform').save(context);
  }
  context.withActiveRoot({ entity: 'CommercePlatform', id: domainRoot.id! });
  let constantOrderStatus1001 = (await Q.orderStatuses().withIdIs("1001").comment('what: locate generated constant OrderStatus(1001)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantOrderStatus1001) {
    constantOrderStatus1001 = OrderStatus.teaqlBootstrapNew(context, "1001");
    constantOrderStatus1001.updateName("Pending");
    constantOrderStatus1001.updateCode("PENDING");
    constantOrderStatus1001.updateColor("#F59E0B");
    constantOrderStatus1001.updateDisplayOrder(decimal("1"));
    constantOrderStatus1001.updateCommercePlatform(domainRoot);
    await constantOrderStatus1001.auditAs('create model constant OrderStatus(1001)').save(context);
  } else {
    let changed = false;
    if (constantOrderStatus1001.name !== "Pending") { constantOrderStatus1001.updateName("Pending"); changed = true; }
    if (constantOrderStatus1001.code !== "PENDING") { constantOrderStatus1001.updateCode("PENDING"); changed = true; }
    if (constantOrderStatus1001.color !== "#F59E0B") { constantOrderStatus1001.updateColor("#F59E0B"); changed = true; }
    if (constantOrderStatus1001.displayOrder !== decimal("1")) { constantOrderStatus1001.updateDisplayOrder(decimal("1")); changed = true; }
    if (String((constantOrderStatus1001.commercePlatform as any)?.id ?? constantOrderStatus1001.commercePlatform) !== String(domainRoot.id)) { constantOrderStatus1001.updateCommercePlatform(domainRoot); changed = true; }
    if (changed) await constantOrderStatus1001.auditAs('reconcile model constant OrderStatus(1001)').save(context);
  }
  let constantOrderStatus1002 = (await Q.orderStatuses().withIdIs("1002").comment('what: locate generated constant OrderStatus(1002)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantOrderStatus1002) {
    constantOrderStatus1002 = OrderStatus.teaqlBootstrapNew(context, "1002");
    constantOrderStatus1002.updateName("Confirmed");
    constantOrderStatus1002.updateCode("CONFIRMED");
    constantOrderStatus1002.updateColor("#10B981");
    constantOrderStatus1002.updateDisplayOrder(decimal("2"));
    constantOrderStatus1002.updateCommercePlatform(domainRoot);
    await constantOrderStatus1002.auditAs('create model constant OrderStatus(1002)').save(context);
  } else {
    let changed = false;
    if (constantOrderStatus1002.name !== "Confirmed") { constantOrderStatus1002.updateName("Confirmed"); changed = true; }
    if (constantOrderStatus1002.code !== "CONFIRMED") { constantOrderStatus1002.updateCode("CONFIRMED"); changed = true; }
    if (constantOrderStatus1002.color !== "#10B981") { constantOrderStatus1002.updateColor("#10B981"); changed = true; }
    if (constantOrderStatus1002.displayOrder !== decimal("2")) { constantOrderStatus1002.updateDisplayOrder(decimal("2")); changed = true; }
    if (String((constantOrderStatus1002.commercePlatform as any)?.id ?? constantOrderStatus1002.commercePlatform) !== String(domainRoot.id)) { constantOrderStatus1002.updateCommercePlatform(domainRoot); changed = true; }
    if (changed) await constantOrderStatus1002.auditAs('reconcile model constant OrderStatus(1002)').save(context);
  }
}
