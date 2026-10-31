// Application-owned acceptance. APIs are the same ones exercised in app.ts.
import {Q} from './src/generated/Q';
import {E} from './src/generated/E';
import {Platform} from './src/generated/models/Platform';
import {TeaQLClient} from './src/teaql-ts';
import {GENERATED_RUNTIME_MODULE} from './src/runtime-module';
import {GENERATED_RUNTIME_MODULE as RECONCILED_MODULE} from './src/reconciled/runtime-module';
import {FixedBusinessClock,RuntimeModule,UserContext,decimal} from 'teaql-ts';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const directory=process.env.TEAQL_FILE_BOOTSTRAP_EVIDENCE_DIR,round=Number(process.env.TEAQL_FILE_BOOTSTRAP_ROUND);
if(!directory||![1,2].includes(round))throw Error('explicit evidence directory and round required');
const now=new Date(round===1?'2032-02-29T10:15:30.125Z':'2033-03-01T11:16:31.250Z');
const makeContext=()=>new UserContext().withBusinessClock(new FixedBusinessClock(now))
 .insertResource('bootstrapActor','caller actor').insertResource('bootstrapCategory','caller category');
const schoolTypes=(context:UserContext)=>Q.schoolTypes().limit(10).comment('read fixed SchoolType identities').purpose('verify generated file bootstrap').executeForList(context);
const platform=(context:UserContext)=>Q.platforms().withIdIs('1').limit(1).comment('read the default Domain Root').purpose('verify generated file bootstrap').executeForOne(context);
function hidden(client:TeaQLClient,context:UserContext){
 // @ts-expect-error The workspace must execute schema only through Context.
 void client.ensureSchema;
 // @ts-expect-error There is no descriptor/array overload on the workspace API.
 context.ensureSchema([]);
}
void hidden;
function restored(context:UserContext){
 expect(context.getResource('bootstrapActor')).toBe('caller actor');expect(context.getResource('bootstrapCategory')).toBe('caller category');
}
function fileBytes(file:string){return existsSync(file)?readFileSync(file).toString('hex'):null;}
function scoped(file:string,module=GENERATED_RUNTIME_MODULE){
 const context=makeContext(),client=new TeaQLClient(file).install(module).setUserContext(context);
 context.insertResource('dataService',client);return{client,context};
}

