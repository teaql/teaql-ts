import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { UserContext } from 'teaql-ts';
import { SQLiteTeaQLClient } from 'teaql-ts/sql/sqlite';
import { SQLExecutionEvidenceStore } from 'teaql-ts/sql/core';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';
import { startStandardNodeTelemetry } from 'teaql-ts/telemetry/standard-node';

// Application-owned fault boundary: no SDK setup or business-operation instrumentation.
class Client extends SQLiteTeaQLClient {
  failSecondItem = false;
  private itemCalls = 0;
  readonly failure = new Error('controlled business failure');
  async executeMutation(source: any): Promise<any> {
    if (this.failSecondItem && (source.mutation ?? source).entity === 'OrderItem' && ++this.itemCalls === 2)
      throw this.failure;
    return super.executeMutation(source);
  }
}

async function main() {
  const pressure = process.argv.includes('--queue-pressure');
  const backlog = process.argv.includes('--shutdown-backlog');
  const handle = pressure ? await startStandardNodeTelemetry() : undefined;
  if (pressure) assert(handle?.health, 'pressure verification requires the standard module enabled');
  const client = new Client(process.env.TEAQL_STANDARD_RESPONSE_DB!, GENERATED_RUNTIME_MODULE.schemas)
    .install(GENERATED_RUNTIME_MODULE).setDiagnosticSQLLogSink(undefined);
  client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  const context = new UserContext().insertResource('dataService', client);
  if (handle) client.setRuntimeTelemetry(handle.telemetry);
  client.setUserContext(context);
  const physical = new SQLExecutionEvidenceStore(); client.setRuntimeTelemetrySink(physical);
  const audits: Readonly<Record<string, unknown>>[] = []; client.setAuditSink(event => {audits.push(event);});
  const group = 'response-' + randomUUID();
  const graph = () => {
    const order = Q.customerOrders().comment('prepare governed response graph').purpose('verify exporter isolation')
      .newEntity(context).updatePlatform('1').updateOrderNumber(group).updateDescription(group);
    order.orderItemList().push(
      Q.orderItems().comment('prepare inherited response item').purpose('verify exporter isolation')
        .newEntity(context).updateName('TEAQL_PRIVATE_ITEM_LEFT'),
      Q.orderItems().comment('prepare explicit response item').purpose('verify exporter isolation')
        .newEntity(context).updateName('TEAQL_PRIVATE_ITEM_RIGHT').auditAs('prepare explicit item'),
    );
    return order;
  };
  try {
    await context.ensureSchema(); const firstSeedAudits = audits.length;
    await context.ensureSchema(); assert.equal(audits.length, firstSeedAudits);
    audits.length = 0; physical.enableAll();
    const initial = graph(); await initial.auditAs('save first governed graph').save(context);
    assert.equal(audits.length, 3);
    const recovering = graph(); client.failSecondItem = true;
    const beforeFailure = audits.length;
    await assert.rejects(recovering.auditAs('reject interrupted graph').save(context), error => error === client.failure);
    assert.equal(audits.length, beforeFailure, 'rolled-back writes must not emit committed audit');
    assert.equal(recovering.id, undefined, 'rollback restores the new-entity state');
    client.failSecondItem = false;
    const rejectedRows = await Q.customerOrders().withDescriptionIs(group).limit(10)
      .comment('inspect rolled back graph').purpose('verify rollback isolation').executeForList(context);
    assert.equal(rejectedRows.length, 1);
    await recovering.auditAs('recover interrupted graph').save(context);
    assert.equal(audits.length, 6);
    const rows = await Q.customerOrders().withIdIs(recovering.id)
      .selectOrderItemListWith(Q.orderItems().limit(3)).limit(1)
      .comment('inspect recovered graph').purpose('verify exporter isolation').executeForList(context);
    assert.equal(rows.length, 1);
    assert.equal(E.customerOrder(rows[0]).orderItemList().size().eval(), 2);
    const loaded = rows[0];
    loaded.updateDescription(group + '-updated'); loaded.orderItemList()[0].updateName('TEAQL_PRIVATE_ITEM_UPDATED');
    await loaded.auditAs('update selected graph item').save(context);
    assert.equal(audits.length, 8, 'unchanged second child must not be written');
    loaded.orderItemList()[1].markForDeletion();
    await loaded.auditAs('remove second graph item').save(context);
    assert.equal(audits.length, 9, 'unchanged root and first child must not be written');
    const final = await Q.customerOrders().withIdIs(loaded.id)
      .selectOrderItemListWith(Q.orderItems().limit(3)).limit(1)
      .comment('inspect final graph').purpose('verify exporter isolation').executeForList(context);
    assert.equal(E.customerOrder(final[0]).description().eval(), group + '-updated');
    assert.equal(E.customerOrder(final[0]).orderItemList().size().eval(), 1);
    assert.equal(E.orderItem(final[0].orderItemList()[0]).name().eval(), 'TEAQL_PRIVATE_ITEM_UPDATED');
    assert(!JSON.stringify(physical.snapshot()).includes('TEAQL_PRIVATE_ITEM_'));
    if (!pressure) await client.flushTelemetry();
    console.log('STANDARD_RESPONSE_EXAMPLE ' + JSON.stringify({firstSeedAudits, repeatSeedAudits: 0,
      savedEntities: 3, rolledBackEntities: 3, recoveredEntities: 3, committedAudits: audits.length,
      updatedEntities: 2, deletedEntities: 1, generatedQandE: true, originalFailurePreserved: true,
      SQL: physical.snapshot().length, ordinaryLogging: false, applicationSDKInitialization: false}));
    console.log('PASS TypeScript standard response graph: create, rollback, retry, update, delete, Q/E, committed audit');
    if (handle) {
      await handle.flush();
      const baseline = handle.health!();
      const baselineAudits = audits.length;
      for (let index = 0; index < 1500; index++) {
        const read = await Q.customerOrders().withIdIs(loaded.id).limit(1)
          .comment('read graph under telemetry pressure').purpose('verify exact bounded admission').executeForList(context);
        assert.equal(E.customerOrder(read[0]).description().eval(), group + '-updated');
      }
      assert.equal(audits.length, baselineAudits);
      const saturated = handle.health!();
      for (const signal of ['traces','logs'] as const) {
        const queue = saturated.queues[signal];
        assert.equal(queue.outstanding, 2048);
        assert(queue.overflow > baseline.queues[signal].overflow);
        assert.equal(queue.admitted - baseline.queues[signal].admitted, 2048);
      }
      console.log('TS_PRESSURE_READY ' + JSON.stringify({baseline,saturated,reads:1500,audits:baselineAudits}));
      if (backlog) {
        const started = performance.now();
        await handle.release();
        const closed = handle.health!();
        assert(performance.now() - started < 6500);
        for (const signal of ['traces','logs'] as const) {
          const queue = closed.queues[signal];
          assert.equal(queue.outstanding,0); assert.equal(queue.exporting,0);
          assert.equal(queue.admitted,queue.completed+queue.retired);
        }
        assert(closed.queues.logs.retired > 0);
        const late = await Q.customerOrders().withIdIs(loaded.id).limit(1)
          .comment('read after telemetry shutdown').purpose('verify business continuity').executeForList(context);
        assert.equal(E.customerOrder(late[0]).description().eval(),group+'-updated');
        assert.equal(audits.length,baselineAudits);
        const after = handle.health!();
        for (const signal of ['traces','logs'] as const)
          assert.equal(after.queues[signal].postShutdown-closed.queues[signal].postShutdown,3);
        console.log('TS_BACKLOG_CLOSED '+JSON.stringify({elapsedMs:performance.now()-started,closed,after,audits:audits.length}));
        console.log('PASS TypeScript standard backlogged shutdown and post-shutdown Q/E');
      } else {
        await handle.flush(); const drained = handle.health!();
        for (const signal of ['traces','logs'] as const) assert.equal(drained.queues[signal].outstanding,0);
        await Q.customerOrders().withIdIs(loaded.id).limit(1).comment('recovery after telemetry pressure')
          .purpose('verify released capacity').executeForList(context);
        await handle.flush(); const recovered = handle.health!();
        assert.equal(recovered.queues.traces.admitted-drained.queues.traces.admitted,3);
        assert.equal(recovered.queues.logs.admitted-drained.queues.logs.admitted,4);
        console.log('TS_PRESSURE_RECOVERED '+JSON.stringify({drained,recovered,audits:audits.length}));
        console.log('PASS TypeScript standard queue pressure and recovery');
      }
    }
  } finally {try {await handle?.release();} finally {await client.close();}}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
