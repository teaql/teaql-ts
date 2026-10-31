import {CheckException, ModeledInteger32Layout, RuntimeModule, SelectQuery, UserContext, integer32Error} from '../src';
import type {ColumnSchema,EntitySchema} from '../src/sql/core';
import {SQLiteTeaQLClient} from '../src/sql/sqlite';

const column:ColumnSchema={columnName:'legacy_amount',modelName:'required_integer',logicalType:'integer',decode:'number',integer32:true};
function schema(c=column):EntitySchema{return{table:'width_probe',columns:{requiredInteger:{...c}}};}
test.each([-2147483648,0,2147483647,null,undefined])('Integer32 pure kernel preserves allowed %p',value=>{
 expect(integer32Error(value,'WidthProbe','required_integer')).toBeUndefined();
});
test.each([-2147483649,2147483648,1.5,NaN,Infinity,'42','PRIVATE-INTEGER-INPUT',true,42n,{},[]])('Integer32 pure kernel rejects %p without value disclosure',value=>{
 const error=integer32Error(value,'WidthProbe','required_integer');expect(error).toBeInstanceOf(CheckException);
 expect(error!.violations[0].location.modelPath()).toBe('required_integer');expect(error!.violations[0].inputValue).toBeUndefined();
 expect(String(error)).not.toContain('PRIVATE-INTEGER-INPUT');
});
test('Integer32 SQL bigint normalization is exact, missing/null remain absent/null',()=>{
 const layout=new ModeledInteger32Layout('WidthProbe',schema());
 expect(layout.read('requiredInteger',2147483647n)).toBe(2147483647);
 expect(()=>layout.read('requiredInteger',2147483648n)).toThrow(CheckException);
 expect(layout.read('requiredInteger',undefined)).toBeUndefined();expect(layout.read('requiredInteger',null)).toBeNull();
 expect(layout.read('_wide_sum',4294967294)).toBe(4294967294);
});
test('Integer32 layout captures metadata before a custom Fix can downgrade the marker',()=>{
 const original=schema(),layout=new ModeledInteger32Layout('WidthProbe',original);
 original.columns.requiredInteger.integer32=false;original.columns.requiredInteger.modelName='other_field';
 const failures=layout.checkMutation({required_integer:2147483648});expect(failures).toHaveLength(1);
 expect(failures[0].location.modelPath()).toBe('required_integer');expect(failures[0].entityType).toBe('WidthProbe');
});
test.each([
 {name:'id',column:{...column,modelName:'id'}},{name:'version',column:{...column,modelName:'version'}},
 {name:'long',column:{...column,logicalType:'long' as const,decode:'long' as const}},
 {name:'float',column:{...column,logicalType:'double' as const}},
 {name:'text',column:{...column,decode:'string' as const}},
])('Integer32 metadata rejects incompatible $name before module installation',entry=>{
 expect(()=>new RuntimeModule({WidthProbe:schema(entry.column)})).toThrow(/INVALID_INTEGER32_METADATA/);
});
test('unmarked legacy integer storage is not implicitly narrowed',()=>{
 const layout=new ModeledInteger32Layout('Legacy',schema({...column,integer32:false}));
 expect(layout.read('requiredInteger',5000000000)).toBe(5000000000);
 expect(layout.checkMutation({required_integer:5000000000})).toEqual([]);
});
test('real SQLite derived SUM is wider than each modeled Integer even when the alias matches its source',async()=>{
 const model=schema();model.columns.id={columnName:'id',logicalType:'integer',decode:'string'};
 model.columns.version={columnName:'version',logicalType:'integer',decode:'number'};
 const client=new SQLiteTeaQLClient(':memory:',{WidthProbe:model});
 client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
 try{
  await new UserContext().insertResource('dataService',client).ensureSchema();
  for(const id of ['1','2'])await client.executeMutation({entity:'WidthProbe',action:'Create',id,
   payload:{required_integer:2147483647},comment:'prepare two valid Integer contributors'});
  for(const alias of ['_wide_sum','requiredInteger']){
   const query=new SelectQuery('WidthProbe').limit(2).aggregate('Sum','requiredInteger',alias)
    .comment('sum legal Integer contributors without narrowing the derived result').purpose('protect aggregate domains from source-field admission');
   expect(await client.executeQuery(query)).toEqual([{[alias]:4294967294}]);
  }
 }finally{await client.close();}
});
