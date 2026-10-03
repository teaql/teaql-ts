import { inspect } from 'node:util';
import { SelectQuery, OrderBy } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { QueryRequest } from '../src/core/request-intent';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK } from '../src/core/log-privacy';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionMetadata } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

const secret = 'PRIVATE-CHILD-COUNT-CANARY', credential = 'CHILD-PASSWORD-CANARY', visible = 'PUBLIC-PAGE';
const column = (columnName: string, integer = false) => ({ columnName,
  logicalType: integer ? 'integer' as const : 'text' as const,
  decode: integer ? 'number' as const : 'native' as const, logPolicy: 'plain' as const });
const schemas: Record<string, EntitySchema> = { Entry: {
  table:'entry_data', auditMaskFields:['name'], columns:{id:column('id',true), version:column('version',true),
    parentId:{...column('parent_id',true), nullable:true}, name:column('name'), marker:column('marker'), password:column('password')},
  relations:{children:{targetEntity:'Entry',localKey:'id',foreignKey:'parentId',many:true}},
} };
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: SQLiteDriver) { super(driver, schemas); }
}
async function fixture() {
  const driver = new SQLiteDriver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService',client).ensureSchema();
  for(let id=1;id<=3;id++) {
    await client.executeMutation({entity:'Entry',action:'Create',id:String(id),payload:{name:'root',marker:visible},comment:'seed roots'});
    await client.executeMutation({entity:'Entry',action:'Create',id:String(id+10),payload:{parentId:id,name:secret,password:credential,marker:'child'},comment:'seed children'});
  }
  const logs:SQLExecutionMetadata[]=[];
  client.setDiagnosticSQLLogSink({write:entry=>logs.push(entry)});
  const reads=jest.spyOn(driver,'query');
  const child=new SelectQuery('Entry').filter({name:{$eq:secret}, password:{$eq:credential}}).limit(2);
  const query=new SelectQuery('Entry').filter({marker:{$eq:visible}}).relationQuery('children',child)
    .order(OrderBy.asc('id')).offset(1).limit(2).comment(`inspect ${secret} ${credential} ${visible}`).purpose(`verify ${secret} ${visible}`);
  return {driver,client,logs,reads,query,child};
}
const prior=process.env[PLAINTEXT_LOG_ENV];
beforeEach(()=>{delete process.env[PLAINTEXT_LOG_ENV];});
afterEach(()=>{if(prior===undefined)delete process.env[PLAINTEXT_LOG_ENV];else process.env[PLAINTEXT_LOG_ENV]=prior;});

test.each(['root','count','count-clone','count-failure','count-stream'])('derived intent privacy: %s',async mode=>{
  const f=await fixture();
  try {
    if(mode==='count-failure') {await f.driver.query('DROP TABLE entry_data');f.reads.mockClear();}
    let error:unknown;
    try {
      if(mode==='root') expect(await f.client.executeQuery(f.query)).toHaveLength(2);
      else if(mode==='count-clone') {
        const count=f.query.forExactCount().clone();
        f.child.filterCondition.name.$eq='changed source';
        expect((await f.client.executeQuery(count))[0].__teaql_total).toBe(3);
      } else if(mode==='count-stream') {
        const rows:any[]=[];
        for await(const chunk of f.client.executeForStream(f.query.forExactCount(),1))rows.push(...chunk);
        expect(rows[0].__teaql_total).toBe(3);
      } else expect(await f.client.executeCount(f.query)).toBe(3);
    } catch(err) {error=err;}
    if(mode==='count-failure')expect(error).toBeDefined();else expect(error).toBeUndefined();
    expect(f.logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(f.logs)).not.toContain(secret);
    expect(JSON.stringify(f.logs)).not.toContain(credential);
    for(const entry of f.logs) {expect(entry.comment).toContain(visible);expect(entry.purpose).toContain(visible);}
    if(mode!=='root')expect(f.logs).toHaveLength(1);
    if(!['root','count-stream'].includes(mode))expect(f.reads).toHaveBeenCalledTimes(1);
    if(mode==='count-failure')expect(f.logs[0].executionOutcome).toBe('failure');
    else {
      await f.client.executeQuery(new SelectQuery('Entry').limit(1).comment(secret).purpose('independent query'));
      expect(f.logs[f.logs.length-1]?.comment).toBe(secret);
    }
  } finally {await f.client.close();}
});

