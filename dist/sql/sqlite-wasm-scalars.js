"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installWasmDecimalFunctions = void 0;
const decimal_1 = require("../core/decimal");
/** TEXT-only exact arithmetic, shared with native SQLite's Decimal semantics.
 * SQLite's aggregate-context pointer, not its transient callback pCtx, owns a
 * group's state. See sqlite.org/wasm/doc/trunk/api-c-style.md#sqlite3_js_aggregate_context.
 */
function installWasmDecimalFunctions(db, capi) {
    const exact = (value) => {
        if (typeof value !== 'string')
            throw new TypeError('Inexact SQLite Decimal value');
        return (0, decimal_1.decimal)(value);
    };
    db.createFunction({ name: 'teaql_decimal_cmp', arity: 2, deterministic: true,
        xFunc: (_context, left, right) => left === null || right === null ? null : (0, decimal_1.compareDecimals)(exact(left), exact(right)) });
    db.createFunction({ name: 'teaql_decimal_order_key', arity: 1, deterministic: true,
        xFunc: (_context, value) => value === null ? null : (0, decimal_1.decimalOrderKey)(exact(value)) });
    const groups = [];
    for (const operation of ['sum', 'min', 'max']) {
        const values = new Map();
        groups.push(values);
        db.createFunction({ name: `teaql_decimal_${operation}`, arity: 1, deterministic: true,
            xStep(context, next) {
                if (next === null)
                    return;
                const value = exact(next), key = capi.sqlite3_js_aggregate_context(context, 1);
                if (!key)
                    throw new Error('SQLite aggregate context allocation failed');
                const previous = values.get(key);
                values.set(key, previous === undefined ? value : operation === 'sum' ? (0, decimal_1.addDecimals)(previous, value)
                    : (0, decimal_1.compareDecimals)(value, previous) === (operation === 'min' ? -1 : 1) ? value : previous);
            },
            xFinal(context) {
                const key = capi.sqlite3_js_aggregate_context(context, 0);
                const result = values.get(key) ?? null;
                values.delete(key);
                return result;
            } });
    }
    // Worker exec is synchronous and serialized. Release residual state after an
    // aborted statement and at close; no callbacks can still be executing then.
    return () => { for (const values of groups)
        values.clear(); };
}
exports.installWasmDecimalFunctions = installWasmDecimalFunctions;
//# sourceMappingURL=sqlite-wasm-scalars.js.map