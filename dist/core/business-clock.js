"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedBusinessClock = exports.SystemBusinessClock = void 0;
class SystemBusinessClock {
    now() { return new Date(); }
}
exports.SystemBusinessClock = SystemBusinessClock;
class FixedBusinessClock {
    constructor(value) {
        if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
            throw new TypeError('Business clock requires a valid Date');
        this.milliseconds = value.getTime();
    }
    now() { return new Date(this.milliseconds); }
}
exports.FixedBusinessClock = FixedBusinessClock;
//# sourceMappingURL=business-clock.js.map