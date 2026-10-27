import {SelectQuery} from '../src/core/ast';
import {UserContext} from '../src/core/context';
import {AbstractSQLTeaQLClient, EntitySchema} from '../src/sql/core';
import {SQLiteDriver} from '../src/sql/sqlite';

const schemas: Record<string, EntitySchema> = {Probe: {table: 'visibility_probe', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
  version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  name: {columnName: 'name', logicalType: 'text', decode: 'string'},
}}};
class Client extends AbstractSQLTeaQLClient {constructor(readonly database: SQLiteDriver) {super(database, schemas);}}
const bounded = () => new SelectQuery('Probe').limit(10).comment('load lifecycle visibility')
  .purpose('verify deletion never silently changes the selected rows');
async function fixture() {
  const client = new Client(new SQLiteDriver(':memory:')).setDiagnosticSQLLogSink(undefined);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const id of ['1', '2']) await client.executeMutation({entity: 'Probe', action: 'Create', id,
      payload: {name: `row-${id}`}, comment: 'create visibility fixture'});
    await client.executeMutation({entity: 'Probe', action: 'Delete', id: '2', version: 1,
      payload: {}, comment: 'mark one row deleted'});
    return client;
  } catch (error) {await client.close(); throw error;}
}
test.each(['live', 'all', 'deleted'] as const)('row, count and clone preserve explicit %s visibility', async visibility => {
  const client = await fixture();
  try {
    const query = bounded();
    if (visibility === 'all') query.withDeletedRows();
    if (visibility === 'deleted') query.deletedRowsOnly();
    const before = JSON.stringify(query), expected = visibility === 'all' ? ['1', '2'] : [visibility === 'live' ? '1' : '2'];
    const actual = await client.executeQuery<any>(query);
    expect(actual.map(row => row.id).sort()).toEqual(expected);
    expect(await client.executeCount(query.clone())).toBe(expected.length);
    const count = await client.executeQuery<any>(query.forExactCount('rows'));
    expect(count).toEqual([{rows: expected.length}]);
    expect(query.clone().deletionVisibility).toBe(visibility);
    expect(JSON.stringify(query)).toBe(before);
  } finally {await client.close();}
});
test('unknown visibility rejects before entering the SQL provider', async () => {
  const client = await fixture();
  try {
    const query = bounded(); (query as any).deletionVisibility = 'unrecognized';
    const provider = jest.spyOn(client.database, 'query');
    await expect(client.executeQuery(query)).rejects.toThrow('QUERY_INVALID_DELETION_VISIBILITY');
    expect(provider).not.toHaveBeenCalled();
  } finally {await client.close();}
});
