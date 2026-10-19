import { decimalOrderKey } from './decimal';

/** A signed 64-bit integer that survives JavaScript JSON without precision loss. */
declare const longBrand: unique symbol;
export type Long = string & { readonly [longBrand]: 'TeaQL.Long' };

const LONG_TEXT = /^-?(?:0|[1-9][0-9]*)$/;
const MIN_LONG = -(1n << 63n);
const MAX_LONG = (1n << 63n) - 1n;

/** Accept exact text or bigint; a JS number is never a safe Long input. */
export function long(value: string | bigint): Long {
  if (typeof value !== 'string' && typeof value !== 'bigint') {
    throw new TypeError('Long requires a signed 64-bit integer string or bigint');
  }
  const text = String(value);
  if (!LONG_TEXT.test(text)) throw new TypeError('Long requires a canonical integer string');
  const exact = BigInt(text);
  if (exact < MIN_LONG || exact > MAX_LONG) throw new RangeError('Long is outside signed 64-bit range');
  return exact.toString() as Long;
}

export function compareLongs(left: string, right: string): number {
  const a = BigInt(long(left));
  const b = BigInt(long(right));
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Binary-collated order key for SQLite TEXT-backed Long columns. */
export function longOrderKey(value: string): string {
  return decimalOrderKey(long(value));
}