test('count source is neither JSON nor inspect output',()=>{
  const query=new SelectQuery('Entry').relationQuery('children',new SelectQuery('Entry').filter({name:{$eq:secret}}));
  const count=query.forExactCount().clone();
  expect(JSON.stringify(count)).not.toContain(secret);
  expect(inspect(count,{depth:10,showHidden:true})).not.toContain(secret);
});

test('count debug retains business values but never credentials',async()=>{
  const f=await fixture();
  try {
    process.env[PLAINTEXT_LOG_ENV]=PLAINTEXT_LOG_ACK;
    await f.client.executeCount(f.query);
    expect(f.logs[0].comment).toContain(secret);
    expect(JSON.stringify(f.logs)).not.toContain(credential);
  } finally {await f.client.close();}
});

test('logs off still requires owned comment and purpose before SQL',async()=>{
  const f=await fixture();
  try {
    f.client.setQueryLoggingEnabled(false);
    await expect(f.client.executeCount(f.query.clone().comment(' '))).rejects.toMatchObject({code:'REQUEST_COMMENT_REQUIRED'});
    await expect(f.client.executeCount(f.query.clone().purpose(' '))).rejects.toMatchObject({code:'QUERY_PURPOSE_REQUIRED'});
    expect(f.reads).not.toHaveBeenCalled();
    expect(await f.client.executeCount(f.query)).toBe(3);
    expect(f.logs).toHaveLength(0);
  } finally {await f.client.close();}
});

test('request captures nested predicates, not only intent strings',async()=>{
  const f=await fixture();
  try {
    const request=new QueryRequest(f.query);
    f.query.filterCondition.marker.$eq='mutated after capture';
    f.child.filterCondition.name.$eq='mutated child';
    expect(await f.client.executeCount(request)).toBe(3);
    expect(await f.client.executeQuery(request)).toHaveLength(2);
    expect(JSON.stringify(f.logs)).not.toContain(secret);
  } finally {await f.client.close();}
});

test.each(['aggregate','facet'])('count retains removed %s bindings',async shape=>{
  const f=await fixture();
  try {
    f.query.relations=[];
    if(shape==='aggregate')f.query.relationAggregate('children','childCount',f.child);
    else f.query.facets=[{facetName:'children',relationName:'children',query:f.child,includeAllFacets:true}];
    const before=f.client.sqlTrace.length;
    expect(await f.client.executeCount(f.query)).toBe(3);
    expect(f.reads).toHaveBeenCalledTimes(1);
    expect(f.client.sqlTrace.length-before).toBe(1);
    expect(JSON.stringify(f.logs)).not.toContain(secret);
    expect(JSON.stringify(f.logs)).not.toContain(credential);
  } finally {await f.client.close();}
});

test.each(['cancelled','failure'])('count stream terminal keeps source: %s',async outcome=>{
  const f=await fixture();
  try {
    if(outcome==='failure')await f.driver.query('DROP TABLE entry_data');
    const iterator=f.client.executeForStream(f.query.forExactCount(),1)[Symbol.asyncIterator]();
    // Native better-sqlite3 errors can cross Jest VM realms. Verify the rejected
    // provider code/message, not instanceof the current realm's Error.
    if(outcome==='failure')await expect(iterator.next()).rejects.toMatchObject({code:'SQLITE_ERROR',message:expect.stringContaining('no such table: entry_data')});
    else {expect((await iterator.next()).done).toBe(false);await iterator.return?.();}
    expect(f.logs).toHaveLength(1);
    expect(f.logs[0].executionOutcome).toBe(outcome);
    expect(JSON.stringify(f.logs)).not.toContain(secret);
    expect(JSON.stringify(f.logs)).not.toContain(credential);
  } finally {await f.client.close();}
});

test('overlapping counts share an immutable source, never owned intent',async()=>{
  const f=await fixture();
  try {
    const source=f.query.forExactCount();
    const a=source.clone().comment('first '+secret).purpose('first purpose');
    const b=source.clone().comment('second '+secret).purpose('second purpose');
    const first=f.client.executeQuery(a),second=f.client.executeQuery(b);
    a.comment('mutated caller');b.filterCondition.marker.$eq='mutated caller';
    const rows=await Promise.all([first,second]);
    expect(rows.map(result=>result[0].__teaql_total)).toEqual([3,3]);
    expect(f.logs).toHaveLength(2);
    expect(f.logs.map(entry=>entry.purpose).sort()).toEqual(['first purpose','second purpose']);
    expect(JSON.stringify(f.logs)).not.toMatch(/PRIVATE-CHILD-COUNT-CANARY|mutated caller/);
  } finally {await f.client.close();}
});
