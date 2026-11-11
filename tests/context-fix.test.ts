import {CheckException, ContextFix, EntityRoot, FixedBusinessClock, LoadedScalarSnapshot,
  MutationIntent, MutationRequest, ObjectLocation, RuntimeModule, UserContext} from '../src';
import type {ContextFixResolver} from '../src';
import {AbstractSQLTeaQLClient, EntitySchema, TeaQLSqlDriver} from '../src/sql/core';

class Driver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  transactions = 0; statements: string[] = [];
  query = async (sql: string) => {this.statements.push(sql);return {rows:[],rowCount:0};};
  stream = async function* () {};
  identifier = (value:string) => `"${value}"`; placeholder = () => '?';
  encode = (value:unknown) => value; contains = () => ''; aggregateFunction = (name:string) => name;
  ensureSchema = async () => {}; nextId = async () => '1'; ensureIdFloor = async () => {}; close = async () => {};
  transaction = async <T>(work:(session:any)=>Promise<T>) => {this.transactions++;return work(this);};
}
class Client extends AbstractSQLTeaQLClient {constructor(driver:Driver){super(driver,{});}}
const timeA = new Date('2033-01-01T00:00:00Z'), timeB = new Date('2033-01-02T00:00:00Z');
function fixture() {
  const schema:EntitySchema = {table:'probe_data',columns:{
    id:{columnName:'id',logicalType:'integer',decode:'string'},version:{columnName:'version',logicalType:'integer',decode:'number'},
    name:{columnName:'name',logicalType:'text',decode:'string'},
    note:{columnName:'note',logicalType:'text',decode:'string'},
    bornAt:{columnName:'born_at',modelName:'born_at',logicalType:'datetime',decode:'date',createFunction:'now'},
    touchedAt:{columnName:'touched_at',modelName:'touched_at',logicalType:'datetime',decode:'date',createFunction:'now',updateFunction:'now'},
  }};
  for(const field of ['source_ip','opened_by','last_ip','changed_by']) schema.columns[field] = {
    columnName:field,modelName:field,logicalType:'text',decode:'string',createFunction:'identity',
    ...(field==='last_ip'||field==='changed_by'?{updateFunction:'identity'}:{}),
  };
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(timeB));
  const driver = new Driver(), client = new Client(driver).setUserContext(context);
  const resolver:ContextFixResolver = (_ctx,input) => input.function==='now' ? input.now : `B:${input.field}`;
  context.insertResource('contextFixResolver',resolver);
  let calls=0,assignments=0;
  client.install(new RuntimeModule({Probe:schema},{Probe:{checkAndFix(ctx,mutation,results){
    calls++;
    for(const [name,column] of Object.entries(schema.columns)){
      const field=column.modelName??name, fn=mutation.action==='Create'?column.createFunction:column.updateFunction;
      if(fn){const present=Object.prototype.hasOwnProperty.call(mutation.payload,field);const before=mutation.payload[field];
        ContextFix.apply(ctx,mutation,field,fn);if(!present&&field in mutation.payload || present&&before!==mutation.payload[field])assignments++;}
    }
    if(mutation.payload.name==='INVALID') results.push({ruleId:'required',location:ObjectLocation.property('name')});
    if(mutation.payload.name==='NORMALIZE'||mutation.payload.name==='REPAIR_OTHER') {
      const other=mutation.payload.name==='REPAIR_OTHER';mutation.payload.name='same';
      if(other)mutation.payload.note='business repair';
    }
  }}}));
  const request=(payload:any,old:any={})=>new MutationRequest({entity:'Probe',id:'1',version:1,action:'Update',payload,comment:'Verify staged Context Fix'})
    .withLoadedSnapshot(new LoadedScalarSnapshot(old));
  return {context,driver,client,schema,request,counts:()=>({calls,assignments})};
}

test('unchanged requests and a forged eligibility flag cannot enable Context assignments',()=>{
  const f=fixture();
  for(let round=0;round<2;round++) expect(f.client.preflightMutation(f.request({})).payload).toEqual({});
  const raw={entity:'Probe',action:'Update',id:'1',version:1,payload:{},contextFixEligible:true,comment:'Cannot forge framework provenance'};
  expect(f.client.preflightMutation(raw).payload).toEqual({});
  expect(f.counts()).toEqual({calls:3,assignments:0});expect(f.driver.transactions).toBe(0);
});
test('real creation needs no caller dirty fields and update preserves create-only values',()=>{
  const f=fixture();
  const created=f.client.preflightMutation({entity:'Probe',action:'Create',payload:{},comment:'Initialize declared Context fields'});
  expect(created.payload).toMatchObject({source_ip:'B:source_ip',last_ip:'B:last_ip',born_at:timeB,touched_at:timeB});
  const updated=f.client.preflightMutation(f.request({name:'changed'},{born_at:timeA,source_ip:'A'}));
  expect(updated.payload).toMatchObject({name:'changed',last_ip:'B:last_ip',changed_by:'B:changed_by',touched_at:timeB});
  expect(updated.payload).not.toHaveProperty('born_at');expect(updated.payload).not.toHaveProperty('source_ip');
});
test('managed values and restored business fields do not independently enable Context Fix',()=>{
  const f=fixture();
  expect(f.client.preflightMutation(f.request({last_ip:'manual',touched_at:timeA})).payload.last_ip).toBe('manual');
  expect(f.client.preflightMutation(f.request({name:'same'},{name:'same'})).payload).toEqual({name:'same'});
  expect(f.counts().assignments).toBe(0);
  const mutation:any={entity:'Probe',action:'Update',payload:{id:'1',version:2,_count:10}};
  f.context.insertResource('fixTime',timeB);
  ContextFix.run(f.context,mutation,f.schema,()=>ContextFix.apply(f.context,mutation,'last_ip','identity'));
  expect(mutation.payload).not.toHaveProperty('last_ip');
});

