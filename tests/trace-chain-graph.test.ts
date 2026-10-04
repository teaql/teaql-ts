import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, EntitySchema, MutationResult, SQLExecutionEvidenceStore, SQLExecutionMetadata } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { GraphCommittedError, GraphMutationSession, MutationIntent, MutationRequest } from '../src/core/request-intent';
import { EntityRoot } from '../src/core/entity-root';
import { MutationTraceScope, TraceNode } from '../src/core/trace-chain';
import { RuntimeModule } from '../src/core/runtime-module';
import { LoadedScalarSnapshot } from '../src/core/loaded-scalar-snapshot';
import { projectSQLLog, PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK } from '../src/core/log-privacy';

it('preflights sibling loaded values before any write, without changing the payload', async () => {
  const f = await fixture();
  const oldValue = 'PRIVATE-OLD-PAYMENT', newValue = 'PRIVATE-NEW-PAYMENT';
  const evidence = new SQLExecutionEvidenceStore();
  try {
    await f.client.executeMutation({ entity: 'Payment', id: '11', action: 'Create',
      payload: { name: oldValue }, comment: 'seed prior payment' });
    f.client.setRuntimeTelemetrySink(evidence);
    const root = { entity: 'Order', action: 'Create', payload: { name: 'root fixture' } };
    const child = { entity: 'Payment', id: '11', version: 1, action: 'Update', payload: { name: newValue } };
    const snapshot = new LoadedScalarSnapshot({ name: oldValue });
    f.client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
    await f.client.executeGraphSave(new MutationIntent(`replace ${oldValue} with ${newValue}`), async graph => {
      f.client.preflightMutation(graph.request(root));
      f.client.preflightMutation(graph.request(child).withLoadedSnapshot(snapshot));
      const request = graph.request(root);
      const saved = await f.client.executeMutation(request);
      expect(JSON.stringify(projectSQLLog(saved.metadata!))).not.toContain(oldValue);
      const previous = process.env[PLAINTEXT_LOG_ENV];
      try {
        process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
        const debug = projectSQLLog(saved.metadata!);
        expect(debug.auditReason).toContain(oldValue);
        delete process.env[PLAINTEXT_LOG_ENV];
        expect(JSON.stringify(projectSQLLog(debug))).not.toContain(oldValue);
        expect(JSON.stringify(projectSQLLog(saved.metadata!))).not.toContain(newValue);
      } finally {
        if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
        else process.env[PLAINTEXT_LOG_ENV] = previous;
      }
      await f.client.executeMutation(graph.request(child, request.scopeFor({ entity: 'Order', id: saved.id }))
        .withLoadedSnapshot(snapshot));
    });
    expect(evidence.snapshot()).toHaveLength(4);
    expect(JSON.stringify(evidence.snapshot())).not.toContain(oldValue);
    expect(JSON.stringify(evidence.snapshot())).not.toContain(newValue);
    expect(JSON.stringify(f.client.auditTrace)).not.toContain(oldValue);
    expect(child.payload).toEqual({ name: newValue });
    expect((await f.driver.query('SELECT name FROM payment_data WHERE id = ?', ['11'])).rows[0].name).toBe(newValue);
  } finally { await f.client.close(); }
});

const schemas: Record<string, EntitySchema> = { Order: {
  table: 'order_data', auditMaskFields: ['name'], columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
    name: { columnName: 'name', logicalType: 'text', decode: 'string', logPolicy: 'plain' },
  },
} };
for (const name of ['OrderItem', 'Payment', 'PaymentAttempt', 'Shipment']) schemas[name] = {
  ...schemas.Order, table: `${name.toLowerCase()}_data`,
};
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: SQLiteDriver) { super(driver, schemas); }
}

it('installs frozen generated module metadata without mutating its registration map', async () => {
  const driver = new SQLiteDriver(':memory:');
  const module = new RuntimeModule(schemas);
  class FrozenClient extends AbstractSQLTeaQLClient {
    constructor() { super(driver, module.schemas); }
  }
  const client = new FrozenClient().setDiagnosticSQLLogSink(undefined);
  try {
    expect(Object.isFrozen(module.schemas)).toBe(true);
    expect(() => client.install(module)).not.toThrow();
    await new UserContext().insertResource('dataService', client).ensureSchema();
    expect(Object.isFrozen(module.schemas)).toBe(true);
  } finally { await client.close(); }
});
async function fixture() {
  const driver = new SQLiteDriver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  return { driver, client };
}

