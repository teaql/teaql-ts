import {SelectQuery, OrderBy} from '../src/core/ast';
import {UserContext} from '../src/core/context';
import {EntitySchema} from '../src/sql/core';
import {SQLiteTeaQLClient} from '../src/sql/sqlite';

const schemas: Record<string, EntitySchema> = {Entry: {table:'group_alias_entry', columns:{
  id:{columnName:'id',logicalType:'integer',decode:'string'},
  version:{columnName:'version',logicalType:'integer',decode:'number'},
  active:{columnName:'active',logicalType:'boolean',decode:'native'},
  amount:{columnName:'amount',logicalType:'integer',decode:'number'},
  timestamp:{columnName:'timestamp',logicalType:'datetime',decode:'date'},
  exact:{columnName:'exact_value',modelName:'exact_value',logicalType:'decimal',decode:'decimal'},
  huge:{columnName:'huge_value',modelName:'huge_value',logicalType:'long',decode:'long'},
  note:{columnName:'note',logicalType:'text',decode:'string',nullable:true},
}}};
const bounded=()=>new SelectQuery('Entry').limit(10).comment('verify grouped result aliases')
  .purpose('preserve source types and caller-selected result names');
async function fixture(){const client=new SQLiteTeaQLClient(':memory:',schemas);
  client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  await new UserContext().insertResource('dataService',client).ensureSchema();
  for(let i=0;i<3;i++)await client.executeMutation({entity:'Entry',action:'Create',id:String(i+1),
    payload:{active:i!==0,amount:i+1,timestamp:1787995800000,exact_value:'12345678901234567890.123456789',
      huge_value:'9007199254740993',note:i===0?null:'same'},comment:'seed a grouping test record'});
  return client;
}
// Compatible metadata lets the same semantic probe execute against the old
// runtime without requiring the new builder overload merely to compile.
function alias(query:SelectQuery,field:string,name:string){
  query.groupBy(field);
  (query as SelectQuery & {groupByAliases?:Record<string,string>}).groupByAliases={
    ...(query as SelectQuery & {groupByAliases?:Record<string,string>}).groupByAliases,[field]:name};
  return query;
}
test('group aliases are real SQL projections and booleans keep their native type',async()=>{
  const client=await fixture();try{
    const query=alias(bounded(),'active','bucket').aggregate('Count','id','hits').order(OrderBy.asc('active'));
    const before=JSON.stringify(query),rows=await client.executeQuery(query);
    expect(rows).toEqual([{bucket:false,hits:1},{bucket:true,hits:2}]);expect(JSON.stringify(query)).toBe(before);
  }finally{await client.close();}
});
test('group-only queries project only the selected group and preserve SQL null',async()=>{
  const client=await fixture();try{
    expect(await client.executeQuery(alias(bounded(),'note','label').order(OrderBy.asc('note'))))
      .toEqual([{label:null},{label:'same'}]);
  }finally{await client.close();}
});
test('an alias matching another model field is decoded through its original source field',async()=>{
  const client=await fixture();try{
    expect(await client.executeQuery(alias(bounded(),'active','huge').aggregate('Count','id','timestamp').order(OrderBy.asc('active'))))
      .toEqual([{huge:false,timestamp:1},{huge:true,timestamp:2}]);
  }finally{await client.close();}
});
test('aggregate-only aliases do not accidentally use model boolean or time decoding',async()=>{
  const client=await fixture();try{
    expect(await client.executeQuery(bounded().aggregate('Count','id','active').aggregate('Sum','amount','timestamp')))
      .toEqual([{active:3,timestamp:6}]);
  }finally{await client.close();}
});
for(const [field,name,expected]of [['timestamp','when','2026-08-29T09:30:00.000Z'],
  ['exact','decimalTotal','12345678901234567890.123456789'],['huge','longKey','9007199254740993']] as const){
  test('group alias retains '+field+' precision and native decoding',async()=>{const client=await fixture();try{
    expect(await client.executeQuery(alias(bounded(),field,name).aggregate('Count','id','hits')))
      .toEqual([{[name]:expected,hits:3}]);
  }finally{await client.close();}});
}
test('streamed grouped rows use the same alias and type metadata as list rows',async()=>{
  const client=await fixture();try{
    const query=alias(bounded(),'active','bucket').aggregate('Count','id','hits').order(OrderBy.asc('active'));
    const rows=[];for await(const chunk of client.executeForStream(query,1))rows.push(...chunk);
    expect(rows).toEqual([{bucket:false,hits:1},{bucket:true,hits:2}]);
  }finally{await client.close();}
});
for(const kind of ['duplicate-group','group-aggregate','duplicate-aggregate','invalid-alias','ungrouped-alias']){
  test(kind+' is rejected before provider execution',async()=>{const client=await fixture();try{
    const query=bounded();
    if(kind==='duplicate-group'){alias(query,'active','same');alias(query,'amount','same');}
    if(kind==='group-aggregate')alias(query,'active','same').aggregate('Count','id','same');
    if(kind==='duplicate-aggregate')query.aggregate('Count','id','same').aggregate('Sum','amount','same');
    if(kind==='invalid-alias')alias(query,'active','not a safe identifier');
    if(kind==='ungrouped-alias')(query as SelectQuery & {groupByAliases?:Record<string,string>}).groupByAliases={active:'orphan'};
    const driver=jest.spyOn((client as any).driver,'query');
    await expect(client.executeQuery(query)).rejects.toThrow(/alias|identifier/i);expect(driver).not.toHaveBeenCalled();
  }finally{await client.close();}});
}
