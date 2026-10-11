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
  const region = new SelectQuery('Region').limit(1).comment('load region');
  const organization = new SelectQuery('Organization').limit(1).comment('load organization');
  organization.relations.push({ name: 'region', query: region });
  const platform = new SelectQuery('Platform').limit(1).comment('load platform');
  platform.relations.push({ name: 'organization', query: organization });
  const school = new SelectQuery('School').limit(1).comment(comment).purpose('inspect native graph trace');
  school.relations.push({ name: 'platform', query: platform });
  return school;
}

it.each([false, true])('compound aggregates emit one physical SQLite statement: logging=%p', async logging => {
  const f = await fixture();
  try {
    const diagnostics: unknown[] = [];
    f.client.setQueryLoggingEnabled(logging).setDiagnosticSQLLogSink({write: entry => diagnostics.push(entry)});
    const reads = jest.spyOn(f.driver, 'query');
    const query = new SelectQuery('School').aggregate('Count', 'id', 'schoolCount').aggregate('Sum', 'id', 'idTotal')
      .comment('calculate school totals').purpose('render totals');
    const rows = await f.client.executeQuery<any>(query);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({schoolCount: 1, idTotal: 1});
    expect(reads).toHaveBeenCalledTimes(1);
    expect(reads.mock.calls[0][0]).toMatch(/COUNT\(/i);
    expect(reads.mock.calls[0][0]).toMatch(/SUM\(/i);
    const facts = f.evidence.snapshot();
    expect(facts).toHaveLength(1);
    expect(facts[0].traceChain!.map(node => node.detail)).toEqual(['render totals', 'calculate school totals']);
    expect(diagnostics).toHaveLength(logging ? 1 : 0);
    console.log(`RTC_COM_07_AGGREGATE_PASS logging=${logging} expressions=2 statements=1`);
  } finally { await f.client.close(); }
});

it('derives three relation frames from actual SQLite loading without injected trace frames', async () => {
  const f = await fixture();
  try {
    const rows = await f.client.executeQuery<any>(graphQuery());
    expect(rows[0].platform.organization.region.name).toBe('Region');
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(4);
    const route = [['platform', 'School.platform'], ['organization', 'Platform.organization'],
      ['region', 'Organization.region']];
    const comments = ['load school graph', 'load platform', 'load organization', 'load region'];
    entries.forEach((entry, index) => {
      expect(entry.comment).toBe('load school graph');
      expect(entry.purpose).toBe('inspect native graph trace');
      expect(entry.traceChain?.map(node => node.detail)).toEqual([
        'inspect native graph trace', 'load school graph', ...comments.slice(1, index + 1),
      ]);
      expect(entry.tracePath.map(frame => [frame.kind, frame.name, (frame as any).detail ?? ''])).toEqual([
        ['operation', 'School', 'query'], ['request', 'School', ''],
        ...route.slice(0, index).map(([name, detail]) => ['relation', name, detail]),
        ['provider', 'sqlite', ''], ['sql', 'select', ''],
      ]);
    });
  } finally { await f.client.close(); }
});

it.each([false, true])('retains native operation parents, explicit comments and local defaults in real SQLite evidence: logging=%p', async logging => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(logging);
    const diagnostics: unknown[] = [];
    f.client.setDiagnosticSQLLogSink({ write: entry => diagnostics.push(entry) });
    const reads = jest.spyOn(f.driver, 'query');
    const query = graphQuery('load schools').purpose('render school list');
    query.relations[0].operation = { kind: 'relation-select', method: 'selectPlatformWith', relation: 'platform' };
    query.relations[0].query!.comment('load visible platforms');
    query.relations[0].query!.relations[0].operation = {
      kind: 'relation-select', method: 'selectOrganizationWith', relation: 'organization',
    };
    expect((await f.client.executeQuery<any>(query))[0].platform.organization.name).toBe('Organization');
    const entries = f.evidence.snapshot();
    expect(reads).toHaveBeenCalledTimes(4);
    expect(entries).toHaveLength(4); // retained evidence is independent of diagnostic logging
    expect(diagnostics).toHaveLength(logging ? 4 : 0);
    expect(entries[1].traceChain!.map(node => node.detail)).toEqual([
      'render school list', 'load schools', 'selectPlatformWith(...)', 'load visible platforms',
    ]);
    expect(entries[2].traceChain!.map(node => node.detail)).toEqual([
      'render school list', 'load schools', 'selectPlatformWith(...)', 'load visible platforms',
      'selectOrganizationWith(...)', 'load Organization',
    ]);
    expect(entries.every(entry => entry.comment === 'load schools')).toBe(true);
    expect(query.relations[0].query!.relations[0].query!.commentText).toBeUndefined();
    console.log(`RTC_COM_02_PASS logging=${logging} explicit=both`);
  } finally { await f.client.close(); }
});

