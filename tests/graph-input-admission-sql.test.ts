import {UserContext} from '../src/core/context';
import {GraphMutationSession, MutationIntent} from '../src/core/request-intent';
import {LoadedEntityIdentityError} from '../src/core/loaded-scalar-snapshot';
import {AbstractSQLTeaQLClient, EntitySchema} from '../src/sql/core';
import {SQLiteDriver} from '../src/sql/sqlite';
const schemas: Record<string, EntitySchema> = {Probe: {table: 'graph_admission_probe', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
  version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  name: {columnName: 'name', logicalType: 'text', decode: 'string'},
}}};
class Client extends AbstractSQLTeaQLClient {constructor(readonly database: SQLiteDriver) {super(database, schemas);}}
async function fixture() {
  let clocks = 0;
  const context = new UserContext().withBusinessClock({now: () => {clocks++; return new Date('2032-01-01');}});
  const client = new Client(new SQLiteDriver(':memory:')).setUserContext(context).setDiagnosticSQLLogSink(undefined);
  try {
    context.insertResource('dataService', client); await context.ensureSchema();
    await client.executeMutation({entity: 'Probe', action: 'Create', id: '1', payload: {name: 'original'}, comment: 'seed admission test'});
    clocks = 0;
    return {context, client, clocks: () => clocks};
  } catch (error) {await client.close(); throw error;}
}
const intent = () => new MutationIntent('verify whole input before Fix and clock');
test('an admitted empty graph has no clock, policy, transaction, Fix resource or query effects', async () => {
  const {context, client, clocks} = await fixture();
  try {
    const existing = new Date('2001-01-01'); context.insertResource('fixTime', existing);
    const query = jest.spyOn(client.database, 'query'), transaction = jest.spyOn(client.database, 'transaction');
    const policy = jest.spyOn(context, 'beginMutationPolicyGraph');
    const result = await client.executeGraphSave(intent(), async graph => {expect(graph.isPreparedEmpty).toBe(true); return 'unchanged';},
      () => {throw new Error('Fix phase must not execute for a complete empty graph');}, () => false);
    expect(result).toBe('unchanged'); expect(clocks()).toBe(0); expect(policy).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled();
    expect(context.getResource('fixTime')).toBe(existing);
  } finally {await client.close();}
});
test('an invalid graph rejects without touching an existing Fix resource', async () => {
  const {context, client, clocks} = await fixture();
  try {
    const existing = new Date('2002-01-01'); context.insertResource('fixTime', existing);
    const transaction = jest.spyOn(client.database, 'transaction'), query = jest.spyOn(client.database, 'query');
    await expect(client.executeGraphSave(intent(), async () => 'unreachable', undefined,
      () => {throw new LoadedEntityIdentityError('id');})).rejects.toBeInstanceOf(LoadedEntityIdentityError);
    expect(clocks()).toBe(0); expect(query).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled();
    expect(context.getResource('fixTime')).toBe(existing);
  } finally {await client.close();}
});
test.each([undefined, Promise.resolve(false)])('admission cannot silently omit its synchronous boolean result: %s', async value => {
  const {client, clocks} = await fixture();
  try {
    const transaction = jest.spyOn(client.database, 'transaction');
    await expect(client.executeGraphSave(intent(), async () => undefined, undefined,
      (() => value) as any)).rejects.toThrow('GRAPH_ADMISSION_RESULT_REQUIRED');
    expect(clocks()).toBe(0); expect(transaction).not.toHaveBeenCalled();
  } finally {await client.close();}
});
test('a valid admitted graph still captures exactly one clock and persists the normal prepared update', async () => {
  const {client, clocks} = await fixture();
  try {
    let request: ReturnType<GraphMutationSession['request']>;
    const result = await client.executeGraphSave(intent(), graph => client.executeMutation(request), graph => {
      request = graph.request({entity: 'Probe', id: '1', action: 'Update', version: 1, payload: {name: 'next'}});
      client.preflightMutation(request); graph.sealPreparedGraph();
    }, () => true);
    expect(clocks()).toBe(1); expect(result.version).toBe(2);
    const actual = await client.database.query('SELECT name,version FROM graph_admission_probe WHERE id=1');
    expect(actual.rows).toEqual([{name: 'next', version: 2}]);
  } finally {await client.close();}
});
test('whole-input admission runs inside the serialized save queue, not before a preceding save can change state', async () => {
  const {client, clocks} = await fixture();
  let release!: () => void, began!: () => void;
  const hold = new Promise<void>(resolve => {release = resolve;}), started = new Promise<void>(resolve => {began = resolve;});
  try {
    let identity = 'loaded';
    const first = client.executeGraphSave(intent(), async () => {began(); await hold; identity = 'changed';}, undefined, () => false);
    await started;
    const second = client.executeGraphSave(intent(), async () => 'unreachable', undefined, () => {
      if (identity === 'changed') throw new LoadedEntityIdentityError('version');
      return false;
    });
    const rejected = expect(second).rejects.toBeInstanceOf(LoadedEntityIdentityError);
    release(); await first; await rejected; expect(clocks()).toBe(0);
  } finally {release(); await client.close();}
});
