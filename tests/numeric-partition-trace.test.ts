import { OrderBy, SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { PLAINTEXT_LOG_ENV } from '../src/core/log-privacy';
import {
  AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore,
  SQLExecutionMetadata, SqlQueryResult,
} from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

// TC-SQL-10 native subset: public numeric grouping and relation-derived windows.
// SelectQuery has no HAVING or public root partitionBy API; do not invent one.
const SECRET = 'PRIVATE-NUMERIC-PARTITION';
const integer = (columnName: string) => ({ columnName, logicalType: 'integer' as const,
  decode: 'number' as const, logPolicy: 'plain' as const });
const identity = { id: integer('id'), version: integer('version') };
const schemas: Record<string, EntitySchema> = {
  GroupRoot: { table: 'group_root', columns: identity, relations: {
    owners: { targetEntity: 'GroupOwner', localKey: 'id', foreignKey: 'rootId', many: true },
  } },
  GroupOwner: { table: 'group_owner', columns: { ...identity, rootId: integer('root_id') }, relations: {
    samples: { targetEntity: 'MetricSample', localKey: 'id', foreignKey: 'ownerId', many: true },
  } },
  MetricSample: { table: 'metric_sample', auditMaskFields: ['name'], columns: {
    ...identity, ownerId: integer('owner_id'), bucket: integer('bucket'),
    name: { columnName: 'name', logicalType: 'text', decode: 'string', logPolicy: 'plain' },
  } },
};

class Driver extends SQLiteDriver {
  readonly reads: Array<{ sql: string; values: unknown[] }> = [];
  override async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (sql.startsWith('SELECT')) this.reads.push({ sql, values: [...values] });
    return super.query(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  constructor(readonly transport = new Driver(':memory:')) { super(transport, schemas); }
}

async function fixture(logging: boolean) {
  const client = new Client().setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  await client.executeMutation({ entity: 'GroupRoot', action: 'Create', id: 1, payload: {}, comment: 'seed group root' });
  for (const id of [1, 2, 3]) await client.executeMutation({ entity: 'GroupOwner', action: 'Create', id,
    payload: { rootId: 1 }, comment: 'seed numeric group owner' });
  // Different per-owner counts, a filtered row, an orphan, and an empty owner.
  const samples = [[1, 20], [1, 10], [1, 10], [1, 20], [2, 20], [2, 20], [2, 10], [null, 30]];
  for (const [index, [ownerId, bucket]] of samples.entries()) await client.executeMutation({
    entity: 'MetricSample', action: 'Create', id: index + 1,
    payload: { ownerId, bucket, name: index === 3 ? 'excluded' : SECRET }, comment: 'seed numeric sample',
  });
  const evidence = new SQLExecutionEvidenceStore();
  const diagnostics: SQLExecutionMetadata[] = [];
  client.setRuntimeTelemetrySink(evidence).setQueryLoggingEnabled(logging)
    .setDiagnosticSQLLogSink({ write: entry => { diagnostics.push(entry); } });
  client.transport.reads.length = 0;
  return { client, evidence, diagnostics };
}

const previousPlaintext = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (previousPlaintext === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = previousPlaintext;
});

const cases = ['root', 'window', 'probe'].flatMap(shape =>
  [true, false].flatMap(logging => [1, 10].map(limit => ({ shape, logging, limit }))));
test.each(cases)('numeric grouping $shape logging=$logging limit=$limit', async ({ shape, logging, limit }) => {
  const f = await fixture(logging);
  try {
    expect(schemas.MetricSample.relations?.bucket).toBeUndefined();
    const grouped = new SelectQuery('MetricSample').groupBy('ownerId').groupBy('bucket')
      .aggregate('Count', 'id', 'n').filter({ name: { $eq: SECRET }, ownerId: { $isNull: false } })
      .order(OrderBy.desc('bucket')).limit(limit);
    const root = shape === 'root' ? 'MetricSample' : 'GroupRoot';
    const query = (shape === 'root' ? grouped.order(OrderBy.asc('ownerId'))
      : new SelectQuery('GroupRoot').limit(1).relationQuery('owners',
        new SelectQuery('GroupOwner').limit(10).order(OrderBy.asc('id'))
          .relationQuery('samples', grouped.topNProbeParentThreshold(shape === 'window' ? 0 : 32))))
      .comment(`count numeric groups ${SECRET}`).purpose(`render numeric groups ${SECRET}`);
    const original = JSON.stringify(query);
    const rows = await f.client.executeQuery<any>(query);
    if (shape === 'root') {
      expect(rows.map(row => [row.ownerId, row.bucket, row.n]))
        .toEqual([[1, 20, 1], [2, 20, 2], [1, 10, 2], [2, 10, 1]].slice(0, limit));
    } else {
      expect(rows).toHaveLength(1);
      expect(rows[0].owners.map((owner: any) => [owner.id,
        owner.samples.map((row: any) => [row.bucket, row.n])])).toEqual([
        [1, [[20, 1], [10, 2]].slice(0, limit)],
        [2, [[20, 2], [10, 1]].slice(0, limit)], [3, []],
      ]);
      for (const owner of rows[0].owners) for (const sample of owner.samples) {
        expect(sample).not.toHaveProperty('__teaql_partition_rank');
      }
    }
    expect(JSON.stringify(query)).toBe(original);
    const entries = f.evidence.snapshot();
    const routes = shape === 'root' ? [[]] : [[], ['GroupRoot.owners'],
      ...Array.from({ length: shape === 'window' ? 1 : 3 }, () => ['GroupRoot.owners', 'GroupOwner.samples'])];
    expect(entries).toHaveLength(routes.length);
    expect(f.client.transport.reads).toHaveLength(routes.length);
    expect(f.diagnostics).toHaveLength(logging ? routes.length : 0);
    entries.forEach((entry, index) => {
      expect(entry.tracePath.map(node => [node.kind, node.name, node.detail ?? ''])).toEqual([
        ['operation', root, 'query'], ['request', root, ''],
        ...routes[index].map(field => ['relation', field.split('.').pop(), field]),
        ['provider', 'sqlite', ''], ['sql', 'select', ''],
      ]);
      expect(entry.executionOutcome).toBe('success');
      expect(entry.comment).toContain('count numeric groups');
      expect(entry.purpose).toContain('render numeric groups');
      console.log(`NUMERIC_SQL shape=${shape} logging=${logging} limit=${limit} ` +
        JSON.stringify({ sql: entry.parameterizedSQL, path: entry.tracePath }));
    });
    // The future-only child operand must protect the very first root statement.
    expect(JSON.stringify(entries)).not.toContain(SECRET);
    expect(JSON.stringify(f.diagnostics)).not.toContain(SECRET);
    if (shape !== 'root') expect(f.client.transport.reads[0].values).not.toContain(SECRET);
    const groupedReads = f.client.transport.reads.filter(read => read.sql.includes('COUNT('));
    expect(groupedReads).toHaveLength(shape === 'probe' ? 3 : 1);
    for (const read of groupedReads) {
      expect(read.values).toContain(SECRET);
      expect(read.sql).toContain('GROUP BY "owner_id", "bucket"');
      expect(read.sql.includes('ROW_NUMBER() OVER')).toBe(shape === 'window');
      expect(read.sql).toContain('ORDER BY "bucket" DESC, "owner_id" ASC');
      expect(read.sql).not.toContain(', "id" ASC');
    }
    f.evidence.enableAll();
    f.diagnostics.length = 0;
    await f.client.executeQuery(new SelectQuery('GroupRoot').limit(1)
      .comment(SECRET).purpose('independent numeric query'));
    expect(f.evidence.snapshot()[0].comment).toBe(SECRET);
    expect(f.evidence.snapshot()[0].tracePath.map(node => node.name))
      .toEqual(['GroupRoot', 'GroupRoot', 'sqlite', 'select']);
    expect(f.diagnostics).toHaveLength(logging ? 1 : 0);
    console.log(`NUMERIC_RESULT shape=${shape} logging=${logging} limit=${limit} SQL=${routes.length} counts=verified`);
  } finally { await f.client.close(); }
});