it('emits no committed audit while the graph is still running or after rollback', async () => {
  const f = await fixture();
  const observed: unknown[] = [];
  f.client.setAuditSink(event => { observed.push(event); });
  const failure = new Error('later graph failure');
  try {
    await expect(f.client.executeGraphSave(new MutationIntent('submit order'), async graph => {
      await f.client.executeMutation(graph.request({ entity: 'Order', action: 'Create', payload: { name: 'first' } }));
      expect(observed).toHaveLength(0);
      expect(f.client.auditTrace).toHaveLength(0);
      throw failure;
    })).rejects.toBe(failure);
    expect(observed).toHaveLength(0);
    expect(f.client.auditTrace).toHaveLength(0);
    expect((await f.driver.query('SELECT * FROM order_data')).rowCount).toBe(0);
  } finally { await f.client.close(); }
});

function reasons(nodes: readonly TraceNode[] | unknown): unknown {
  return (nodes as readonly TraceNode[]).map(node => [node.kind, node.name, node.entityId, node.detail]);
}

it('retains all six native graph lineages at request, physical SQL, and committed audit boundaries', async () => {
  const f = await fixture();
  for (const [entity, id] of [['Order', '1'], ['OrderItem', '1'], ['Payment', '1'],
    ['PaymentAttempt', '1'], ['Shipment', '1'], ['OrderItem', '2']]) {
    await f.client.executeMutation({ entity, id, action: 'Create', payload: { name: `${entity}-fixture-${id}` }, comment: 'prepare fixture' });
  }
  const commands: Array<readonly TraceNode[]> = [];
  const sql = new SQLExecutionEvidenceStore();
  const audit: Readonly<Record<string, unknown>>[] = [];
  f.client.setRuntimeTelemetrySink(sql).setAuditSink(event => { audit.push(event); });
  try {
    await f.client.executeGraphSave(new MutationIntent('submit order'), async graph => {
      for (const [entity, id] of [['Order', '1'], ['OrderItem', '1'], ['Payment', '1'],
        ['PaymentAttempt', '1'], ['Shipment', '1'], ['OrderItem', '2']]) {
        f.client.preflightMutation(graph.request({ entity, id, version: 1,
          action: entity === 'OrderItem' && id === '2' ? 'Delete' : 'Update',
          payload: { name: `${entity}-changed-${id}` } }));
      }
      const apply = async (entity: string, id: string, parent?: MutationTraceScope,
        local?: string, action = 'Update') => {
        const request = graph.request({ entity, id, action, version: 1,
          payload: { name: `${entity}-changed-${id}` } }, parent, local);
        await f.client.executeMutation(request);
        commands.push(request.traceFor({ entity, id }));
        return request.scopeFor({ entity, id });
      };
      const root = await apply('Order', '1');
      await apply('OrderItem', '1', root);
      const payment = await apply('Payment', '1', root, 'authorize payment');
      await apply('PaymentAttempt', '1', payment);
      await apply('Shipment', '1', root, 'dispatch shipment');
      await apply('OrderItem', '2', root, 'remove unavailable item', 'Delete');
      expect(audit).toHaveLength(0);
    });
    const root = ['auditReason', 'Order', '1', 'submit order'];
    const expected = [[root], [root], [root, ['auditReason', 'Payment', '1', 'authorize payment']],
      [root, ['auditReason', 'Payment', '1', 'authorize payment']],
      [root, ['auditReason', 'Shipment', '1', 'dispatch shipment']],
      [root, ['auditReason', 'OrderItem', '2', 'remove unavailable item']]];
    expect(commands.map(reasons)).toEqual(expected);
    expect(sql.snapshot().map(entry => reasons(entry.mutationLineage))).toEqual(expected.flatMap(lineage => [lineage, lineage]));
    expect(audit.map(event => reasons(event.mutationLineage))).toEqual(expected);
    expect(sql.snapshot().map(entry => entry.auditReason)).toEqual(Array(12).fill('submit order'));
    expect(sql.snapshot().every(entry => entry.tracePath[0].name === 'Order')).toBe(true);
    expect(sql.snapshot().map(entry => entry.operation)).toEqual(['update', 'update', 'update', 'update', 'update', 'delete'].flatMap(op => [op, 'select']));
    expect(sql.snapshot().filter(entry => entry.operation === 'select').every(entry => entry.resultCount === 1
      && entry.tracePath.map(node => node.kind).join('/') === 'operation/request/provider/sql')).toBe(true);
    expect(audit.every(event => Object.isFrozen(event.mutationLineage))).toBe(true);
  } finally { await f.client.close(); }
});

