/** A signed 64-bit integer that survives JavaScript JSON without precision loss. */
declare const longBrand: unique symbol;
export type Long = string & {
    readonly [longBrand]: 'TeaQL.Long';
};
/** Accept exact text or bigint; a JS number is never a safe Long input. */
export declare function long(value: string | bigint): Long;
export declare function compareLongs(left: string, right: string): number;
/** Binary-collated order key for SQLite TEXT-backed Long columns. */
export declare function longOrderKey(value: string): string;
export {};
//# sourceMappingURL=long.d.ts.map