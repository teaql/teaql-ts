"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.longOrderKey = exports.compareLongs = exports.long = void 0;
const decimal_1 = require("./decimal");
const LONG_TEXT = /^-?(?:0|[1-9][0-9]*)$/;
const MIN_LONG = -(1n << 63n);
const MAX_LONG = (1n << 63n) - 1n;
/** Accept exact text or bigint; a JS number is never a safe Long input. */
function long(value) {
    if (typeof value !== 'string' && typeof value !== 'bigint') {
        throw new TypeError('Long requires a signed 64-bit integer string or bigint');
    }
    const text = String(value);
    if (!LONG_TEXT.test(text))
        throw new TypeError('Long requires a canonical integer string');
    const exact = BigInt(text);
    if (exact < MIN_LONG || exact > MAX_LONG)
        throw new RangeError('Long is outside signed 64-bit range');
    return exact.toString();
}
exports.long = long;
function compareLongs(left, right) {
    const a = BigInt(long(left));
    const b = BigInt(long(right));
    return a < b ? -1 : a > b ? 1 : 0;
}
exports.compareLongs = compareLongs;
/** Binary-collated order key for SQLite TEXT-backed Long columns. */
function longOrderKey(value) {
    return (0, decimal_1.decimalOrderKey)(long(value));
}
exports.longOrderKey = longOrderKey;
//# sourceMappingURL=long.js.map