/** Business decisions and Fix use this context-owned clock; TTLs/durations do not. */
export interface BusinessClock { now(): Date; }

export class SystemBusinessClock implements BusinessClock {
  now(): Date { return new Date(); }
}

export class FixedBusinessClock implements BusinessClock {
  private readonly milliseconds: number;
  constructor(value: Date) {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError('Business clock requires a valid Date');
    this.milliseconds = value.getTime();
  }
  now(): Date { return new Date(this.milliseconds); }
}
