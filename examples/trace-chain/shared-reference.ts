import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EntityRoot, GraphMutationSession, MutationIntent, MutationRequest, TraceNode, UserContext } from 'teaql-ts';
import { AbstractSQLTeaQLClient, MutationResult, SQLExecutionEvidenceStore } from 'teaql-ts/sql/core';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

function manifest(directory: string, prefix = ''): string {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => entry.isDirectory() ? manifest(join(directory, entry.name), `${prefix}${entry.name}/`)
      : `${createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex')}  ${prefix}${entry.name}\n`).join('');
}
const before = manifest('lib');
const nonce = randomUUID();
const database = resolve(process.env.TEAQL_TRACE_CHAIN_SHARED_DB ?? '.local/shared-reference.sqlite');
mkdirSync(join(database, '..'), { recursive: true });
const ledger = (entity: unknown): EntityRoot => (entity as { _root: EntityRoot })._root;
const key = (entity: string, id: string | undefined) => ({ entity, id: id! });
const plain = (nodes: unknown) => (nodes as readonly TraceNode[]).map(node => [node.kind, node.name, node.entityId, node.detail]);

class Client extends AbstractSQLTeaQLClient {
  readonly commands: Array<{ entity: string; id: string; version?: number; lineage: readonly TraceNode[] }> = [];
  readonly snapshots = new Map<string, Readonly<Record<string, unknown>>>();
  readonly sharedSnapshots: unknown[] = [];
  activeSaves = 0;
  maxOverlappingSaves = 0;
  constructor(driver: SQLiteDriver) { super(driver, GENERATED_RUNTIME_MODULE.schemas); }
  async executeQuery(query: any): Promise<any[]> {
    const rows = await super.executeQuery(query);
    // Faithfully reuse an immutable provider-loaded reference, never fabricated
    // values, expected versions, SQL, trace frames or generated entity wrappers.
    for (const row of rows) if (row.platform && typeof row.platform === 'object') {
      const cacheKey = `${row.platform.id}:${row.platform.version}`;
      let snapshot = this.snapshots.get(cacheKey);
      if (!snapshot) {
        const loadedSnapshot: Readonly<Record<string, unknown>> = Object.freeze({ ...row.platform });
        this.snapshots.set(cacheKey, loadedSnapshot); snapshot = loadedSnapshot;
      }
      row.platform = snapshot;
      this.sharedSnapshots.push(snapshot);
    }
    return rows;
  }
  async executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T> {
    this.activeSaves++;
    this.maxOverlappingSaves = Math.max(this.maxOverlappingSaves, this.activeSaves);
    try { return await super.executeGraphSave(intent, work); }
    finally { this.activeSaves--; }
  }
  async executeMutation(input: any): Promise<MutationResult> {
    assert(input instanceof MutationRequest);
    const result = await super.executeMutation(input);
    this.commands.push({ entity: input.mutation.entity, id: result.id, version: input.mutation.version,
      lineage: input.traceFor({ entity: input.mutation.entity, id: result.id }) });
    return result;
  }
}