it.each([false, true])('rejects explicitly blank relation comments before child SQLite: logging=%p', async logging => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(logging);
    const reads = jest.spyOn(f.driver, 'query');
    for (const blank of ['', ' \t', '\u0085']) {
      reads.mockClear();
      const query = graphQuery();
      query.relations[0].query!.comment(blank);
      await expect(f.client.executeQuery(query)).rejects.toMatchObject({ field: 'comment', requestKind: 'query' });
      expect(reads.mock.calls.length).toBeLessThanOrEqual(1);
      expect(reads.mock.calls.some(([sql]) => sql.includes('FROM "platform_data"'))).toBe(false);
      expect(query.relations[0].query!.commentText).toBe(blank);
      console.log(`RTC_COM_04_RELATION_PASS logging=${logging} invalid_child_provider=0`);
    }
    reads.mockClear();
    expect((await f.client.executeQuery<any>(graphQuery()))[0].platform.organization.region.name).toBe('Region');
    expect(reads).toHaveBeenCalledTimes(4);
  } finally { await f.client.close(); }
});

it.each([false, true])('rejects explicitly blank facet value comments before value SQLite: logging=%p', async logging => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(logging);
    const reads = jest.spyOn(f.driver, 'query');
    for (const blank of ['', ' \t', '\u0085']) {
      reads.mockClear();
      const child = new SelectQuery('Platform').aggregate('Count', 'id', 'schoolCount').comment(blank);
      const outer = new SelectQuery('School').comment('load schools').purpose('validate facet input');
      outer.facetBy('platformCounts', 'platform', { toQuery: () => child }, true, {
        kind: 'facet', method: 'facetByPlatformAs', relation: 'platform', alias: 'platformCounts',
      });
      await expect(executeRelationFacets(f.client, query => query, outer, outer.facets))
        .rejects.toMatchObject({ field: 'comment', requestKind: 'query' });
      expect(reads.mock.calls.some(([sql]) => sql.includes('FROM "platform_data"'))).toBe(false);
      expect(child.commentText).toBe(blank);
      console.log(`RTC_COM_04_FACET_PASS logging=${logging} invalid_value_provider=0`);
    }
  } finally { await f.client.close(); }
});

it.each([false, true])('retains named and unnamed exact-count intent in real SQLite: logging=%p', async logging => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(logging);
    const diagnostics: unknown[] = [];
    f.client.setDiagnosticSQLLogSink({write: entry => diagnostics.push(entry)});
    const query = new SelectQuery('School').limit(1).comment('load schools').purpose('render school list');
    expect(await f.client.executeCount(query, 'totalSchools', {
      kind: 'named-count', method: 'countAs', alias: 'totalSchools',
    })).toBe(1);
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0].parameterizedSQL).toContain('totalSchools');
    expect(entries[0].traceChain!.map(node => node.detail)).toEqual([
      'render school list', 'load schools', "countAs('totalSchools')",
    ]);
    expect(entries[0].tracePath.some(node => node.kind === 'relation')).toBe(false);
    f.evidence.enableAll(); diagnostics.length = 0;
    expect(await f.client.executeCount(query)).toBe(1);
    const defaults = f.evidence.snapshot();
    expect(defaults).toHaveLength(1);
    expect(defaults[0].parameterizedSQL).toContain('__teaql_total');
    expect(defaults[0].traceChain!.map(node => node.detail)).toEqual([
      'render school list', 'load schools', 'framework: named-count',
    ]);
    expect(defaults[0].tracePath.some(node => node.kind === 'relation')).toBe(false);
    expect(diagnostics).toHaveLength(logging ? 1 : 0);
    expect(query.commentText).toBe('load schools');
    console.log(`RTC_COM_05_PASS logging=${logging} named=true unnamed=true`);
  } finally { await f.client.close(); }
});

it('shares one named facet operation between the aggregate and value-query SQLite branches', async () => {
  const f = await fixture();
  try {
    const nested = new SelectQuery('Platform').aggregate('Count', 'id', 'schoolCount')
      .comment('load platform facets');
    const outer = new SelectQuery('School').comment('load schools').purpose('render school list');
    outer.facetBy('platformCounts', 'platform', { toQuery: () => nested }, true, {
      kind: 'facet', method: 'facetByPlatformAs', relation: 'platform', alias: 'platformCounts',
    });
    const facets = await executeRelationFacets(f.client, query => query, outer, outer.facets);
    expect(facets.platformCounts.map(row => row.schoolCount)).toEqual([1]);
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(2);
    const prefix = ['render school list', 'load schools', "facetByPlatformAs('platformCounts')"];
    expect(entries[0].traceChain!.map(node => node.detail)).toEqual([...prefix, 'aggregate platform']);
    expect(entries[0].parameterizedSQL).toContain('AS "schoolCount"');
    expect(entries[1].traceChain!.map(node => node.detail)).toEqual([...prefix, 'load platform facets']);
  } finally { await f.client.close(); }
});

