import assert from 'node:assert/strict';
import {randomUUID, createHash} from 'node:crypto';
import {mkdirSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {UserContext} from 'teaql-ts';
import {AbstractSQLTeaQLClient, SQLExecutionEvidenceStore, SQLExecutionMetadata, MutationResult} from 'teaql-ts/sql/core';
import {SQLiteDriver} from 'teaql-ts/sql/sqlite';
import {Q} from './lib/src/generated/Q';
import {E} from './lib/src/generated/E';
import {GENERATED_RUNTIME_MODULE} from './lib/src/runtime-module';

type Order = Parameters<typeof E.customerOrder>[0];
type Payment = Parameters<typeof E.payment>[0];
const secret = 'TS-PRIVATE-AGGREGATE-MEMBERSHIP';
const comment = `inspect ${secret}`, purpose = 'verify complete aggregate membership ancestry';
function hashes(dir: string): string {
  return readdirSync(dir, {withFileTypes: true}).sort((a,b)=>a.name.localeCompare(b.name))
    .map(row=>row.isDirectory()?hashes(join(dir,row.name)):
      createHash('sha256').update(readFileSync(join(dir,row.name))).digest('hex')).join('');
}
class Driver extends SQLiteDriver {
  reads: Array<{sql: string; values: unknown[]}> = [];
  override async query(sql: string, values: any[] = []) {
    if (/^SELECT\b/.test(sql)) this.reads.push({sql,values:[...values]});
    return super.query(sql,values);
  }
  override async *stream(sql: string, values: any[] = []) {
    this.reads.push({sql,values:[...values]});
    yield* super.stream(sql,values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  commands = 0;
  constructor(driver: Driver) {super(driver,GENERATED_RUNTIME_MODULE.schemas);}
  override async executeMutation(request: any): Promise<MutationResult> {
    this.commands++;return super.executeMutation(request);
  }
}
async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const rows: T[]=[];for await (const row of stream) rows.push(row);return rows;
}
function count(row: object): number {
  const value=(row as unknown as Record<string,unknown>).selectedItemCount;
  assert.equal(typeof value,'number','aggregate alias must exist, not default to zero');
  assert(Number.isSafeInteger(value));return value as number;
}
function route(root: string, edges: string[]) {
  let owner=root;
  const path: Array<[string,string,string]>=[['operation',root,'query'],['request',root,'']];
  for(const edge of edges) {
    path.push(['relation',edge,`${owner}.${edge}`]);
    owner=edge==='customerOrder'?'CustomerOrder':'OrderItem';
  }
  path.push(['provider','sqlite',''],['sql','select','']);return path;
}
async function main() {
  const before=hashes('lib');
  const database=resolve(process.env.TEAQL_TRACE_CHAIN_MEMBERSHIP_DB??'.local/aggregate-membership.sqlite');
  mkdirSync(dirname(database),{recursive:true});
  const driver=new Driver(database),client=new Client(driver).install(GENERATED_RUNTIME_MODULE);
  const context=new UserContext().insertResource('dataService',client);
  const evidence=new SQLExecutionEvidenceStore(),diagnostics: SQLExecutionMetadata[]=[],audits: unknown[]=[];
  client.setRuntimeTelemetrySink(evidence).setDiagnosticSQLLogSink(undefined).setAuditSink(event=>{audits.push(event);});
  const group=randomUUID();
  try {
    await context.ensureSchema();await context.ensureSchema();
    const order=Q.customerOrders().comment('initialize membership graph').purpose('verify generated aggregate')
      .newEntity(context).updatePlatform('1').updateOrderNumber(group).updateDescription(group);
    for(const name of [secret,'ordinary member'])order.orderItemList().push(Q.orderItems()
      .comment('initialize membership item').purpose('verify two members').newEntity(context).updateName(name));
    order.paymentList().push(Q.payments().comment('initialize membership payment').purpose('verify nested owner')
      .newEntity(context).updateReferenceCode(group));
    await order.auditAs('seed generated aggregate membership').save(context);
    const id=order.id!;
    for(const nested of [false,true])for(const mode of ['list','stream-full','stream-tail'])
      for(const logging of [false,true])for(const filtered of [false,true]) {
        driver.reads=[];client.commands=0;audits.length=0;diagnostics.length=0;evidence.enableAll();
        client.setQueryLoggingEnabled(logging).setDiagnosticSQLLogSink({write:entry=>diagnostics.push(entry)});
        const children=Q.orderItems().limit(2).selectCustomerOrderWith(Q.customerOrders()
          .withIdIs(filtered?'0':id).limit(1));
        const orders=Q.customerOrders().withIdIs(id).limit(1)
          .countOrderItemsWith('selectedItemCount',Q.orderItems().withNameIs(secret).limit(2))
          .selectOrderItemListWith(children);
        const query=nested?Q.payments().filterByCustomerOrderIn(id).limit(1).selectCustomerOrderWith(orders):orders;
        const request=query.comment(comment).purpose(purpose);
        const rows=mode==='list'?await request.executeForList(context):
          await collect<Order|Payment>(request.executeForStream(context,mode==='stream-full'?1:3));
        assert.equal(rows.length,1);
        const loaded=nested?E.payment(rows[0] as Payment).customerOrder().eval():rows[0] as Order;
        assert(loaded);assert.equal(E.customerOrder(loaded).id().eval(),id);
        assert.equal(count(loaded),1);
        const items=loaded.orderItemList();assert.equal(items.length,2);
        const identities=items.map(item=>{
          const target=E.orderItem(item).customerOrder().eval();assert(target);
          assert.equal(E.customerOrder(target).id().eval(),id,'actual FK identity survives filtering');
          if(filtered)assert.throws(()=>E.customerOrder(target).description().eval(),{name:'TeaQLNotLoadedError'});
          else assert.equal(E.customerOrder(target).description().eval(),group);
          return E.customerOrder(target).id().eval();
        });
        const safe=evidence.snapshot();
        const edges=nested?[[],['customerOrder'],['customerOrder','orderItemList'],
          ['customerOrder','orderItemList'],['customerOrder','orderItemList','customerOrder']]:
          [[],['orderItemList'],['orderItemList'],['orderItemList','customerOrder']];
        assert.equal(safe.length,edges.length);assert.equal(driver.reads.length,edges.length);
        assert.equal(diagnostics.length,logging?safe.length:0);
        // A streamed root records completion after its cursor closes. Its child
        // statements complete first; do not pretend metadata is emitted on open.
        const completedEdges=mode==='list'?edges:[...edges.slice(1),edges[0]];
        safe.forEach((entry,i)=>{
          const physicalIndex=mode==='list'?i:(i+1)%edges.length;
          assert.equal(entry.parameterizedSQL,driver.reads[physicalIndex].sql,'metadata must describe actual driver SQL');
          assert.equal(entry.executionOutcome,'success');assert.equal(entry.comment,'inspect [REDACTED]');
          assert.equal(entry.purpose,purpose);
          assert.deepEqual(entry.tracePath.map(n=>[n.kind,n.name,n.detail??'']),route(nested?'Payment':'CustomerOrder',completedEdges[i]));
        });
        assert(!JSON.stringify({safe,diagnostics}).includes(secret));
        const aggregates=driver.reads.filter(r=>/COUNT\(/i.test(r.sql));assert.equal(aggregates.length,1);
        assert(aggregates[0].values.includes(secret),'masking must not change actual database bindings');
        assert.equal(client.commands,0);assert.equal(audits.length,0);
        console.log('TS_AGGREGATE_MEMBERSHIP '+JSON.stringify({nested,mode,logging,filtered,id,count:count(loaded),
          members:items.length,foreignIDs:identities,detail:filtered?'NotLoaded':'Loaded',
          commands:client.commands,audits:audits.length,diagnostics:diagnostics.length,physical:driver.reads,safe}));
        if(filtered) {
          const independent=await Q.customerOrders().withIdIs(id).limit(1)
            .comment('load independent full detail').purpose('verify edge-owned view').executeForList(context);
          assert.equal(E.customerOrder(independent[0]).description().eval(),group);
          for(const item of items)assert.throws(()=>E.orderItem(item).customerOrder().description().eval(),{name:'TeaQLNotLoadedError'});
        }
      }
    assert.equal(hashes('lib'),before,'generated library is unchanged');
    const entry=require.resolve('teaql-ts'),runtimeRoot=resolve(dirname(entry),'..');
    console.log('TS_AGGREGATE_RUNTIME '+JSON.stringify({entry,runtimeRoot,
      modules:Object.keys(require.cache).filter(file=>file.startsWith(runtimeRoot+'/dist/')).sort()
        .map(file=>({path:file.slice(runtimeRoot.length+1),sha256:createHash('sha256').update(readFileSync(file)).digest('hex')}))}));
    console.log('PASS TypeScript generated aggregate membership: 24 scenarios; actual SQL, complete safe ancestry, FK and independent filtered views');
  } finally {await client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