it('materializes database-assigned IDs and preserves independent concurrent graphs on one Context', async () => {
  const f = await fixture();
  const sql = new SQLExecutionEvidenceStore();
  f.client.setRuntimeTelemetrySink(sql);
  const create = (reason: string) => f.client.executeGraphSave(new MutationIntent(reason), async graph => {
    const rootRequest = graph.request({ entity: 'Order', action: 'Create', payload: { name: `fixture-${reason}` } });
    const root = await f.client.executeMutation(rootRequest);
    const parent = rootRequest.scopeFor({ entity: 'Order', id: root.id });
    const childRequest = graph.request({ entity: 'Payment', action: 'Create', payload: { name: 'payment-fixture' } }, parent, 'authorize payment');
    return f.client.executeMutation(childRequest);
  });
  try {
    const results = await Promise.all([create('first operation'), create('second operation')]);
    const audit = f.client.auditTrace;
    expect(audit).toHaveLength(4);
    for (const [index, reason] of ['first operation', 'second operation'].entries()) {
      expect(results[index].metadata?.auditReason).toBe(reason);
      expect(results[index].metadata?.statements?.map(entry => entry.operation)).toEqual(['insert', 'select']);
      const entries = sql.snapshot().filter(entry => entry.auditReason === reason);
      expect(entries).toHaveLength(4);
      expect(entries.map(entry => entry.operation)).toEqual(['insert', 'select', 'insert', 'select']);
      expect(reasons(entries[3].mutationLineage)).toEqual([
        ['auditReason', 'Order', String(index + 1), reason],
        ['auditReason', 'Payment', String(index + 1), 'authorize payment'],
      ]);
      expect(reasons(entries[2].mutationLineage)).toEqual(reasons(entries[3].mutationLineage));
      expect(reasons(audit[index * 2 + 1].mutationLineage)).toEqual(reasons(entries[3].mutationLineage));
      expect(results[index].metadata?.statements?.[1].mutationLineage).toEqual(entries[3].mutationLineage);
    }
  } finally { await f.client.close(); }
});

it('uses a complete per-type ledger override without changing sibling fallback', async () => {
  const f = await fixture();
  const ledger = new EntityRoot();
  const key = { entity: 'Payment', id: -1 };
  const override: TraceNode[] = [{ kind: 'auditReason', name: 'Order', entityId: '100', detail: 'submit order' },
    { kind: 'auditReason', name: 'Payment', entityId: '1', detail: 'review payment exception' }];
  ledger.setTraceChain(key, override);
  override[1] = { ...override[1], detail: 'MUTATED-CALLER-SOURCE' };
  try {
    await f.client.executeGraphSave(new MutationIntent('submit order'), async graph => {
      const request = graph.request({ entity: 'Payment', action: 'Create', payload: { name: 'payment-fixture' }, ledgerRoot: ledger, ledgerKey: key });
      await f.client.executeMutation(request);
      await f.client.executeMutation(graph.request({ entity: 'Order', action: 'Create', payload: { name: 'order-fixture' } }));
    });
    expect(reasons(f.client.auditTrace[0].mutationLineage)).toEqual([
      ['auditReason', 'Order', '100', 'submit order'],
      ['auditReason', 'Payment', '1', 'review payment exception'],
    ]);
    expect(reasons(f.client.auditTrace[1].mutationLineage)).toEqual([['auditReason', 'Order', '1', 'submit order']]);
    ledger.rekey(key, { entity: 'Payment', id: '1' });
    expect(ledger.traceChain(key)).toBeUndefined();
    expect(ledger.traceChain({ entity: 'Order', id: '1' })).toBeUndefined();
    const other = new EntityRoot(); other.mergeFrom(ledger);
    expect(other.traceChain({ entity: 'Payment', id: '1' })).toEqual(ledger.traceChain({ entity: 'Payment', id: '1' }));
    other.clearCommitted(); expect(other.traceChain({ entity: 'Payment', id: '1' })).toBeUndefined();
  } finally { await f.client.close(); }
});

