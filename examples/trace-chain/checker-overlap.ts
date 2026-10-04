import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CheckException, EntityRoot, GraphMutationSession, MutationIntent, MutationRequest, TraceNode, UserContext } from 'teaql-ts';
import { AbstractSQLTeaQLClient, MutationResult, SQLExecutionEvidenceStore, SQLExecutionMetadata, SqlQueryResult, SqlSession } from 'teaql-ts/sql/core';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

// Mechanical fingerprinting only: never inspect generated source for APIs.
function manifest(directory: string, prefix = ''): string {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => entry.isDirectory() ? manifest(join(directory, entry.name), `${prefix}${entry.name}/`)
      : `${createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex')}  ${prefix}${entry.name}\n`).join('');
}
const before = manifest('lib');
const database = resolve(process.env.TEAQL_TRACE_CHAIN_CHECKER_DB ?? '.local/checker-overlap.sqlite');
const evidence = resolve(process.env.TEAQL_TRACE_CHAIN_CHECKER_EVIDENCE ?? '.local/checker-overlap-evidence');
const attempt = process.env.TEAQL_TRACE_CHAIN_CHECKER_RUN ?? 'manual';
mkdirSync(join(database, '..'), { recursive: true }); mkdirSync(evidence, { recursive: true });
writeFileSync(join(evidence, `${attempt}-library-before.sha256`), before);
const nonce = randomUUID();
const ledger = (entity: unknown): EntityRoot => (entity as { _root: EntityRoot })._root;
const plain = (nodes: unknown) => (nodes as readonly TraceNode[]).map(node => [node.kind, node.name, node.entityId, node.detail]);
type Transaction = { reason?: string; outcome: 'pending' | 'commit' | 'rollback'; sql: string[] };
class Driver extends SQLiteDriver {
  readonly transactions: Transaction[] = [];
  current?: Transaction;
  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    assert.equal(this.current, undefined, 'the real SQLite transaction gate must serialize writers');
    const transaction: Transaction = { outcome: 'pending', sql: [] };
    this.transactions.push(transaction); this.current = transaction;
    try { const result = await super.transaction(work); transaction.outcome = 'commit'; return result; }
    catch (error) { transaction.outcome = 'rollback'; throw error; }
    finally { this.current = undefined; }
  }
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    this.current?.sql.push(sql);
    return super.query(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  readonly commands: Array<{ entity: string; id: string; reason: string; lineage: readonly TraceNode[] }> = [];
  readonly physical: SQLExecutionMetadata[] = [];
  readonly preflights: Array<{ entity: string; reason: string; rejected: boolean }> = [];
  readonly snapshots = new Map<string, Readonly<Record<string, unknown>>>();
  readonly sharedSnapshots: unknown[] = [];
  activeSaves = 0; maxSaves = 0; activeCallbacks = 0; maxCallbacks = 0;
  constructor(readonly observedDriver: Driver) { super(observedDriver, GENERATED_RUNTIME_MODULE.schemas); }
  async executeQuery(query: any): Promise<any[]> {
    const rows = await super.executeQuery(query);
    for (const row of rows) if (row.platform && typeof row.platform === 'object') {
      const key = `${row.platform.id}:${row.platform.version}`;
      let snapshot = this.snapshots.get(key);
      if (!snapshot) {
        const loaded: Readonly<Record<string, unknown>> = Object.freeze({ ...row.platform });
        this.snapshots.set(key, loaded); snapshot = loaded;
      }
      row.platform = snapshot; this.sharedSnapshots.push(snapshot);
    }
    return rows;
  }
  async executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T> {
    this.activeSaves++; this.maxSaves = Math.max(this.maxSaves, this.activeSaves);
    try {
      return await super.executeGraphSave(intent, async graph => {
        this.activeCallbacks++; this.maxCallbacks = Math.max(this.maxCallbacks, this.activeCallbacks);
        assert(this.observedDriver.current); this.observedDriver.current.reason = intent.comment;
        try { return await work(graph); } finally { this.activeCallbacks--; }
      });
    } finally { this.activeSaves--; }
  }
  preflightMutation(input: any): any {
    assert(input instanceof MutationRequest);
    const entry = { entity: input.mutation.entity, reason: input.comment, rejected: false };
    this.preflights.push(entry);
    try { return super.preflightMutation(input); }
    catch (error) { entry.rejected = error instanceof CheckException; throw error; }
  }
  async executeMutation(input: any): Promise<MutationResult> {
    assert(input instanceof MutationRequest);
    // Record entry, not only successful completion: rejected graphs must never get here.
    const entry = { entity: input.mutation.entity, id: String(input.mutation.id), reason: input.comment,
      lineage: input.traceFor({ entity: input.mutation.entity, id: input.mutation.id }) };
    this.commands.push(entry);
    const result = await super.executeMutation(input);
    entry.id = result.id;
    this.physical.push(...result.metadata!.statements!);
    return result;
  }
}

