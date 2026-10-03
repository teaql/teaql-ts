import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { executeRelationFacets } from '../src/core/facet';
import { PLAINTEXT_LOG_ACK, PLAINTEXT_LOG_ENV } from '../src/core/log-privacy';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore,
  SQLExecutionMetadata, TextDiagnosticSQLLogSink } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

const secret = 'FACET-PRIVATE-SCHOOL';
const futureSecret = 'FACET-PRIVATE-PLATFORM';
const column = (name: string, text = false) => ({ columnName: name,
  logicalType: text ? 'text' as const : 'integer' as const,
  decode: 'string' as const, logPolicy: 'plain' as const });
const schemas: Record<string, EntitySchema> = {
  School: { table: 'like_school', auditMaskFields: ['name'], columns: {
    id: column('id'), version: column('version'), platform: column('platform'),
    name: column('name', true), publicName: column('public_name', true),
    password: column('password', true), unknownName: { ...column('unknown_name', true), logPolicy: 'unknown' },
  }, relations: { platform: { targetEntity: 'Platform', localKey: 'platform', foreignKey: 'id', many: false } } },
  Platform: { table: 'like_platform', auditMaskFields: ['name'], columns: {
    id: column('id'), version: column('version'), name: column('name', true),
  } },
};
class Driver extends SQLiteDriver {
  readonly reads: { sql: string; values: unknown[] }[] = [];
  async query(sql: string, values: any[] = []) {
    if (sql.startsWith('SELECT')) this.reads.push({ sql, values: [...values] });
    return super.query(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  constructor(readonly transport = new Driver(':memory:')) { super(transport, schemas); }
}
const previous = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = previous;
});

async function fixture(logging: boolean, value = secret) {
  const client = new Client().setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  await client.executeMutation({ entity: 'Platform', action: 'Create', id: '1',
    payload: { name: `${futureSecret}-tail` }, comment: 'seed LIKE privacy fixture' });
  for (const [id, name] of [['1', `${value}-tail`], ['2', `head-${value}`]]) {
    await client.executeMutation({ entity: 'School', action: 'Create', id,
      payload: { name, publicName: name, password: name, unknownName: name, platform: '1' },
      comment: 'seed LIKE privacy fixture' });
  }
  const evidence = new SQLExecutionEvidenceStore();
  const diagnostics: SQLExecutionMetadata[] = [], text: string[] = [];
  client.setRuntimeTelemetrySink(evidence).setQueryLoggingEnabled(logging)
    .setDiagnosticSQLLogSink({ write(entry) {
      diagnostics.push(entry); new TextDiagnosticSQLLogSink(line => text.push(line)).write(entry);
    } });
  client.transport.reads.length = 0;
  return { client, evidence, diagnostics, text };
}

it.each(['$startsWith', '$notStartsWith', '$endsWith', '$notEndsWith'].flatMap(operator =>
  [false, true].map(logging => [operator, logging] as const)))(
  'masks original LIKE operand at real safe sinks: %s logging=%p', async (operator, logging) => {
    const f = await fixture(logging);
    const query = new SelectQuery('School').filter({ name: { [operator]: secret } }).limit(10)
      .comment(`load ${secret}`).purpose(`inspect ${secret}`);
    const before = JSON.stringify(query);
    try {
      const rows = await f.client.executeQuery<any>(query);
      const expectFirst = operator === '$startsWith' || operator === '$notEndsWith';
      expect(rows.map(row => row.id)).toEqual([expectFirst ? '1' : '2']);
      expect(f.client.transport.reads).toHaveLength(1);
      expect(f.client.transport.reads[0].values).toEqual([
        operator.toLowerCase().includes('startswith') ? `${secret}%` : `%${secret}`, 10,
      ]);
      expect(f.evidence.snapshot()).toHaveLength(1);
      const entry = f.evidence.snapshot()[0];
      expect(entry.comment).toBe('load [REDACTED]');
      expect(entry.purpose).toBe('inspect [REDACTED]');
      expect(entry.executionOutcome).toBe('success');
      expect(entry.resultCount).toBe(1);
      expect(entry.logMode).toBe('masked');
      expect(entry.parameterLogPolicies).toEqual(['masked', 'plain']);
      expect(entry.tracePath.map(node => node.name)).toEqual(['School', 'School', 'sqlite', 'select']);
      expect(JSON.stringify([f.evidence.snapshot(), f.diagnostics, f.text])).not.toContain(secret);
      expect(f.diagnostics).toHaveLength(logging ? 1 : 0);
      expect(JSON.stringify(query)).toBe(before);
      await f.client.executeQuery(new SelectQuery('Platform').limit(1)
        .comment(`independent ${secret}`).purpose('no inherited binding'));
      expect(f.evidence.snapshot()[1].comment).toBe(`independent ${secret}`);
    } finally { await f.client.close(); }
  });

