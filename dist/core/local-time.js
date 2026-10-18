"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localTime = void 0;
const LOCAL_TIME_TEXT = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,6})?$/;
function localTime(value) {
    if (typeof value !== 'string' || !LOCAL_TIME_TEXT.test(value)) {
        throw new TypeError('LocalTime requires HH:mm:ss with optional 1-6 fractional digits');
    }
    const dot = value.indexOf('.');
    if (dot < 0)
        return value;
    const fraction = value.slice(dot + 1).padEnd(6, '0');
    return (fraction === '000000' ? value.slice(0, dot) : `${value.slice(0, dot)}.${fraction}`);
}
exports.localTime = localTime;
//# sourceMappingURL=local-time.js.map