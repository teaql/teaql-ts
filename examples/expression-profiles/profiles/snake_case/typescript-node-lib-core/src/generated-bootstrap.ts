import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { DistributionCenter } from './generated/models/DistributionCenter';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.distributionCenters().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = DistributionCenter.teaqlBootstrapNew(context, '1');
    domainRoot.updateDockName("North Receiving Terminal");
    await domainRoot.auditAs('create generated Domain Root DistributionCenter').save(context);
  }
  context.withActiveRoot({ entity: 'DistributionCenter', id: domainRoot.id! });
}