it('assembles minimal reverse children using a private key without publishing an unselected field', async () => {
  const f = await fixture();
  const model = { ...schemas, Platform: { ...schemas.Platform, relations: {
    ...schemas.Platform.relations,
    schoolList: { targetEntity: 'School', localKey: 'id', foreignKey: 'platform', many: true },
  } } };
  const client = new Client(f.driver, model).setDiagnosticSQLLogSink(undefined);
  try {
    const child = new SelectQuery('School').select(['name']).limit(3).comment('load school previews');
    const query = new SelectQuery('Platform').select(['name']).limit(1)
      .comment('load platforms').purpose('render bounded previews')
      .relationQuery('schoolList', child, 'id', 'platform', true, {
        kind: 'relation-select', method: 'selectSchoolListWith', relation: 'schoolList',
      });
    const rows = await client.executeQuery<any>(query);
    expect(rows[0].schoolList).toHaveLength(1);
    expect(rows[0].schoolList[0].name).toBe('School');
    expect(Object.prototype.hasOwnProperty.call(rows[0].schoolList[0], 'platform')).toBe(false);
    expect(child.selectItems).toEqual(['name']);
  } finally { await f.client.close(); }
});

it.each([false, true])('prefixes and escaped facet aliases preserve bindings under privacy projection: logging=%p', async logging => {
  const f = await fixture(true);
  const secret = 'TRACE-PRIVATE-CANARY';
  try {
    await f.client.executeMutation({entity: 'Platform', action: 'Update', id: '1', version: 1,
      payload: {name: secret}, comment: 'seed privacy canary'});
    f.client.setQueryLoggingEnabled(logging);
    const diagnostics: unknown[] = [];
    f.client.setDiagnosticSQLLogSink({write: entry => diagnostics.push(entry)});
    const reads = jest.spyOn(f.driver, 'query');
    for (const privateInput of [false, true]) {
      f.evidence.enableAll(); diagnostics.length = 0; reads.mockClear();
      const alias = 'choices"\\\n' + (privateInput ? secret : '');
      const comment = privateInput ? `what: load ${secret}` : 'what: load schools';
      const purpose = privateInput ? `why: inspect ${secret}` : 'why: inspect schools';
      const child = new SelectQuery('Platform').limit(10).aggregate('Count', 'id', 'schoolCount')
        .comment(privateInput ? `load ${secret} facets` : 'load platform facets');
      if (privateInput) child.filter({name: {$eq: secret}});
      const query = new SelectQuery('School').limit(10).comment(comment).purpose(purpose)
        .facetBy(alias, 'platform', {toQuery: () => child}, false,
          {kind: 'facet', method: 'facetByPlatformAs', alias, relation: 'platform'});
      const before = JSON.stringify(query);
      const result = await executeRelationFacets(f.client, query => query, query, query.facets);
      expect(result[alias]).toHaveLength(1);
      expect(result[alias][0]).toMatchObject({id: '1', name: secret, schoolCount: 1});
      const facts = f.evidence.snapshot();
      expect(facts).toHaveLength(2); expect(reads).toHaveBeenCalledTimes(2);
      expect(diagnostics).toHaveLength(logging ? 2 : 0);
      const safeComment = privateInput ? 'what: load [REDACTED]' : comment;
      const safePurpose = privateInput ? 'why: inspect [REDACTED]' : purpose;
      const chains = facts.map(entry => entry.traceChain!.map(node => node.detail));
      for (const local of ['aggregate platform', privateInput ? 'load [REDACTED] facets' : 'load platform facets'])
        expect(chains).toContainEqual([safePurpose, safeComment, 'facetByPlatformAs(\'choices"\\\\\\n' + (privateInput ? '[REDACTED]' : '') + '\')', local]);
      if (privateInput) {
        expect(JSON.stringify(facts)).not.toContain(secret);
        expect(reads.mock.calls.some(call => call[1]?.includes(secret))).toBe(true);
      }
      expect(JSON.stringify(query)).toBe(before);
    }
    console.log(`RTC_COM_09_12_PASS logging=${logging} plain=true private=true escaped=true bindings=true`);
  } finally { await f.client.close(); }
});