test('file provider creates the generated root and constants, then preserves an unchanged repeated seed',async()=>{
 const file=join(directory!,'school-file.json'),before=fileBytes(file),{client,context}=scoped(file);
 const persist=jest.spyOn(client as any,'persist');expect(fileBytes(file)).toBe(before);expect(client.auditTrace).toHaveLength(0);expect(persist).not.toHaveBeenCalled();
 expect('ensureSchema' in client).toBe(false);
 await context.ensureSchema();restored(context);
 expect(client.auditTrace).toHaveLength(round===1?3:0);
 if(round===1)for(const event of client.auditTrace){expect(event.actor).toBe('teaql-generated-bootstrap');expect(event.category).toBe('runtime-bootstrap');expect(event.recordedAt).toBe(now.toISOString());}
 const root=await platform(context);expect(root?.id).toBe('1');
 const types=await schoolTypes(context);for(const [id,code]of [['1001','PRIMARY'],['1002','SECONDARY']])expect(types.find(x=>x.id===id)?.code).toBe(code);
 expect(context.requireActiveRoot('Platform').id).toBe('1');
 const snapshot=fileBytes(file),audits=client.auditTrace.length;persist.mockClear();
 await context.ensureSchema();restored(context);expect(persist).not.toHaveBeenCalled();expect(client.auditTrace).toHaveLength(audits);expect(fileBytes(file)).toBe(snapshot);
 const created=JSON.stringify(root!.createTime);root!.updateName('User-maintained platform '+round);
 await root!.auditAs('keep an application-owned Domain Root customization').save(context);
 const version=root!.version;await context.ensureSchema();
 const preserved=await platform(context);expect(preserved?.name).toBe('User-maintained platform '+round);expect(preserved?.version).toBe(version);expect(JSON.stringify(preserved?.createTime)).toBe(created);
 const extra=Q.schoolTypes().comment('allocate a type after fixed model identities').purpose('verify the file ID floor').newEntity(context)
  .updatePlatform(Platform.refer('1')).updateName('Other '+round).updateCode('OTHER_'+round).updateDisplayOrder(decimal('3'));
 await extra.auditAs('verify normal allocation never collides with model constants').save(context);expect(Number(extra.id)).toBe(1002+round);
 const school=Q.schools().comment('prepare a file-backed School').purpose('verify the bootstrap graph is usable').newEntity(context)
  .updatePlatform(Platform.refer('1')).updateSchoolTypeToPrimary().updateName('File School '+round).updateAddress('12 River Road')
  .updateEstablishedDate('1995-09-01').updateStudentCapacity(800).updateActive(true);
 await school.auditAs('create a School against the generated constants').save(context);
 const load=()=>Q.schools().withIdIs(school.id!).selectSchoolTypeWith(Q.schoolTypesWithMinimalFields().selectCode())
  .limit(1).comment('load a School and its seeded SchoolType').purpose('verify generated Q/E in a file-backed store').executeForOne(context);
 let loaded=await load();expect(loaded).toBeDefined();expect(E.school(loaded!).schoolTypeId().eval()).toBe('1001');
 expect((loaded!.schoolType as {code:string}).code).toBe('PRIMARY');loaded!.updateName('File Academy '+round);
 await loaded!.auditAs('update a complete School after automatic file bootstrap').save(context);
 loaded=await load();expect(loaded?.name).toBe('File Academy '+round);expect(loaded?.version).toBe(2);
 restored(context);persist.mockRestore();
 process.stdout.write('FILE_BOOTSTRAP='+JSON.stringify({scenario:'school',round,passed:true,firstAudits:round===1?3:0,repeatWrites:0,
  root:{id:'1',version:version,name:preserved!.name},school:{id:loaded!.id,version:2,typeId:'1001'},extraTypeId:extra.id,file})+'\n');
},30000);

test('fresh file client reconciles a new generated constant model exactly once',async()=>{
 const file=join(directory!,'school-reconcile.json'),base=scoped(file);await base.context.ensureSchema();
 const first=(await schoolTypes(base.context)).find(x=>x.id==='1001')!;const changed=scoped(file,RECONCILED_MODULE);
 await changed.context.ensureSchema();const primary=(await schoolTypes(changed.context)).find(x=>x.id==='1001')!;
 expect(primary.name).toBe('Primary School');expect(primary.version).toBe(Number(first.version)+1);
 const secondary=(await schoolTypes(changed.context)).find(x=>x.id==='1002')!;expect(secondary.version).toBe(1);
 expect(changed.client.auditTrace).toHaveLength(1);expect(changed.client.auditTrace[0].actor).toBe('teaql-generated-bootstrap');
 expect(changed.client.auditTrace[0].category).toBe('runtime-bootstrap');expect(changed.client.auditTrace[0].recordedAt).toBe(now.toISOString());
 const persist=jest.spyOn(changed.client as any,'persist'),bytes=fileBytes(file);await changed.context.ensureSchema();
 expect(persist).not.toHaveBeenCalled();expect(fileBytes(file)).toBe(bytes);expect(changed.client.auditTrace).toHaveLength(1);restored(changed.context);persist.mockRestore();
 process.stdout.write('FILE_BOOTSTRAP='+JSON.stringify({scenario:'reconcile',round,passed:true,primaryVersion:primary.version,
  secondaryVersion:1,audits:1,repeatWrites:0,file})+'\n');
},30000);

