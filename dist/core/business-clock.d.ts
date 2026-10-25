/** Business decisions and Fix use this context-owned clock; TTLs/durations do not. */
export interface BusinessClock {
    now(): Date;
}
export declare class SystemBusinessClock implements BusinessClock {
    now(): Date;
}
export declare class FixedBusinessClock implements BusinessClock {
    private readonly milliseconds;
    constructor(value: Date);
    now(): Date;
}
//# sourceMappingURL=business-clock.d.ts.map