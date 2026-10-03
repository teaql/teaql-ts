import { SelectQuery, OrderBy } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore, SQLExecutionMetadata, SqlQueryResult } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

const column = (columnName: string, integer = false) => ({ columnName,
  logicalType: integer ? 'integer' as const : 'text' as const,
  decode: integer ? 'string' as const : 'native' as const, logPolicy: 'plain' as const });
const identity = { id: column('id', true), version: column('version', true) };
const model: Record<string, EntitySchema> = {
  Owner: { table: 'owner_data', auditMaskFields: [], columns: identity,
    relations: { parents: { targetEntity: 'Parent', localKey: 'id', foreignKey: 'ownerId', many: true } } },
  Parent: { table: 'parent_data', auditMaskFields: ['name'], columns: {
    ...identity, ownerId: column('owner_id', true), code: column('code'), name: column('name'),
  }, relations: { children: { targetEntity: 'Child', localKey: 'code', foreignKey: 'parentRef', many: true } } },
  Child: { table: 'child_data', auditMaskFields: [], columns: { ...identity, parentRef: column('parent_ref') },
    relations: {
      parentRef: { targetEntity: 'Parent', localKey: 'parentRef', foreignKey: 'code', many: false },
      parentAgain: { targetEntity: 'Parent', localKey: 'parentRef', foreignKey: 'code', many: false },
    } },
};
class Driver extends SQLiteDriver {
  reads = 0;
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (sql.startsWith('SELECT')) this.reads++;
    return super.query(sql, values);
  }
  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    this.reads++;
    yield* super.stream(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: Driver) { super(driver, model); }
}
async function fixture() {
  const driver = new Driver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  for (const [entity, id, payload] of [
    ['Owner', '1', {}],
    ['Parent', '1', { ownerId: '1', code: 'P-A', name: 'PRIVATE-PARENT' }],
    ['Parent', '2', { ownerId: '1', code: 'P-B', name: 'PRIVATE-EMPTY' }],
    ['Child', '1', { parentRef: 'P-A' }], ['Child', '2', { parentRef: 'P-A' }],
  ] as const) await client.executeMutation({ entity, id, action: 'Create', payload,
    comment: 'seed native relation membership fixture' });
  const evidence = new SQLExecutionEvidenceStore();
  const logs: SQLExecutionMetadata[] = [];
  client.setRuntimeTelemetrySink(evidence);
  client.setDiagnosticSQLLogSink({ write: entry => logs.push(entry) });
  driver.reads = 0;
  return { client, driver, evidence, logs };
}
const cases = ['list', 'stream-full', 'stream-tail'].flatMap(mode =>
  [false, true].flatMap(nested => [false, true].flatMap(logging =>
    ['scalar-control', 'visible', 'filtered', 'filtered-sibling'].map(shape => ({ mode, nested, logging, shape })))));
test.each(cases)('membership $mode nested=$nested logging=$logging $shape', async ({ mode, nested, logging, shape }) => {
  const f = await fixture();
  try {
    f.client.setQueryLoggingEnabled(logging);
    const child = new SelectQuery('Child').order(OrderBy.asc('id')).limit(10).topNProbeParentThreshold(0)
      .relationAggregate('parentRef', 'parentCount', new SelectQuery('Parent'));
    if (shape !== 'scalar-control') child.relationQuery('parentRef', new SelectQuery('Parent')
      .filter({ name: { $eq: shape === 'visible' ? 'PRIVATE-PARENT' : 'NOT-VISIBLE' } }));
    if (shape === 'filtered-sibling') child.relationQuery('parentAgain', new SelectQuery('Parent'));
    const parents = new SelectQuery('Parent').order(OrderBy.asc('id')).limit(2).topNProbeParentThreshold(0)
      .relationQuery('children', child);
    const query = (nested ? new SelectQuery('Owner').limit(1).relationQuery('parents', parents) : parents)
      .comment('load parent membership').purpose('verify scalar keys across relation hydration');
    const rows: any[] = [];
    if (mode === 'list') rows.push(...await f.client.executeQuery(query));
    else for await (const chunk of f.client.executeForStream(query, mode === 'stream-full' ? 1 : 3)) rows.push(...chunk);
    const loaded = nested ? rows[0].parents : rows;
    expect(loaded).toHaveLength(2);
    expect(loaded[0].children).toHaveLength(2);
    expect(loaded[1].children).toEqual([]);
    for (const row of loaded[0].children) {
      expect(row.parentCount).toBe(1);
      if (shape === 'scalar-control') expect(row.parentRef).toBe('P-A');
      else if (shape === 'visible') expect(row.parentRef.code).toBe('P-A');
      else expect(row.parentRef).toBeNull();
      if (shape === 'filtered-sibling') expect(row.parentAgain.code).toBe('P-A');
    }
    const expected = 4 + Number(nested) + Number(mode === 'stream-full' && !nested)
      - Number(shape === 'scalar-control') + Number(shape === 'filtered-sibling');
    expect(f.driver.reads).toBe(expected);
    const entries = f.evidence.snapshot();
    expect(entries).toHaveLength(expected);
    expect(f.logs).toHaveLength(logging ? expected : 0);
    {
      expect(entries.every(e => e.comment === 'load parent membership' && e.purpose === query.purposeText)).toBe(true);
      expect(JSON.stringify(entries)).not.toContain('PRIVATE-PARENT');
      const count = entries.find(e => /COUNT\(/i.test(e.parameterizedSQL))!;
      expect(count.tracePath.map(frame => [frame.kind, frame.name])).toEqual([
        ['operation', query.entity], ['request', query.entity],
        ...(nested ? [['relation', 'parents']] : []), ['relation', 'children'], ['relation', 'parentRef'],
        ['provider', 'sqlite'], ['sql', 'select'],
      ]);
    }
    const plain = await f.client.executeQuery<any>(new SelectQuery('Child').limit(2)
      .comment('independent request').purpose('verify no assembly state escapes'));
    expect(plain.map(row => row.parentRef)).toEqual(['P-A', 'P-A']);
    expect(plain.map(row => Object.keys(row).sort())).toEqual([['id', 'parentRef', 'version'], ['id', 'parentRef', 'version']]);
    const final = f.evidence.snapshot();
    expect(final[final.length - 1].tracePath.map(frame => frame.kind))
      .toEqual(['operation', 'request', 'provider', 'sql']);
  } finally { await f.client.close(); }
});
