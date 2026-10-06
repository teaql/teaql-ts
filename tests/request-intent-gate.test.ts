import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { MutationQuery } from '../src/core/ast';
import { MutationRequest, QueryRequest, RequestIntentError } from '../src/core/request-intent';
import { EntityRoot } from '../src/core/entity-root';
import { TraceNode } from '../src/core/trace-chain';
import { MutationPlan } from '../src/core/mutation-policy';
import { TeaQLClient } from '../src/tfp/client';
import { AbstractSQLTeaQLClient, EntitySchema } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

const schemas: Record<string, EntitySchema> = {
  Document: { table: 'document_data', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
    name: { columnName: 'name', logicalType: 'text', decode: 'native' },
  }, relations: { related: { targetEntity: 'Document', localKey: 'id', foreignKey: 'id', many: false } } },
};
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: SQLiteDriver) { super(driver, schemas); }
}

async function fixture() {
  const driver = new SQLiteDriver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client);
  await context.ensureSchema();
  const sql = jest.spyOn(driver, 'query');
  const stream = jest.spyOn(driver, 'stream');
  const transaction = jest.spyOn(driver, 'transaction');
  const policy = jest.spyOn(context, 'enterMutationPolicy');
  const checker = jest.spyOn(context, 'recordMutationPolicyPreflight');
  // SQL clients currently expose no separate Query Policy callback. Observe
  // the real compilation boundary, not a fabricated policy hook.
  const compile = jest.spyOn(client as any, 'compileQuery');
  return { driver, client, context, sql, stream, transaction, policy, checker, compile };
}

async function observedFixture(logging: boolean) {
  const f = await fixture();
  const diagnostic = jest.fn();
  const sqlTelemetry = jest.fn();
  const audit = jest.fn();
  const governance = jest.fn();
  const telemetrySuccess = jest.fn();
  const telemetryFailure = jest.fn();
  const telemetryStart = jest.fn(() => ({ success: telemetrySuccess, failure: telemetryFailure }));
  const resolvePolicy = jest.fn(() => undefined);
  const beginPolicyGraph = jest.spyOn(f.context, 'beginMutationPolicyGraph');
  const nextId = jest.spyOn(f.driver, 'nextId');
  const ensureIdFloor = jest.spyOn(f.driver, 'ensureIdFloor');
  f.context.withMutationPolicyRegistry({ resolve: resolvePolicy })
    .withMutationGovernanceSink({ onWarning: governance });
  f.client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging)
    .setDiagnosticSQLLogSink({ write: diagnostic }).setRuntimeTelemetrySink({ record: sqlTelemetry })
    .setAuditSink(audit).setRuntimeTelemetry({ start: telemetryStart });
  const expectNoExecution = () => {
    for (const observer of [f.sql, f.stream, f.transaction, f.compile, f.policy, f.checker,
      beginPolicyGraph, resolvePolicy, nextId, ensureIdFloor, diagnostic, sqlTelemetry, audit,
      governance, telemetryStart, telemetrySuccess, telemetryFailure]) {
      expect(observer).not.toHaveBeenCalled();
    }
    expect(f.client.auditTrace).toHaveLength(0);
  };
  return { ...f, diagnostic, sqlTelemetry, audit, governance, expectNoExecution };
}

async function expectCommentRequired(kind: 'query' | 'mutation', execute: () => unknown) {
  try {
    await execute();
    throw new Error('expected request intent rejection');
  } catch (error) {
    expect(error).toBeInstanceOf(RequestIntentError);
    expect(error).toMatchObject({ code: 'REQUEST_COMMENT_REQUIRED', field: 'comment', requestKind: kind });
    expect(String(error)).not.toContain('SECRET-CANARY');
  }
}

