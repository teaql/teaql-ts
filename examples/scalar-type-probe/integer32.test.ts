// Application-owned generated Q/E/Mutation acceptance; spellings come from
// main.test.ts and the retained file-client Checker probe, not source discovery.
import {Q} from 'scalar-lib/generated/Q';
import {E,TeaQLNotLoadedError} from 'scalar-lib/generated/E';
import {ScalarTypeProbe} from 'scalar-lib/generated/models/ScalarTypeProbe';
import {SQLiteTeaQLClient} from 'scalar-lib/teaql-node-sqlite';
import {TeaQLClient} from 'scalar-lib/teaql-ts';
import {GENERATED_RUNTIME_MODULE} from 'scalar-lib/runtime-module';
import {CheckException,EntityChecker,FixedBusinessClock,RuntimeModule,UserContext,decimal,long,localTime} from 'teaql-ts';
import {dirname,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';

async function prepare(context:UserContext,name:string){
 const root=await Q.typePlatforms().withIdIs(String(context.requireActiveRoot('TypePlatform').id)).limit(1).comment('reuse width-test root').purpose('prepare modeled Integer acceptance').executeForOne(context);
 if(!root)throw Error('seeded root missing');
 return (await Q.scalarTypeProbes().comment('prepare one complete width-test entity').purpose('verify modeled Integer through generated APIs').newEntity(context))
  .updateTypePlatform(root).updateRequiredString(name).updateRequiredBoolean(true).updateRequiredInteger(7).updateOptionalInteger(null)
  .updateRequiredLong(long('9223372036854775807')).updateRequiredDecimal(decimal('1.00'))
  .updateRequiredFloat(1.25).updateRequiredDouble(2.5).updateRequiredDate('2024-02-29')
  .updateRequiredTime(localTime('12:34:56')).updateRequiredDatetime('2024-02-29T12:34:56.789Z');
}
async function load(context:UserContext,id:string){
 const row=await Q.scalarTypeProbes().withIdIs(id).limit(1).comment('reload exact width-test entity').purpose('verify immutable value and version').executeForOne(context);
 if(!row)throw Error('saved width-test row missing');return row;
}
function precise(error:unknown,field:string){
 expect(error).toBeInstanceOf(CheckException);
 expect((error as CheckException).violations.some(v=>v.ruleId==='invalid_type'&&v.entityType==='ScalarTypeProbe'&&v.location.modelPath()===field)).toBe(true);
}
for(const backend of ['sqlite','file'] as const)test(`generated Integer32 ${backend} save Fix native JSON and E`,async()=>{
 const base=process.env.TEAQL_FULL_SCALAR_DB,round=Number(process.env.TEAQL_INTEGER32_ROUND);
 if(!base||![1,2].includes(round))throw Error('explicit retained scalar database and width round required');
 const file=join(dirname(base),'integer32-'+backend+(backend==='sqlite'?'.sqlite':'.json'));
 const context=new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30.125Z')));
 const client=backend==='sqlite'?new SQLiteTeaQLClient(file).setUserContext(context)
  :new TeaQLClient(file).install(GENERATED_RUNTIME_MODULE).setUserContext(context);
 context.insertResource('dataService',client);const native=client as any;
 native.setQueryLoggingEnabled?.(false);native.setMutationLoggingEnabled?.(false);
 const cases:Array<{name:string;passed:true;zeroEffects?:boolean;fixCalls?:number}>=[],prefix=`integer32-${backend}-round-${round}`;
 const record=(name:string,other:Record<string,unknown>={})=>cases.push({name,passed:true,...other});
 try{
  await context.ensureSchema();
  let control=await prepare(context,prefix+'-control');await control.auditAs('persist a complete generated width control').save(context);
  const id=control.id!;
  const providers=backend==='sqlite'?[jest.spyOn(native.driver,'query'),jest.spyOn(native.driver,'transaction'),jest.spyOn(native.driver,'nextId'),jest.spyOn(native.driver,'ensureIdFloor')]
   :[jest.spyOn(native,'persist')];
  const initial=await load(context,id);expect(E.scalarTypeProbe(initial).requiredLong().eval()).toBe('9223372036854775807');
  const mutation=(row:ScalarTypeProbe,field:string,value:number)=>field==='required_integer'?row.updateRequiredInteger(value):row.updateOptionalInteger(value);
  for(const field of ['required_integer','optional_integer'])for(const [bound,value]of [['below',-2147483649],['above',2147483648]] as const){
   for(const update of [false,true]){
    let row=update?await load(context,id):await prepare(context,prefix+'-invalid-'+field+'-'+bound);mutation(row,field,value);
    const key={entity:'ScalarTypeProbe',id:(row as any)._ledgerId},pending=JSON.stringify((row as any)._root.change(key)),audits=native.auditTrace.length;
    providers.forEach(p=>p.mockClear());let failure:unknown;
    try{await row.auditAs('reject invalid Integer before provider work').save(context);}catch(error){failure=error;}
    precise(failure,field);providers.forEach(p=>expect(p).not.toHaveBeenCalled());expect(native.auditTrace.length).toBe(audits);
    expect(JSON.stringify((row as any)._root.change(key))).toBe(pending);
    record(`${update?'update':'create'}-${field}-${bound}`,{zeroEffects:true});
    row=await load(context,id);expect(row.version).toBe(1);expect(E.scalarTypeProbe(row).requiredInteger().eval()).toBe(7);expect(E.scalarTypeProbe(row).optionalInteger().eval()).toBeNull();
   }
   for(const update of [false,true]){
    const generated=GENERATED_RUNTIME_MODULE.checkers.ScalarTypeProbe;let calls=0;
    const checker:EntityChecker={checkAndFix(c,m,r){calls++;generated.checkAndFix(c,m,r);m.payload[field]=value;}};
    native.install(new RuntimeModule({}, {ScalarTypeProbe:checker}));
    const row=update?await load(context,id):await prepare(context,prefix+'-fix-'+field+'-'+bound);
    mutation(row,field,8);const key={entity:'ScalarTypeProbe',id:(row as any)._ledgerId},pending=JSON.stringify((row as any)._root.change(key));
    providers.forEach(p=>p.mockClear());let failure:unknown;
    try{await row.auditAs('reject a final Fix outside the model domain').save(context);}catch(error){failure=error;}
    precise(failure,field);expect(calls).toBe(1);providers.forEach(p=>expect(p).not.toHaveBeenCalled());
    expect(JSON.stringify((row as any)._root.change(key))).toBe(pending);
    record(`fix-${update?'update':'create'}-${field}-${bound}`,{zeroEffects:true,fixCalls:calls});
    native.install(new RuntimeModule({}, {ScalarTypeProbe:generated}));
   }
   expect(()=>new ScalarTypeProbe({id:'9',version:1,[field==='required_integer'?'requiredInteger':'optionalInteger']:value} as any)).toThrow(CheckException);
   record(`construct-${field}-${bound}`);
   const invalid=await load(context,id);mutation(invalid,field,value);
   for(const terminal of ['eval','present','fallback','json']){
    let failure:unknown;
    try{if(terminal==='json')JSON.stringify(invalid);else{
     const expression=field==='required_integer'?E.scalarTypeProbe(invalid).requiredInteger():E.scalarTypeProbe(invalid).optionalInteger();
     if(terminal==='eval')expression.eval();else if(terminal==='present')expression.isPresent();else expression.orElse(123);
    }}catch(error){failure=error;}
    precise(failure,field);record(`${terminal}-${field}-${bound}`);
   }
  }
  const generated=GENERATED_RUNTIME_MODULE.checkers.ScalarTypeProbe;let calls=0;
  native.install(new RuntimeModule({}, {ScalarTypeProbe:{checkAndFix(c,m,r){calls++;m.payload.required_integer=2147483647;generated.checkAndFix(c,m,r);}}}));
  control=await load(context,id);control.updateRequiredInteger(2147483648);await control.auditAs('repair Integer once before final model admission').save(context);
  expect(calls).toBe(1);expect(control.version).toBe(2);expect(E.scalarTypeProbe(control).requiredInteger().eval()).toBe(2147483647);
  native.install(new RuntimeModule({}, {ScalarTypeProbe:generated}));record('one-valid-repair',{fixCalls:calls});
  const partial=await Q.scalarTypeProbesWithMinimalFields().withIdIs(id).limit(1).comment('omit modeled Integer deliberately').purpose('retain NotLoaded semantics').executeForOne(context);
  expect(partial).toBeDefined();expect(()=>E.scalarTypeProbe(partial!).requiredInteger().eval()).toThrow(TeaQLNotLoadedError);record('partial-not-loaded');
  expect(E.scalarTypeProbe(await load(context,id)).requiredLong().eval()).toBe('9223372036854775807');record('wide-long-and-version');
  providers.forEach(p=>p.mockRestore());
  const legacy:Array<{id:string;field:string;fault:string;value:unknown}>=[];
  for(const field of ['required_integer','optional_integer'])for(const [fault,value]of [['below',-2147483649],['above',2147483648],['fraction',1.5],['text','PRIVATE-INTEGER-INPUT']] as const){
   const row=await prepare(context,`${prefix}-legacy-${field}-${fault}`);await row.auditAs('prepare valid row before explicit legacy corruption').save(context);
   legacy.push({id:row.id!,field,fault,value});
  }
  // Deliberately bypass domain validation only for test-owned corruption.
  // Create all rows first, so a later ordinary persist cannot erase a fault.
  if(backend==='sqlite')for(const fault of legacy)await native.driver.query(`UPDATE scalar_type_probe_data SET ${fault.field} = ? WHERE id = ?`,[fault.value,fault.id]);
  else{
   const state=JSON.parse(readFileSync(file,'utf8'));
   for(const fault of legacy)state.data.ScalarTypeProbe[fault.id][fault.field]=fault.value;
   writeFileSync(file,JSON.stringify(state));
   const reader=new TeaQLClient(file).install(GENERATED_RUNTIME_MODULE).setUserContext(context);
   context.insertResource('dataService',reader);
  }
  for(const fault of legacy){
   let failure:unknown;try{await load(context,fault.id);}catch(error){failure=error;}precise(failure,fault.field);record(`legacy-${fault.field}-${fault.fault}`);
   const projected=await Q.scalarTypeProbesWithMinimalFields().withIdIs(fault.id).limit(1).comment('omit corrupt Integer deliberately').purpose('verify safe projected reads remain NotLoaded').executeForOne(context);
   expect(projected?.id).toBe(fault.id);expect(projected?.version).toBe(1);
   expect(()=>E.scalarTypeProbe(projected!).requiredInteger().eval()).toThrow(TeaQLNotLoadedError);record(`legacy-projection-${fault.field}-${fault.fault}`);
  }
  process.stdout.write('TYPESCRIPT_INTEGER32='+JSON.stringify({language:'typescript',backend,round,passed:true,id,cases,legacy,controlVersion:2,controlLong:'9223372036854775807',file,
   bootstrapMode:'context.ensureSchema',automaticBootstrapAccepted:true})+'\n');
 }finally{if(backend==='sqlite')await (client as SQLiteTeaQLClient).close();}
},30000);
