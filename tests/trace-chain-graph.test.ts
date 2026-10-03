import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { GraphCommittedError, GraphMutationSession, MutationIntent } from '../src/core/request-intent';
import { EntityRoot } from '../src/core/entity-root';
import { MutationTraceScope, TraceNode } from '../src/core/trace-chain';
import { RuntimeModule } from '../src/core/runtime-module';

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