it.each([false, true].flatMap(logging => [false, true].map(empty => ({ logging, empty }))))(
  'retains native ledger override or empty fallback at every emitted boundary: %j', async ({ logging, empty }) => {
    const f = await fixture();
    const targets = [['Order', '100'], ['Payment', '1'], ['OrderItem', '1'], ['Shipment', '1']];
    for (const [entity, id] of targets) await f.client.executeMutation({
      entity, id, action: 'Create', payload: { name: `${entity}-before` }, comment: 'seed ledger fixture',
    });
    const secret = 'LEDGER-PRIVATE-PAYMENT';
    const reason = `submit using ${secret}`;
    const root: TraceNode = Object.freeze({ kind: 'auditReason', name: 'Order', entityId: '100', detail: reason });
    const leaf: TraceNode = Object.freeze({ kind: 'auditReason', name: 'Payment', entityId: '1', detail: `review ${secret}` });
    // Explicit complete native input: this is not a generated-planner writer proof.
    const callerChain: readonly TraceNode[] = Object.freeze(empty ? [] : [root, leaf]);
    const callerBefore = JSON.stringify(callerChain);
    const ledger = new EntityRoot();
    ledger.setTraceChain({ entity: 'Payment', id: '1' }, callerChain);
    ledger.setTraceChain({ entity: 'OrderItem', id: '1' }, []);
    expect(ledger.traceChain({ entity: 'Payment', id: '1' })).not.toBe(callerChain);
    expect(ledger.traceChain({ entity: 'Shipment', id: '1' })).toBeUndefined();

    const context = new UserContext();
    f.client.setUserContext(context);
    const policy = jest.spyOn(context, 'enterMutationPolicy');
    const sql = new SQLExecutionEvidenceStore();
    const diagnostics: SQLExecutionMetadata[] = [];
    const audits: Readonly<Record<string, unknown>>[] = [];
    let inTransaction = false, commits = 0;
    const transaction = f.driver.transaction.bind(f.driver);
    jest.spyOn(f.driver, 'transaction').mockImplementation(async work => {
      inTransaction = true;
      try { const result = await transaction(work); commits++; return result; }
      finally { inTransaction = false; }
    });
    f.client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging)
      .setRuntimeTelemetrySink(sql).setDiagnosticSQLLogSink({ write: entry => diagnostics.push(entry) })
      .setAuditSink(event => {
        expect(inTransaction).toBe(false);
        expect(commits).toBe(audits.length < 4 ? 1 : 2);
        audits.push(event);
      });
    const query = f.driver.query.bind(f.driver);
    const physical = jest.spyOn(f.driver, 'query');
    const commands: Array<{ entity: string; id: string; comment: string;
      payload: unknown; lineage: readonly TraceNode[] }> = [];
    const execute = f.client.executeMutation.bind(f.client);
    jest.spyOn(f.client, 'executeMutation').mockImplementation(async request => {
      expect(request).toBeInstanceOf(MutationRequest);
      const mutation = request.mutation;
      commands.push({ entity: mutation.entity, id: mutation.id, comment: request.comment,
        payload: { ...mutation.payload }, lineage: request.traceFor({ entity: mutation.entity, id: mutation.id }) });
      return execute(request);
    });
    const results: MutationResult[] = [];
    const names = ['root-after', secret, 'item-after', 'shipment-after'];
    const payloads = names.map(name => Object.freeze({ name }));
    try {
      await f.client.executeGraphSave(new MutationIntent(reason), async graph => {
        const mutations = targets.map(([entity, id], index) => ({ entity, id, version: 1,
          action: 'Update', payload: payloads[index], ledgerRoot: ledger, ledgerKey: { entity, id } }));
        const rootRequest = graph.request(mutations[0]);
        const parent = rootRequest.scopeFor({ entity: 'Order', id: '100' });
        const requests = [rootRequest, graph.request(mutations[1], parent),
          graph.request(mutations[2], parent), graph.request(mutations[3], parent)];
        // Capture the future Payment's marked value before the first root SQL.
        for (const request of requests) f.client.preflightMutation(request);
        for (const request of requests) {
          results.push(await f.client.executeMutation(request));
          expect(audits).toHaveLength(0);
        }
        expect(graph.intent.comment).toBe(reason);
      });

      const expected = [[root], empty ? [root] : [root, leaf], [root], [root]];
      const safe = expected.map(nodes => nodes.map(node => ({ ...node,
        detail: node.detail!.replace(secret, '[REDACTED]') })));
      expect(commands).toHaveLength(4);
      expect(commands.map(command => [command.entity, command.id])).toEqual(targets);
      expect(commands.map(command => reasons(command.lineage))).toEqual(expected.map(reasons));
      expect(commands.map(command => command.comment)).toEqual(Array(4).fill(reason));
      expect(commands.map(command => command.payload)).toEqual(payloads);
      expect(policy.mock.calls.map(([input]) => {
        const mutation = input as { entity: string; id: string; comment: string; payload: unknown };
        return [mutation.entity, mutation.id, mutation.comment, mutation.payload];
      }))
        .toEqual(targets.map(([entity, id], index) => [entity, id, reason, payloads[index]]));
      expect(commits).toBe(1);
      expect(physical).toHaveBeenCalledTimes(8);
      const raw = results.flatMap(result => [...result.metadata!.statements!]);
      expect(raw.map(entry => [entry.parameterizedSQL, [...entry.parameters]]))
        .toEqual(physical.mock.calls.map(([statement, values]) => [statement, values]));
      expect(raw.map(entry => entry.parameters)).toEqual(targets.flatMap(([, id], index) => [[names[index], id, 1], [id]]));
      expect(raw.map(entry => reasons(entry.mutationLineage))).toEqual(expected.flatMap(nodes => [reasons(nodes), reasons(nodes)]));
      expect(raw.map(entry => entry.auditReason)).toEqual(Array(8).fill(reason));
      expect(raw.map(entry => entry.operation)).toEqual(Array(4).fill(['update', 'select']).flat());
      expect(raw.every(entry => entry.executionOutcome === 'success')).toBe(true);
      for (const [index, result] of results.entries()) {
        expect(result).toMatchObject({ success: true, id: targets[index][1], version: 2,
          persistedRecord: { id: targets[index][1], version: 2, name: names[index] } });
        expect(result.metadata!.statements![0].affectedRows).toBe(1);
        expect(result.metadata!.statements![1].resultCount).toBe(1);
        expect(result.metadata!.statements![0].tracePath.map(node => [node.kind, node.name]))
          .toEqual([['operation', 'Order'], ['entity', targets[index][0]], ['provider', 'sqlite'], ['sql', 'update']]);
        expect(result.metadata!.statements![1].tracePath.map(node => [node.kind, node.name]))
          .toEqual([['operation', 'Order'], ['request', 'Order'], ['provider', 'sqlite'], ['sql', 'select']]);
      }
      expect(sql.snapshot()).toHaveLength(8);
      expect(diagnostics).toHaveLength(logging ? 8 : 0);
      expect(diagnostics).toEqual(logging ? sql.snapshot() : []);
      expect(audits.map(event => [event.entity, event.id, event.version])).toEqual(targets.map(([entity, id]) => [entity, id, 2]));
      expect(audits.map(event => reasons(event.mutationLineage))).toEqual(safe.map(reasons));
      expect(audits.map(event => event.reason)).toEqual(Array(4).fill('submit using [REDACTED]'));
      expect(sql.snapshot().map(entry => reasons(entry.mutationLineage))).toEqual(safe.flatMap(nodes => [reasons(nodes), reasons(nodes)]));
      expect(sql.snapshot().map(entry => entry.auditReason)).toEqual(Array(8).fill('submit using [REDACTED]'));
      for (const entry of [...sql.snapshot(), ...diagnostics]) {
        expect(JSON.stringify(entry)).not.toContain(secret);
      }
      expect(JSON.stringify(audits)).not.toContain(secret);
      expect(audits.every(event => Object.isFrozen(event) && Object.isFrozen(event.mutationLineage))).toBe(true);
      expect(JSON.stringify(callerChain)).toBe(callerBefore);
      expect(ledger.traceChain({ entity: 'Payment', id: '1' })).toEqual(callerChain);
      expect(payloads).toEqual(names.map(name => ({ name })));
      for (const [index, [entity, id]] of targets.entries()) {
        expect((await query(`SELECT name, version FROM ${schemas[entity].table} WHERE id = ?`, [id])).rows)
          .toEqual([{ name: names[index], version: 2 }]);
      }

      // Native owners explicitly clear their ledger; raw requests do not promise generated cleanup.
      ledger.clearCommitted();
      expect(ledger.traceChain({ entity: 'Payment', id: '1' })).toBeUndefined();
      const nextReason = `independent mention ${secret}`;
      await f.client.executeGraphSave(new MutationIntent(nextReason), async graph => {
        const request = graph.request({ entity: 'Payment', id: '1', version: 2, action: 'Update',
          payload: { name: 'following-value' }, ledgerRoot: ledger, ledgerKey: { entity: 'Payment', id: '1' } });
        f.client.preflightMutation(request);
        const result = await f.client.executeMutation(request);
        expect(result.persistedRecord).toMatchObject({ id: '1', version: 3, name: 'following-value' });
      });
      expect(commits).toBe(2);
      expect(commands).toHaveLength(5);
      expect(physical).toHaveBeenCalledTimes(10);
      expect(sql.snapshot()).toHaveLength(10);
      expect(diagnostics).toHaveLength(logging ? 10 : 0);
      expect(audits).toHaveLength(5);
      const next = [['auditReason', 'Payment', '1', nextReason]];
      expect(reasons(commands[4].lineage)).toEqual(next);
      expect(reasons(audits[4].mutationLineage)).toEqual(next);
      expect(audits[4].reason).toBe(nextReason);
      expect(sql.snapshot().slice(8).map(entry => reasons(entry.mutationLineage))).toEqual([next, next]);
      expect(sql.snapshot().slice(8).map(entry => entry.auditReason)).toEqual([nextReason, nextReason]);
      expect(JSON.stringify(callerChain)).toBe(callerBefore);
    } finally { await f.client.close(); }
  });

