import {UserContext} from '../src/core/context';
import {SelectQuery} from '../src/core/ast';
import {MutationIntent} from '../src/core/request-intent';
import {AbstractSQLTeaQLClient, EntitySchema} from '../src/sql/core';
import {SQLiteDriver} from '../src/sql/sqlite';

// Both generated Float and Double use logicalType:double. Canonical model keys
// differ from native members to cover admission and column mapping together.
const schemas: Record<string, EntitySchema> = {Probe: {table: 'finite_probe', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
  version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  requiredFloat: {columnName: 'required_float', modelName: 'required_float', logicalType: 'double', decode: 'number'},
  optionalDouble: {columnName: 'optional_double', modelName: 'optional_double', logicalType: 'double', decode: 'number', nullable: true},
}}};
class Client extends AbstractSQLTeaQLClient {
  constructor(readonly database: SQLiteDriver) {super(database, schemas);}
}
async function fixture() {
  const client = new Client(new SQLiteDriver(':memory:'));
  client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  await client.executeMutation({entity: 'Probe', action: 'Create', id: '1',
    payload: {required_float: 1.5, optional_double: 2.25}, comment: 'seed finite scalar row'});
  return client;
}
const badValues: Array<[string, unknown]> = [['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity], ['numeric text', '1.5']];
for (const action of ['Create', 'Update']) for (const field of ['required_float', 'optional_double']) {
  test.each(badValues)(`${action} ${field} rejects %s before any provider work`, async (_name, value) => {
    const client = await fixture();
    try {
      const beforeAudit = client.auditTrace;
      const transaction = jest.spyOn(client.database, 'transaction');
      const query = jest.spyOn(client.database, 'query');
      const allocate = jest.spyOn(client.database, 'nextId');
      const floor = jest.spyOn(client.database, 'ensureIdFloor');
      await expect(client.executeMutation({entity: 'Probe', action, ...(action === 'Update' ? {id: '1', version: 1} : {}),
        payload: {required_float: 1.5, [field]: value}, comment: 'reject non-portable floating point'}))
        .rejects.toThrow(new RegExp(`finite.*${field}|${field}.*finite`, 'i'));
      for (const provider of [transaction, query, allocate, floor]) expect(provider).not.toHaveBeenCalled();
      expect(client.auditTrace).toEqual(beforeAudit);
      const rows = await client.executeQuery<any>(new SelectQuery('Probe').limit(2)
        .comment('verify rejected numeric mutation').purpose('preserve row and version'));
      expect(rows).toEqual([{id: '1', version: 1, requiredFloat: 1.5, optionalDouble: 2.25}]);
    } finally {await client.close();}
  });
}
test('graph preparation rejects non-finite fields before opening a transaction', async () => {
  const client = await fixture();
  try {
    const transaction = jest.spyOn(client.database, 'transaction');
    const work = jest.fn();
    await expect(client.executeGraphSave(new MutationIntent('reject invalid numeric graph'), work, graph => {
      client.preflightMutation(graph.request({entity: 'Probe', action: 'Create',
        payload: {required_float: Infinity}, comment: 'prepare numeric graph'}));
    })).rejects.toThrow(/required_float.*finite|finite.*required_float/i);
    expect(transaction).not.toHaveBeenCalled(); expect(work).not.toHaveBeenCalled();
  } finally {await client.close();}
});
test.each([0, -0, 1.5, -3.5, Number.MIN_VALUE, Number.MAX_VALUE])('finite floating point %s remains portable', async value => {
  const client = await fixture();
  try {
    const saved = await client.executeMutation({entity: 'Probe', action: 'Update', id: '1', version: 1,
      payload: {required_float: value, optional_double: null}, comment: 'save finite float and explicit null'});
    const json = JSON.parse(JSON.stringify(saved.persistedRecord));
    expect(json.requiredFloat).toBe(value === 0 ? 0 : value);
    expect(json.optionalDouble).toBeNull(); expect(json.version).toBe(2);
  } finally {await client.close();}
});
test('legacy non-finite stored numbers fail readback rather than becoming JSON null', async () => {
  const client = await fixture();
  try {
    // Deliberate corruption oracle, not an alternative business write API.
    await client.database.query('UPDATE finite_probe SET required_float = ? WHERE id = 1', [Infinity]);
    await expect(client.executeQuery(new SelectQuery('Probe').limit(1)
      .comment('inspect a non-portable legacy value').purpose('reject silent JSON null')))
      .rejects.toThrow(/required_float.*finite|finite.*required_float/i);
  } finally {await client.close();}
});
