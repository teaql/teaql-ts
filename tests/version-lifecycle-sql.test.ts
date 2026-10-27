import {SelectQuery} from '../src/core/ast';
import {UserContext} from '../src/core/context';
import {RuntimeModule} from '../src/core/runtime-module';
import {DelegatingMutationPolicyRegistry} from '../src/core/mutation-policy';
import {long} from '../src/core/long';
import {AbstractSQLTeaQLClient, EntitySchema} from '../src/sql/core';
import {SQLiteDriver} from '../src/sql/sqlite';

const MAX = '9223372036854775807', MIN = '-9223372036854775808';
const schemas: Record<string, EntitySchema> = {Probe: {table: 'version_probe', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
  version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  name: {columnName: 'name', logicalType: 'text', decode: 'string'},
}}};
class Client extends AbstractSQLTeaQLClient {
  constructor(readonly database: SQLiteDriver) {super(database, schemas);}
}
async function fixture(version = '1') {
  const client = new Client(new SQLiteDriver(':memory:')).setDiagnosticSQLLogSink(undefined);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    await client.executeMutation({entity: 'Probe', action: 'Create', id: '1', payload: {name: 'original'}, comment: 'seed version fixture'});
    // Deliberate boundary-state oracle, not a business write implementation.
    await client.database.query('UPDATE version_probe SET version = ? WHERE id = 1', [version]);
    const effects = {fix: 0, review: 0, clock: 0};
    const context = new UserContext().withBusinessClock({now: () => {effects.clock++; return new Date('2026-10-27T00:00:00Z');}})
      .withMutationPolicyRegistry(new DelegatingMutationPolicyRegistry(() => ({
        identity: {policyId: 'version-fixture', version: '1', fingerprint: 'controlled'},
        review: () => {effects.review++; return {verdict: 'allow' as const};},
      })));
    client.setUserContext(context).install(new RuntimeModule(schemas, {Probe: {checkAndFix() {effects.fix++;}}}));
    return {client, effects};
  } catch (error) {await client.close(); throw error;}
}
async function stored(client: Client) {
  const result = await client.database.query('SELECT CAST(version AS TEXT) AS version,typeof(version) AS storage_type,name FROM version_probe WHERE id = 1');
  return result.rows[0];
}
const selected = () => new SelectQuery('Probe').limit(1).comment('inspect a precise optimistic version')
  .purpose('preserve signed sixty-four-bit lifecycle');

test.each(['9007199254740992', '9007199254740993', '9223372036854775806', MAX])(
  'Q hydration and JSON retain wide version %s without Number conversion', async version => {
    const {client} = await fixture(version);
    try {
      const rows = await client.executeQuery<any>(selected());
      expect(rows[0].version).toBe(long(version));
      expect(JSON.parse(JSON.stringify(rows))[0].version).toBe(version);
      expect(await stored(client)).toEqual({version, storage_type: 'integer', name: 'original'});
    } finally {await client.close();}
  });

test.each(['9007199254740991', '9223372036854775806'])(
  'a legal update at %s returns the exact next version and persisted record', async version => {
    const {client} = await fixture(version), expected = (BigInt(version) + 1n).toString();
    try {
      const result = await client.executeMutation({entity: 'Probe', action: 'Update', id: '1', version: long(version),
        payload: {name: 'updated'}, comment: 'advance the last representable version'});
      expect(result.version).toBe(long(expected)); expect(result.persistedRecord?.version).toBe(long(expected));
      expect(JSON.parse(JSON.stringify(result.persistedRecord)).version).toBe(expected);
      expect(await stored(client)).toEqual({version: expected, storage_type: 'integer', name: 'updated'});
    } finally {await client.close();}
  });

test('deletion of MAX reaches exactly MIN without an overflowing SQL intermediate', async () => {
  const {client} = await fixture(MAX);
  try {
    const result = await client.executeMutation({entity: 'Probe', action: 'Delete', id: '1', version: long(MAX), payload: {}, comment: 'delete the largest live version'});
    expect(result.version).toBe(long(MIN)); expect(result.persistedRecord?.version).toBe(long(MIN));
    expect(await stored(client)).toEqual({version: MIN, storage_type: 'integer', name: 'original'});
    expect(await client.executeQuery(selected())).toEqual([]);
  } finally {await client.close();}
});

const rejected: Array<[string, 'Update' | 'Delete', unknown]> = [
  ['exhausted live version', 'Update', MAX],
  ...(['Update', 'Delete'] as const).flatMap(action => [
    ['zero', action, 0], ['tombstone', action, -2], ['null', action, null], ['fraction', action, 1.5],
    ['NaN', action, NaN], ['Infinity', action, Infinity], ['rounded integer', action, Number(MAX)],
    ['out-of-domain text', action, '9223372036854775808'], ['noncanonical text', action, '01'],
  ] as Array<[string, 'Update' | 'Delete', unknown]>),
];
test.each(rejected)('%s %s rejects before Fix, clock, policy, transaction or provider', async (_label, action, version) => {
  const {client, effects} = await fixture();
  try {
    const transaction = jest.spyOn(client.database, 'transaction'), query = jest.spyOn(client.database, 'query');
    const audits = client.auditTrace;
    await expect(client.executeMutation({entity: 'Probe', action, id: '1', version, payload: action === 'Delete' ? {} : {name: 'must not write'},
      comment: 'reject invalid version before side effects'})).rejects.toThrow(/version/i);
    expect(effects).toEqual({fix: 0, review: 0, clock: 0});
    expect(transaction).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled(); expect(client.auditTrace).toEqual(audits);
    query.mockRestore(); expect(await stored(client)).toEqual({version: '1', storage_type: 'integer', name: 'original'});
  } finally {await client.close();}
});

test('versionless administrative deletion must never recover an existing tombstone', async () => {
  const {client} = await fixture('-2');
  try {
    const audits = client.auditTrace;
    await expect(client.executeMutation({entity: 'Probe', action: 'Delete', id: '1', payload: {}, comment: 'do not re-delete a tombstone'}))
      .rejects.toThrow(/Optimistic lock|version/i);
    expect(await stored(client)).toEqual({version: '-2', storage_type: 'integer', name: 'original'});
    expect(client.auditTrace).toEqual(audits);
  } finally {await client.close();}
});

test('an ordinary safe version retains its native number API', async () => {
  const {client} = await fixture();
  try {
    const result = await client.executeMutation({entity: 'Probe', action: 'Update', id: '1', version: 1, payload: {name: 'ordinary'}, comment: 'retain exact ordinary versions'});
    expect(result.version).toBe(2); expect(result.persistedRecord?.version).toBe(2);
    expect(await stored(client)).toEqual({version: '2', storage_type: 'integer', name: 'ordinary'});
  } finally {await client.close();}
});
