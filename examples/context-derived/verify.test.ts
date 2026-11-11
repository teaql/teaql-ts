import {CheckException, ContextFix, ContextFixResolver, FixedBusinessClock, RuntimeModule,
  UserContext, checkResultToWire} from '../../src';
import {Q} from 'context-generated/generated/Q';
import {E} from 'context-generated/generated/E';
import {Entry} from 'context-generated/generated/models/Entry';
import {SQLiteTeaQLClient} from 'context-generated/teaql-node-sqlite';
import {TeaQLClient} from 'context-generated/teaql-ts';
import {GENERATED_RUNTIME_MODULE} from 'context-generated/runtime-module';

const A = new Date('2033-01-01T00:00:00Z'), B = new Date('2033-01-02T00:00:00Z'), C = new Date('2033-01-03T00:00:00Z');
const milliseconds = (value:unknown) => value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
function located(error:unknown,path:string):CheckException {
  expect(error).toBeInstanceOf(CheckException);
  const failure=error as CheckException;
  expect(failure.violations.some(result=>result.entityType && checkResultToWire(result).instancePath===path)).toBe(true);
  return failure;
}
async function rejected(work:()=>Promise<unknown>,path:string):Promise<CheckException>{
  try{await work();throw new Error('expected a failed check');}catch(error){return located(error,path);}
}

