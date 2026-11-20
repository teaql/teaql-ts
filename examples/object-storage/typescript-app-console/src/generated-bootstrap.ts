import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { CommercePlatform } from './generated/models/CommercePlatform';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.commercePlatforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = CommercePlatform.teaqlBootstrapNew(context, '1');
    domainRoot.updateName("Order Attachments");
    await domainRoot.auditAs('create generated Domain Root CommercePlatform').save(context);
  }
  context.withActiveRoot({ entity: 'CommercePlatform', id: domainRoot.id! });
}
