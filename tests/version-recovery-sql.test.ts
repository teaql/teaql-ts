import {MutationQuery, SelectQuery} from '../src/core/ast';
import {UserContext} from '../src/core/context';
import {RuntimeModule} from '../src/core/runtime-module';
import {long} from '../src/core/long';
import {AbstractSQLTeaQLClient, EntitySchema} from '../src/sql/core';
import {SQLiteDriver} from '../src/sql/sqlite';
const MIN = -9223372036854775808n;
const schemas: Record<string, EntitySchema> = {Probe: {table: 'recovery_probe', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'}, version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  name: {columnName: 'name', logicalType: 'text', decode: 'string'},
}}};
class Client extends AbstractSQLTeaQLClient {constructor(readonly database: SQLiteDriver) {super(database, schemas);}}
async function fixture(version: string) {
  const client = new Client(new SQLiteDriver(':memory:')).setDiagnosticSQLLogSink(undefined);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    await client.executeMutation({entity: 'Probe', action: 'Create', id: '1', payload: {name: 'original'}, comment: 'seed recovery fixture'});
    await client.database.query('UPDATE recovery_probe SET version=? WHERE id=1', [version]); return client;
  } catch (error) {await client.close(); throw error;}
}
test.each([-1n, -2n, MIN + 2n])('explicit recovery of %s preserves its checked exact result', async value => {
  const client = await fixture(value.toString()), expected = -value + 1n;
  try {
    const result = await client.executeMutation(new MutationQuery('Probe', 'Recover', {}, '1', 'explicitly recover a tombstone',
      expected > BigInt(Number.MAX_SAFE_INTEGER) ? long(value) : Number(value)));
    expect(String(result.version)).toBe(expected.toString()); expect(result.deleted).toBe(false);
    const actual = await client.database.query('SELECT CAST(version AS TEXT) AS version,typeof(version) AS storage_type FROM recovery_probe WHERE id=1');
    expect(actual.rows).toEqual([{version: expected.toString(), storage_type: 'integer'}]);
    const rows = await client.executeQuery<any>(new SelectQuery('Probe').limit(1).comment('load the explicitly recovered row').purpose('verify live visibility'));
    expect(String(rows[0].version)).toBe(expected.toString());
    expect(client.auditTrace[client.auditTrace.length - 1].action).toBe('Recover');
    expect(result.metadata?.statements?.[0].operation).toBe('update');
  } finally {await client.close();}
});
test.each([MIN, MIN + 1n, 0n, 1n])('invalid recovery of %s rejects before provider entry', async value => {
  const client = await fixture(value.toString());
  try {
    const query = jest.spyOn(client.database, 'query'), transaction = jest.spyOn(client.database, 'transaction'), audit = client.auditTrace;
    await expect(client.executeMutation({entity: 'Probe', action: 'Recover', id: '1', version: long(value), payload: {}, comment: 'reject invalid recovery'})).rejects.toThrow(/version/);
    expect(query).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled(); expect(client.auditTrace).toEqual(audit);
  } finally {await client.close();}
});
test('a field Fix cannot replace the optimistic version reviewed by the caller', async () => {
  const client = await fixture('1');
  try {
    client.install(new RuntimeModule({}, {Probe: {checkAndFix(_context, mutation) {mutation.version = 2;}}}));
    const query = jest.spyOn(client.database, 'query'), transaction = jest.spyOn(client.database, 'transaction');
    await expect(client.executeMutation({entity: 'Probe', action: 'Update', id: '1', version: 1, payload: {name: 'no'}, comment: 'retain the supplied optimistic version'}))
      .rejects.toThrow(/version/);
    expect(query).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled();
  } finally {await client.close();}
});
test('expectedVersion and generated version cannot disagree', async () => {
  const client = await fixture('1');
  try {
    const query = jest.spyOn(client.database, 'query');
    await expect(client.executeMutation({entity: 'Probe', action: 'Update', id: '1', version: 1, expectedVersion: 2,
      payload: {name: 'no'}, comment: 'reject conflicting optimistic metadata'})).rejects.toThrow(/version/);
    expect(query).not.toHaveBeenCalled();
  } finally {await client.close();}
});
