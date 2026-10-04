import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DelegatingMutationPolicyApprovalProvider, DelegatingMutationPolicyRegistry,
  MutationPlan, MutationRequest, TraceNode, UserContext } from 'teaql-ts';
import { AbstractSQLTeaQLClient, MutationResult, SQLExecutionEvidenceStore,
  SQLExecutionMetadata, SqlQueryResult, SqlSession } from 'teaql-ts/sql/core';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

// Byte fingerprints only; generated source is not used for API discovery.
function fingerprint(directory: string, prefix = ''): string {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => entry.isDirectory() ? fingerprint(join(directory, entry.name), `${prefix}${entry.name}/`)
      : `${createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex')} ${prefix}${entry.name}\n`).join('');
}
const originalLibrary = fingerprint('lib');
const database = resolve(process.env.TEAQL_TRACE_CHAIN_PLAN_DB ?? '.local/plan-item-lineage.sqlite');
mkdirSync(join(database, '..'), { recursive: true });
class Driver extends SQLiteDriver {
  readonly writes: Array<{ sql: string; values: readonly unknown[]; transaction?: number }> = [];
  readonly transactions: Array<{ id: number; committed: boolean }> = [];
  activeTransaction?: number;
  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    const transaction = { id: this.transactions.length + 1, committed: false };
    this.transactions.push(transaction);
    const result = await super.transaction(async session => {
      this.activeTransaction = transaction.id;
      try { return await work(session); }
      finally { this.activeTransaction = undefined; }
    });
    transaction.committed = true;
    return result;
  }
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (/^(INSERT|UPDATE)/.test(sql) && sql.includes('order_item_data')) {
      this.writes.push({ sql, values: [...values], transaction: this.activeTransaction });
    }
    return super.query(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  readonly commands: Array<{ entity: string; id: string; reason: string; lineage: readonly TraceNode[] }> = [];
  constructor(driver: Driver) { super(driver, GENERATED_RUNTIME_MODULE.schemas); }
  async executeMutation(request: any): Promise<MutationResult> {
    assert(request instanceof MutationRequest, 'ordinary generated save owns every request');
    const result = await super.executeMutation(request);
    this.commands.push({ entity: request.mutation.entity, id: result.id, reason: request.comment,
      lineage: request.traceFor({ entity: request.mutation.entity, id: result.id }) });
    return result;
  }
}
const plain = (nodes: unknown) => (nodes as readonly TraceNode[])
  .map(node => [node.kind, node.name, node.entityId, node.detail]);