test('concurrent Context callers share one seed without actor leakage',async()=>{
 const file=join(directory!,'school-concurrent.json'),client=new TeaQLClient(file).install(GENERATED_RUNTIME_MODULE),callers=[makeContext(),makeContext()];
 for(const context of callers)context.insertResource('dataService',client);
 await Promise.all(callers.map(context=>context.ensureSchema()));
 expect(client.auditTrace).toHaveLength(round===1?3:0);for(const caller of callers){restored(caller);expect((await platform(caller))?.id).toBe('1');}
 expect((await schoolTypes(callers[0])).map(x=>x.id).sort()).toEqual(['1001','1002']);
 process.stdout.write('FILE_BOOTSTRAP='+JSON.stringify({scenario:'concurrent',round,passed:true,audits:round===1?3:0,contexts:2,file})+'\n');
},30000);

test('failed bootstrap leaves no committed file/audit and restores the caller Context',async()=>{
 const file=join(directory!,'school-rejected.json'),{client,context}=scoped(file),failure=new Error('intentional bootstrap structural rejection');
 client.install(new RuntimeModule({}, {Platform:{checkAndFix(){throw failure;}}}));
 const persist=jest.spyOn(client as any,'persist');await expect(context.ensureSchema()).rejects.toBe(failure);
 expect(persist).not.toHaveBeenCalled();expect(existsSync(file)).toBe(false);expect(client.auditTrace).toHaveLength(0);restored(context);persist.mockRestore();
 process.stdout.write('FILE_BOOTSTRAP='+JSON.stringify({scenario:'rejected',round,passed:true,writes:0,audits:0,fileAbsent:true,file})+'\n');
},30000);

test('conflicting bootstrap roots reject during passive installation',()=>{
 const file=join(directory!,'school-conflict.json'),{client}=scoped(file);
 expect(()=>client.install(new RuntimeModule({}, {}, {defaultDomainRoot:{entity:'Platform',id:'99'}}))).toThrow('different Default Domain Roots');
 expect(existsSync(file)).toBe(false);expect(client.auditTrace).toHaveLength(0);
 process.stdout.write('FILE_BOOTSTRAP='+JSON.stringify({scenario:'conflict',round,passed:true,writes:0,fileAbsent:true,file})+'\n');
});

// Additional allocator regression; ordinary setup/recreation uses generated
// Mutation. Only this test-owned legacy-state injection bypasses domain APIs.
test('recreating lower fixed model IDs never moves an existing ID floor backwards',async()=>{
 const file=join(directory!,'school-floor.json'),initial=scoped(file);await initial.context.ensureSchema();
 const state=JSON.parse(readFileSync(file,'utf8')),floor=9000+round*100;
 delete state.data.SchoolType['1001'];delete state.data.SchoolType['1002'];state.nextIds.SchoolType=floor;
 writeFileSync(file,JSON.stringify(state));
 const {client,context}=scoped(file);await context.ensureSchema();
 expect(client.auditTrace).toHaveLength(2);expect((await schoolTypes(context)).filter(x=>['1001','1002'].includes(x.id!))).toHaveLength(2);
 const next=Q.schoolTypes().comment('allocate after restoring lower fixed identities').purpose('verify persistent monotonic ID floors').newEntity(context)
  .updatePlatform(Platform.refer('1')).updateName('Floor control '+round).updateCode('FLOOR_'+round).updateDisplayOrder(decimal('4'));
 await next.auditAs('verify fixed bootstrap identities cannot rewind allocation').save(context);expect(next.id).toBe(String(floor));
 const stored=JSON.parse(readFileSync(file,'utf8'));expect(stored.nextIds.SchoolType).toBe(floor+1);restored(context);
 process.stdout.write('FILE_BOOTSTRAP='+JSON.stringify({scenario:'floor',round,passed:true,recreatedConstants:2,allocatedId:next.id,nextFloor:floor+1,file})+'\n');
},30000);
