import {CheckException, EntityChecker, EntityRoot, MutationIntent, ObjectLocation, RuntimeModule, SelectQuery, UserContext} from '../src';
import {AbstractSQLTeaQLClient, ColumnSchema, EntitySchema} from '../src/sql/core';
import {SQLiteDriver} from '../src/sql/sqlite';

// Structural assignment intentionally compiles on the original runtime too.
// The identical fixture proves whether that runtime actually honors the marker.
const integer = (name: string, nullable = false): ColumnSchema => Object.assign({
  columnName: name, modelName: name, logicalType: 'integer' as const, decode: 'number' as const, nullable,
}, {integer32: true});
const schemas: Record<string, EntitySchema> = {WidthProbe: {table: 'width_probe', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
  version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  requiredInteger: integer('required_integer'), optionalInteger: integer('optional_integer', true),
  wideLong: {columnName: 'wide_long', modelName: 'wide_long', logicalType: 'long', decode: 'long'},
}}};
class Client extends AbstractSQLTeaQLClient {
  constructor(readonly database: SQLiteDriver) {super(database, schemas);}
}
async function fixture() {
  const client = new Client(new SQLiteDriver(':memory:')).setUserContext(new UserContext());
  client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  await client.executeMutation({entity: 'WidthProbe', action: 'Create', id: '5000000000',
    payload: {required_integer: 7, optional_integer: null, wide_long: '9223372036854775807'}, comment: 'prepare exact width controls'});
  return client;
}
function query() {return new SelectQuery('WidthProbe').limit(2).comment('read modeled Integer controls').purpose('verify exact domain and absence');}
function precise(error: unknown, field: string) {
  expect(error).toBeInstanceOf(CheckException);
  const result = (error as CheckException).violations.find(v=>v.ruleId === 'invalid_type' && v.location.modelPath() === field);
  expect(result).toBeDefined();expect(result!.entityType).toBe('WidthProbe');expect(result!.inputValue).toBeUndefined();
  expect(String(error)).not.toContain('PRIVATE-INTEGER-INPUT');
}
const fields = ['required_integer', 'optional_integer'];
const bad: Array<[string, unknown]> = [['below', -2147483649], ['above', 2147483648], ['fraction', 1.5],
  ['NaN', NaN], ['Infinity', Infinity], ['text', 'PRIVATE-INTEGER-INPUT'], ['boolean', true]];
for (const action of ['Create', 'Update']) for (const field of fields) test.each(bad)(
  `modeled Integer32 ${action} ${field} rejects %s before provider`, async (_name, value) => {
    const client = await fixture();
    try {
      const audit = client.auditTrace;
      const effects = [jest.spyOn(client.database, 'query'), jest.spyOn(client.database, 'transaction'),
        jest.spyOn(client.database, 'nextId'), jest.spyOn(client.database, 'ensureIdFloor')];
      let failure: unknown;
      try {await client.executeMutation({entity: 'WidthProbe', action, ...(action === 'Update' ? {id: '5000000000', version: 1} : {}),
        payload: {required_integer: 7, optional_integer: null, wide_long: '9223372036854775807', [field]: value}, comment: 'reject invalid modeled Integer'});}
      catch (error) {failure = error;}
      precise(failure, field);for (const e of effects) expect(e).not.toHaveBeenCalled();expect(client.auditTrace).toEqual(audit);
      expect(await client.executeQuery(query())).toEqual([{id: '5000000000', version: 1, requiredInteger: 7, optionalInteger: null, wideLong: '9223372036854775807'}]);
    } finally {await client.close();}
  });
