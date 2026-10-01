import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { MutationQuery } from '../src/core/ast';
import { MutationRequest, QueryRequest } from '../src/core/request-intent';
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
  return { driver, client, context, sql, stream, transaction, policy, checker };
}

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
('rejects query purpose %p before provider access', async purpose => {
  const f = await fixture();
  try {
    const query = new SelectQuery('Document').comment('load document');
    query.purposeText = purpose as any;
    await expect(f.client.executeQuery(query)).rejects.toMatchObject({
      code: 'QUERY_PURPOSE_REQUIRED', field: 'purpose', requestKind: 'query',
    });
    expect(f.sql).not.toHaveBeenCalled();
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
