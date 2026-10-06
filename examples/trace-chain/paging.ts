import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { EntityRoot, SelectQuery, UserContext } from 'teaql-ts';
import { AbstractSQLTeaQLClient, SQLExecutionEvidenceStore } from 'teaql-ts/sql/core';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

function manifest(directory: string, prefix = ''): string {
  return readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))
    .map(entry=>entry.isDirectory()?manifest(join(directory,entry.name),`${prefix}${entry.name}/`)
      :`${createHash('sha256').update(readFileSync(join(directory,entry.name))).digest('hex')}  ${prefix}${entry.name}\n`).join('');
}
class Client extends AbstractSQLTeaQLClient {
  constructor(driver:SQLiteDriver){super(driver,GENERATED_RUNTIME_MODULE.schemas);}
}
class Context extends UserContext {
  allowed?:string[];
  calls=0;
  override prepareQuery(query:SelectQuery):SelectQuery {
    this.calls++;
    const prepared=super.prepareQuery(query);
    if(this.allowed && prepared.entity==='CustomerOrder') prepared.filter({$and:[prepared.filterCondition,{id:{$in:this.allowed}}]});
    return prepared;
  }
}
const ledger=(entity:unknown)=>(entity as {_root:EntityRoot})._root;
async function main() {
  const before=manifest('lib');
  const database=resolve(process.env.TEAQL_TRACE_CHAIN_PAGE_DB??'.local/paging.sqlite');
  mkdirSync(dirname(database),{recursive:true});
  const client=new Client(new SQLiteDriver(database)).install(GENERATED_RUNTIME_MODULE).setDiagnosticSQLLogSink(undefined);
  const context=new Context().insertResource('dataService',client);
  const sql=new SQLExecutionEvidenceStore();
  const audits:Readonly<Record<string,unknown>>[]=[];
  client.setRuntimeTelemetrySink(sql).setAuditSink(event=>{audits.push(event);});
  const failures:unknown[]=[];
  try {
    await context.ensureSchema(); await context.ensureSchema();
    for(const mode of ['page','scope','list','stream']) {
      try {
        context.allowed=undefined;
        const group=`VISIBLE-PAGE-${randomUUID()}`;
        const privateName='PRIVATE-TS-PAGE-CHILD-CANARY';
        const ids:string[]=[];
        for(let i=0;i<(mode==='scope'?4:3);i++) {
          const root=Q.customerOrders().comment('initialize page root').purpose('verify page isolation').newEntity(context)
            .updatePlatform('1').updateOrderNumber(`${group}-${i}`).updateDescription(group);
          root.orderItemList().push(Q.orderItems().comment('initialize page child').purpose('verify page isolation').newEntity(context).updateName(privateName));
          await root.auditAs('seed page graph').save(context); ids.push(root.id!);
        }
        const paged=mode==='page'||mode==='scope';
        if(mode==='scope')context.allowed=ids.slice(0,3);
        if(!paged)context.allowed=ids.slice(1,3);
        sql.enableAll();audits.length=0;context.calls=0;
        const request=Q.customerOrders().withDescriptionIs(group)
          .selectOrderItemListWith(Q.orderItems().withNameIs(privateName).limit(2))
          .orderByIdAscending().limit(3).comment(`inspect ${privateName} ${group}`).purpose(`verify ${privateName} ${group}`);
        let page;
        if(paged)page=await request.executeForPage(context,1,2);
        else {
          const data=mode==='list'?Array.from(await request.executeForList(context)):[];
          if(mode==='stream')for await(const entity of request.executeForStream(context,1))data.push(entity);
          page={data,totalCount:undefined};
        }
        assert.equal(page.totalCount,paged?3:undefined,'count and data must use the same Context-scoped request');
        assert.equal(context.calls,1,'prepare Context once for count and rows');
        const rows=Array.from(page.data);
        assert.deepEqual(rows.map(row=>E.customerOrder(row).id().eval()),ids.slice(1,3));
        assert.notEqual(ledger(rows[0]),ledger(rows[1]),'page roots need independent mutation ownership');
        const childIDs=rows.map((row,i)=>{
          assert.equal(row.orderItemList().length,1);
          const child=row.orderItemList()[0];
          assert.equal(ledger(row),ledger(child),'owned child must join only its parent graph');
          assert.equal(E.orderItem(child).name().eval(),privateName);
          assert.equal(E.orderItem(child).customerOrderId().eval(),ids[i+1]);
          return child.id!;
        });
        const statements=sql.snapshot();
        assert.equal(statements.filter(entry=>entry.parameterizedSQL.includes('__teaql_total')).length,paged?1:0);
        assert.equal(statements.length,paged?4:3,'only count (if requested), root and two SQLite child probes execute');
        assert(!JSON.stringify(statements).includes(privateName),'page/count/relation logs must mask child source');
        for(const entry of statements){
          assert(entry.comment?.includes(group));assert(entry.purpose?.includes(group));
          assert.equal(entry.tracePath[0].name,'CustomerOrder');
          assert.equal(entry.tracePath[entry.tracePath.length-1].kind,'sql');
        }
        context.allowed=undefined;
        rows.forEach((row,i)=>{
          row.updateDescription(`${group}-saved-${i}`);
          row.orderItemList()[0].updateName(`saved child ${i}`).auditAs(`edit page child ${i}`);
        });
        for(let i=0;i<2;i++) {
          audits.length=0;sql.enableAll();
          const reason=`save independent page ${i}`;
          await rows[i].auditAs(reason).save(context);
          assert.equal(audits.length,2,'only owning root and child commit');
          for(const event of audits)assert.equal((event.mutationLineage as any[])[0].detail,reason);
          for(let j=0;j<2;j++) {
            const reloaded=await Q.customerOrders().withIdIs(ids[j+1]).selectOrderItemListWith(Q.orderItems().limit(2)).limit(1)
              .comment('reload page graph').purpose('verify independent persistence').executeForList(context);
            const root=reloaded[0],child=root.orderItemList()[0];
            assert.equal(E.customerOrder(root).description().eval(),j<=i?`${group}-saved-${j}`:group);
            assert.equal(E.customerOrder(root).version().eval(),j<=i?2:1);
            assert.equal(E.orderItem(child).name().eval(),j<=i?`saved child ${j}`:privateName);
            assert.equal(E.orderItem(child).version().eval(),j<=i?2:1);
          }
        }
        console.log(`PAGE_OBSERVED ${JSON.stringify({mode,group,ids,childIDs,total:page.totalCount,offset:paged?1:0,size:2,physicalQueries:statements.length})}`);
        console.log(`PAGE OWNERSHIP PASSED: ${mode}`);
      } catch(error) {failures.push(error);console.error(`PAGE FAILED: ${mode}`,error);}
    }
    assert.equal(manifest('lib'),before,'generated library unchanged');
    assert.equal(failures.length,0,'all page scenarios must pass');
  } finally {await client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
