import fs from 'node:fs';
import {CheckException, CheckerPresentationModel, UserContext, checkResultToWire,
  standardCheckerMessageRenderer} from '../../src';
import {Q} from 'natural-generated/generated/Q';
import {E} from 'natural-generated/generated/E';
import {SQLiteTeaQLClient} from 'natural-generated/teaql-node-sqlite';
import {TeaQLClient as FileTeaQLClient} from 'natural-generated/teaql-ts';
import {GENERATED_RUNTIME_MODULE} from 'natural-generated/runtime-module';

// 101 Unicode scalars, 102 UTF-16 units. Actual generated bound is 100 scalars.
const SECRET='密钥🔑'+'a'.repeat(98);

test.each(['sqlite','file'] as const)('generated %s graph uses automatic metadata and protects relocated diagnostics',async provider=>{
  expect(require.resolve('teaql-ts')).toBe(process.env.TEAQL_EXPECTED_RUNTIME_ENTRY);
  const sqlite=process.env.TEAQL_NATURAL_MESSAGES_DB,file=process.env.TEAQL_NATURAL_MESSAGES_FILE;
  if(!sqlite||!file)throw new Error('Use scripts/verify-natural-messages.cjs --example');
  const context=new UserContext().installCheckerMessageWarning(()=>{});
  const client=provider==='sqlite'?new SQLiteTeaQLClient(sqlite).setDiagnosticSQLLogSink(undefined):new FileTeaQLClient(file);
  client.setUserContext(context).install(GENERATED_RUNTIME_MODULE);context.insertResource('dataService',client);
  // The generated module owns descriptors and the actual Checker. There is no
  // manually installed presentation model, custom bounds rule or seed SQL.
  expect(context.checkerPresentationModel).toBe(CheckerPresentationModel.empty);
  expect(GENERATED_RUNTIME_MODULE.checkerPresentationModel).not.toBe(CheckerPresentationModel.empty);
  const responses:unknown[]=[];
  async function rejected(work:()=>Promise<unknown>,expected:string):Promise<void>{
    let failure:unknown;try{await work();}catch(error){failure=error;}
    expect(failure).toBeInstanceOf(CheckException);
    const error=failure as CheckException,response={provider,violations:error.violations.map(result=>checkResultToWire(result))};
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
    const parents=await Q.catalogs().withIdIs('1').limit(1).comment('Load unchanged graph owner')
      .purpose('Verify an indexed child failure without editing the parent').executeForList(context);
    const parent=parents[0],parentVersion=parent.version;parent.entryList().push(first,second);
    const execute=jest.spyOn(client,'executeMutation');
    const query=provider==='sqlite'?jest.spyOn((client as any).driver,'query'):undefined;
    const transaction=provider==='sqlite'?jest.spyOn((client as any).driver,'transaction'):undefined;
    const auditBefore=client.auditTrace.length,originalFile=provider==='file'?fs.readFileSync(file):undefined;
    const reset=()=>{execute.mockClear();query?.mockClear();transaction?.mockClear();};
    const unchanged=()=>{
      expect(execute).not.toHaveBeenCalled();if(query)expect(query).not.toHaveBeenCalled();if(transaction)expect(transaction).not.toHaveBeenCalled();
      expect(client.auditTrace).toHaveLength(auditBefore);expect(parent.version).toBe(parentVersion);
      if(originalFile)expect(fs.readFileSync(file)).toEqual(originalFile);
    };
    // The unchanged parent is not a writable view; the first writable child is
    // not the origin. The failure must still identify the second child.
    first.updateName('changed');
    for(const [locale,expected] of [['en','The name of the 2nd entry is required.'],['zh-CN','请填写第2项明细的名称。']] as const){
      context.setLocaleCode(locale);second.updateName(null as unknown as string);reset();
      await rejected(()=>parent.auditAs('Reject the second null child before provider work').save(context),expected);unchanged();
    }
    context.setLocaleCode('en');second.updateName(SECRET);reset();
    await rejected(()=>parent.auditAs('Reject a private scalar-length violation').save(context),
      'The name of the 2nd entry must not exceed 100 Unicode scalar values; its current length is 101.');unchanged();
    expect(second.name).toBe(SECRET);expect(second.version).toBe(version);
    // Relocation reuses a safe literal from the customer renderer. It must not
    // invoke customer code a second time after the original privacy scope ends.
    let rendererCalls=0;
    context.installCheckerMessageRenderer(request=>{
      rendererCalls++;expect(request.arguments.input).not.toBe(SECRET);expect(request.arguments.input_len).toBe('101');
      return {message:`Custom response ${SECRET}`,warnings:[]};
    });reset();
    await rejected(()=>parent.auditAs('Verify one customer rendering per error').save(context),'Custom response [REDACTED]');
    expect(rendererCalls).toBe(1);unchanged();context.installCheckerMessageRenderer(standardCheckerMessageRenderer);
    first.updateName('first');second.updateName('renamed');
    await parent.auditAs('Persist only the corrected second child').save(context);
    expect(client.auditTrace).toHaveLength(auditBefore+1);expect(parent.version).toBe(parentVersion);
    const stored=await load(secondId);expect(E.entry(stored).name().eval()).toBe('renamed');expect(stored.version).toBe(Number(version)+1);
    expect(context.checkerPresentationModel).toBe(CheckerPresentationModel.empty);
    execute.mockRestore();query?.mockRestore();transaction?.mockRestore();
    process.stdout.write('TS_NATURAL_SQLITE_PASS='+JSON.stringify({passed:true,provider,child:secondId,first:first.id,version:stored.version,
      responses:responses.length,providerCallsOnRejection:0,transactionCallsOnRejection:0,updatedAudits:1,rendererCalls,
      automaticMetadata:true,unchangedParent:true,localSource:require.resolve('teaql-ts')})+'\n');
  }finally{if(client instanceof SQLiteTeaQLClient)await client.close();}
},30000);