it('rejects missing root intent before opening a transaction even when logging is disabled', async () => {
  const f = await fixture();
  const transaction = jest.spyOn(f.driver, 'transaction');
  f.client.setMutationLoggingEnabled(false).setQueryLoggingEnabled(false);
  try {
    await expect(f.client.executeGraphSave(undefined as any, async () => { throw new Error('should not run'); }))
      .rejects.toMatchObject({ code: 'REQUEST_COMMENT_REQUIRED', field: 'comment' });
    expect(transaction).not.toHaveBeenCalled();
    expect(f.client.auditTrace).toHaveLength(0);
  } finally { await f.client.close(); }
});

it('cannot silently join an unrelated active transaction or reuse an expired graph capability', async () => {
  const f = await fixture();
  let expired!: GraphMutationSession;
  const mutation = { entity: 'Order', action: 'Create', payload: { name: 'order-fixture' }, comment: 'unrelated operation' };
  try {
    await f.client.executeGraphSave(new MutationIntent('submit order'), async graph => {
      expired = graph;
      await expect(f.client.executeMutation(mutation)).rejects.toThrow('GRAPH_MUTATION_SESSION_REQUIRED');
      await f.client.executeMutation(graph.request(mutation));
    });
    await expect(f.client.executeMutation(expired.request(mutation))).rejects.toThrow('GRAPH_MUTATION_SESSION_REQUIRED');
    expect((await f.driver.query('SELECT * FROM order_data')).rowCount).toBe(1);
  } finally { await f.client.close(); }
});

