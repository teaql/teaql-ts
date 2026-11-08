import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { Tenant } from './generated/models/Tenant';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.tenants().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Tenant.teaqlBootstrapNew(context, '1');
    domainRoot.updateName("Tenant Name");
    await domainRoot.auditAs('create generated Domain Root Tenant').save(context);
  }
  context.withActiveRoot({ entity: 'Tenant', id: domainRoot.id! });
}
