import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MutationRequest, TraceNode, UserContext } from 'teaql-ts';
import { AbstractSQLTeaQLClient, MutationResult, SQLExecutionEvidenceStore, SQLExecutionMetadata, SqlQueryResult } from 'teaql-ts/sql/core';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

const database = resolve(process.env.TEAQL_TRACE_CHAIN_DB ?? '.local/trace-chain.sqlite');
mkdirSync(join(database, '..'), { recursive: true });
const checks: string[] = [];
const nonce = randomUUID();
function manifest(directory: string, prefix = ''): string {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => entry.isDirectory() ? manifest(join(directory, entry.name), `${prefix}${entry.name}/`)
      : `${createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex')}  ${prefix}${entry.name}\n`).join('');
}
const generatedBefore = manifest('lib');

class Driver extends SQLiteDriver {
  failureTable?: string;
  readbackFailure = false;
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (this.failureTable && sql.includes(this.failureTable)
      && (this.readbackFailure ? sql.startsWith('SELECT') && sql.includes('WHERE "id" = ?') : sql.startsWith('INSERT'))) {
      throw new Error('injected trace-chain provider failure');
    }
    return super.query(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  readonly commands: Array<{ entity: string; action: string; lineage: readonly TraceNode[] }> = [];
  constructor(driver: Driver) { super(driver, GENERATED_RUNTIME_MODULE.schemas); }
  async executeMutation(mutation: any): Promise<MutationResult> {
    const result = await super.executeMutation(mutation);
    assert(mutation instanceof MutationRequest, 'generated save must pass an owned request');
    assert.equal(result.metadata?.statements?.length, 2, 'successful save must return write/readback metadata');
    assert.equal(result.metadata.statements[0].affectedRows, 1);
    assert.equal(result.metadata.statements[1].resultCount, 1);
    this.commands.push({ entity: mutation.mutation.entity, action: mutation.mutation.action,
      lineage: mutation.traceFor({ entity: mutation.mutation.entity, id: result.id }) });
    return result;
  }
}

function construct(context: UserContext, suffix: string) {
  const order = Q.customerOrders().comment('initialize order').purpose('verify generated graph').newEntity(context)
    .updatePlatform('1').updateOrderNumber(`${nonce}-${suffix}`).updateDescription(`fixture-description-${suffix}`);
  const item = Q.orderItems().comment('initialize available item').purpose('verify generated graph').newEntity(context)
    .updateName(`fixture-available-${suffix}`);
  const removed = Q.orderItems().comment('initialize second item').purpose('verify generated graph').newEntity(context)
    .updateName(`fixture-unavailable-${suffix}`);
  const payment = Q.payments().comment('initialize payment').purpose('verify generated graph').newEntity(context)
    .updateReferenceCode(`fixture-payment-${suffix}`).auditAs('authorize payment');
  const attempt = Q.paymentAttempts().comment('initialize payment attempt').purpose('verify generated graph').newEntity(context)
    .updateReferenceCode(`fixture-attempt-${suffix}`);
  const shipment = Q.shipments().comment('initialize shipment').purpose('verify generated graph').newEntity(context)
    .updateReferenceCode(`fixture-shipment-${suffix}`).auditAs('dispatch shipment');
  order.orderItemList().push(item, removed);
  order.paymentList().push(payment);
  payment.paymentAttemptList().push(attempt);
  order.shipmentList().push(shipment);
  return { order, item, removed, payment, attempt, shipment };
}
function plain(nodes: unknown): unknown {
  return (nodes as readonly TraceNode[]).map(node => [node.kind, node.name, node.entityId, node.detail]);
}
function expected(graph: ReturnType<typeof construct>, rootReason: string, deleted = false) {
  const root = ['auditReason', 'CustomerOrder', graph.order.id, rootReason];
  return [[root], [root], deleted ? [root, ['auditReason', 'OrderItem', graph.removed.id, 'remove unavailable item']] : [root],
    [root, ['auditReason', 'Payment', graph.payment.id, 'authorize payment']],
    [root, ['auditReason', 'Payment', graph.payment.id, 'authorize payment']],
    [root, ['auditReason', 'Shipment', graph.shipment.id, 'dispatch shipment']]];
}

function checkPhysicalGraph(entries: readonly SQLExecutionMetadata[], lineages: ReturnType<typeof expected>, reason: string) {
  assert.deepEqual(entries.map(entry => plain(entry.mutationLineage)), lineages.flatMap(lineage => [lineage, lineage]));
  for (let index = 0; index < lineages.length; index++) {
    const write = entries[index * 2], read = entries[index * 2 + 1];
    assert.notEqual(write.operation, 'select'); assert.equal(write.affectedRows, 1);
    assert.equal(read.operation, 'select'); assert.equal(read.resultCount, 1);
    assert.equal(read.executionOutcome, 'success'); assert.equal(read.comment, reason);
    assert.equal(read.purpose, 'verify persisted mutation result');
    assert.deepEqual(read.tracePath.map(node => node.kind), ['operation', 'request', 'provider', 'sql']);
    assert.equal(read.tracePath[0].name, 'CustomerOrder'); assert.equal(read.tracePath[0].detail, 'query');
    assert.deepEqual(read.mutationLineage, write.mutationLineage);
  }
}

async function main() {
  const driver = new Driver(database);
  const client = new Client(driver).install(GENERATED_RUNTIME_MODULE).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client);
  const sql = new SQLExecutionEvidenceStore();
  const audits: Readonly<Record<string, unknown>>[] = [];
  client.setAuditSink(event => {
    // The sink sees committed, queryable rows, not an intermediate transaction.
    audits.push(event);
  });
  try {
    await context.ensureSchema(); await context.ensureSchema();
    // Fixture setup through the runtime allocator, not generated ID setters or
    // application SQL. Reserve unused IDs and align the two sequence floors so
    // retained databases with different per-type histories still exercise the
    // same-numeric-ID boundary. Gaps are intentional; no business row is reset.
    await driver.transaction(async session => {
      const rootID = await driver.nextId(session, 'CustomerOrder');
      const paymentID = await driver.nextId(session, 'Payment');
      const floor = String(Math.max(Number(rootID), Number(paymentID)));
      await driver.ensureIdFloor(session, 'CustomerOrder', floor);
      await driver.ensureIdFloor(session, 'Payment', floor);
    });
    const roots = await Q.platforms().limit(2).comment('read default root').purpose('verify idempotent bootstrap').executeForList(context);
    assert.equal(roots.length, 1); assert.equal(E.platform(roots[0]).id().eval(), '1');
    checks.push('generated bootstrap twice');
    client.commands.length = 0; audits.length = 0;
    client.setRuntimeTelemetrySink(sql);
    const graph = construct(context, 'normative');
    await graph.order.auditAs('submit order').save(context);
    assert.equal(client.commands.length, 6);
    assert.deepEqual(client.commands.map(command => plain(command.lineage)), expected(graph, 'submit order'));
    checkPhysicalGraph(sql.snapshot(), expected(graph, 'submit order'), 'submit order');
    assert.deepEqual(audits.map(event => plain(event.mutationLineage)), expected(graph, 'submit order'));
    assert.equal(graph.order.id, graph.payment.id, 'aligned fixture must exercise same-ID/different-type identity');
    checks.push('generated six creates with assigned IDs and branch-local lineage');

    client.commands.length = 0; audits.length = 0; sql.enableAll();
    graph.order.updateDescription('fixture-description-updated');
    graph.item.updateName('fixture-available-updated');
    graph.removed.markForDeletion().auditAs('remove unavailable item');
    graph.payment.updateReferenceCode('fixture-payment-updated');
    graph.attempt.updateReferenceCode('fixture-attempt-updated');
    graph.shipment.updateReferenceCode('fixture-shipment-updated');
    await graph.order.auditAs('submit order').save(context);
    assert.deepEqual(client.commands.map(command => plain(command.lineage)), expected(graph, 'submit order', true));
    checkPhysicalGraph(sql.snapshot(), expected(graph, 'submit order', true), 'submit order');
    assert.deepEqual(audits.map(event => plain(event.mutationLineage)), expected(graph, 'submit order', true));
    assert(sql.snapshot().every(entry => entry.auditReason === 'submit order' && entry.tracePath[0].name === 'CustomerOrder'));
    assert.deepEqual(client.commands.map(command => command.action), ['Update', 'Update', 'Delete', 'Update', 'Update', 'Update']);
    checks.push('generated normative update and child markForDeletion then root save');

    sql.enableAll();
    const attempts = await Q.paymentAttempts().withIdIs(graph.attempt.id)
      .selectPaymentWith(Q.payments().limit(1).selectCustomerOrderWith(
        Q.customerOrders().limit(1).selectPlatformWith(Q.platforms().limit(1))))
      .limit(1).comment('load generated three-level graph').purpose('verify query lineage').executeForList(context);
    assert.equal(attempts.length, 1);
    assert.equal(E.paymentAttempt(attempts[0]).referenceCode().eval(), 'fixture-attempt-updated');
    assert.equal(E.paymentAttempt(attempts[0]).paymentId().eval(), graph.payment.id);
    assert.equal(E.paymentAttempt(attempts[0]).payment().customerOrder().platform().id().eval(), '1');
    assert.deepEqual(sql.snapshot().map(entry => entry.tracePath.filter(node => node.kind === 'relation').map(node => [node.name, node.detail])),
      [[], [['payment', 'PaymentAttempt.payment']], [['payment', 'PaymentAttempt.payment'], ['customerOrder', 'Payment.customerOrder']],
        [['payment', 'PaymentAttempt.payment'], ['customerOrder', 'Payment.customerOrder'], ['platform', 'CustomerOrder.platform']]]);
    assert(sql.snapshot().every(entry => entry.comment === 'load generated three-level graph'));
    assert(sql.snapshot().every(entry => entry.purpose === 'verify query lineage'));
    assert(sql.snapshot().every(entry => entry.tracePath[0].kind === 'operation'
      && entry.tracePath[0].name === 'PaymentAttempt'
      && entry.tracePath[1].kind === 'request' && entry.tracePath[1].name === 'PaymentAttempt'
      && entry.tracePath.at(-2)?.kind === 'provider'
      && entry.tracePath.at(-1)?.kind === 'sql' && entry.tracePath.at(-1)?.name === 'select'));
    const qualifiedQueryRelations = [['payment', 'PaymentAttempt.payment'],
      ['customerOrder', 'Payment.customerOrder'], ['platform', 'CustomerOrder.platform']];
    sql.snapshot().forEach((entry, depth) => assert.deepEqual(
      entry.tracePath.map(node => [node.kind, node.name, node.detail ?? '']),
      [['operation', 'PaymentAttempt', 'query'], ['request', 'PaymentAttempt', ''],
        ...qualifiedQueryRelations.slice(0, depth).map(([name, detail]) => ['relation', name, detail]),
        ['provider', 'sqlite', ''], ['sql', 'select', '']],
      'canonical generated path at every physical boundary'));
    checks.push('generated bounded Q and E across three relation levels');

    audits.length = 0; sql.enableAll();
    const first = construct(context, 'concurrent-first'), second = construct(context, 'concurrent-second');
    await Promise.all([first.order.auditAs('first independent operation').save(context),
      second.order.auditAs('second independent operation').save(context)]);
    for (const [graph, reason] of [[first, 'first independent operation'], [second, 'second independent operation']] as const) {
      assert.deepEqual(audits.filter(event => event.reason === reason).map(event => plain(event.mutationLineage)), expected(graph, reason));
      checkPhysicalGraph(sql.snapshot().filter(entry => entry.auditReason === reason), expected(graph, reason), reason);
    }
    checks.push('generated overlapping graph saves on the same Context');

    for (const readback of [false, true]) {
      const failed = construct(context, `failed-${readback}`);
      client.commands.length = 0; audits.length = 0; sql.enableAll();
      driver.failureTable = 'payment_data'; driver.readbackFailure = readback;
      await assert.rejects(failed.order.auditAs('submit failing order').save(context), /injected trace-chain provider failure/);
      assert.equal(audits.length, 0);
      const last = sql.snapshot()[sql.snapshot().length - 1];
      assert.equal(last.executionOutcome, 'failure'); assert.equal(last.auditReason, 'submit failing order');
      assert.equal(last.mutationLineage?.length, 2);
      assert.equal(last.mutationLineage?.[1].detail, 'authorize payment');
      if (readback) {
        assert.equal(last.operation, 'select');
        assert.equal(sql.snapshot()[sql.snapshot().length - 2].executionOutcome, 'success');
      }
      driver.failureTable = undefined;
      const rows = await Q.customerOrders().withOrderNumberIs(`${nonce}-failed-${readback}`).limit(1)
        .comment('inspect failed graph').purpose('verify atomic rollback').executeForList(context);
      assert.equal(rows.length, 0);
    }
    checks.push('generated provider and readback failures retain trace and produce no committed audit');

    const privacy = construct(context, 'loaded-privacy');
    privacy.item.updateName('PRIVATEOLDITEM');
    await privacy.order.auditAs('seed loaded privacy graph').save(context);
    const loaded = (await Q.customerOrders().withIdIs(privacy.order.id)
      .selectOrderItemListWith(Q.orderItems().limit(2)).limit(1)
      .comment('load privacy graph').purpose('verify authoritative scalar snapshot').executeForList(context))[0];
    const item = loaded.orderItemList().find(row => row.id === privacy.item.id)!;
    assert.equal(E.orderItem(item).name().eval(), 'PRIVATEOLDITEM');
    for (const [oldValue, newValue, fail] of [
      ['PRIVATEOLDITEM', 'PRIVATENEWITEM', false],
      ['PRIVATENEWITEM', 'PRIVATEROLLBACKITEM', true],
      ['PRIVATENEWITEM', 'PRIVATERETRYITEM', false],
    ] as const) {
      loaded.updateDescription(`privacy update ${newValue.length}`);
      item.updateName(newValue);
      audits.length = 0; sql.enableAll();
      client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
      driver.failureTable = fail ? 'order_item_data' : undefined;
      driver.readbackFailure = fail;
      const operation = loaded.auditAs(`replace ${oldValue} with ${newValue}`).save(context);
      if (fail) await assert.rejects(operation, /injected trace-chain provider failure/);
      else await operation;
      const evidence = sql.snapshot();
      assert.equal(evidence.length, 4, 'parent and child writes plus both readbacks');
      assert(!JSON.stringify(evidence).includes(oldValue), 'old scalar leaked into graph SQL');
      assert(!JSON.stringify(evidence).includes(newValue), 'new scalar leaked into graph SQL');
      assert(!JSON.stringify(audits).includes(oldValue), 'old scalar leaked into graph audit');
      assert.equal(audits.length, fail ? 0 : 2);
      driver.failureTable = undefined;
      const persisted = (await Q.orderItems().withIdIs(item.id).limit(1)
        .comment('verify item privacy mutation').purpose('check committed or rolled-back value').executeForList(context))[0];
      assert.equal(E.orderItem(persisted).name().eval(), fail ? oldValue : newValue);
    }
    // No unrelated request may inherit the preceding graph's privacy snapshot.
    sql.enableAll();
    await Q.platforms().limit(1).comment('independent PRIVATEOLDITEM').purpose('verify graph privacy isolation').executeForList(context);
    assert.equal(sql.snapshot()[0].comment, 'independent PRIVATEOLDITEM');
    checks.push('generated loaded old-value privacy, committed refresh, rollback retry and independent request isolation');
  } finally { await client.close(); }
  assert.equal(manifest('lib'), generatedBefore, 'application execution changed generated source');
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/generated-library-manifest.sha256', generatedBefore);
  console.log(JSON.stringify({ database, nonce, checks, generatedSourceUnchanged: true }));
  console.log(`PASS TypeScript generated trace-chain example: ${checks.length} checks`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
