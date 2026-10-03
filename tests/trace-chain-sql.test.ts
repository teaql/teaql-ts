import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore, SqlQueryResult } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { executeRelationFacets } from '../src/core/facet';

const schemas: Record<string, EntitySchema> = {};
for (const [entity, relation, target] of [
  ['School', 'platform', 'Platform'], ['Platform', 'organization', 'Organization'],
  ['Organization', 'region', 'Region'], ['Region', '', ''],
]) {
  schemas[entity] = {
    table: `${entity.toLowerCase()}_data`, auditMaskFields: [],
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
      name: { columnName: 'name', logicalType: 'text', decode: 'string', logPolicy: 'plain' },
      ...(relation ? { [relation]: { columnName: relation, logicalType: 'integer' as const,
        decode: 'string' as const, logPolicy: 'plain' as const } } : {}),
    },
    relations: relation ? { [relation]: { targetEntity: target, localKey: relation,
      foreignKey: 'id', many: false } } : {},
  };
}

class Driver extends SQLiteDriver {
  readbackFailure?: Error;
  aggregateFailure?: Error;
  aggregateCalls = 0;
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (/COUNT\(/i.test(sql) && sql.includes('platform_data')) {
      this.aggregateCalls++;
      if (this.aggregateFailure) throw this.aggregateFailure;
    }
    if (this.readbackFailure && sql.includes('school_data') && sql.startsWith('SELECT')
      && sql.includes('WHERE "id" = ?')) throw this.readbackFailure;
    return super.query(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: Driver, model = schemas) { super(driver, model); }
}
async function fixture(privatePlatformName = false) {
  const driver = new Driver(':memory:');
  const model: Record<string, EntitySchema> = privatePlatformName ? { ...schemas, Platform: {
    ...schemas.Platform, columns: { ...schemas.Platform.columns,
      name: { ...schemas.Platform.columns.name, logPolicy: 'masked' } },
  } } : schemas;
  const client = new Client(driver, model).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client);
  await context.ensureSchema();
  for (const [entity, relation, target] of [
    ['Region', '', ''], ['Organization', 'region', 'Region'],
    ['Platform', 'organization', 'Organization'], ['School', 'platform', 'Platform'],
  ]) await client.executeMutation({ entity, action: 'Create', id: '1',
    payload: { name: entity, ...(target ? { [relation]: '1' } : {}) }, comment: 'seed native SQL trace fixture' });
  const evidence = new SQLExecutionEvidenceStore();
  client.setRuntimeTelemetrySink(evidence);
  return { driver, client, context, evidence };
}
function graphQuery(comment = 'load school graph') {
  const region = new SelectQuery('Region').limit(1);
  const organization = new SelectQuery('Organization').limit(1);
  organization.relations.push({ name: 'region', query: region });
  const platform = new SelectQuery('Platform').limit(1);
  platform.relations.push({ name: 'organization', query: organization });
  const school = new SelectQuery('School').limit(1).comment(comment).purpose('inspect native graph trace');
  school.relations.push({ name: 'platform', query: platform });
  return school;
}

it('derives three relation frames from actual SQLite loading without injected trace frames', async () => {
  const f = await fixture();
  try {
    const rows = await f.client.executeQuery<any>(graphQuery());
    expect(rows[0].platform.organization.region.name).toBe('Region');
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(4);
    const route = [['platform', 'School.platform'], ['organization', 'Platform.organization'],
      ['region', 'Organization.region']];
    entries.forEach((entry, index) => {
      expect(entry.comment).toBe('load school graph');
      expect(entry.purpose).toBe('inspect native graph trace');
      expect(entry.tracePath.map(frame => [frame.kind, frame.name, (frame as any).detail ?? ''])).toEqual([
        ['operation', 'School', 'query'], ['request', 'School', ''],
        ...route.slice(0, index).map(([name, detail]) => ['relation', name, detail]),
        ['provider', 'sqlite', ''], ['sql', 'select', ''],
      ]);
    });
  } finally { await f.client.close(); }
});

it('keeps successful write and failed readback as separate canonical statement paths', async () => {
  const f = await fixture();
  const failure = new Error('READBACK-CANARY');
  f.driver.readbackFailure = failure;
  try {
    await expect(f.client.executeMutation({ entity: 'School', action: 'Update', id: '1', version: 1,
      payload: { name: 'Changed' }, comment: 'rename school' })).rejects.toBe(failure);
    const entries = f.evidence.snapshot();
    expect(entries.map(entry => entry.executionOutcome)).toEqual(['success', 'failure']);
    entries.forEach((entry, index) => {
      expect(entry.auditReason).toBe('rename school');
      expect(entry.tracePath.map(frame => [frame.kind, frame.name])).toEqual([
        ['operation', 'School'], [index === 0 ? 'entity' : 'request', 'School'],
        ['provider', 'sqlite'], ['sql', index === 0 ? 'update' : 'select'],
      ]);
    });
  } finally { await f.client.close(); }
});