for (const field of fields) for (const action of ['Create', 'Update']) test.each([-2147483649,2147483648])(
  `modeled Integer32 final Fix ${action} ${field} rejects %s without changing intent`, async value => {
    const client = await fixture();let calls = 0;
    try {
      const checker: EntityChecker = {checkAndFix(_ctx, mutation) {calls++;mutation.payload[field] = value;}};
      client.install(new RuntimeModule({}, {WidthProbe: checker}));
      const root = new EntityRoot(), key = {entity: 'WidthProbe', id: '5000000000'};
      root.set(key, field, 7);const pending = root.change(key);
      const providers = [jest.spyOn(client.database, 'query'),jest.spyOn(client.database, 'transaction')];
      let failure: unknown;
      try {await client.executeMutation({entity: 'WidthProbe', action, ...(action === 'Update' ? {id: '5000000000', version: 1} : {}),
        ledgerRoot: root, ledgerKey: key, payload: {[field]: 7}, comment: 'final Fix must not widen a modeled Integer'});}
      catch (error) {failure = error;}
      precise(failure, field);expect(calls).toBe(1);for (const p of providers) expect(p).not.toHaveBeenCalled();expect(root.change(key)).toEqual(pending);
    } finally {await client.close();}
  });
for (const field of fields) test.each([['below',-2147483649],['above',2147483648],['fraction',1.5],['text','PRIVATE-INTEGER-INPUT']])(
  `modeled Integer32 real legacy ${field} %s fails read but omitted projection remains absent`, async (_name,value) => {
    const client = await fixture();
    try {
      // Explicit test-only corrupt writer; ordinary setup/save uses Mutation.
      await client.database.query(`UPDATE width_probe SET ${field} = ? WHERE id = ?`, [value, '5000000000']);
      let failure: unknown;try {await client.executeQuery(query());} catch(error) {failure=error;}
      precise(failure,field);
      const partial = query().select(['id','version']);
      expect(await client.executeQuery(partial)).toEqual([{id:'5000000000',version:1}]);
      const stored=await client.database.query(`SELECT ${field},version FROM width_probe`);
      expect(stored.rows[0][field]).toBe(value);expect(stored.rows[0].version).toBe(1);
    } finally {await client.close();}
  });
test.each([-2147483648,0,2147483647])('modeled Integer32 endpoint %s retains wide Long, identity, version and nullable state', async value => {
  const client=await fixture();
  try {
    const saved=await client.executeMutation({entity:'WidthProbe',action:'Update',id:'5000000000',version:1,
      payload:{required_integer:value,optional_integer:null},comment:'persist valid endpoint'});
    expect(saved.version).toBe(2);
    expect(await client.executeQuery(query())).toEqual([{id:'5000000000',version:2,requiredInteger:value,optionalInteger:null,wideLong:'9223372036854775807'}]);
  } finally {await client.close();}
});
test('modeled Integer32 one Fix may repair an initially out-of-domain value before admission', async()=>{
  const client=await fixture();let calls=0;
  try {
    client.install(new RuntimeModule({}, {WidthProbe:{checkAndFix(_context,mutation){calls++;mutation.payload.required_integer=2147483647;}}}));
    const saved=await client.executeMutation({entity:'WidthProbe',action:'Update',id:'5000000000',version:1,
      payload:{required_integer:Number.MAX_SAFE_INTEGER},comment:'repair before final Integer admission'});
    expect(calls).toBe(1);expect(saved.persistedRecord?.requiredInteger).toBe(2147483647);expect(saved.version).toBe(2);
  } finally {await client.close();}
});
test('modeled Integer32 graph rejection precedes transaction and work', async()=>{
  const client=await fixture();try {
    const transaction=jest.spyOn(client.database,'transaction'),work=jest.fn();
    let failure: unknown;
    try {await client.executeGraphSave(new MutationIntent('reject invalid width before graph work'),work,graph=>{
      client.preflightMutation(graph.request({entity:'WidthProbe',action:'Create',payload:{required_integer:2147483648},comment:'invalid width node'}));
    });}catch(error){failure=error;}
    precise(failure,'required_integer');expect(transaction).not.toHaveBeenCalled();expect(work).not.toHaveBeenCalled();
  }finally{await client.close();}
});
