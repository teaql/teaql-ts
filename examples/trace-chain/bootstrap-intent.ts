import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MutationRequest, QueryRequest, UserContext } from 'teaql-ts';
import { AbstractSQLTeaQLClient, MutationResult, SQLExecutionEvidenceStore,
  SQLExecutionMetadata, SqlSession } from 'teaql-ts/sql/core';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { Q } from './lib/src/generated/Q';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

// Mechanical fingerprints, not generated-source API discovery.
function fingerprint(directory: string, prefix = ''): string {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => entry.isDirectory() ? fingerprint(join(directory, entry.name), `${prefix}${entry.name}/`)
      : `${createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex')} ${prefix}${entry.name}\n`).join('');
}
const before = fingerprint('lib');
const base = resolve(process.env.TEAQL_TRACE_CHAIN_BOOTSTRAP_DB ?? '.local/bootstrap-intent.sqlite');
mkdirSync(join(base, '..'), { recursive: true });

class Driver extends SQLiteDriver {
  active = false;
  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    this.active = true;
    try { return await super.transaction(work); }
    finally { this.active = false; }
  }
}
class Client extends AbstractSQLTeaQLClient {
  readonly lookups: Array<{ comment: string; purpose: string; rows: number }> = [];
  readonly commands: Array<{ request: MutationRequest; result: MutationResult }> = [];
  constructor(driver: Driver) { super(driver, GENERATED_RUNTIME_MODULE.schemas); }
  async executeQuery<T = any>(query: any): Promise<T[]> {
    const request = query instanceof QueryRequest ? query : new QueryRequest(query);
    const rows = await super.executeQuery<T>(query);
    this.lookups.push({ comment: request.comment, purpose: request.purpose, rows: rows.length });
    return rows;
  }
  async executeMutation(request: any): Promise<MutationResult> {
    assert(request instanceof MutationRequest, 'generated bootstrap owns a validated mutation request');
    const result = await super.executeMutation(request);
    this.commands.push({ request, result });
    return result;
  }
}
function route(entry: SQLExecutionMetadata, mutation: boolean): void {
  assert.equal(entry.executionOutcome, 'success');
  assert.deepEqual(entry.tracePath.map(node => node.kind),
    ['operation', mutation ? 'entity' : 'request', 'provider', 'sql']);
  assert.equal(entry.tracePath[0].name, 'Platform');
  assert.equal(entry.tracePath[2].name, 'sqlite');
  assert.equal(entry.tracePath[3].name, entry.operation);
}
async function run(logging: boolean): Promise<void> {
  const database = `${base}.${logging ? 'on' : 'off'}`;
  const driver = new Driver(database);
  const client = new Client(driver).install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client)
    .insertResource('bootstrapActor', 'caller-before-bootstrap')
    .insertResource('bootstrapCategory', 'caller-category');
  client.setUserContext(context);
  const physical = new SQLExecutionEvidenceStore();
  const diagnostics: SQLExecutionMetadata[] = [];
  const audits: Readonly<Record<string, unknown>>[] = [];
  // Install every observer BEFORE schema/startup; never replace the module's bootstrap.
  client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging)
    .setRuntimeTelemetrySink(physical)
    .setDiagnosticSQLLogSink({ write: entry => diagnostics.push(entry) })
    .setAuditSink(event => {
      assert.equal(driver.active, false, 'audit callback must run after transaction commit');
      const reader = new Database(database, { readonly: true });
      try {
        assert.deepEqual(reader.prepare('SELECT id, version, name FROM platform_data WHERE id = 1').get(),
          { id: 1, version: 1, name: 'Trace Chain Verification' }, 'independent connection sees committed bootstrap');
      } finally { reader.close(); }
      audits.push(event);
    });
  const restored = () => {
    assert.equal(context.getResource('bootstrapActor'), 'caller-before-bootstrap');
    assert.equal(context.getResource('bootstrapCategory'), 'caller-category');
    assert.equal(context.getResource('dataService'), client);
  };
  try {
    await context.ensureSchema();
    restored();
    assert.equal(client.lookups.length, 1, 'one actual generated root lookup');
    const lookup = client.lookups[0];
    assert(lookup.comment.trim() && lookup.purpose.trim(), 'runtime owns nonblank bootstrap query intent');
    const firstWrites = client.commands.length;
    assert(firstWrites === 0 || firstWrites === 1);
    assert.equal(lookup.rows, firstWrites ? 0 : 1);
    assert.equal(audits.length, firstWrites);
    const entries = physical.snapshot();
    assert.equal(entries.length, 1 + 2 * firstWrites, 'real root lookup plus optional write/readback');
    assert.equal(diagnostics.length, logging ? entries.length : 0);
    route(entries[0], false);
    assert.equal(entries[0].comment, lookup.comment);
    assert.equal(entries[0].purpose, lookup.purpose);
    assert.equal(entries[0].resultCount, lookup.rows);
    if (firstWrites) {
      const { request, result } = client.commands[0];
      assert.equal(request.mutation.entity, 'Platform');
      assert.equal(request.mutation.action, 'Create');
      assert(request.comment.trim(), 'runtime owns nonblank bootstrap mutation intent');
      assert.equal(result.id, '1'); assert.equal(result.version, 1);
      const lineage = request.traceFor({ entity: 'Platform', id: result.id });
      assert.deepEqual(lineage.map(node => [node.kind, node.name, node.entityId, node.detail]),
        [['auditReason', 'Platform', '1', request.comment]]);
      assert.equal(result.metadata?.statements?.length, 2);
      const [write, readback] = result.metadata!.statements!;
      route(write, true); route(readback, false);
      assert.equal(write.operation, 'insert'); assert.equal(write.affectedRows, 1);
      assert.equal(readback.operation, 'select'); assert.equal(readback.resultCount, 1);
      for (const raw of [write, readback]) {
        assert.equal(raw.auditReason, request.comment);
        assert.deepEqual(raw.mutationLineage, lineage);
      }
      assert.equal(readback.comment, request.comment);
      assert.equal(readback.purpose, 'verify persisted mutation result');
      const expected = request.auditProjection({ entity: 'Platform', id: result.id }, request.mutation.payload);
      assert.equal(audits[0].actor, 'teaql-generated-bootstrap');
      assert.equal(audits[0].category, 'runtime-bootstrap');
      assert.equal(audits[0].entity, 'Platform'); assert.equal(audits[0].id, '1');
      assert.equal(audits[0].reason, expected.reason);
      assert.deepEqual(audits[0].mutationLineage, expected.mutationLineage);
      for (const safe of entries.slice(1)) {
        route(safe, safe.operation === 'insert');
        assert.equal(safe.auditReason, expected.reason);
        assert.deepEqual(safe.mutationLineage, expected.mutationLineage);
      }
    }
    physical.enableAll(); diagnostics.length = 0; audits.length = 0;
    client.lookups.length = 0; client.commands.length = 0;
    await context.ensureSchema();
    restored();
    assert.equal(client.commands.length, 0); assert.equal(audits.length, 0);
    assert.deepEqual(client.lookups, [{ ...lookup, rows: 1 }], 'repeated startup owns identical query intent');
    assert.equal(client.lookups[0].comment, lookup.comment);
    assert.equal(physical.snapshot().length, 1);
    assert.equal(diagnostics.length, logging ? 1 : 0);
    route(physical.snapshot()[0], false);
    assert.equal(physical.snapshot()[0].comment, lookup.comment);
    assert.equal(physical.snapshot()[0].purpose, lookup.purpose);
    const roots = await Q.platforms().withIdIs('1').limit(1)
      .comment('read bootstrap root').purpose('verify generated bootstrap persistence').executeForList(context);
    assert.equal(roots.length, 1); assert.equal(roots[0].id, '1'); assert.equal(roots[0].version, 1);
    console.log(JSON.stringify({ case: 'TC-REQ-09', path: 'generated default bootstrap', logging,
      firstWrites, repeatWrites: 0, committedAudits: firstWrites,
      physicalStatements: entries.length, diagnostics: logging ? entries.length : 0,
      comment: lookup.comment, purpose: lookup.purpose, restoredContext: true }));
  } finally { await client.close(); }
}
async function main(): Promise<void> {
  for (const logging of [false, true]) await run(logging);
  assert.equal(fingerprint('lib'), before);
  console.log('PASS TypeScript generated bootstrap intent: logging off/on, committed audit, repeat no writes, unchanged generated library');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