async function main() {
  const driver = new Driver(database);
  const client = new Client(driver).install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client);
  client.setUserContext(context);
  const evidence = new SQLExecutionEvidenceStore();
  const diagnostics: SQLExecutionMetadata[] = [];
  const audits: Readonly<Record<string, unknown>>[] = [];
  const reviewed: MutationPlan[] = [];
  client.setRuntimeTelemetrySink(evidence).setDiagnosticSQLLogSink({ write: entry => diagnostics.push(entry) })
    .setAuditSink(event => { audits.push(event); });
  try {
    await context.ensureSchema();
    const identity = { policyId: 'trace-plan-items', version: '1', fingerprint: 'sha256:trace-plan-items-v1' };
    context.withMutationPolicyRegistry(new DelegatingMutationPolicyRegistry(key =>
      key === 'CustomerOrder.saveGraph' ? { identity, review: (_context, plan) => {
        reviewed.push(plan); return { verdict: 'allow' };
      } } : undefined));
    context.withMutationPolicyApprovalProvider(new DelegatingMutationPolicyApprovalProvider(policy =>
      ({ policy, approvedBy: 'trace-example-owner', approvedAt: new Date('2026-10-04T00:00:00Z') })));

    for (const logging of [true, false]) {
      client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging);
      const nonce = randomUUID();
      const order = Q.customerOrders().comment('initialize plan root').purpose('verify ordered graph plan').newEntity(context)
        .updatePlatform('1').updateOrderNumber(`PLAN-${nonce}`).updateDescription('before');
      const first = Q.orderItems().comment('initialize first plan item').purpose('verify ordered graph plan').newEntity(context);
      const second = Q.orderItems().comment('initialize second plan item').purpose('verify ordered graph plan').newEntity(context);
      order.orderItemList().push(first, second);
      first.auditAs('prepare first item'); second.auditAs('prepare second item');
      for (const phase of ['create', 'update'] as const) {
        const secrets = [`LEFTPRIVATE${phase.toUpperCase()}${nonce}`, `RIGHTPRIVATE${phase.toUpperCase()}${nonce}`];
        first.updateName(secrets[0]); second.updateName(secrets[1]);
        order.updateDescription(phase);
        const reason = `align ${secrets[0]} with ${secrets[1]}`;
        reviewed.length = 0; client.commands.length = 0; driver.writes.length = 0; driver.transactions.length = 0;
        diagnostics.length = 0; audits.length = 0; evidence.enableAll();
        await order.auditAs(reason).save(context);
        assert.equal(reviewed.length, 1, 'one governed plan, not two independently approved saves');
        const plan = reviewed[0];
        assert.equal(plan.auditReason, reason, 'raw caller intent stays unchanged');
        assert.equal(plan.operations.length, 3);
        const items = plan.operations.filter(operation => operation.entity === 'OrderItem');
        assert.equal(items.length, 2);
        assert.deepEqual(items.map(operation => operation.changedValues.name), secrets);
        assert(items.every(operation => operation.kind === phase));
        assert(Object.isFrozen(plan) && Object.isFrozen(plan.operations));
        const expected = [
          [['auditReason', 'CustomerOrder', order.id, reason]],
          [['auditReason', 'CustomerOrder', order.id, reason], ['auditReason', 'OrderItem', first.id, 'prepare first item']],
          [['auditReason', 'CustomerOrder', order.id, reason], ['auditReason', 'OrderItem', second.id, 'prepare second item']],
        ];
        assert.deepEqual(client.commands.map(command => [command.entity, command.id]),
          [['CustomerOrder', order.id], ['OrderItem', first.id], ['OrderItem', second.id]]);
        assert.deepEqual(client.commands.map(command => plain(command.lineage)), expected);
        assert(client.commands.every(command => command.reason === reason));
        assert.equal(driver.writes.length, 2);
        assert.deepEqual(driver.transactions, [{ id: 1, committed: true }], 'one real atomic graph transaction');
        assert(driver.writes.every(write => write.transaction === 1));
        assert(driver.writes[0].values.includes(secrets[0]) && !driver.writes[0].values.includes(secrets[1]));
        assert(driver.writes[1].values.includes(secrets[1]) && !driver.writes[1].values.includes(secrets[0]));
        const physical = evidence.snapshot();
        assert.equal(physical.length, 6, 'root plus two item writes and three real readbacks');
        assert.equal(audits.length, 3);
        assert.equal(diagnostics.length, logging ? 6 : 0);
        const safe = JSON.stringify({ physical, diagnostics, audits });
        for (const secret of secrets) assert(!safe.includes(secret), 'sibling secret leaked through inherited prose');
        for (let index = 0; index < 3; index++) {
          const write = physical[index * 2], read = physical[index * 2 + 1];
          assert.equal(write.affectedRows, 1); assert.equal(read.operation, 'select'); assert.equal(read.resultCount, 1);
          assert.deepEqual(write.mutationLineage, read.mutationLineage);
          assert.deepEqual(audits[index].mutationLineage, write.mutationLineage);
          const leaf = write.mutationLineage![write.mutationLineage!.length - 1];
          assert.equal(leaf.entityId, index === 0 ? order.id : index === 1 ? first.id : second.id);
          if (index > 0) assert.equal(leaf.detail, index === 1 ? 'prepare first item' : 'prepare second item');
        }
        // The exact same words are not private in an unrelated request that
        // neither binds nor loads these items; stale graph masking must not linger.
        evidence.enableAll();
        const independent = `independent ${secrets.join(' ')}`;
        await Q.platforms().limit(1).comment(independent).purpose('verify completed plan privacy isolation').executeForList(context);
        assert.equal(evidence.snapshot()[0].comment, independent);
        const loaded = await Q.orderItems().withIdIs(first.id).limit(1)
          .comment('read first committed item').purpose('verify item plan persistence').executeForList(context);
        assert.equal(E.orderItem(loaded[0]).name().eval(), secrets[0]);
        console.log(JSON.stringify({ case: 'TC-MUT-09/TC-REQ-16', path: 'existing MutationPlan and root save',
          logging, phase, reviewedPlans: 1, operations: 3, sameTypeItems: 2,
          transactions: 1, commands: 3, physicalStatements: 6, committedAudits: 3, siblingPrivacy: true, nextRequestIndependent: true }));
      }
    }
  } finally { await client.close(); }
  assert.equal(fingerprint('lib'), originalLibrary);
  console.log('PASS TypeScript generated plan item lineage: 4 scenarios; one plan, ordered same-type items, sibling privacy, independent next request');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