it.each([false, true])('carries LIKE operand provenance through future Facets, logging=%p', async logging => {
  const f = await fixture(logging);
  try {
    const child = new SelectQuery('Platform').filter({ name: { $startsWith: futureSecret } })
      .limit(10).aggregate('Count', 'id', 'schoolCount');
    const query = new SelectQuery('School').filter({ name: { $startsWith: secret } }).limit(10)
      .facetBy('platforms', 'platform', { toQuery: () => child }, false)
      .comment(`load ${secret} via ${futureSecret}`).purpose(`inspect ${secret} ${futureSecret}`);
    const before = JSON.stringify(query);
    expect((await f.client.executeQuery<any>(query)).map(row => row.id)).toEqual(['1']);
    const facets = await executeRelationFacets(f.client, value => value, query, query.facets);
    expect(facets.platforms.map(row => [row.id, row.schoolCount])).toEqual([['1', 1]]);
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(3);
    expect(entries.map(entry => entry.tracePath.filter(node => node.kind === 'relation').map(node => node.name)))
      .toEqual([[], [], ['platform']]);
    for (const entry of entries) {
      expect(entry.comment).toBe('load [REDACTED] via [REDACTED]');
      expect(entry.purpose).toBe('inspect [REDACTED] [REDACTED]');
    }
    expect(f.client.transport.reads[0].values).toEqual([`${secret}%`, 10]);
    expect(f.client.transport.reads[2].values).toContain(`${futureSecret}%`);
    expect(f.diagnostics).toHaveLength(logging ? 3 : 0);
    expect(JSON.stringify([entries, f.diagnostics, f.text])).not.toMatch(/FACET-PRIVATE-(SCHOOL|PLATFORM)/);
    expect(JSON.stringify(query)).toBe(before);
  } finally { await f.client.close(); }
});

it.each(['$eq', '$startsWith'])('does not infer sensitive substrings by stripping literal wildcards: %s', async operator => {
  const literal = '%LITERAL_WILDCARD%\\';
  const f = await fixture(true, literal);
  try {
    const operand = operator === '$eq' ? `${literal}-tail` : literal;
    const query = new SelectQuery('School').filter({ name: { [operator]: operand } }).limit(10)
      .comment(`private ${operand}; public LITERAL_WILDCARD`).purpose('preserve exact operand');
    // Preserve the existing SQL LIKE semantics: the caller's leading % is
    // still a wildcard, so the prefix form matches both seeded rows.
    expect(await f.client.executeQuery(query)).toHaveLength(operator === '$eq' ? 1 : 2);
    expect(f.client.transport.reads[0].values).toEqual([operator === '$eq' ? operand : `${operand}%`, 10]);
    expect(f.evidence.snapshot()[0].comment).toBe('private [REDACTED]; public LITERAL_WILDCARD');
    expect(query.commentText).toBe(`private ${operand}; public LITERAL_WILDCARD`);
  } finally { await f.client.close(); }
});

it.each(['name', 'publicName', 'password', 'unknownName'].flatMap(field =>
  [false, true].map(debug => [field, debug] as const)))(
  'retains original field policy for LIKE operand: %s debug=%p', async (field, debug) => {
    const f = await fixture(true);
    if (debug) process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
    try {
      const query = new SelectQuery('School').filter({ [field]: { $startsWith: secret } }).limit(10)
        .comment(`load ${secret}`).purpose('verify source policy');
      expect(await f.client.executeQuery(query)).toHaveLength(1);
      const visible = field === 'publicName' || (field === 'name' && debug);
      expect(f.evidence.snapshot()[0].comment).toBe(`load ${visible ? secret : '[REDACTED]'}`);
      expect(f.client.transport.reads[0].values).toEqual([`${secret}%`, 10]);
      if (!visible) expect(JSON.stringify([f.evidence.snapshot(), f.diagnostics, f.text])).not.toContain(secret);
      if (debug && field === 'name') {
        delete process.env[PLAINTEXT_LOG_ENV];
        const safeText: string[] = [];
        new TextDiagnosticSQLLogSink(line => safeText.push(line)).write(f.diagnostics[0]);
        expect(safeText.join('\n')).not.toContain(secret);
      }
    } finally { await f.client.close(); }
  });