test.each([false, true])('TC-REQ-12 rejects actual trace-only request input before all execution sinks: logging=%s', async logging => {
  const f = await observedFixture(logging);
  try {
    // Caller frames are real input, not trusted runtime query provenance.
    const query = Object.assign(new SelectQuery('Document').purpose('inspect document'), {
      traceChain: [
        { kind: 'comment', name: 'Document', detail: 'SECRET-CANARY trace-only comment' },
        { kind: 'purpose', name: 'Document', detail: 'SECRET-CANARY trace-only purpose' },
      ] satisfies TraceNode[],
    });
    expect(query.commentText).toBeUndefined();
    expect(query.traceChain).toHaveLength(2);
    for (const execute of [
      () => new QueryRequest(query),
      () => f.client.executeQuery(query),
      () => f.client.executeCount(query),
      () => f.client.executeForStream(query)[Symbol.asyncIterator]().next(),
      () => f.client.executeFacetMembership(query, 'name'),
    ]) await expectCommentRequired('query', execute);

    const ledgerRoot = new EntityRoot();
    const ledgerKey = { entity: 'Document', id: '1' };
    const traceChain: TraceNode[] = [
      { kind: 'auditReason', name: 'Document', entityId: '1', detail: 'SECRET-CANARY trace-only reason' },
    ];
    ledgerRoot.setTraceChain(ledgerKey, traceChain);
    const mutation = { entity: 'Document', action: 'Create', id: '1',
      payload: { name: 'SECRET-CANARY mutation payload' }, ledgerRoot, ledgerKey, traceChain };
    expect(mutation).not.toHaveProperty('comment');
    expect(ledgerRoot.traceChain(ledgerKey)).toEqual(traceChain);
    for (const execute of [
      () => new MutationRequest(mutation),
      () => f.client.preflightMutation(mutation),
      () => f.client.executeMutation(mutation),
    ]) await expectCommentRequired('mutation', execute);
    f.expectNoExecution();
  } finally { await f.client.close(); }
});

test.each([false, true])('TC-REQ-14 rejects missing graph root comment despite annotated children: logging=%s', async logging => {
  const f = await observedFixture(logging);
  try {
    const children = ['first child reason', 'second child reason'].map((comment, index) =>
      new MutationRequest({ entity: 'Document', action: 'Create', id: String(index + 1),
        payload: { name: 'SECRET-CANARY child payload' }, comment }));
    expect(children.map(child => child.comment)).toEqual(['first child reason', 'second child reason']);
    const work = jest.fn(async graph => {
      for (const child of children) {
        const request = graph.request(child.mutation, undefined, child.comment);
        f.client.preflightMutation(request);
        await f.client.executeMutation(request);
      }
    });
    await expectCommentRequired('mutation', () => f.client.executeGraphSave(undefined as any, work));
    expect(work).not.toHaveBeenCalled();
    f.expectNoExecution();
  } finally { await f.client.close(); }
});