async function main() {
  const driver = new Driver(database);
  const client = new Client(driver).install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client);
  client.setUserContext(context);
  const sql = new SQLExecutionEvidenceStore();
  const diagnostics: SQLExecutionMetadata[] = [];
  const audit: Readonly<Record<string, unknown>>[] = [];
  client.setRuntimeTelemetrySink(sql).setDiagnosticSQLLogSink({ write: entry => diagnostics.push(entry) })
    .setAuditSink(event => { audit.push(event); });
  assert(GENERATED_RUNTIME_MODULE.checkers.CustomerOrder);
  assert(GENERATED_RUNTIME_MODULE.checkers.OrderItem);
  const reset = () => {
    client.commands.length = 0; client.physical.length = 0; client.preflights.length = 0;
    audit.length = 0; diagnostics.length = 0; driver.transactions.length = 0;
    client.maxSaves = 0; client.maxCallbacks = 0; sql.enableAll();
  };
  const create = async (suffix: string) => {
    const root = Q.customerOrders().comment('initialize Checker overlap fixture').purpose('verify generated validation')
      .newEntity(context).updatePlatform('1').updateOrderNumber(`${nonce}-${suffix}`).updateDescription(`before-${suffix}`);
    root.orderItemList().push(Q.orderItems().comment('initialize Checker item').purpose('verify generated validation')
      .newEntity(context).updateName(`${nonce}-${suffix}-item`));
    await root.auditAs('seed Checker overlap fixture').save(context);
    return root;
  };
  const load = async (id: string) => {
    const rows = await Q.customerOrders().withIdIs(id).selectPlatformWith(Q.platforms().limit(1))
      .selectOrderItemListWith(Q.orderItems().limit(10)).limit(1)
      .comment('load complete Checker graph').purpose('retain optimistic versions and readonly references').executeForList(context);
    assert.equal(rows.length, 1); return rows[0];
  };
  try {
    await context.ensureSchema(); await context.ensureSchema();
    for (const logging of [false, true]) for (const invalidFirst of [false, true]) {
      client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging);
      const suffix = `${logging}-${invalidFirst}`;
      const a = await create(`valid-${suffix}`), b = await create(`invalid-${suffix}`);
      client.sharedSnapshots.length = 0;
      const valid = await load(a.id!), invalid = await load(b.id!);
      const platformA = E.customerOrder(valid).platform().eval()!, platformB = E.customerOrder(invalid).platform().eval()!;
      assert.equal(client.sharedSnapshots[0], client.sharedSnapshots[1]);
      assert(Object.isFrozen(client.sharedSnapshots[0]));
      assert.notEqual(platformA, platformB); assert.notEqual(ledger(valid), ledger(invalid));
      const platformVersion = E.platform(platformA).version().eval();
      const invalidVersion = E.customerOrder(invalid).version().eval();
      const invalidDescription = E.customerOrder(invalid).description().eval();
      const validReason = `accept graph ${suffix}`, invalidReason = `reject graph ${suffix}`;
      valid.updateDescription(`accepted-${nonce}-${suffix}`);
      valid.orderItemList()[0].updateName(`accepted-child-${nonce}-${suffix}`).auditAs('accepted child responsibility');
      invalid.updateDescription(`must-remain-pending-${nonce}-${suffix}`);
      const missingName = Q.orderItems().comment('initialize invalid child').purpose('verify real required-field Checker')
        .newEntity(context).auditAs('rejected child responsibility');
      invalid.orderItemList().push(missingName);
      reset();
      const jobs = invalidFirst
        ? [invalid.auditAs(invalidReason).save(context), valid.auditAs(validReason).save(context)]
        : [valid.auditAs(validReason).save(context), invalid.auditAs(invalidReason).save(context)];
      const settled = await Promise.allSettled(jobs);
      const accepted = settled[invalidFirst ? 1 : 0], rejected = settled[invalidFirst ? 0 : 1];
      assert.equal(accepted.status, 'fulfilled'); assert.equal(rejected.status, 'rejected');
      if (rejected.status !== 'rejected') throw new Error('missing generated Checker rejection');
      assert(rejected.reason instanceof CheckException);
      assert(rejected.reason.violations.some((v: { ruleId: string; location: { nativePath(): string } }) =>
        v.ruleId.toLowerCase() === 'required' && v.location.nativePath() === 'orderItemList[1].name'), JSON.stringify(rejected.reason.violations));
      assert.equal(client.maxSaves, 2, 'both public Save invocations must be live');
      assert.equal(client.maxCallbacks, 1, 'runtime gate serializes Checker/work callbacks');
      assert(client.preflights.some(p => p.entity === 'OrderItem' && p.reason === invalidReason && p.rejected));
      assert(client.preflights.some(p => p.entity === 'OrderItem' && p.reason === validReason && !p.rejected));
      assert.deepEqual(client.commands.map(c => [c.entity, c.id, c.reason]),
        [['CustomerOrder', valid.id, validReason], ['OrderItem', valid.orderItemList()[0].id, validReason]]);
      assert.equal(audit.length, 2); assert.equal(client.physical.length, 4); assert.equal(sql.snapshot().length, 4);
      assert.equal(diagnostics.length, logging ? 4 : 0);
      const expected = [[['auditReason', 'CustomerOrder', valid.id, validReason]],
        [['auditReason', 'CustomerOrder', valid.id, validReason],
          ['auditReason', 'OrderItem', valid.orderItemList()[0].id, 'accepted child responsibility']]];
      assert.deepEqual(client.commands.map(c => plain(c.lineage)), expected);
      assert.deepEqual(audit.map(event => plain(event.mutationLineage)), expected);
      assert.deepEqual(client.physical.map(entry => plain(entry.mutationLineage)), expected.flatMap(chain => [chain, chain]));
      assert.equal(driver.transactions.length, 2);
      const failed = driver.transactions.find(t => t.reason === invalidReason)!;
      assert.equal(failed.outcome, 'rollback'); assert.deepEqual(failed.sql, [], 'no ID allocation or business SQL before Checker rejection');
      assert.equal(driver.transactions.find(t => t.reason === validReason)!.outcome, 'commit');
      assert.equal(ledger(platformA).snapshot().length, 0); assert.equal(ledger(platformB).snapshot().length, 0);
      assert.equal(E.platform(platformA).version().eval(), platformVersion);
      assert.equal(context.getResource('fixTime'), undefined); assert.equal(context.getResource('fixEvidenceCurrent'), undefined);
      const observation = { logging, invalidFirst, publicOverlap: client.maxSaves, serializedCallbacks: client.maxCallbacks,
        violations: rejected.reason.violations, preflights: client.preflights.slice(), commands: client.commands.slice(),
        statements: sql.snapshot(), committedAudit: audit.slice(), transactions: driver.transactions.slice() };
      const storedValid = await load(valid.id!), storedInvalid = await load(invalid.id!);
      assert.equal(E.customerOrder(storedValid).description().eval(), `accepted-${nonce}-${suffix}`);
      assert.equal(E.orderItem(storedValid.orderItemList()[0]).name().eval(), `accepted-child-${nonce}-${suffix}`);
      assert.equal(E.customerOrder(storedInvalid).description().eval(), invalidDescription);
      assert.equal(E.customerOrder(storedInvalid).version().eval(), invalidVersion);
      assert.equal(storedInvalid.orderItemList().length, 1);
      assert.equal(E.platform(E.customerOrder(storedInvalid).platform().eval()!).version().eval(), platformVersion);
      assert.equal(ledger(invalid).change({ entity: 'CustomerOrder', id: invalid.id! }).description,
        `must-remain-pending-${nonce}-${suffix}`);
      reset();
      const nextReason = `independent after rejection ${suffix}`;
      storedInvalid.updateDescription(`next-${nonce}-${suffix}`);
      await storedInvalid.auditAs(nextReason).save(context);
      assert.equal(client.commands.length, 1); assert.equal(audit.length, 1);
      assert.equal(client.commands[0].reason, nextReason);
      const nextLineage = [['auditReason', 'CustomerOrder', invalid.id, nextReason]];
      assert.deepEqual(plain(client.commands[0].lineage), nextLineage);
      assert.deepEqual(plain(audit[0].mutationLineage), nextLineage);
      assert.deepEqual(client.physical.map(entry => plain(entry.mutationLineage)), [nextLineage, nextLineage]);
      assert.equal(sql.snapshot().length, 2); assert.equal(diagnostics.length, logging ? 2 : 0);
      assert.equal(context.getResource('fixTime'), undefined); assert.equal(context.getResource('fixEvidenceCurrent'), undefined);
      assert.equal(E.customerOrder(await load(invalid.id!)).description().eval(), `next-${nonce}-${suffix}`);
      console.log(JSON.stringify({ ...observation, nextIndependentSave: 'committed', sharedReadonlyReference: true }));
    }
  } finally { await client.close(); }
  const after = manifest('lib'); assert.equal(after, before);
  writeFileSync(join(evidence, `${attempt}-library-after.sha256`), after);
  console.log(JSON.stringify({ database, nonce, attempt, generatedFiles: before.trim().split('\n').length, generatedSourceUnchanged: true }));
  console.log('PASS TypeScript generated Checker overlap: 4 scenarios; real Required rejection, no rejected commands/business SQL/audit; transactions serialized');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
