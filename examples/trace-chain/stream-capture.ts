import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {EntityRoot,SelectQuery,UserContext} from 'teaql-ts';
import {AbstractSQLTeaQLClient,SQLExecutionEvidenceStore} from 'teaql-ts/sql/core';
import {SQLiteDriver} from 'teaql-ts/sql/sqlite';
import {Q} from './lib/src/generated/Q';
import {E} from './lib/src/generated/E';
import {GENERATED_RUNTIME_MODULE} from './lib/src/runtime-module';

const manifest=(directory:string):string=>readdirSync(directory,{withFileTypes:true})
  .sort((a,b)=>a.name.localeCompare(b.name)).map(entry=>entry.isDirectory()
    ?manifest(join(directory,entry.name)):createHash('sha256').update(readFileSync(join(directory,entry.name))).digest('hex')).join('');
class Client extends AbstractSQLTeaQLClient {
  constructor(driver:SQLiteDriver){super(driver,GENERATED_RUNTIME_MODULE.schemas);}
}
class Context extends UserContext {
  allowed:string[]=[];
  calls=0;
  override prepareQuery(query:SelectQuery):SelectQuery {
    this.calls++;
    const prepared=super.prepareQuery(query);
    return query.entity==='CustomerOrder'
      ?prepared.filter({$and:[query.filterCondition,{id:{$in:this.allowed}}]}):prepared;
  }
}
async function collect<T>(stream:AsyncIterable<T>):Promise<T[]> {
  const rows:T[]=[];for await(const row of stream)rows.push(row);return rows;
}
const ledger=(entity:unknown)=>(entity as {_root:EntityRoot})._root;
async function main(){
  const before=manifest('lib');
  const path=resolve(process.env.TEAQL_TRACE_CHAIN_STREAM_DB??'.local/stream-capture.sqlite');
  mkdirSync(dirname(path),{recursive:true});
  const client=new Client(new SQLiteDriver(path)).install(GENERATED_RUNTIME_MODULE).setDiagnosticSQLLogSink(undefined);
  const context=new Context().insertResource('dataService',client);
  const sql=new SQLExecutionEvidenceStore();client.setRuntimeTelemetrySink(sql);
  const group=`STREAM-${randomUUID()}`,secret='PRIVATE-STREAM-CHILD';
  const ids:string[]=[];
  try{
    await context.ensureSchema();await context.ensureSchema();
    for(let index=0;index<3;index++){
      const root=Q.customerOrders().comment('seed stream capture').purpose('verify delayed consumption').newEntity(context)
        .updatePlatform('1').updateOrderNumber(`${group}-${index}`).updateDescription(group);
      root.orderItemList().push(Q.orderItems().comment('seed stream child').purpose('verify delayed relation capture')
        .newEntity(context).updateName(secret));
      await root.auditAs('seed delayed stream graph').save(context);ids.push(root.id!);
    }
    sql.enableAll();context.calls=0;context.allowed=ids.slice(0,2);
    const child=Q.orderItems().withNameIs(secret).limit(2);
    const builder=Q.customerOrders().withIdIn(...ids).selectOrderItemListWith(child).orderByIdAscending().limit(3);
    const request=builder.comment(`first ${secret} ${group}`).purpose('first stream');
    const first=request.executeForStream(context,1);
    assert.equal(context.calls,1,'Context preparation belongs to stream creation, not first poll');
    assert.equal(sql.snapshot().length,0,'creating a stream does not execute SQL');
    request.comment('caller replaced first intent');child.withNameIs('no match');
    context.allowed=ids.slice(2);
    const second=Q.customerOrders().withIdIn(...ids)
      .selectOrderItemListWith(Q.orderItems().withNameIs(secret).limit(2)).limit(3)
      .comment(`second ${secret} ${group}`).purpose('second stream').executeForStream(context,1);
    assert.equal(context.calls,2);context.allowed=[];
    const [a,b]=await Promise.all([collect(first),collect(second)]);
    assert.deepEqual(a.map(row=>E.customerOrder(row).id().eval()),ids.slice(0,2));
    assert.deepEqual(b.map(row=>E.customerOrder(row).id().eval()),ids.slice(2));
    assert.equal(new Set([...a,...b].map(ledger)).size,3);
    for(const row of [...a,...b]){
      assert.equal(row.orderItemList().length,1);
      assert.equal(E.orderItem(row.orderItemList()[0]).name().eval(),secret);
      assert.equal(ledger(row),ledger(row.orderItemList()[0]));
    }
    const observations=sql.snapshot();
    assert.equal(observations.length,5,'two root SELECTs and three real child probes');
    assert(!JSON.stringify(observations).includes(secret));
    assert(!JSON.stringify(observations).includes('caller replaced'));
    for(const entry of observations){
      assert(entry.comment?.includes(group));
      assert(['first stream','second stream'].includes(entry.purpose!));
      assert.equal(entry.tracePath[0].name,'CustomerOrder');
      assert.equal(entry.tracePath[entry.tracePath.length-1].kind,'sql');
    }
    sql.enableAll();context.allowed=ids;
    const cancelled=Q.customerOrders().withIdIn(...ids).orderByIdAscending().limit(3)
      .comment('cancel after one').purpose('verify stream terminal').executeForStream(context,1)[Symbol.asyncIterator]();
    try {assert.equal((await cancelled.next()).done,false);} finally {await cancelled.return?.();}
    const terminal=sql.snapshot();assert.equal(terminal.length,1);
    assert.equal(terminal[0].executionOutcome,'cancelled');assert.equal(terminal[0].resultCount,1);
    sql.enableAll();
    const abandoned=Q.customerOrders().withIdIn(...ids).limit(3)
      .comment('never consumed').purpose('verify no fake SQL').executeForStream(context,1)[Symbol.asyncIterator]();
    await abandoned.return?.();assert.equal(sql.snapshot().length,0);
    assert.equal(manifest('lib'),before,'generated source unchanged');
    console.log(`STREAM_CAPTURE_OBSERVED ${JSON.stringify({group,ids,first:a.length,second:b.length,physicalQueries:observations.length,cancelledRows:terminal[0].resultCount,neverPolledStatements:0})}`);
    console.log('PASS TypeScript generated creation-time stream capture');
  }catch(error){console.error('STREAM_CAPTURE_SQL_SHAPES',client.sqlTrace.slice(-5));throw error;}
  finally{await client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