async function main() {
  const driver = new SQLiteDriver(database);
  const client = new Client(driver).install(GENERATED_RUNTIME_MODULE).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client);
  const sql = new SQLExecutionEvidenceStore();
  const audit: Readonly<Record<string, unknown>>[] = [];
  client.setRuntimeTelemetrySink(sql).setAuditSink(event => { audit.push(event); });
  const reset = () => { client.commands.length = 0; audit.length = 0; sql.enableAll(); };
  const observe = (scenario: string) => console.log(JSON.stringify({ scenario,
    commands: client.commands, sql: sql.snapshot(), committedAudit: audit }));
  const create = async (suffix: string, twoItems = false) => {
    const order = Q.customerOrders().comment('initialize ownership fixture').purpose('test graph ownership').newEntity(context)
      .updatePlatform('1').updateOrderNumber(`${nonce}-${suffix}`).updateDescription(`before-${suffix}`);
    for (let index = 0; index < (twoItems ? 2 : 1); index++) {
      order.orderItemList().push(Q.orderItems().comment('initialize ownership item').purpose('test graph ownership').newEntity(context)
        .updateName(`${nonce}-${suffix}-item-${index}`));
    }
    await order.auditAs('create ownership fixture').save(context);
    return order;
  };
  const load = async (id: string) => {
    const rows = await Q.customerOrders().withIdIs(id)
      .selectPlatformWith(Q.platforms().limit(1))
      .selectOrderItemListWith(Q.orderItems().limit(10))
      .limit(1).comment('load ownership graph').purpose('test generated graph isolation').executeForList(context);
    assert.equal(rows.length, 1);
    return rows[0];
  };
  const scenario = process.env.TEAQL_TRACE_CHAIN_SCENARIO;
  const checks: string[] = [];
  try {
    await context.ensureSchema(); await context.ensureSchema();
    if (!scenario || scenario === 'shared') {
      const a = await create('shared-a'), b = await create('shared-b');
      await b.updateDescription('give b a distinct optimistic version').auditAs('prepare distinct version').save(context);
      const first = await load(a.id!), second = await load(b.id!);
      const platformA = E.customerOrder(first).platform().eval()!, platformB = E.customerOrder(second).platform().eval()!;
      assert.equal(client.sharedSnapshots[0], client.sharedSnapshots[1], 'provider reference is genuinely shared');
      assert(Object.isFrozen(client.sharedSnapshots[0]));
      assert.notEqual(platformA, platformB, 'typed wrappers do not share mutation ownership');
      assert.notEqual(ledger(first), ledger(second));
      assert.notEqual(ledger(platformA), ledger(first));
      assert.notEqual(ledger(platformB), ledger(second));
      const platformRootA = ledger(platformA), platformRootB = ledger(platformB);
      const itemA = first.orderItemList()[0], itemB = second.orderItemList()[0];
      const itemVersions = [E.orderItem(itemA).version().eval(), E.orderItem(itemB).version().eval()];
      const rootVersions = [E.customerOrder(first).version().eval()!, E.customerOrder(second).version().eval()!];
      assert.notEqual(rootVersions[0], rootVersions[1]);
      first.updateDescription('own first change'); second.updateDescription('own second change');
      reset(); client.maxOverlappingSaves = 0;
      await Promise.all([first.auditAs('first independent ownership request').save(context),
        second.auditAs('second independent ownership request').save(context)]);
      assert.equal(client.maxOverlappingSaves, 2, 'actual public saves overlap; transactions remain queued');
      assert.deepEqual(client.commands.map(command => [command.entity, command.id, command.version]),
        [['CustomerOrder', first.id, rootVersions[0]], ['CustomerOrder', second.id, rootVersions[1]]]);
      assert.deepEqual([E.orderItem(itemA).version().eval(), E.orderItem(itemB).version().eval()], itemVersions);
      assert.equal(ledger(platformA), platformRootA); assert.equal(ledger(platformB), platformRootB);
      assert.equal(platformRootA.snapshot().length, 0); assert.equal(platformRootB.snapshot().length, 0);
      const expected = [
        [['auditReason', 'CustomerOrder', first.id, 'first independent ownership request']],
        [['auditReason', 'CustomerOrder', second.id, 'second independent ownership request']],
      ];
      assert.deepEqual(client.commands.map(command => plain(command.lineage)), expected);
      assert.deepEqual(audit.map(event => plain(event.mutationLineage)), expected);
      assert.deepEqual(sql.snapshot().filter(entry => entry.operation === 'update').map(entry => plain(entry.mutationLineage)), expected);
      assert(sql.snapshot().filter(entry => entry.operation === 'update').every(entry => entry.affectedRows === 1));
      observe('shared');
      assert(!sql.snapshot().some(entry => entry.operation === 'update'
        && entry.tracePath.some(node => node.kind === 'entity' && node.name === 'Platform')));
      const reread = await load(first.id!);
      assert.equal(E.customerOrder(reread).description().eval(), 'own first change');
      assert.equal(E.orderItem(reread.orderItemList()[0]).version().eval(), itemVersions[0]);
      checks.push('shared');
      console.log(`SHARED READONLY PASSED: overlapping_saves=2 root_versions=${rootVersions.join(',')} mutations=2 audits=2 unchanged_children=true`);
    }
    if (!scenario || scenario === 'scoped') {
      const original = await create('scoped', true);
      const receiver = await load(original.id!), source = await load(original.id!);
      const sourceRoot = ledger(source);
      source.updateDescription('FOREIGN ROOT MUST REMAIN PENDING');
      const reached = source.orderItemList()[0], unrelated = source.orderItemList()[1];
      reached.updateName('reached child change').auditAs('edit selected item');
      unrelated.updateName('UNREACHED CHILD MUST REMAIN PENDING');
      receiver.orderItemList().splice(0, receiver.orderItemList().length, reached);
      receiver.updateDescription('receiver own change');
      reset();
      await receiver.auditAs('save scoped graph').save(context);
      assert.equal(client.commands.length, 2);
      assert.deepEqual(client.commands.map(command => command.entity), ['CustomerOrder', 'OrderItem']);
      assert.equal(ledger(receiver).change(key('OrderItem', unrelated.id)).name, undefined, 'do not import an unreachable key');
      assert.equal(sourceRoot.change(key('CustomerOrder', source.id)).description, 'FOREIGN ROOT MUST REMAIN PENDING');
      assert.equal(sourceRoot.change(key('OrderItem', unrelated.id)).name, 'UNREACHED CHILD MUST REMAIN PENDING');
      assert.equal(sourceRoot.change(key('OrderItem', reached.id)).name, 'reached child change', 'import does not clear source');
      const expected = [[['auditReason', 'CustomerOrder', receiver.id, 'save scoped graph']],
        [['auditReason', 'CustomerOrder', receiver.id, 'save scoped graph'], ['auditReason', 'OrderItem', reached.id, 'edit selected item']]];
      assert.deepEqual(client.commands.map(command => plain(command.lineage)), expected);
      assert.deepEqual(audit.map(event => plain(event.mutationLineage)), expected);
      const reread = await load(receiver.id!);
      observe('scoped');
      assert.equal(E.customerOrder(reread).description().eval(), 'receiver own change');
      const byId = new Map(reread.orderItemList().map(item => [item.id, item]));
      assert.equal(E.orderItem(byId.get(reached.id)!).name().eval(), 'reached child change');
      assert.notEqual(E.orderItem(byId.get(unrelated.id)!).name().eval(), 'UNREACHED CHILD MUST REMAIN PENDING');
      checks.push('scoped');
      console.log('SCOPED IMPORT PASSED: mutations=2 audits=2 foreign_root_retained=true unreachable_child_retained=true');
    }
    if (!scenario || scenario === 'descendant') {
      const created = await create('descendant'), loaded = await load(created.id!);
      const version = E.customerOrder(loaded).version().eval();
      loaded.orderItemList()[0].updateName('only the child changed').auditAs('edit child under clean parent');
      reset();
      await loaded.auditAs('save descendant change').save(context);
      assert.deepEqual(client.commands.map(command => command.entity), ['OrderItem']);
      assert.equal(E.customerOrder(loaded).version().eval(), version);
      assert.deepEqual(plain(audit[0].mutationLineage), [
        ['auditReason', 'CustomerOrder', loaded.id, 'save descendant change'],
        ['auditReason', 'OrderItem', loaded.orderItemList()[0].id, 'edit child under clean parent'],
      ]);
      const reread = await load(loaded.id!);
      assert.equal(E.orderItem(reread.orderItemList()[0]).name().eval(), 'only the child changed');
      assert.equal(E.customerOrder(reread).version().eval(), version);
      checks.push('descendant');
      observe('descendant');
      console.log('CLEAN ANCESTOR PASSED: mutations=1 audits=1 parent_version_unchanged=true lineage_inherited=true');
    }
    if (!scenario || scenario === 'conflict') {
      const created = await create('conflict');
      const old = await load(created.id!);
      const newer = await load(created.id!);
      await newer.orderItemList()[0].updateName('committed newer version').auditAs('advance selected item').save(context);
      const fresh = await load(created.id!);
      const conflicting = fresh.orderItemList()[0].updateName('uncommitted conflicting version');
      const pendingSource = ledger(conflicting);
      old.orderItemList().push(conflicting);
      old.updateDescription('pending receiver must survive conflict');
      reset();
      await assert.rejects(old.auditAs('reject mixed versions').save(context), /ENTITY_VERSION_CONFLICT/);
      assert.equal(client.commands.length, 0); assert.equal(audit.length, 0);
      assert.equal(sql.snapshot().filter(entry => ['insert', 'update', 'delete'].includes(entry.operation)).length, 0);
      assert.equal(ledger(old).change(key('CustomerOrder', old.id)).description, 'pending receiver must survive conflict');
      assert.equal(pendingSource.change(key('OrderItem', conflicting.id)).name, 'uncommitted conflicting version');
      checks.push('conflict');
      observe('conflict');
      console.log('MIXED VERSION REJECTED: mutations=0 audits=0 receiver_pending=true source_pending=true');
    }
  } finally { await client.close(); }
  assert.equal(manifest('lib'), before, 'acceptance must not edit generated source');
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/shared-reference-library.sha256', before);
  console.log(JSON.stringify({ database, nonce, checks, generatedSourceUnchanged: true }));
  console.log(`PASS TypeScript shared-reference example: ${checks.length} checks`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
