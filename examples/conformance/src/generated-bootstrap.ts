import { UserContext } from './teaql-ts';
import { Q } from './generated/Q';
import { Platform } from './generated/models/Platform';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.platforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Platform.teaqlBootstrapNew('1');
    domainRoot.updateName("Runtime Example");
    await domainRoot.auditAs('create generated Domain Root Platform').save(context);
  }
  context.withActiveRoot({ entity: 'Platform', id: domainRoot.id! });
}