it('does not accept forged route metadata from a public query object', async () => {
  const f = await fixture();
  try {
    const query = new SelectQuery('School').limit(1).comment('read school').purpose('verify route ownership');
    (query as any).__teaqlTracePath = [{ level: 0, kind: 'relation', name: 'FORGED-RELATION' }];
    await f.client.executeQuery(query);
    expect(JSON.stringify(f.evidence.snapshot())).not.toContain('FORGED-RELATION');
    expect(f.evidence.snapshot()[0].tracePath.map(frame => frame.kind))
      .toEqual(['operation', 'request', 'provider', 'sql']);
  } finally { await f.client.close(); }
});

it('propagates typed facet provenance through actual membership and nested relation queries', async () => {
  const f = await fixture();
  try {
    const nested = new SelectQuery('Platform').aggregate('Count', 'id', 'schoolCount');
    nested.relations.push({ name: 'organization', query: new SelectQuery('Organization').limit(1) });
    const outer = new SelectQuery('School').limit(1).comment('load platform facets').purpose('inspect native facets');
    outer.facetBy('platforms', 'platform', { toQuery: () => nested });
    const facets = await executeRelationFacets(f.client, query => query, outer, outer.facets);
    expect(facets.platforms[0].schoolCount).toBe(1);
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(3);
    expect(entries.map(entry => entry.tracePath.filter(frame => frame.kind === 'relation')
      .map(frame => [frame.name, frame.detail]))).toEqual([
      [], [['platform', 'School.platform']],
      [['platform', 'School.platform'], ['organization', 'Platform.organization']],
    ]);
    expect(entries.every(entry => entry.comment === 'load platform facets')).toBe(true);
  } finally { await f.client.close(); }
});

it('preserves local relation names for a real relation aggregate', async () => {
  const f = await fixture();
  try {
    const query = new SelectQuery('School').limit(1).comment('load relation count').purpose('inspect aggregate provenance');
    query.relationAggregates.push({ relationName: 'platform', alias: 'platformCount', singleResult: true,
      query: new SelectQuery('Platform').aggregate('Count', 'id', 'platformCount') });
    expect((await f.client.executeQuery<any>(query))[0].platformCount).toBe(1);
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(2);
    expect(entries[1].tracePath.filter(frame => frame.kind === 'relation'))
      .toEqual([{ kind: 'relation', name: 'platform', detail: 'School.platform', level: 2 }]);
  } finally { await f.client.close(); }
});

it('retains query semantics and provenance when a three-level graph is streamed', async () => {
  const f = await fixture();
  try {
    const chunks = [];
    for await (const chunk of f.client.executeForStream<any>(graphQuery('stream school graph'), 1)) chunks.push(chunk);
    expect(chunks[0][0].platform.organization.region.name).toBe('Region');
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(4);
    expect(entries.every(entry => entry.tracePath[0].name === 'School' && entry.tracePath[0].detail === 'query')).toBe(true);
    expect(entries.map(entry => entry.tracePath.filter(frame => frame.kind === 'relation').length).sort()).toEqual([0, 1, 2, 3]);
  } finally { await f.client.close(); }
});

it('isolates overlapping native queries on one Context without a mutable trace stack', async () => {
  const f = await fixture();
  try {
    const results = await Promise.all([f.client.executeQuery(graphQuery('first independent query')),
      f.client.executeQuery(graphQuery('second independent query'))]);
    expect(results.map(rows => rows.length)).toEqual([1, 1]);
    const entries = f.evidence.snapshot();
    for (const reason of ['first independent query', 'second independent query']) {
      const own = entries.filter(entry => entry.comment === reason);
      expect(own).toHaveLength(4);
      expect(own.map(entry => entry.tracePath.filter(frame => frame.kind === 'relation').length).sort()).toEqual([0, 1, 2, 3]);
    }
  } finally { await f.client.close(); }
});

