/** Time of day without a date or UTC offset; six fractional digits are portable. */
declare const localTimeBrand: unique symbol;
export type LocalTime = string & {
    readonly [localTimeBrand]: 'TeaQL.LocalTime';
};
export declare function localTime(value: string): LocalTime;
export {};
//# sourceMappingURL=local-time.d.ts.map