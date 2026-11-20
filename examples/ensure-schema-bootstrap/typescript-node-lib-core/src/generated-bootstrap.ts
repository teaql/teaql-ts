import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { Platform } from './generated/models/Platform';
import { SchoolType } from './generated/models/SchoolType';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.platforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Platform.teaqlBootstrapNew(context, '1');
    domainRoot.updateName("Default School District");
    await domainRoot.auditAs('create generated Domain Root Platform').save(context);
  }
  context.withActiveRoot({ entity: 'Platform', id: domainRoot.id! });
  let constantSchoolType1001 = (await Q.schoolTypes().withIdIs("1001").comment('what: locate generated constant SchoolType(1001)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantSchoolType1001) {
    constantSchoolType1001 = SchoolType.teaqlBootstrapNew(context, "1001");
    constantSchoolType1001.updatePlatform(domainRoot);
    constantSchoolType1001.updateName("Primary");
    constantSchoolType1001.updateCode("PRIMARY");
    await constantSchoolType1001.auditAs('create model constant SchoolType(1001)').save(context);
  } else {
    let changed = false;
    if (String((constantSchoolType1001.platform as any)?.id ?? constantSchoolType1001.platform) !== String(domainRoot.id)) { constantSchoolType1001.updatePlatform(domainRoot); changed = true; }
    if (constantSchoolType1001.name !== "Primary") { constantSchoolType1001.updateName("Primary"); changed = true; }
    if (constantSchoolType1001.code !== "PRIMARY") { constantSchoolType1001.updateCode("PRIMARY"); changed = true; }
    if (changed) await constantSchoolType1001.auditAs('reconcile model constant SchoolType(1001)').save(context);
  }
  let constantSchoolType1002 = (await Q.schoolTypes().withIdIs("1002").comment('what: locate generated constant SchoolType(1002)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantSchoolType1002) {
    constantSchoolType1002 = SchoolType.teaqlBootstrapNew(context, "1002");
    constantSchoolType1002.updatePlatform(domainRoot);
    constantSchoolType1002.updateName("Secondary");
    constantSchoolType1002.updateCode("SECONDARY");
    await constantSchoolType1002.auditAs('create model constant SchoolType(1002)').save(context);
  } else {
    let changed = false;
    if (String((constantSchoolType1002.platform as any)?.id ?? constantSchoolType1002.platform) !== String(domainRoot.id)) { constantSchoolType1002.updatePlatform(domainRoot); changed = true; }
    if (constantSchoolType1002.name !== "Secondary") { constantSchoolType1002.updateName("Secondary"); changed = true; }
    if (constantSchoolType1002.code !== "SECONDARY") { constantSchoolType1002.updateCode("SECONDARY"); changed = true; }
    if (changed) await constantSchoolType1002.auditAs('reconcile model constant SchoolType(1002)').save(context);
  }
}
