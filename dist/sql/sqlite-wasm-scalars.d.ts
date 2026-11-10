export type WasmScalarFunction = Readonly<{
    name: string;
    arity: number;
    deterministic?: boolean;
    xFunc?: (context: number, ...values: unknown[]) => unknown;
    xStep?: (context: number, value: unknown) => void;
    xFinal?: (context: number) => unknown;
}>;
export type WasmFunctionDatabase = {
    createFunction(options: WasmScalarFunction): unknown;
};
export type WasmAggregateAPI = {
    sqlite3_js_aggregate_context(context: number, bytes: number): number;
};
/** TEXT-only exact arithmetic, shared with native SQLite's Decimal semantics.
 * SQLite's aggregate-context pointer, not its transient callback pCtx, owns a
 * group's state. See sqlite.org/wasm/doc/trunk/api-c-style.md#sqlite3_js_aggregate_context.
 */
export declare function installWasmDecimalFunctions(db: WasmFunctionDatabase, capi: WasmAggregateAPI): () => void;
//# sourceMappingURL=sqlite-wasm-scalars.d.ts.map