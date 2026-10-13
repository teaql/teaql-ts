import { OrderBy, SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { executeRelationFacets } from '../src/core/facet';
import { SmartList } from '../src/core/smart-list';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

// Native metadata only: runtime derivation must produce every observed frame.
const schemas: Record<string, EntitySchema> = {};
for (const [entity, field, target] of [
  ['School', 'platform', 'Platform'], ['Platform', 'organization', 'Organization'],
  ['Organization', '', ''],
]) {
  schemas[entity] = {
    table: `${entity.toLowerCase()}_data`,
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
      name: { columnName: 'name', logicalType: 'text', decode: 'string', logPolicy: 'masked' },
      ...(field ? { [field]: { columnName: field, logicalType: 'integer' as const,
        decode: 'string' as const, logPolicy: 'plain' as const } } : {}),
    },
    relations: field ? { [field]: { targetEntity: target, localKey: field, foreignKey: 'id', many: false } } : {},
  };
}
schemas.Platform.relations!.schools = { targetEntity: 'School', localKey: 'id', foreignKey: 'platform', many: true };
class Client extends AbstractSQLTeaQLClient {
  constructor(readonly transport = new SQLiteDriver(':memory:')) { super(transport, schemas); }
}

async function fixture(logging: boolean) {
  const client = new Client().setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  for (const [entity, id, payload] of [
    ['Organization', '1', { name: 'North' }], ['Organization', '2', { name: 'South' }],
    ['Platform', '1', { name: 'Alpha', organization: '1' }],
    ['Platform', '2', { name: 'Beta', organization: '2' }],
    ['Platform', '3', { name: 'Empty', organization: '2' }],
    ['School', '1', { name: 'A', platform: '1' }],
    ['School', '2', { name: 'B', platform: '1' }],
    ['School', '3', { name: 'C', platform: '2' }],
  ] as const) await client.executeMutation({ entity, action: 'Create', id,
    payload: { ...payload }, comment: 'seed native facet trace example' });
  const evidence = new SQLExecutionEvidenceStore();
  const diagnostics: unknown[] = [];
  client.setRuntimeTelemetrySink(evidence).setQueryLoggingEnabled(logging);
  client.setDiagnosticSQLLogSink({ write: entry => { diagnostics.push(entry); } });
  return { client, evidence, diagnostics };
}

function facets(includeAll: boolean) {
  const platform = new SelectQuery('Platform').limit(10).aggregate('Count', 'id', 'schoolCount');
  platform.facetBy('organizations', 'organization', {
    toQuery: () => new SelectQuery('Organization').limit(10).aggregate('Count', 'id', 'platformCount'),
  }, includeAll);
  return new SelectQuery('School').limit(10).facetBy('platforms', 'platform', { toQuery: () => platform }, includeAll);
}

function assertPaths(entries: ReturnType<SQLExecutionEvidenceStore['snapshot']>, root: string,
  routes: string[][], comment: string) {
  expect(entries.length).toBe(routes.length);
  entries.forEach((entry, index) => {
    expect(entry.comment).toBe(comment);
    expect(entry.purpose).toBe('verify nested facet ownership');
    expect(entry.executionOutcome).toBe('success');
    expect(entry.tracePath.map(node => [node.kind, node.name, node.detail ?? ''])).toEqual([
      ['operation', root, 'query'], ['request', root, ''],
      ...routes[index].map(field => ['relation', field.split('.').pop(), field]),
      ['provider', 'sqlite', ''], ['sql', 'select', ''],
    ]);
  });
}