describe.each([false, true])('TC-REQ-13 explicit root comment with blank route tail: logging=%s', logging => {
  test.each(['entity', 'provider', 'sql'] as const)('%s tail preserves request, policy, SQL and audit reason', async kind => {
    const f = await observedFixture(logging);
    try {
      const comment = '  explicit mutation request reason  ';
      const ledgerRoot = new EntityRoot();
      const ledgerKey = { entity: 'Document', id: '1' };
      const source: TraceNode[] = [
        { kind: 'auditReason', name: 'Document', entityId: '1', detail: comment },
        { kind, name: kind === 'entity' ? 'Document' : kind === 'provider' ? 'sqlite' : 'insert', detail: '' },
      ];
      // Deliberately supplied diagnostic input tests intent ownership, not
      // whether generated graph traversal constructs these route nodes.
      ledgerRoot.setTraceChain(ledgerKey, source);
      const request = new MutationRequest({ entity: 'Document', action: 'Create', id: '1',
        payload: { name: 'stored document' }, comment, ledgerRoot, ledgerKey });
      const trace = request.traceFor(ledgerKey);
      expect(trace).toEqual(source);
      expect(trace[trace.length - 1]).toMatchObject({ kind, detail: '' });
      expect(request.comment).toBe(comment);
      expect(request.intent.readbackIntent().comment).toBe(comment);
      const identity = { policyId: 'intent-gate', version: '1', fingerprint: 'intent-gate-v1' };
      const review = jest.fn((_context: unknown, plan: MutationPlan) => {
        expect(plan.auditReason).toBe(comment);
        return { verdict: 'allow' as const };
      });
      f.context.withMutationPolicyRegistry({ resolve: () => ({ identity, review }) })
        .withMutationPolicyApprovalProvider({ findApproval: policy => ({
          policy, approvedBy: 'native-test', approvedAt: new Date(),
        }) });
      const result = await f.client.executeMutation(request);
      expect(result.persistedRecord).toMatchObject({ id: '1', name: 'stored document', version: 1 });
      expect(review).toHaveBeenCalledTimes(1);
      expect(f.policy).toHaveBeenCalledWith(expect.objectContaining({ comment }));
      expect(f.transaction).toHaveBeenCalledTimes(1);
      expect(result.metadata?.statements?.map(entry => entry.operation)).toEqual(['insert', 'select']);
      for (const statement of result.metadata!.statements!) {
        expect(statement.auditReason).toBe(comment);
        expect(statement.mutationLineage).toEqual(source);
      }
      expect(f.sqlTelemetry).toHaveBeenCalledTimes(2);
      expect(f.diagnostic).toHaveBeenCalledTimes(logging ? 2 : 0);
      for (const [entry] of [...f.sqlTelemetry.mock.calls, ...f.diagnostic.mock.calls]) {
        expect(entry.auditReason).toBe(comment);
        expect(entry.mutationLineage).toEqual(source);
      }
      expect(f.audit).toHaveBeenCalledTimes(1);
      expect(f.client.auditTrace).toHaveLength(1);
      expect(f.audit.mock.calls[0][0]).toMatchObject({ reason: comment, mutationLineage: source });
      expect(f.client.auditTrace[0]).toMatchObject({ reason: comment, mutationLineage: source });
      expect(request.comment).toBe(comment);
      expect(f.governance).not.toHaveBeenCalled();
    } finally { await f.client.close(); }
  });
});

test.each([undefined, null, '', ' \t\r\n', '\u0085', '\u00a0', '\u2003'])
('rejects query comment %p at list/count/stream/facet boundaries with logging disabled', async comment => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
    f.context.insertResource('comment', 'not a request comment');
    const query = new SelectQuery('Document').purpose('inspect document');
    query.commentText = comment as any;
    for (const execute of [
      () => f.client.executeQuery(query),
      () => f.client.executeCount(query),
      () => f.client.executeForStream(query)[Symbol.asyncIterator]().next(),
      () => f.client.executeFacetMembership(query, 'name'),
    ]) {
      await expect(execute()).rejects.toMatchObject({
        code: 'REQUEST_COMMENT_REQUIRED', field: 'comment', requestKind: 'query',
      });
    }
    expect(f.sql).not.toHaveBeenCalled();
    expect(f.stream).not.toHaveBeenCalled();
    expect(f.compile).not.toHaveBeenCalled();
  } finally { await f.client.close(); }
});

test('captured Query Request intent survives mutable builders and relation loading', async () => {
  const f = await fixture();
  try {
    await f.client.executeMutation({ entity: 'Document', action: 'Create', id: '1',
      payload: { name: 'Example' }, comment: 'seed request fixture' });
    const logs: any[] = [];
    f.client.setDiagnosticSQLLogSink({ write: entry => logs.push(entry) });
    const builder = new SelectQuery('Document').comment(' load document ').purpose('inspect graph')
      .relationQuery('related', new SelectQuery('Document').comment('not the root').purpose('not the root'));
    const request = new QueryRequest(builder);
    f.sql.mockImplementation((sql, values) => {
      builder.comment('').purpose('');
      return SQLiteDriver.prototype.query.call(f.driver, sql, values);
    });
    const rows = await f.client.executeQuery<any>(request);
    expect(rows).toHaveLength(1);
    expect(rows[0].related.name).toBe('Example');
    expect(logs).toHaveLength(2);
    for (const log of logs) {
      expect(log.comment).toBe(' load document ');
      expect(log.purpose).toBe('inspect graph');
    }
  } finally { await f.client.close(); }
});