it('publishes later committed events and runs cleanup after one audit sink fails', async () => {
  const f = await fixture();
  const calls: string[] = [];
  let count = 0;
  f.client.setAuditSink(() => { calls.push('audit'); if (++count === 1) throw new Error('audit sink failed'); });
  try {
    await expect(f.client.executeGraphSave(new MutationIntent('submit order'), async graph => {
      for (const name of ['first-fixture', 'second-fixture'])
        await f.client.executeMutation(graph.request({ entity: 'Order', action: 'Create', payload: { name } }));
      f.client.afterGraphRollback(() => { calls.push('rollback'); });
      f.client.afterGraphCommit(() => { calls.push('cleanup'); });
    })).rejects.toMatchObject({ committed: true });
    expect(calls).toEqual(['cleanup', 'audit', 'audit']);
    expect((await f.driver.query('SELECT * FROM order_data')).rowCount).toBe(2);
    expect(f.client.auditTrace).toHaveLength(2);
    await f.client.executeGraphSave(new MutationIntent('next independent operation'), async () => undefined);
  } finally { await f.client.close(); }
});

it.each([false, true])('redacts sibling-owned private values throughout graph intent and readback: failure=%s', async failReadback => {
  const f = await fixture();
  const sql = new SQLExecutionEvidenceStore();
  f.client.setRuntimeTelemetrySink(sql);
  const secret = 'SIBLING-PRIVATE-CANARY';
  const reason = `submit using ${secret}`;
  const query = f.driver.query.bind(f.driver);
  if (failReadback) jest.spyOn(f.driver, 'query').mockImplementation(async (statement, values) => {
    if (statement.startsWith('SELECT') && statement.includes('payment_data') && statement.includes('WHERE "id" = ?'))
      throw new Error('injected readback failure');
    return query(statement, values);
  });
  try {
    const operation = f.client.executeGraphSave(new MutationIntent(reason), async graph => {
      const root = { entity: 'Order', action: 'Create', payload: { name: 'root-fixture' } };
      const child = { entity: 'Payment', action: 'Create', payload: { name: secret } };
      f.client.preflightMutation(graph.request(root));
      f.client.preflightMutation(graph.request(child));
      const request = graph.request(root);
      const saved = await f.client.executeMutation(request);
      await f.client.executeMutation(graph.request(child, request.scopeFor({ entity: 'Order', id: saved.id }), 'authorize payment'));
      expect(graph.intent.comment).toBe(reason);
    });
    if (failReadback) await expect(operation).rejects.toThrow('injected readback failure');
    else await operation;
    expect(JSON.stringify(sql.snapshot())).not.toContain(secret);
    expect(JSON.stringify(f.client.auditTrace)).not.toContain(secret);
    expect(sql.snapshot().every(entry => entry.auditReason === 'submit using [REDACTED]')).toBe(true);
    if (failReadback) expect(f.client.auditTrace).toHaveLength(0);
    else expect((await query('SELECT name FROM payment_data')).rows[0].name).toBe(secret);
    await f.client.executeMutation({ entity: 'Order', action: 'Create', payload: { name: 'next-fixture' }, comment: reason });
    expect(sql.snapshot()[sql.snapshot().length - 1].auditReason).toBe(reason);
  } finally { await f.client.close(); }
});

it('does not invoke rollback callbacks when a commit callback fails after database commit', async () => {
  const f = await fixture();
  const calls: string[] = [];
  try {
    await expect(f.client.executeGraphSave(new MutationIntent('submit order'), async graph => {
      await f.client.executeMutation(graph.request({ entity: 'Order', action: 'Create', payload: { name: 'committed' } }));
      f.client.afterGraphRollback(() => { calls.push('rollback'); });
      f.client.afterGraphCommit(() => { calls.push('broken'); throw new Error('commit callback failed'); });
      f.client.afterGraphCommit(() => { calls.push('cleanup'); });
    })).rejects.toBeInstanceOf(GraphCommittedError);
    expect((await f.driver.query('SELECT * FROM order_data')).rowCount).toBe(1);
    expect(calls).toEqual(['broken', 'cleanup']);
  } finally { await f.client.close(); }
});