it('projects private operands out of nested business trace comments as well as SQL diagnostics', async () => {
  const f = await fixture(true);
  try {
    const query = graphQuery('load Platform graph');
    query.relations[0].query!.filter({ name: { $eq: 'Platform' } }).comment('load Platform details');
    await f.client.executeQuery(query);
    expect(f.evidence.snapshot()).toHaveLength(4);
    for (const entry of f.evidence.snapshot()) {
      expect(entry.traceChain).toBeDefined();
      expect(entry.traceChain!.map(node => node.detail).join('/')).not.toContain('Platform');
    }
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
    expect(entries.map(entry => entry.traceChain?.map(node => node.detail))).toEqual([
      ['inspect native facets', 'load platform facets', "facetByPlatformAs('platforms')", 'aggregate platform'],
      ['inspect native facets', 'load platform facets', "facetByPlatformAs('platforms')", 'load School.platform'],
      ['inspect native facets', 'load platform facets', "facetByPlatformAs('platforms')",
        'load School.platform', 'load Platform.organization'],
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

it.each([[false, false], [true, false], [false, true], [true, true]])(
  'isolates two live native query graphs with logging=%p sharedTemplate=%p', async (logging, sharedTemplate) => {
  const f = await fixture();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let bothEntered!: () => void;
  const entered = new Promise<void>(resolve => { bothEntered = resolve; });
  let roots = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let pending: Promise<any[]>[] = [];
  const original = f.driver.query.bind(f.driver);
  jest.spyOn(f.driver, 'query').mockImplementation(async (sql, values) => {
    const rows = await original(sql, values);
    if (/FROM "school_data"/.test(sql)) {
      roots++;
      if (roots === 2) bothEntered();
      await gate;
    }
    return rows;
  });
  try {
    f.client.setQueryLoggingEnabled(logging);
    const template = graphQuery().relations[0].query!;
    const templateBefore = JSON.stringify(template);
    const build = (comment: string, purpose: string) => {
      const query = graphQuery(comment).purpose(purpose);
      if (sharedTemplate) query.relations[0].query = template;
      return f.context.prepareQuery(query);
    };
    const assertTemplateUnchanged = () => {
      expect(JSON.stringify(template)).toBe(templateBefore);
      let query: SelectQuery | undefined = template;
      while (query) {
        expect(query.commentText).toBeUndefined(); expect(query.purposeText).toBeUndefined();
        query = query.relations[0]?.query;
      }
    };
    const first = build('first independent query', 'render first graph');
    const second = build('second independent query', 'render second graph');
    // Query optimization observers legitimately initialize these optional
    // public fields to undefined; that is not a runtime-owned trace frame.
    f.context.idSetPaginationCount = undefined;
    f.context.continuousPageCursorId = undefined;
    // Both operations resolve the same trusted service from the same Context.
    // Context resources are application-owned; a live query must not insert an
    // ambient trace stack into them or add runtime frames as Context properties.
    const contextResources = (f.context as unknown as { resources: Map<string, unknown> }).resources;
    const resourcesBefore = new Map(contextResources);
    const contextKeysBefore = Reflect.ownKeys(f.context);
    const service = f.context.requireResource<Client>('dataService');
    expect(service).toBe(f.client);
    pending = [service.executeQuery(first), service.executeQuery(second)];
    const completed = Promise.all(pending);
    // Unlike Promise.all alone, this proves both real root SQL calls have
    // finished while neither operation can return or load its descendants.
    await Promise.race([entered, completed.then(() => { throw new Error('queries escaped the overlap barrier'); }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('root overlap timeout')), 3000); })]);
    expect(roots).toBe(2);
    expect(f.evidence.snapshot()).toHaveLength(0);
    expect(Reflect.ownKeys(f.context)).toEqual(contextKeysBefore);
    expect(contextResources).toEqual(resourcesBefore);
    expect(first.commentText).toBe('first independent query');
    expect(second.commentText).toBe('second independent query');
    assertTemplateUnchanged();
    release();
    const results = await completed;
    expect(Reflect.ownKeys(f.context)).toEqual(contextKeysBefore);
    expect(contextResources).toEqual(resourcesBefore);
    expect(results.map(rows => rows.length)).toEqual([1, 1]);
    expect(results.map(rows => rows[0].platform.organization.region.name)).toEqual(['Region', 'Region']);
    assertTemplateUnchanged();
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(8);
    for (const [reason, purpose] of [['first independent query', 'render first graph'],
      ['second independent query', 'render second graph']]) {
      const own = entries.filter(entry => entry.comment === reason);
      expect(own).toHaveLength(4);
      own.forEach((entry, depth) => {
        expect(entry.purpose).toBe(purpose);
        expect(entry.executionOutcome).toBe('success');
        expect(entry.tracePath.map(frame => [frame.kind, frame.name])).toEqual([
          ['operation', 'School'], ['request', 'School'],
          ...['platform', 'organization', 'region'].slice(0, depth).map(name => ['relation', name]),
          ['provider', 'sqlite'], ['sql', 'select'],
        ]);
      });
    }
  } finally {
    if (timeout) clearTimeout(timeout);
    release();
    await Promise.allSettled(pending);
    await f.client.close();
  }
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
