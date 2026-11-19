import { UserContext, decimal, long, localTime } from './teaql-ts';
import { Q } from './generated/Q';
import { Platform } from './generated/models/Platform';
import { TaskStatus } from './generated/models/TaskStatus';

/** @internal Generated typed Mutation bootstrap; never call from application code. */
export async function ensureGeneratedBootstrap(context: UserContext): Promise<void> {
  let domainRoot = (await Q.platforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!domainRoot) {
    domainRoot = Platform.teaqlBootstrapNew('1');
    domainRoot.updateName("Robot System");
    domainRoot.updateUserEmail("admin@robots.example");
    await domainRoot.auditAs('create generated Domain Root Platform').save(context);
  }
  context.withActiveRoot({ entity: 'Platform', id: domainRoot.id! });
  let constantTaskStatus1001 = (await Q.taskStatuses().withIdIs("1001").comment('what: locate generated constant TaskStatus(1001)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantTaskStatus1001) {
    constantTaskStatus1001 = TaskStatus.teaqlBootstrapNew("1001");
    constantTaskStatus1001.updateName("Planned");
    constantTaskStatus1001.updateCode("PLANNED");
    constantTaskStatus1001.updateColor("#94A3B8");
    constantTaskStatus1001.updateDisplayOrder(decimal("10"));
    constantTaskStatus1001.updateProgress(decimal("0"));
    constantTaskStatus1001.updatePlatform(domainRoot);
    await constantTaskStatus1001.auditAs('create model constant TaskStatus(1001)').save(context);
  } else {
    let changed = false;
    if (constantTaskStatus1001.name !== "Planned") { constantTaskStatus1001.updateName("Planned"); changed = true; }
    if (constantTaskStatus1001.code !== "PLANNED") { constantTaskStatus1001.updateCode("PLANNED"); changed = true; }
    if (constantTaskStatus1001.color !== "#94A3B8") { constantTaskStatus1001.updateColor("#94A3B8"); changed = true; }
    if (constantTaskStatus1001.displayOrder !== decimal("10")) { constantTaskStatus1001.updateDisplayOrder(decimal("10")); changed = true; }
    if (constantTaskStatus1001.progress !== decimal("0")) { constantTaskStatus1001.updateProgress(decimal("0")); changed = true; }
    if (String((constantTaskStatus1001.platform as any)?.id ?? constantTaskStatus1001.platform) !== String(domainRoot.id)) { constantTaskStatus1001.updatePlatform(domainRoot); changed = true; }
    if (changed) await constantTaskStatus1001.auditAs('reconcile model constant TaskStatus(1001)').save(context);
  }
  let constantTaskStatus1002 = (await Q.taskStatuses().withIdIs("1002").comment('what: locate generated constant TaskStatus(1002)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantTaskStatus1002) {
    constantTaskStatus1002 = TaskStatus.teaqlBootstrapNew("1002");
    constantTaskStatus1002.updateName("Ready");
    constantTaskStatus1002.updateCode("READY");
    constantTaskStatus1002.updateColor("#3B82F6");
    constantTaskStatus1002.updateDisplayOrder(decimal("20"));
    constantTaskStatus1002.updateProgress(decimal("25"));
    constantTaskStatus1002.updatePlatform(domainRoot);
    await constantTaskStatus1002.auditAs('create model constant TaskStatus(1002)').save(context);
  } else {
    let changed = false;
    if (constantTaskStatus1002.name !== "Ready") { constantTaskStatus1002.updateName("Ready"); changed = true; }
    if (constantTaskStatus1002.code !== "READY") { constantTaskStatus1002.updateCode("READY"); changed = true; }
    if (constantTaskStatus1002.color !== "#3B82F6") { constantTaskStatus1002.updateColor("#3B82F6"); changed = true; }
    if (constantTaskStatus1002.displayOrder !== decimal("20")) { constantTaskStatus1002.updateDisplayOrder(decimal("20")); changed = true; }
    if (constantTaskStatus1002.progress !== decimal("25")) { constantTaskStatus1002.updateProgress(decimal("25")); changed = true; }
    if (String((constantTaskStatus1002.platform as any)?.id ?? constantTaskStatus1002.platform) !== String(domainRoot.id)) { constantTaskStatus1002.updatePlatform(domainRoot); changed = true; }
    if (changed) await constantTaskStatus1002.auditAs('reconcile model constant TaskStatus(1002)').save(context);
  }
  let constantTaskStatus1003 = (await Q.taskStatuses().withIdIs("1003").comment('what: locate generated constant TaskStatus(1003)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantTaskStatus1003) {
    constantTaskStatus1003 = TaskStatus.teaqlBootstrapNew("1003");
    constantTaskStatus1003.updateName("Executing");
    constantTaskStatus1003.updateCode("EXECUTING");
    constantTaskStatus1003.updateColor("#F59E0B");
    constantTaskStatus1003.updateDisplayOrder(decimal("30"));
    constantTaskStatus1003.updateProgress(decimal("50"));
    constantTaskStatus1003.updatePlatform(domainRoot);
    await constantTaskStatus1003.auditAs('create model constant TaskStatus(1003)').save(context);
  } else {
    let changed = false;
    if (constantTaskStatus1003.name !== "Executing") { constantTaskStatus1003.updateName("Executing"); changed = true; }
    if (constantTaskStatus1003.code !== "EXECUTING") { constantTaskStatus1003.updateCode("EXECUTING"); changed = true; }
    if (constantTaskStatus1003.color !== "#F59E0B") { constantTaskStatus1003.updateColor("#F59E0B"); changed = true; }
    if (constantTaskStatus1003.displayOrder !== decimal("30")) { constantTaskStatus1003.updateDisplayOrder(decimal("30")); changed = true; }
    if (constantTaskStatus1003.progress !== decimal("50")) { constantTaskStatus1003.updateProgress(decimal("50")); changed = true; }
    if (String((constantTaskStatus1003.platform as any)?.id ?? constantTaskStatus1003.platform) !== String(domainRoot.id)) { constantTaskStatus1003.updatePlatform(domainRoot); changed = true; }
    if (changed) await constantTaskStatus1003.auditAs('reconcile model constant TaskStatus(1003)').save(context);
  }
  let constantTaskStatus1004 = (await Q.taskStatuses().withIdIs("1004").comment('what: locate generated constant TaskStatus(1004)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
  if (!constantTaskStatus1004) {
    constantTaskStatus1004 = TaskStatus.teaqlBootstrapNew("1004");
    constantTaskStatus1004.updateName("Verified");
    constantTaskStatus1004.updateCode("VERIFIED");
    constantTaskStatus1004.updateColor("#16A34A");
    constantTaskStatus1004.updateDisplayOrder(decimal("40"));
    constantTaskStatus1004.updateProgress(decimal("100"));
    constantTaskStatus1004.updatePlatform(domainRoot);
    await constantTaskStatus1004.auditAs('create model constant TaskStatus(1004)').save(context);
  } else {
    let changed = false;
    if (constantTaskStatus1004.name !== "Verified") { constantTaskStatus1004.updateName("Verified"); changed = true; }
    if (constantTaskStatus1004.code !== "VERIFIED") { constantTaskStatus1004.updateCode("VERIFIED"); changed = true; }
    if (constantTaskStatus1004.color !== "#16A34A") { constantTaskStatus1004.updateColor("#16A34A"); changed = true; }
    if (constantTaskStatus1004.displayOrder !== decimal("40")) { constantTaskStatus1004.updateDisplayOrder(decimal("40")); changed = true; }
    if (constantTaskStatus1004.progress !== decimal("100")) { constantTaskStatus1004.updateProgress(decimal("100")); changed = true; }
    if (String((constantTaskStatus1004.platform as any)?.id ?? constantTaskStatus1004.platform) !== String(domainRoot.id)) { constantTaskStatus1004.updatePlatform(domainRoot); changed = true; }
    if (changed) await constantTaskStatus1004.auditAs('reconcile model constant TaskStatus(1004)').save(context);
  }
}