test.each(['sqlite','file'] as const)('generated Context Fix: %s provider',async kind=>{
  expect(require.resolve('teaql-ts')).toBe(process.env.TEAQL_EXPECTED_RUNTIME_ENTRY);
  const base=process.env.TEAQL_CONTEXT_FIX_DB;if(!base)throw new Error('use verify-local.cjs for isolated retained databases');
  const context=new UserContext().withBusinessClock(new FixedBusinessClock(A));
  const client=kind==='sqlite'?new SQLiteTeaQLClient(base+'.sqlite').setDiagnosticSQLLogSink(undefined)
    :new TeaQLClient(base+'.json').install(GENERATED_RUNTIME_MODULE);
  client.setUserContext(context);context.insertResource('dataService',client);
  try{
    await context.ensureSchema();
    const schema=GENERATED_RUNTIME_MODULE.schemas.Entry;
    for(const [name,column] of Object.entries(schema.columns)){
      const field=column.modelName??name;
      if(['source_ip','opened_by','last_ip','changed_by'].includes(field)){
        column.createFunction='identity';if(field==='last_ip'||field==='changed_by')column.updateFunction='identity';
      }
    }
    const generated=GENERATED_RUNTIME_MODULE.checkers.Entry;
    client.install(new RuntimeModule({}, {Entry:{checkAndFix(ctx,mutation,results){
      for(const field of ['source_ip','opened_by','last_ip','changed_by']){
        if(mutation.action!=='Create' && (field==='source_ip'||field==='opened_by'))continue;
        ContextFix.apply(ctx,mutation,field,'identity');
      }
      generated.checkAndFix(ctx,mutation,results);
    }}}));
    let phase='A',failToken=false,invalidIP=false;
    const resolver:ContextFixResolver=(_ctx,input)=>{
      if(input.function==='now')return input.now;
      if(input.function==='uniStr'){if(failToken)throw new Error('PRIVATE_CONTEXT_PROVIDER_CANARY');return 'fixture-token';}
      return invalidIP&&input.field==='last_ip'?'x'.repeat(101):`${phase}:${input.field}`;
    };
    context.insertResource('contextFixResolver',resolver);
    const provider=kind==='sqlite'?(client as any).driver:client;
    const write=jest.spyOn(provider,kind==='sqlite'?'query':'persist');
    const transaction=kind==='sqlite'?jest.spyOn(provider,'transaction'):undefined;
    const clear=()=>{write.mockClear();transaction?.mockClear();};
    const noWrites=()=>{expect(write).not.toHaveBeenCalled();if(transaction)expect(transaction).not.toHaveBeenCalled();};
    const make=(name:string)=>Q.entries().comment('Prepare one Context fixture entity')
      .purpose('Verify automatic values cannot manufacture mutations').newEntity(context).updateName(name).updateCatalog('1');
    const load=async(id:string)=>{
      const rows=await Q.entries().withIdIs(id).limit(1).comment('Reload stored Context fixture')
        .purpose('Observe committed values through generated Q and E').executeForList(context);
      expect(rows).toHaveLength(1);return rows[0];
    };
    const initialAudits=client.auditTrace.length;
    const broken=make('failed token');failToken=true;clear();
    const error=await rejected(()=>broken.auditAs('Reject failed Context source before persistence').save(context),'/guardedToken');
    expect(String(error)).not.toContain('PRIVATE_CONTEXT_PROVIDER_CANARY');noWrites();expect(client.auditTrace).toHaveLength(initialAudits);
    expect(broken.bornAt).toBeUndefined();expect(broken.name).toBe('failed token');failToken=false;
    let first=make('first');await first.auditAs('Create the first Context A row').save(context);
    let second=make('second');await second.auditAs('Create an independent Context A sibling').save(context);
    first=await load(first.id!);const id=first.id!,version=first.version;
    expect(milliseconds(E.entry(first).bornAt().eval())).toBe(A.getTime());
    expect(E.entry(first).lastIp().eval()).toBe('A:last_ip');
    phase='B';context.withBusinessClock(new FixedBusinessClock(B));
    let audits=client.auditTrace.length;clear();
    for(let round=0;round<2;round++)await first.auditAs('Save unchanged row under Context B').save(context);
    noWrites();expect(client.auditTrace).toHaveLength(audits);
    let stored=await load(id);expect(stored.version).toBe(version);expect(milliseconds(stored.touchedAt)).toBe(A.getTime());
    expect(stored.lastIp).toBe('A:last_ip');
    first.updateName('n'.repeat(101));clear();await rejected(()=>first.auditAs('Reject invalid caller value').save(context),'/name');
    noWrites();expect(client.auditTrace).toHaveLength(audits);expect(first.name).toHaveLength(101);
    first.updateName('first');clear();await first.auditAs('Revert rejected edit and remain unchanged').save(context);noWrites();
    first.updateName('renamed');invalidIP=true;clear();
    await rejected(()=>first.auditAs('Reject invalid Context supplied IP').save(context),'/lastIp');noWrites();invalidIP=false;
    expect(first.lastIp).toBe('A:last_ip');expect(first.name).toBe('renamed');
    await first.auditAs('Commit one independently established business change').save(context);
    expect(client.auditTrace).toHaveLength(audits+1);stored=await load(id);
    expect(E.entry(stored).name().eval()).toBe('renamed');expect(stored.version).toBe(Number(version)+1);
    expect(milliseconds(stored.bornAt)).toBe(A.getTime());expect(milliseconds(stored.touchedAt)).toBe(B.getTime());
    expect(stored.sourceIp).toBe('A:source_ip');expect(stored.openedBy).toBe('A:opened_by');
    expect(stored.lastIp).toBe('B:last_ip');expect(stored.changedBy).toBe('B:changed_by');

    // A valid earlier child must not keep Fix from an invalid graph attempt.
    const parents=await Q.catalogs().withIdIs('1').limit(1).comment('Load unchanged graph ancestor')
      .purpose('Verify Context Fix isolation and graph rollback').executeForList(context);
    expect(parents).toHaveLength(1);const parent=parents[0],parentVersion=parent.version;
    first=await load(id);second=await load(second.id!);parent.entryList().push(first,second);
    first.updateName('graph edit');second.updateName('z'.repeat(101));phase='C';context.withBusinessClock(new FixedBusinessClock(C));
    audits=client.auditTrace.length;clear();
    await rejected(()=>parent.auditAs('Reject the later child after preparing its sibling').save(context),'/entryList/1/name');
    noWrites();expect(client.auditTrace).toHaveLength(audits);
    expect(first.name).toBe('graph edit');expect(first.lastIp).toBe('B:last_ip');
    const ledger=(first as any)._root,key={entity:'Entry',id:first.id!};
    expect(Object.keys(ledger.change(key))).toEqual(['name']);
    second.updateName('second');await parent.auditAs('Retry one independently changed child').save(context);
    expect(client.auditTrace).toHaveLength(audits+1);expect(parent.version).toBe(parentVersion);
    expect((await load(id)).lastIp).toBe('C:last_ip');expect((await load(second.id!)).lastIp).toBe('A:last_ip');
    process.stdout.write('TS_CONTEXT_FIX_CASE='+JSON.stringify({provider:kind,passed:true,noOpProviderCalls:0,
      failedCheckProviderCalls:0,updateAudits:1,typedQ:true,typedE:true,objectLocation:true,graphRollback:true})+'\n');
    write.mockRestore();transaction?.mockRestore();
  }finally{if(kind==='sqlite')await (client as SQLiteTeaQLClient).close();}
},30000);
