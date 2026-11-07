import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CheckException, QueryParser, RequestIntentError, TeaQLNotLoadedError, UserContext } from 'teaql-ts';
import { Q } from './ts-lib-core/src/generated/Q';
import { E } from './ts-lib-core/src/generated/E';
import { SQLiteTeaQLClient } from './ts-lib-core/src/teaql-node-sqlite';
import { GENERATED_RUNTIME_MODULE } from './ts-lib-core/src/runtime-module';
import { runNativeExamples } from './app-native/src/main';
import { runDynamicExamples } from './app-dynamic/src/main';

async function main() {
  const database = process.env.TEAQL_TASK_BOARD_DB;
  assert(database, 'Run npm run verify or set TEAQL_TASK_BOARD_DB to a retained SQLite path.');
  const round = Number(process.env.TEAQL_TASK_BOARD_ROUND ?? '1'); assert([1, 2].includes(round));
  mkdirSync(dirname(resolve(database)), {recursive: true});
  const client = new SQLiteTeaQLClient(resolve(database)).setDiagnosticSQLLogSink(undefined);
  client.install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client);
  try {
    await context.ensureSchema(); await context.ensureSchema();
    const roots = await Q.platforms().limit(2).comment('read seeded root')
      .purpose('verify repeated bootstrap').executeForList(context);
    const statuses = await Q.taskStatuses().orderByIdAscending().limit(10).comment('read seeded task statuses')
      .purpose('verify fixed constant identities').executeForList(context);
    assert.deepEqual(roots.map(r => r.id), ['1']);
    assert.deepEqual(statuses.map(r => [r.id, E.taskStatus(r).code().eval()]),
      [['1001', 'PLANNED'], ['1002', 'READY'], ['1003', 'EXECUTING'], ['1004', 'VERIFIED']]);

    const invalid = (await Q.tasks().comment('prepare invalid task').purpose('verify Checker').newEntity(context))
      .updatePlatform('1').updateStatusToPlanned().updateName('');
    const beforeInvalid = client.sqlTrace.length;
    await assert.rejects(async () => invalid.auditAs('reject blank task name').save(context), CheckException);
    assert.equal(client.sqlTrace.length, beforeInvalid, 'Checker rejection must precede business SQL');
    const missingAudit = (await Q.tasks().comment('prepare unaudited task').purpose('verify audit gate').newEntity(context))
      .updatePlatform('1').updateStatusToPlanned().updateName('rejected audit fixture');
    await assert.rejects(async () => missingAudit.auditAs('').save(context), RequestIntentError);

    let seeded = 0, renamed = 0;
    for (const channel of ['native', 'dynamic']) {
      const initialName = 'bug-' + channel, finalName = initialName + ' verified';
      const existing = await Q.tasks().withNameIn(initialName, finalName).limit(2)
        .comment('find retained task fixture').purpose('avoid duplicate sample data').executeForList(context);
      assert(existing.length <= 1);
      let entity = existing[0];
      if (!entity) {
        entity = (await Q.tasks().comment('initialize task graph').purpose('demonstrate generated creation').newEntity(context))
          .updatePlatform('1').updateStatusToPlanned().updateName(initialName);
        assert(entity.id && BigInt(entity.id) > 0n, 'creation must assign identity before saving');
        const log = (await Q.taskExecutionLogs().comment('initialize execution history')
          .purpose('demonstrate graph save').newEntity(context))
          .updateTask(entity.id).updateAction('created').updateDetail('PRIVATE-TASK-DETAIL');
        entity.taskExecutionLogList().push(log);
        await entity.auditAs('create task and its execution history').save(context); seeded++;
      }
      // Save a complete model, never a reconstructed DTO or reduced projection.
      if (E.task(entity).name().eval() !== finalName) {
        entity.updateName(finalName).updateStatusToVerified();
        await entity.auditAs('verify task completion').save(context); renamed++;
      }
    }
    assert.equal(seeded, round === 1 ? 2 : 0); assert.equal(renamed, round === 1 ? 2 : 0);
    const {tasks, facets} = await runNativeExamples(context);
    const dynamic = await runDynamicExamples(context);
    assert.equal(tasks.length, 2); assert.equal(dynamic.length, 2);
    assert.deepEqual(tasks.map(r => r.id), dynamic.map(r => r.id));
    for (const task of tasks) {
      const name = E.task(task).name().eval(); assert(typeof name === 'string' && name.endsWith(' verified'));
      const status = E.task(task).status().eval(); assert(status);
      assert.equal(E.taskStatus(status).code().eval(), 'VERIFIED');
      assert.equal(E.task(task).statusId().eval(), '1004');
      assert.equal(E.task(task).taskExecutionLogList().size().eval(), 1);
      assert.equal(E.task(task).taskExecutionLogList().first().action().eval(), 'created');
      assert.equal(E.task(task).taskExecutionLogList().first().taskId().eval(), task.id);
    }
    const counters = facets.facets.statusFacet;
    assert(counters, 'the requested Facet is present');
    assert.deepEqual(counters.map(r => [String(r.id), r.taskCount]), [['1001', 0], ['1002', 0], ['1003', 0], ['1004', 2]]);
    const sparse = await Q.tasksWithMinimalFields().selectName().limit(1)
      .comment('load name-only task projection').purpose('verify E loaded-state safety').executeForList(context);
    assert.equal(sparse.length, 1); assert.throws(() => E.task(sparse[0]).status().eval(), TeaQLNotLoadedError);
    assert.throws(() => E.task(sparse[0]).status().code().orElse('fallback'), TeaQLNotLoadedError);
    assert.throws(() => QueryParser.parse('globalThis.process.exit()', Q));
    await assert.rejects(async () => Q.tasks().limit(1).comment('').purpose('verify query intent').executeForList(context), RequestIntentError);

    const transient = (await Q.tasks().comment('initialize deletion fixture').purpose('demonstrate staged deletion').newEntity(context))
      .updatePlatform('1').updateStatusToReady().updateName('temporary-task-' + round);
    await transient.auditAs('create deletion fixture').save(context);
    const id = transient.id!;
    await transient.markForDeletion().auditAs('remove temporary task').save(context);
    const visible = await Q.tasks().withIdIs(id).limit(1).comment('check normal-query hiding')
      .purpose('verify staged deletion').executeForList(context); assert.equal(visible.length, 0);
    const deleted = await Q.tasks().deletedRowsOnly().withIdIs(id).limit(1).comment('read retained deleted task')
      .purpose('verify negative optimistic version').executeForList(context);
    assert.equal(deleted.length, 1); assert(BigInt(deleted[0].version!) < 0n);
    console.log('TYPESCRIPT_TASK_BOARD=' + JSON.stringify({passed: true, round, seeded, renamed,
      rootIds: roots.map(r => r.id), constantIds: statuses.map(r => r.id), taskIds: tasks.map(r => r.id),
      versions: tasks.map(r => r.version), typedDynamicMatch: true, checkerRejected: true,
      missingAuditRejected: true, notLoadedRejected: true, parserInjectionRejected: true,
      deletedId: id, deletedVersion: deleted[0].version, actualSQL: client.sqlTrace.length,
      runtimeOrigin: require.resolve('teaql-ts')}));
    console.log('PASS TypeScript generated Task Board: bootstrap, typed/dynamic Q, loaded E, Checker, audited graph, update, staged delete');
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