test('business normalization discards automatic Context but keeps another business repair',()=>{
  const f=fixture();
  expect(f.client.preflightMutation(f.request({name:'NORMALIZE'},{name:'same'})).payload).toEqual({name:'same'});
  expect(f.client.preflightMutation(f.request({name:'REPAIR_OTHER'},{name:'same',note:'before'})).payload)
    .toMatchObject({name:'same',note:'business repair',last_ip:'B:last_ip'});
  expect(f.client.preflightMutation(f.request({name:'NORMALIZE'})).payload).toMatchObject({name:'same',last_ip:'B:last_ip'});
});
test('failed check preserves caller intent, discards automatic staging and permits retry',()=>{
  const f=fixture(), payload={name:'INVALID'};
  let error:CheckException|undefined;
  try{f.client.preflightMutation(f.request(payload));}catch(failure){error=failure as CheckException;}
  expect(error).toBeInstanceOf(CheckException);expect(error!.violations[0].location.instancePath()).toBe('/name');
  expect(error!.violations[0].entityType).toBe('Probe');expect(payload).toEqual({name:'INVALID'});
  payload.name='valid';expect(f.client.preflightMutation(f.request(payload)).payload.last_ip).toBe('B:last_ip');
  expect(f.context.getResource('fixTime')).toBeUndefined();expect(f.driver.statements).toEqual([]);
});
test.each(['throw','type','async','asyncReject'] as const)('Context provider %s failures are safe and precisely located',kind=>{
  const f=fixture();f.context.insertResource<ContextFixResolver>('contextFixResolver',()=>{
    if(kind==='throw')throw new Error('PRIVATE_PROVIDER_CANARY');
    if(kind==='asyncReject')return Promise.reject(new Error('PRIVATE_PROVIDER_CANARY'));
    return kind==='async'?Promise.resolve('not a synchronous Context input'):42;
  });
  let error:CheckException|undefined;
  try{f.client.preflightMutation(f.request({name:'edit'}));}catch(failure){error=failure as CheckException;}
  expect(error).toBeInstanceOf(CheckException);
  const result=error!.violations[0];expect(result.entityType).toBe('Probe');
  expect(result.location.instancePath()).toBe('/touchedAt');
  expect(result.location.prefixedBy(ObjectLocation.property('children').index(1)).instancePath()).toBe('/children/1/touchedAt');
  expect(String(error)).not.toContain('PRIVATE_PROVIDER_CANARY');expect((error as any).cause).toBeUndefined();
  expect(f.context.getResource('fixTime')).toBeUndefined();expect(f.driver.transactions).toBe(0);
});
test('a later invalid sibling unwinds an earlier successful Context Fix without losing caller edits',async()=>{
  const f=fixture(),root=new EntityRoot(),key={entity:'Probe',id:'1'},second={entity:'Probe',id:'2'};
  root.setOriginalVersion(key,1);root.setOriginalVersion(second,1);root.set(key,'name','first');root.set(second,'name','INVALID');
  const firstObject={id:'1',version:1,name:'first'},secondObject={id:'2',version:1,name:'INVALID'};
  await expect(f.client.executeGraphSave(new MutationIntent('Validate graph before provider work'),async()=>{throw new Error('unreachable');},graph=>{
    for(const owner of [key,second]){
      const request=graph.request({entity:'Probe',action:'Update',id:owner.id,version:1,payload:root.change(owner),ledgerRoot:root,ledgerKey:owner});
      f.client.preflightMutation(request);
    }
  },graph=>{
    graph.registerSource(firstObject,root,key,{},()=>({...firstObject}));
    graph.registerSource(secondObject,root,second,{},()=>({...secondObject}));return true;
  })).rejects.toBeInstanceOf(CheckException);
  expect(root.change(key)).toEqual({name:'first'});expect(root.change(second)).toEqual({name:'INVALID'});
  expect(f.driver.transactions).toBe(0);expect(f.driver.statements).toEqual([]);
  expect(f.context.getResource('fixTime')).toBeUndefined();
});