describe('streamed relation aggregates', () => {
  function request() {
    const query = new SelectQuery('School').limit(2)
      .comment('stream school counts').purpose('inspect streamed aggregate provenance');
    query.relationAggregates.push({ relationName: 'platform', alias: 'platformCount', singleResult: true,
      query: new SelectQuery('Platform').aggregate('Count', 'id', 'platformCount') });
    return query;
  }

  it.each([1, 2])('populates counts for chunk size %i with logging on and off', async chunkSize => {
    for (const logging of [true, false]) {
      const f = await fixture();
      try {
        f.client.setQueryLoggingEnabled(logging);
        const chunks = [];
        for await (const chunk of f.client.executeForStream<any>(request(), chunkSize)) chunks.push(chunk);
        expect(chunks.map(chunk => chunk.map(row => row.platformCount))).toEqual([[1]]);
        expect(f.driver.aggregateCalls).toBe(1);
        if (logging) {
          const entries = f.evidence.snapshot();
          expect(entries).toHaveLength(2);
          expect(entries.map(entry => entry.executionOutcome)).toEqual(['success', 'success']);
          expect(entries.every(entry => entry.comment === 'stream school counts')).toBe(true);
          expect(entries.every(entry => entry.purpose === 'inspect streamed aggregate provenance')).toBe(true);
          expect(entries[0].tracePath.map(frame => [frame.kind, frame.name])).toEqual([
            ['operation', 'School'], ['request', 'School'], ['relation', 'platform'],
            ['provider', 'sqlite'], ['sql', 'select'],
          ]);
          expect(entries[1].tracePath.map(frame => frame.kind))
            .toEqual(['operation', 'request', 'provider', 'sql']);
        }
      } finally { await f.client.close(); }
    }
  });

  it('completes the delivered aggregate before early stream cancellation', async () => {
    const f = await fixture();
    try {
      for await (const chunk of f.client.executeForStream<any>(request(), 1)) {
        expect(chunk[0].platformCount).toBe(1);
        break;
      }
      expect(f.driver.aggregateCalls).toBe(1);
      expect(f.evidence.snapshot().map(entry => entry.executionOutcome)).toEqual(['success', 'cancelled']);
      // A later independent request must not inherit the aggregate's relation path.
      await f.client.executeQuery(new SelectQuery('Region').limit(1)
        .comment('independent region').purpose('verify stream scope isolation'));
      const independent = f.evidence.snapshot();
      expect(independent[independent.length - 1].tracePath.map(frame => [frame.kind, frame.name])).toEqual([
        ['operation', 'Region'], ['request', 'Region'], ['provider', 'sqlite'], ['sql', 'select'],
      ]);
    } finally { await f.client.close(); }
  });

  it.each(['list', 'stream'])('%s preserves scalar membership when loading and aggregating the same relation', async mode => {
    const f = await fixture(true);
    try {
      const query = request().comment('inspect Platform count');
      query.relationAggregates[0].query.filter({ name: { $eq: 'Platform' } });
      const child = new SelectQuery('Platform').limit(1);
      child.relationAggregates.push({ relationName: 'organization', alias: 'organizationCount', singleResult: true,
        query: new SelectQuery('Organization').aggregate('Count', 'id', 'organizationCount') });
      query.relations.push({ name: 'platform', query: child });
      const chunks = [];
      if (mode === 'list') chunks.push(await f.client.executeQuery<any>(query));
      else for await (const chunk of f.client.executeForStream<any>(query, 1)) chunks.push(chunk);
      expect(chunks[0][0].platformCount).toBe(1);
      expect(chunks[0][0].platform.organizationCount).toBe(1);
      const entries = f.evidence.snapshot();
      expect(entries).toHaveLength(4);
      expect(entries.every(entry => entry.comment === 'inspect [REDACTED] count')).toBe(true);
      expect(entries.every(entry => entry.tracePath[0].name === 'School')).toBe(true);
      expect(entries.map(entry => entry.tracePath.filter(frame => frame.kind === 'relation').map(frame => frame.name)))
        .toEqual(mode === 'list' ? [[], ['platform'], ['platform'], ['platform', 'organization']]
          : [['platform'], ['platform'], ['platform', 'organization'], []]);
    } finally { await f.client.close(); }
  });

  it.each([1, 2])('retains aggregate and stream failures before delivery, chunk size %i', async chunkSize => {
    const f = await fixture();
    const failure = new Error('aggregate failed');
    f.driver.aggregateFailure = failure;
    let delivered = 0;
    try {
      await expect((async () => {
        for await (const chunk of f.client.executeForStream<any>(request(), chunkSize)) delivered += chunk.length;
      })()).rejects.toBe(failure);
      expect(delivered).toBe(0);
      expect(f.driver.aggregateCalls).toBe(1);
      const entries = f.evidence.snapshot();
      expect(entries.map(entry => entry.executionOutcome)).toEqual(['failure', 'failure']);
      expect(entries.map(entry => entry.tracePath.filter(frame => frame.kind === 'relation').map(frame => frame.name)))
        .toEqual([['platform'], []]);
      expect(entries.every(entry => entry.comment === 'stream school counts')).toBe(true);
    } finally { await f.client.close(); }
  });
});