it.each([true, false])('ID-set collection owns a helper and cache hits do not invent SQL, logging=%p', async logging => {
  const f = await fixture(logging);
  try {
    const context = new UserContext().insertResource('dataService', f.client);
    const reads = jest.spyOn(f.client.transport, 'query');
    const page = (offset: number) => context.prepareQuery(new SelectQuery('School')
      .select(['id', 'version', 'name']).order(OrderBy.desc('id'))
      .offset(offset).limit(1).comment('load school page').purpose('render school page')
      .optimizePaginationWithIdSetConfig('request-tree-schools', 60, 10));
    expect((await f.client.executeQuery<any>(page(1))).map(row => row.id)).toEqual(['2']);
    expect(context.idSetPaginationPlan).toBe('ID_SET_BUILD');
    expect(context.idSetPaginationCount).toBe(3);
    expect(context.idSetPaginationCountAccuracy).toBe('EXACT');
    const first = f.evidence.snapshot();
    expect(first).toHaveLength(2);
    expect(first[0].traceChain?.map(node => node.detail)).toEqual([
      'render school page', 'load school page', 'collect School IDs for pagination']);
    expect(first[1].traceChain?.map(node => node.detail)).toEqual(['render school page', 'load school page']);
    f.evidence.enableAll(); f.diagnostics.length = 0;
    reads.mockClear();
    expect((await f.client.executeQuery<any>(page(0))).map(row => row.id)).toEqual(['3']);
    expect(context.idSetPaginationPlan).toBe('ID_SET_HIT');
    expect(context.idSetPaginationCount).toBe(3);
    expect(context.idSetPaginationCountAccuracy).toBe('EXACT');
    expect(reads).toHaveBeenCalledTimes(1);
    expect(reads.mock.calls[0][0]).not.toMatch(/COUNT\(/i);
    const second = f.evidence.snapshot();
    expect(second).toHaveLength(1);
    expect(second[0].traceChain?.map(node => node.detail)).toEqual(['render school page', 'load school page']);
    expect(f.diagnostics).toHaveLength(logging ? 1 : 0);
    expect((second[0].tracePath ?? []).some(node => node.kind === 'relation')).toBe(false);
    console.log(`RTC_COM_07_CACHE_PASS logging=${logging} accuracy=EXACT hit_statements=1`);
  } finally { await f.client.close(); }
});

it.each([true, false])('keeps native nested facet sibling comments isolated, logging=%p', async logging => {
  const f = await fixture(logging);
  try {
    const outer = new SelectQuery('School').limit(10).comment('load branches').purpose('render branches');
    for (const alias of ['left', 'right']) {
      const organizations = new SelectQuery('Organization').limit(10).aggregate('Count', 'id', 'platformCount')
        .comment(`load ${alias} organizations`);
      const platforms = new SelectQuery('Platform').limit(10).aggregate('Count', 'id', 'schoolCount')
        .comment(`load ${alias} platforms`);
      platforms.facetBy('organizations', 'organization', {toQuery: () => organizations}, true,
        {kind: 'facet', method: 'facetByOrganizationAs', alias: 'organizations', relation: 'organization'});
      outer.facetBy(alias, 'platform', {toQuery: () => platforms}, true,
        {kind: 'facet', method: 'facetByPlatformAs', alias, relation: 'platform'});
    }
    const before = JSON.stringify(outer);
    const result = await executeRelationFacets(f.client, query => query, outer, outer.facets);
    for (const alias of ['left', 'right']) {
      expect(result[alias].map(row => [row.id, row.schoolCount])).toEqual([['1', 2], ['2', 1], ['3', 0]]);
      expect(result[alias].facets.organizations?.map(row => [row.id, row.platformCount])).toEqual([['1', 1], ['2', 2]]);
      const prefix = ['render branches', 'load branches', `facetByPlatformAs('${alias}')`];
      const chains = f.evidence.snapshot().map(entry => entry.traceChain!.map(node => node.detail))
        .filter(chain => chain[2] === prefix[2]);
      expect(chains).toHaveLength(4);
      expect(chains).toContainEqual([...prefix, 'aggregate platform']);
      expect(chains).toContainEqual([...prefix, `load ${alias} platforms`]);
      for (const local of ['aggregate organization', `load ${alias} organizations`])
        expect(chains).toContainEqual([...prefix, `load ${alias} platforms`, "facetByOrganizationAs('organizations')", local]);
    }
    expect(f.evidence.snapshot()).toHaveLength(8);
    expect(f.diagnostics).toHaveLength(logging ? 8 : 0);
    expect(JSON.stringify(outer)).toBe(before);
    console.log(`RTC_COM_06_PASS logging=${logging} nested=true siblings=true`);
  } finally { await f.client.close(); }
});

it.each([true, false])('executes nested facets with inherited roots, logging=%p', async logging => {
  const f = await fixture(logging);
  try {
    const outer = facets(false).filter({ platform: { $eq: '1' } })
      .comment('load nested facets').purpose('verify nested facet ownership');
    const before = JSON.stringify(outer);
    const result = await executeRelationFacets(f.client, query => query, outer, outer.facets);
    expect(result.platforms.map(row => [row.id, row.schoolCount])).toEqual([['1', 2]]);
    expect(result.platforms.facets.organizations?.map(row => [row.id, row.platformCount])).toEqual([['1', 1]]);
    expect(JSON.stringify(outer)).toBe(before);
    // Diagnostics may be disabled independently of the explicitly installed
    // execution-evidence observer. It still observes actual SQL metadata.
    assertPaths(f.evidence.snapshot(), 'School', [
      [], ['School.platform'], ['School.platform'], ['School.platform', 'Platform.organization'],
    ], 'load nested facets');
    expect(f.diagnostics).toHaveLength(logging ? 4 : 0);
  } finally { await f.client.close(); }
});

it.each([true, false])('ID-set helper redacts a secret bound only by a selected descendant, logging=%p', async logging => {
  const f = await fixture(logging);
  try {
    const context = new UserContext().insertResource('dataService', f.client);
    const query = new SelectQuery('School').order(OrderBy.desc('id')).offset(1).limit(1)
      .comment('load Alpha school page').purpose('inspect Alpha selections')
      .relationQuery('platform', new SelectQuery('Platform').limit(5).filter({name: {$eq: 'Alpha'}}), 'platform', 'id', false)
      .optimizePaginationWithIdSetConfig('private-id-set', 60, 10);
    const rows = await f.client.executeQuery<any>(context.prepareQuery(query));
    expect(rows.map(row => row.id)).toEqual(['2']);
    const facts = f.evidence.snapshot();
    expect(facts).toHaveLength(3);
    expect(facts[0].traceChain?.map(node => node.detail)).toEqual([
      'inspect [REDACTED] selections', 'load [REDACTED] school page', 'collect School IDs for pagination']);
    expect(JSON.stringify(facts)).not.toContain('Alpha');
    expect(JSON.stringify(f.diagnostics)).not.toContain('Alpha');
  } finally { await f.client.close(); }
});

it.each([true, false])('preserves explicit facet SUM comments and rejects blank input with logging=%p', async logging => {
  for (const comment of ['sum visible school IDs', '', ' \t', '\u0085']) {
    const f = await fixture(logging);
    try {
      const sum = new SelectQuery('School').aggregate('Sum', 'id', 'schoolTotal').comment(comment);
      const originalSum = JSON.stringify(sum);
      const values = new SelectQuery('Platform').limit(10).comment('load platform facets')
        .aggregate('Count', 'id', 'schoolCount').relationAggregate('schools', 'schoolTotal', sum);
      const outer = new SelectQuery('School').limit(10).comment('load schools').purpose('render school list')
        .facetBy('platforms', 'platform', { toQuery: () => values }, false,
          { kind: 'facet', method: 'facetByPlatformAs', alias: 'platforms', relation: 'platform' });
      if (comment !== 'sum visible school IDs') {
        await expect(executeRelationFacets(f.client, query => query, outer, outer.facets)).rejects.toThrow();
        expect(f.evidence.snapshot().every(entry => (entry.traceChain ?? []).length <= 4)).toBe(true);
        continue;
      }
      const results = await executeRelationFacets(f.client, query => query, outer, outer.facets);
      expect(results.platforms.map(row => [row.id, row.schoolTotal])).toEqual([['1', 3], ['2', 3]]);
      const facts = f.evidence.snapshot();
      expect(facts).toHaveLength(3);
      expect(f.diagnostics).toHaveLength(logging ? 3 : 0);
      const aggregateFacts = facts.filter(entry => {
        const chain = entry.traceChain ?? [];
        return chain[chain.length - 1]?.detail === comment;
      });
      expect(aggregateFacts).toHaveLength(1);
      expect((aggregateFacts[0].traceChain ?? []).map(node => node.detail)).toEqual(['render school list', 'load schools',
          "facetByPlatformAs('platforms')", 'aggregate platform', comment]);
      expect(sum.commentText).toBe(comment);
      expect(JSON.stringify(sum)).toBe(originalSum);
    } finally { await f.client.close(); }
  }
});

it.each([[true, 0], [true, 32], [false, 0], [false, 32]])(
  'retains facets separately on each loaded relation, includeAll=%p threshold=%p', async (includeAll, threshold) => {
  const f = await fixture(true);
  try {
    const outer = new SelectQuery('Platform').limit(10)
      .comment('load per-parent facets').purpose('verify nested facet ownership');
    outer.relations.push({ name: 'schools', query: facets(Boolean(includeAll)).limit(1)
      .topNProbeParentThreshold(Number(threshold)) });
    const rows = await f.client.executeQuery<any>(outer);
    expect(rows.map(row => row.schools.length)).toEqual([1, 1, 0]);
    for (const [index, row] of rows.entries()) {
      expect(row.schools).toBeInstanceOf(SmartList);
      const platforms = row.schools.facets.platforms as SmartList<any>;
      expect(platforms.map(value => [value.id, value.schoolCount])).toEqual(includeAll
        ? [['1', index === 0 ? 2 : 0], ['2', index === 1 ? 1 : 0], ['3', 0]]
        : index < 2 ? [[String(index + 1), index === 0 ? 2 : 1]] : []);
      const organizations = platforms.facets.organizations!;
      expect(organizations.map(value => [value.id, value.platformCount])).toEqual(includeAll
        ? [['1', 1], ['2', 2]] : index < 2 ? [[String(index + 1), 1]] : []);
    }
    const paths = f.evidence.snapshot().map(entry => entry.tracePath
      .filter(node => node.kind === 'relation').map(node => node.detail));
    expect(paths.some(path => path.join('/') === 'Platform.schools/School.platform/Platform.organization')).toBe(true);
    for (const entry of f.evidence.snapshot()) {
      expect(entry.tracePath[0]).toMatchObject({ kind: 'operation', name: 'Platform', detail: 'query' });
      expect(entry.tracePath[1]).toMatchObject({ kind: 'request', name: 'Platform' });
      expect(entry.comment).toBe('load per-parent facets');
      expect(entry.purpose).toBe('verify nested facet ownership');
    }
  } finally { await f.client.close(); }
});

it('keeps inherited private intent safe through nested facet success/failure and the next request', async () => {
  const f = await fixture(true);
  const outer = new SelectQuery('Platform').limit(10).filter({ name: { $eq: 'Alpha' } })
    .comment('load Alpha facets').purpose('inspect Alpha selections');
  outer.relations.push({ name: 'schools', query: facets(false) });
  const original = f.client.transport.query.bind(f.client.transport);
  const failure = new Error('driver detail Alpha');
  let failOrganization = true;
  jest.spyOn(f.client.transport, 'query').mockImplementation((sql, values) => {
    if (failOrganization && /FROM "organization_data"/.test(sql)) return Promise.reject(failure);
    return original(sql, values);
  });
  try {
    await expect(f.client.executeQuery(outer)).rejects.toBe(failure);
    const failed = f.evidence.snapshot();
    expect(failed[failed.length - 1].executionOutcome).toBe('failure');
    expect(failed[failed.length - 1].tracePath.filter(node => node.kind === 'relation')
      .map(node => node.detail)).toEqual(['Platform.schools', 'School.platform', 'Platform.organization']);
    expect(JSON.stringify(failed)).not.toContain('Alpha');
    expect(JSON.stringify(f.diagnostics)).not.toContain('Alpha');
    failOrganization = false;
    const rows = await f.client.executeQuery<any>(outer);
    expect(rows[0].name).toBe('Alpha');
    expect(rows[0].schools.facets.platforms[0].schoolCount).toBe(2);
    expect(JSON.stringify(f.evidence.snapshot())).not.toContain('Alpha');
    expect(outer.commentText).toBe('load Alpha facets');
    // No Context/global accumulation of a previous request's private values.
    await f.client.executeQuery(new SelectQuery('Organization').limit(1)
      .comment('Alpha is ordinary prose here').purpose('independent request'));
    const all = f.evidence.snapshot();
    expect(all[all.length - 1].comment).toBe('Alpha is ordinary prose here');
  } finally { await f.client.close(); }
});

it('protects early membership SQL from a secret bound only by a later nested facet', async () => {
  const f = await fixture(true);
  try {
    const outer = facets(false).comment('inspect North facets').purpose('verify North privacy');
    outer.facets[0].query.facets[0].query.filter({ name: { $eq: 'North' } });
    const result = await executeRelationFacets(f.client, query => query, outer, outer.facets);
    expect(result.platforms.facets.organizations?.map(row => row.name)).toEqual(['North']);
    const entries = f.evidence.snapshot();
    expect(entries.length).toBe(4);
    expect(JSON.stringify(entries)).not.toContain('North');
    expect(outer.commentText).toBe('inspect North facets');
  } finally { await f.client.close(); }
});

it.each([['mixed', false], ['mixed', true], ['all-null', false], ['all-null', true]] as const)(
  'null local keys never count orphan children: page=%s includeAll=%p', async (page, includeAll) => {
  const column = (name: string) => ({ columnName: name, logicalType: 'integer' as const,
    decode: 'string' as const, logPolicy: 'plain' as const });
  const identity = { id: column('id'), version: column('version') };
  const model: Record<string, EntitySchema> = {
    Parent: { table: 'nullable_facet_parent', columns: { ...identity, code: column('code') },
      relations: { children: { targetEntity: 'Child', localKey: 'code', foreignKey: 'parentCode', many: true } } },
    Child: { table: 'nullable_facet_child', columns: {
      ...identity, parentCode: column('parent_code'), tag: column('tag'),
    }, relations: { tag: { targetEntity: 'Tag', localKey: 'tag', foreignKey: 'id', many: false } } },
    Tag: { table: 'nullable_facet_tag', columns: identity },
  };
  class NullableClient extends AbstractSQLTeaQLClient {
    constructor() { super(new SQLiteDriver(':memory:'), model); }
  }
  const client = new NullableClient().setDiagnosticSQLLogSink(undefined);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const [entity, id, payload] of [
      ['Parent', '1', { code: '10' }], ['Parent', '2', { code: null }],
      ['Tag', '100', {}], ['Tag', '200', {}],
      ['Child', '1', { parentCode: '10', tag: '100' }],
      ['Child', '2', { parentCode: null, tag: '200' }],
    ] as const) await client.executeMutation({ entity, id, action: 'Create', payload: { ...payload },
      comment: 'seed nullable relation facet fixture' });
    const children = new SelectQuery('Child').limit(2).facetBy('tags', 'tag', {
      toQuery: () => new SelectQuery('Tag').limit(10).aggregate('Count', 'id', 'childCount'),
    }, includeAll);
    const query = new SelectQuery('Parent').limit(2)
      .comment('load nullable relation facets').purpose('exclude orphan membership')
      .relationQuery('children', children);
    if (page === 'all-null') query.filter({ id: { $eq: '2' } });
    const evidence = new SQLExecutionEvidenceStore();
    client.setRuntimeTelemetrySink(evidence);
    const rows = await client.executeQuery<any>(query);
    expect(rows.map(row => row.id)).toEqual(page === 'mixed' ? ['1', '2'] : ['2']);
    for (const row of rows) {
      const hasKey = row.code !== null;
      expect(row.children.map((child: any) => child.id)).toEqual(hasKey ? ['1'] : []);
      expect(row.children).toBeInstanceOf(SmartList);
      const tags = row.children.facets?.tags as SmartList<any> | undefined;
      expect(tags).toBeInstanceOf(SmartList);
      expect(tags?.map(tag => [tag.id, tag.childCount])).toEqual(includeAll
        ? [['100', hasKey ? 1 : 0], ['200', 0]] : hasKey ? [['100', 1]] : []);
    }
    for (const entry of evidence.snapshot()) {
      expect(entry.tracePath[0]).toMatchObject({ kind: 'operation', name: 'Parent', detail: 'query' });
      expect(entry.tracePath[1]).toMatchObject({ kind: 'request', name: 'Parent' });
      expect(entry.comment).toBe('load nullable relation facets');
      expect(entry.purpose).toBe('exclude orphan membership');
    }
  } finally { await client.close(); }
});
