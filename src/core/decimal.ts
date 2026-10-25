/** An exact base-10 value. Construct it from text, never from a JS number. */
declare const decimalBrand: unique symbol;
export type Decimal = string & { readonly [decimalBrand]: 'TeaQL.Decimal' };

const DECIMAL_TEXT = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MAX_DIGITS = 1024;

/** Preserve every digit and the caller's scale across mutation and JSON boundaries. */
export function decimal(value: string): Decimal {
  if (typeof value !== 'string' || !DECIMAL_TEXT.test(value)
      || value.length - Number(value.startsWith('-')) - Number(value.includes('.')) > MAX_DIGITS) {
    throw new TypeError('Decimal requires a finite base-10 string (for example "3.50")');
  }
  return value as Decimal;
}

type DecimalParts = { negative: boolean; integer: string; fraction: string };

function parts(value: string): DecimalParts {
  const exact = decimal(value);
  const negative = exact.startsWith('-');
  const [whole, fractional = ''] = (negative ? exact.slice(1) : exact).split('.');
  const integer = whole.replace(/^0+(?=[0-9])/, '');
  const fraction = fractional.replace(/0+$/, '');
  return { negative: negative && (integer !== '0' || fraction !== ''), integer, fraction };
}

/** Numeric comparison without passing through IEEE-754. */
export function compareDecimals(left: string, right: string): number {
  const a = parts(left);
  const b = parts(right);
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  const sign = a.negative ? -1 : 1;
  if (a.integer.length !== b.integer.length) {
    return Math.sign(a.integer.length - b.integer.length) * sign;
  }
  if (a.integer !== b.integer) return (a.integer < b.integer ? -1 : 1) * sign;
  const width = Math.max(a.fraction.length, b.fraction.length);
  const af = a.fraction.padEnd(width, '0');
  const bf = b.fraction.padEnd(width, '0');
  return af === bf ? 0 : (af < bf ? -1 : 1) * sign;
}

/** Binary-collated SQLite key with numeric order, including negatives and scale aliases. */
export function decimalOrderKey(value: string): string {
  const p = parts(value);
  const width = p.integer.length.toString().padStart(4, '0');
  if (!p.negative) return `1${width}${p.integer}:${p.fraction}!`;
  const invert = (digits: string) => digits.replace(/[0-9]/g, digit => String(9 - Number(digit)));
  return `0${invert(width)}${invert(p.integer)}:${invert(p.fraction)}~`;
}

/** Exact addition; the result retains the widest supplied fractional scale. */
export function addDecimals(left: string, right: string): Decimal {
  decimal(left);
  decimal(right);
  const leftScale = left.split('.')[1]?.length ?? 0;
  const rightScale = right.split('.')[1]?.length ?? 0;
  const scale = Math.max(leftScale, rightScale);
  const coefficient = (value: string, valueScale: number): bigint =>
    BigInt(value.replace('.', '')) * 10n ** BigInt(scale - valueScale);
  const sum = coefficient(left, leftScale) + coefficient(right, rightScale);
  if (scale === 0) return decimal(sum.toString());
  const negative = sum < 0n ? '-' : '';
  const digits = (sum < 0n ? -sum : sum).toString().padStart(scale + 1, '0');
  return decimal(`${negative}${digits.slice(0, -scale)}.${digits.slice(-scale)}`);
}
