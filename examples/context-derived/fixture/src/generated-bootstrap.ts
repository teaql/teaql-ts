import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { Catalog } from './generated/models/Catalog';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.catalogs().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Catalog.teaqlBootstrapNew('1');
    domainRoot.updateName("Catalog");
    await domainRoot.auditAs('create generated Domain Root Catalog').save(context);
  }
  context.withActiveRoot({ entity: 'Catalog', id: domainRoot.id! });
}
