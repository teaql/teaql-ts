/** An exact base-10 value. Construct it from text, never from a JS number. */
declare const decimalBrand: unique symbol;
export type Decimal = string & {
    readonly [decimalBrand]: 'TeaQL.Decimal';
};
/** Preserve every digit and the caller's scale across mutation and JSON boundaries. */
export declare function decimal(value: string): Decimal;
/** Numeric comparison without passing through IEEE-754. */
export declare function compareDecimals(left: string, right: string): number;
/** Binary-collated SQLite key with numeric order, including negatives and scale aliases. */
export declare function decimalOrderKey(value: string): string;
/** Exact addition; the result retains the widest supplied fractional scale. */
export declare function addDecimals(left: string, right: string): Decimal;
export {};
//# sourceMappingURL=decimal.d.ts.map