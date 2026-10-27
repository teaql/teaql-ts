import {installWasmDecimalFunctions, WasmScalarFunction} from '../src/sql/sqlite-wasm-scalars';

function fixture() {
  const functions = new Map<string, WasmScalarFunction>(), contexts = new Map<number, number>();
  const clear = installWasmDecimalFunctions({createFunction(fn) {functions.set(fn.name, fn);}},
    {sqlite3_js_aggregate_context(ctx, bytes) {if (!contexts.has(ctx) && bytes) contexts.set(ctx, ctx + 1000); return contexts.get(ctx) ?? 0;}});
  return {functions, contexts, clear, get: (name: string) => functions.get('teaql_decimal_' + name)!};
}
test('registers explicit SQL arities and deterministic exact TEXT functions', () => {
  const f=fixture(); expect(f.functions.size).toBe(5); for(const fn of f.functions.values()) expect(fn.deterministic).toBe(true);
  expect(f.get('cmp').arity).toBe(2); expect(f.get('sum').arity).toBe(1);
  expect(f.get('cmp').xFunc!(0,'9007199254740993.1','9007199254740993.01')).toBe(1);
  expect(f.get('cmp').xFunc!(0,null,'1')).toBeNull();
  expect(() => f.get('cmp').xFunc!(0,1,'1')).toThrow('Inexact SQLite Decimal');
});
test('SUM uses exact arithmetic beyond the JS safe integer range', () => {
  const sum=fixture().get('sum'); sum.xStep!(1,'9007199254740993.01'); sum.xStep!(1,'0.09');
  expect(sum.xFinal!(1)).toBe('9007199254740993.10'); expect(sum.xFinal!(1)).toBeNull();
});
test('empty and null-only aggregates stay null, not zero', () => {
  for(const op of ['sum','min','max']) {const fn=fixture().get(op);expect(fn.xFinal!(1)).toBeNull();fn.xStep!(2,null);expect(fn.xFinal!(2)).toBeNull();}
});
test('multiple groups use stable aggregate pointers, not callback-context identity', () => {
  const f=fixture(),sum=f.get('sum'); f.contexts.set(1,77); f.contexts.set(2,88); f.contexts.set(3,77);
  sum.xStep!(1,'1.25'); sum.xStep!(2,'5.00'); sum.xStep!(3,'2.75');
  expect(sum.xFinal!(3)).toBe('4.00'); expect(sum.xFinal!(2)).toBe('5.00');
});
test('MIN/MAX and ordering are numeric, not lexicographic TEXT order', () => {
  const f=fixture();for(const op of ['min','max'])for(const value of ['10.00','2.50','-100.25']) f.get(op).xStep!(1,value);
  expect(f.get('min').xFinal!(1)).toBe('-100.25');expect(f.get('max').xFinal!(1)).toBe('10.00');
  const order=f.get('order_key');const values=['10.00','2.50','-100.25'];
  expect(values.sort((a,b)=>String(order.xFunc!(0,a)).localeCompare(String(order.xFunc!(0,b))))).toEqual(['-100.25','2.50','10.00']);
});
test('aborted-query cleanup prevents state from leaking into reused group pointers', () => {
  const f=fixture(),sum=f.get('sum');sum.xStep!(1,'100.00');f.clear();expect(sum.xFinal!(1)).toBeNull();
  sum.xStep!(1,'3.00');expect(sum.xFinal!(1)).toBe('3.00');
});
test('numeric/inexact inputs and aggregate allocation failure are not coerced', () => {
  const sum=fixture().get('sum');expect(()=>sum.xStep!(1,0.1)).toThrow('Inexact SQLite Decimal');
  const functions:WasmScalarFunction[]=[];installWasmDecimalFunctions({createFunction(fn){functions.push(fn);}},{sqlite3_js_aggregate_context(){return 0;}});
  expect(()=>functions.find(fn=>fn.name==='teaql_decimal_sum')!.xStep!(1,'1')).toThrow('allocation failed');
});