test('captured Mutation Request comment is also the policy and audit reason, without trimming', async () => {
  const f = await fixture();
  try {
    const command = new MutationQuery('Document', 'Create', { name: 'Example' }, undefined, ' submit document ');
    const request = new MutationRequest(command);
    command.comment = '';
    await f.client.executeMutation(request);
    expect(f.policy).toHaveBeenCalledWith(expect.objectContaining({ comment: ' submit document ' }));
    expect(f.client.auditTrace[0].reason).toBe(' submit document ');
  } finally { await f.client.close(); }
});

test('TFP adapters reject missing intent before policy, headers or fetch; facets inherit root intent', async () => {
  const context = new UserContext();
  const policy = jest.spyOn(context, 'enterMutationPolicy');
  const headers = jest.fn(() => ({}));
  const fetch = jest.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }));
  const client = new TeaQLClient({ baseUrl: 'https://invalid.example', userContext: context,
    fetch: fetch as any, getHeaders: headers });
  await expect(client.executeQuery(new SelectQuery('Document').purpose('inspect')))
    .rejects.toMatchObject({ code: 'REQUEST_COMMENT_REQUIRED', field: 'comment', requestKind: 'query' });
  await expect(client.executeMutation({ entity: 'Document', action: 'Create', payload: { name: 'SECRET-CANARY' } }))
    .rejects.toMatchObject({ code: 'REQUEST_COMMENT_REQUIRED', field: 'comment', requestKind: 'mutation' });
  expect(policy).not.toHaveBeenCalled();
  expect(headers).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  const root = new SelectQuery('Document').comment('root query').purpose('inspect graph');
  root.facetBy('names', 'name', { toQuery: () => new SelectQuery('Document') });
  await client.executeQuery(root);
  const payload = JSON.parse((fetch.mock.calls[0] as any)[1].body);
  expect(payload.facets[0].query.commentText).toBe('root query');
  expect(payload.facets[0].query.purposeText).toBe('inspect graph');
});

test('direct Mutation Policy plan cannot replace a missing root reason with child data', () => {
  const context = new UserContext();
  expect(() => context.reviewMutationPlan({ executionId: '1', requestKey: 'Document.saveGraph',
    rootEntityType: 'Document', operations: [{ entity: 'Document', kind: 'create', changedValues: {} }],
  } as any)).toThrow('REQUEST_COMMENT_REQUIRED');
});

test.each([undefined, null, '', '\u0085', '\u00a0', '\u2003'])
('rejects query purpose %p at list/count/stream/facet boundaries before compilation', async purpose => {
  const f = await fixture();
  try {
    const query = new SelectQuery('Document').comment('load document');
    query.purposeText = purpose as any;
    for (const logging of [false, true]) {
      f.client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging);
      for (const execute of [
        () => f.client.executeQuery(query),
        () => f.client.executeCount(query),
        () => f.client.executeForStream(query)[Symbol.asyncIterator]().next(),
        () => f.client.executeFacetMembership(query, 'name'),
      ]) {
        await expect(execute()).rejects.toMatchObject({
          code: 'QUERY_PURPOSE_REQUIRED', field: 'purpose', requestKind: 'query',
        });
      }
    }
    expect(f.sql).not.toHaveBeenCalled();
    expect(f.stream).not.toHaveBeenCalled();
    expect(f.compile).not.toHaveBeenCalled();
  } finally { await f.client.close(); }
});

test.each([undefined, null, '', ' \t\r\n', '\u0085', '\u00a0', '\u2003', 123])
('rejects mutation comment %p before checker/policy/transaction/provider', async comment => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
    const mutation = { entity: 'Document', action: 'Create', payload: { name: 'SECRET-CANARY' }, comment };
    expect(() => f.client.preflightMutation(mutation)).toThrow();
    await expect(f.client.executeMutation(mutation)).rejects.toMatchObject({
      code: 'REQUEST_COMMENT_REQUIRED', field: 'comment', requestKind: 'mutation',
    });
    expect(f.checker).not.toHaveBeenCalled();
    expect(f.policy).not.toHaveBeenCalled();
    expect(f.transaction).not.toHaveBeenCalled();
    expect(f.sql).not.toHaveBeenCalled();
    expect(f.client.auditTrace).toHaveLength(0);
  } finally { await f.client.close(); }
});
