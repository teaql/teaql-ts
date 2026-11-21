import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { Warehouse } from './generated/models/Warehouse';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.warehouses().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Warehouse.teaqlBootstrapNew('1');
    domainRoot.updateName("Central Warehouse");
    await domainRoot.auditAs('create generated Domain Root Warehouse').save(context);
  }
  context.withActiveRoot({ entity: 'Warehouse', id: domainRoot.id! });
}
