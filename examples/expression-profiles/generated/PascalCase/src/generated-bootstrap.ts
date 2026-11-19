import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { TypePlatform } from './generated/models/TypePlatform';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.typePlatforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = TypePlatform.teaqlBootstrapNew(context, '1');
    domainRoot.updateName("Scalar Type Conformance");
    await domainRoot.auditAs('create generated Domain Root TypePlatform').save(context);
  }
  context.withActiveRoot({ entity: 'TypePlatform', id: domainRoot.id! });
}
