import {CheckException, CheckerPresentationModel, ObjectLocation, RuntimeModule, UserContext, checkResultToWire} from '../../src';
import {Q} from 'context-generated/generated/Q';
import {E} from 'context-generated/generated/E';
import {SQLiteTeaQLClient} from 'context-generated/teaql-node-sqlite';
import {GENERATED_RUNTIME_MODULE} from 'context-generated/runtime-module';
import fixture from '../../tests/fixtures/natural-messages/cases-v1.json';

const SECRET='密钥🔑abcdef'; // Nine Unicode scalar values, ten UTF-16 code units.

test('generated SQLite graph returns English/Chinese natural errors, then persists a corrected child',async()=>{
  expect(require.resolve('teaql-ts')).toBe(process.env.TEAQL_EXPECTED_RUNTIME_ENTRY);
  const database=process.env.TEAQL_NATURAL_MESSAGES_DB;if(!database)throw new Error('Use scripts/verify-natural-messages.cjs --example');
  const context=new UserContext().installCheckerMessageWarning(()=>{});
  const client=new SQLiteTeaQLClient(database).setDiagnosticSQLLogSink(undefined);
  client.setUserContext(context);context.insertResource('dataService',client);
  const entities={Catalog:fixture.entities.Catalog,Entry:fixture.entities.Entry};
  const presentation=CheckerPresentationModel.fromJson(JSON.stringify({schema:'teaql.checker-model/v1',revision:'generated-natural-example-v1',entities,currentObject:fixture.currentObject}));
  const generated=GENERATED_RUNTIME_MODULE.checkers.Entry;
  // Sensitivity is an application policy on the real name field. Generated
  // model/library files are unchanged; SQL persistence must still get plaintext.
  client.install(new RuntimeModule({Entry:{...GENERATED_RUNTIME_MODULE.schemas.Entry,auditMaskFields:['name']}},
    {Entry:{checkAndFix(ctx,mutation,errors){
      if(mutation.action==='Create')for(const field of ['source_ip','last_ip','opened_by','changed_by'])mutation.payload[field]??='local';
      generated.checkAndFix(ctx,mutation,errors);
      const name=mutation.payload.name;
      if(typeof name==='string'&&!name.trim()&&!errors.some(error=>error.ruleId==='required'&&error.location.modelPath()==='name'))
        errors.push({ruleId:'required',location:ObjectLocation.property('name')});
      if(typeof name==='string'&&Array.from(name).length>8)
        errors.push({ruleId:'max_length',location:ObjectLocation.property('name'),inputValue:name,systemValue:8});
    }}}).withCheckerPresentation(presentation));
  const responses:unknown[]=[];
  async function rejected(work:()=>Promise<unknown>,expected:string):Promise<void>{
    let failure:unknown;
    try{await work();}catch(error){failure=error;}
    expect(failure).toBeInstanceOf(CheckException);
    const error=failure as CheckException,response={violations:error.violations.map(result=>checkResultToWire(result))};
    const target=response.violations.find(result=>result.instancePath==='/entryList/1/name');
    expect(target).toBeDefined();expect(target!.entityType).toBe('Entry');expect(target!.message).toBe(expected);
    expect(error.message).toContain(expected);expect(JSON.stringify(response)).not.toContain(SECRET);
    expect(String(error)).not.toContain(SECRET);responses.push(response);
    process.stdout.write('TS_NATURAL_RESPONSE='+JSON.stringify(response)+'\n');
  }
  try{
    await context.ensureSchema();await context.ensureSchema();
    const make=(name:string)=>Q.entries().comment('Prepare an example child')
      .purpose('Verify generated audited mutation and natural errors').newEntity(context).updateName(name).updateCatalog('1');
    let first=make('first'),second=make('second');
    await first.auditAs('Create the first valid child').save(context);
    await second.auditAs('Create the second valid child').save(context);
    const load=async(id:string)=>{
      const rows=await Q.entries().withIdIs(id).limit(1).comment('Reload complete child')
        .purpose('Verify actual stored values through E').executeForList(context);expect(rows).toHaveLength(1);return rows[0];
    };
    first=await load(first.id!);second=await load(second.id!);
    expect(E.entry(second).name().eval()).toBe('second');const secondId=second.id!,version=second.version;
    const parents=await Q.catalogs().withIdIs('1').limit(1).comment('Load graph owner')
      .purpose('Verify an indexed child failure').executeForList(context);
    const parent=parents[0];parent.entryList().push(first,second);
    const driver=(client as any).driver,write=jest.spyOn(driver,'query'),transaction=jest.spyOn(driver,'transaction');
    const auditBefore=client.auditTrace.length;
    const reset=()=>{write.mockClear();transaction.mockClear();};
    const unchanged=()=>{expect(write).not.toHaveBeenCalled();expect(transaction).not.toHaveBeenCalled();expect(client.auditTrace).toHaveLength(auditBefore);};
    first.updateName('changed');
    for(const [locale,expected] of [['en','The name of the 2nd entry is required.'],['zh-CN','请填写第2条明细的名称。']] as const){
      context.setLocaleCode(locale);second.updateName('');reset();
      await rejected(()=>parent.auditAs('Reject the second empty child before SQL').save(context),expected);unchanged();
    }
    context.setLocaleCode('en');second.updateName(SECRET);reset();
    await rejected(()=>parent.auditAs('Reject a private scalar-length violation').save(context),
      'The name of the 2nd entry must not exceed 8 Unicode scalar values; its current length is 9.');unchanged();
    expect(second.name).toBe(SECRET);expect(second.version).toBe(version);
    first.updateName('first');second.updateName('renamed');
    await parent.auditAs('Persist only the corrected second child').save(context);
    expect(client.auditTrace).toHaveLength(auditBefore+1);
    const stored=await load(secondId);expect(E.entry(stored).name().eval()).toBe('renamed');expect(stored.version).toBe(Number(version)+1);
    write.mockRestore();transaction.mockRestore();
    process.stdout.write('TS_NATURAL_SQLITE_PASS='+JSON.stringify({passed:true,child:secondId,first:first.id,version:stored.version,
      responses:responses.length,providerCallsOnRejection:0,transactionCallsOnRejection:0,updatedAudits:1,localSource:require.resolve('teaql-ts')})+'\n');
  }finally{await client.close();}
},30000);
