import {addDecimals, compareDecimals, decimal, decimalOrderKey, Decimal} from '../core/decimal';

export type WasmScalarFunction = Readonly<{
  name: string; arity: number; deterministic?: boolean;
  xFunc?: (context: number, ...values: unknown[]) => unknown;
  xStep?: (context: number, value: unknown) => void;
  xFinal?: (context: number) => unknown;
}>;
export type WasmFunctionDatabase = {createFunction(options: WasmScalarFunction): unknown};
export type WasmAggregateAPI = {sqlite3_js_aggregate_context(context: number, bytes: number): number};

/** TEXT-only exact arithmetic, shared with native SQLite's Decimal semantics.
 * SQLite's aggregate-context pointer, not its transient callback pCtx, owns a
 * group's state. See sqlite.org/wasm/doc/trunk/api-c-style.md#sqlite3_js_aggregate_context.
 */
export function installWasmDecimalFunctions(db: WasmFunctionDatabase, capi: WasmAggregateAPI): () => void {
  const exact = (value: unknown): Decimal => {
    if (typeof value !== 'string') throw new TypeError('Inexact SQLite Decimal value');
    return decimal(value);
  };
  db.createFunction({name: 'teaql_decimal_cmp', arity: 2, deterministic: true,
    xFunc: (_context, left, right) => left === null || right === null ? null : compareDecimals(exact(left), exact(right))});
  db.createFunction({name: 'teaql_decimal_order_key', arity: 1, deterministic: true,
    xFunc: (_context, value) => value === null ? null : decimalOrderKey(exact(value))});
  const groups: Array<Map<number, Decimal>> = [];
  for (const operation of ['sum', 'min', 'max'] as const) {
    const values = new Map<number, Decimal>(); groups.push(values);
    db.createFunction({name: `teaql_decimal_${operation}`, arity: 1, deterministic: true,
      xStep(context, next) {
        if (next === null) return;
        const value = exact(next), key = capi.sqlite3_js_aggregate_context(context, 1);
        if (!key) throw new Error('SQLite aggregate context allocation failed');
        const previous = values.get(key);
        values.set(key, previous === undefined ? value : operation === 'sum' ? addDecimals(previous, value)
          : compareDecimals(value, previous) === (operation === 'min' ? -1 : 1) ? value : previous);
      },
      xFinal(context) {
        const key = capi.sqlite3_js_aggregate_context(context, 0);
        const result = values.get(key) ?? null; values.delete(key); return result;
      }});
  }
  // Worker exec is synchronous and serialized. Release residual state after an
  // aborted statement and at close; no callbacks can still be executing then.
  return () => {for (const values of groups) values.clear();};
}
