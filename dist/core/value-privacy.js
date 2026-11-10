"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessMask = exports.scrubLogText = exports.logValueStrings = exports.hasCredentials = exports.credentialName = exports.plaintextLogsEnabled = exports.maskAuditValue = exports.PLAINTEXT_LOG_ACK = exports.PLAINTEXT_LOG_ENV = void 0;
/** Shared value privacy primitives; independent of SQL, contexts and providers. */
exports.PLAINTEXT_LOG_ENV = 'TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS';
exports.PLAINTEXT_LOG_ACK = 'I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK';
const redacted = '[REDACTED]';
let warned = false;
function maskAuditValue(value) {
    const scalars = Array.from(value);
    if (scalars.length < 8 || /^[0-9]+$/.test(value))
        return '*'.repeat(scalars.length);
    return scalars.slice(0, 2).join('') + '*'.repeat(scalars.length - 4) + scalars.slice(-2).join('');
}
exports.maskAuditValue = maskAuditValue;
function plaintextLogsEnabled() {
    const environment = globalThis.process?.env;
    const enabled = environment?.[exports.PLAINTEXT_LOG_ENV] === exports.PLAINTEXT_LOG_ACK;
    if (enabled && !warned) {
        warned = true;
        console.warn('TeaQL: sensitive plaintext logging enabled; application data may be written to disk. Authentication secrets remain redacted.');
    }
    return enabled;
}
exports.plaintextLogsEnabled = plaintextLogsEnabled;
function credentialName(name) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return ['password', 'passwd', 'passphrase', 'privatekey', 'secret', 'accesstoken',
        'refreshtoken', 'idtoken', 'apikey', 'authorization', 'credential', 'sessiontoken',
        'magiclinktoken'].some(word => normalized.includes(word));
}
exports.credentialName = credentialName;
function hasCredentials(value) {
    return !!value && typeof value === 'object' && credentialObject(value, new WeakSet());
}
exports.hasCredentials = hasCredentials;
function credentialObject(value, seen) {
    if (!value || typeof value !== 'object' || seen.has(value))
        return false;
    seen.add(value);
    try {
        if (Array.isArray(value))
            return value.some(child => credentialObject(child, seen));
        return Object.entries(value).some(([key, child]) => credentialName(key) || credentialObject(child, seen));
    }
    finally {
        seen.delete(value);
    }
}
function logValueStrings(value) {
    if (value === undefined || value === null || value === '')
        return [];
    return typeof value === 'object' ? objectStrings(value, new WeakSet()) : [String(value)];
}
exports.logValueStrings = logValueStrings;
function objectStrings(value, seen) {
    if (value === undefined || value === null || value === '')
        return [];
    if (typeof value === 'object') {
        if (seen.has(value))
            return [];
        seen.add(value);
        try {
            if (Array.isArray(value))
                return value.flatMap(child => objectStrings(child, seen));
            if (value instanceof Date)
                return [value.toISOString()];
            return Object.values(value).flatMap(child => objectStrings(child, seen));
        }
        finally {
            seen.delete(value);
        }
    }
    return [String(value)];
}
function scrubLogText(text, values) {
    return [...new Set(values)].sort((a, b) => b.length - a.length)
        .reduce((result, value) => result?.split(value).join(redacted), text);
}
exports.scrubLogText = scrubLogText;
/** Internal shared structured-value implementation, not a public barrel API. */
function businessMask(value, seen = new WeakSet()) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'object') {
        if (seen.has(value))
            return redacted;
        seen.add(value);
        try {
            if (Array.isArray(value))
                return value.map(child => businessMask(child, seen));
            if ('type' in value)
                return businessMask(value.value, seen);
            if (!(value instanceof Date))
                return redacted;
        }
        finally {
            seen.delete(value);
        }
    }
    return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}
exports.businessMask = businessMask;
//# sourceMappingURL=value-privacy.js.map