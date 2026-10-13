import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UserContext } from 'teaql-ts';
import { SQLiteTeaQLClient } from 'teaql-ts/sql/sqlite';
import { SQLExecutionEvidenceStore } from 'teaql-ts/sql/core';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

async function main() {
  const directory = mkdtempSync(join(tmpdir(), 'teaql-standard-graph-'));
  const client = new SQLiteTeaQLClient(join(directory, 'graph.sqlite'), GENERATED_RUNTIME_MODULE.schemas)
    .install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client);
  client.setUserContext(context).setDiagnosticSQLLogSink(undefined);
  const physical = new SQLExecutionEvidenceStore(); client.setRuntimeTelemetrySink(physical);
  const audits: Readonly<Record<string, unknown>>[] = []; client.setAuditSink(event => { audits.push(event); });
  try {
    await context.ensureSchema();
    physical.enableAll(); audits.length = 0;
    const order = Q.customerOrders().comment('prepare graph root').purpose('verify standard graph telemetry')
      .newEntity(context).updatePlatform('1').updateOrderNumber('STANDARD-GRAPH').updateDescription('fixture');
    const inherited = Q.orderItems().comment('prepare inherited item').purpose('verify standard graph telemetry').newEntity(context)
      .updateName('STANDARD_GRAPH_PRIVATE_LEFT');
    const explicit = Q.orderItems().comment('prepare explicit item').purpose('verify standard graph telemetry').newEntity(context)
      .updateName('STANDARD_GRAPH_PRIVATE_RIGHT').auditAs('prepare second graph item');
    order.orderItemList().push(inherited, explicit);
    await order.auditAs('save governed graph').save(context);
    assert.equal(audits.length, 3);
    assert.equal(physical.snapshot().length, 6);
    const loaded = await Q.customerOrders().withIdIs(order.id)
      .selectOrderItemListWith(Q.orderItems().limit(3)).limit(1)
      .comment('inspect saved graph').purpose('verify standard graph telemetry').executeForList(context);
    assert.equal(loaded.length, 1);
    assert.equal(E.customerOrder(loaded[0]).orderItemList().size().eval(), 2);
    const lineages = physical.snapshot().filter(entry => entry.operation === 'insert')
      .map(entry => entry.mutationLineage!.map(node => node.detail));
    assert.deepEqual(lineages, [['save governed graph'], ['save governed graph'],
      ['save governed graph', 'prepare second graph item']]);
    assert(!JSON.stringify(physical.snapshot()).includes('STANDARD_GRAPH_PRIVATE_'));
    await client.flushTelemetry();
    console.log('STANDARD_GRAPH_EXAMPLE ' + JSON.stringify({ sqlExecutions: 6, committedAudits: audits.length,
      inheritedLineage: true, explicitLineage: true, generatedQandE: true, applicationSDKInitialization: false }));
    console.log('PASS TypeScript standard graph telemetry: one graph, three entities, six SQL, independent committed audit');
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
