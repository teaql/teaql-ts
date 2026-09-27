"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectSQLLog = exports.scrubLogText = exports.logValueStrings = exports.credentialName = exports.plaintextLogsEnabled = exports.PLAINTEXT_LOG_ACK = exports.PLAINTEXT_LOG_ENV = void 0;
exports.PLAINTEXT_LOG_ENV = 'TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS';
exports.PLAINTEXT_LOG_ACK = 'I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK';
const redacted = '[REDACTED]';
const redactedSQL = '[REDACTED SQL; NOT REPLAYABLE]';
let warned = false;
function plaintextLogsEnabled() {
    // Browsers have no trusted process environment: remain redacted there.
    const enabled = typeof process !== 'undefined' && process.env?.[exports.PLAINTEXT_LOG_ENV] === exports.PLAINTEXT_LOG_ACK;
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
    if (Array.isArray(value))
        return value.some(hasCredentials);
    if (value && typeof value === 'object') {
        return Object.entries(value).some(([key, child]) => credentialName(key) || hasCredentials(child));
    }
    return false;
}
function logValueStrings(value) {
    if (value === undefined || value === null || value === '')
        return [];
    if (Array.isArray(value))
        return value.flatMap(logValueStrings);
    if (value instanceof Date)
        return [value.toISOString()];
    if (typeof value === 'object')
        return Object.values(value).flatMap(logValueStrings);
    return [String(value)];
}
exports.logValueStrings = logValueStrings;
function scrubLogText(text, values) {
    return [...new Set(values)].sort((a, b) => b.length - a.length)
        .reduce((result, value) => result?.split(value).join(redacted), text);
}
exports.scrubLogText = scrubLogText;
function projectSQLLog(metadata) {
    const credentials = credentialName(metadata.parameterizedSQL) || credentialName(metadata.debugSQL)
        || hasCredentials(metadata.parameters);
    if (plaintextLogsEnabled() && !credentials)
        return metadata;
    const secrets = logValueStrings(metadata.parameters);
    const unsafeSQL = /['"`$]|--|\/\*|\b\d+\b/.test(metadata.parameterizedSQL);
    return Object.freeze({
        ...metadata,
        parameterizedSQL: unsafeSQL ? redactedSQL : scrubLogText(metadata.parameterizedSQL, secrets),
        parameters: Object.freeze(metadata.parameters.map(() => null)),
        debugSQL: redactedSQL,
        comment: scrubLogText(metadata.comment, secrets),
        purpose: scrubLogText(metadata.purpose, secrets),
        auditReason: scrubLogText(metadata.auditReason, secrets),
        tracePath: Object.freeze(metadata.tracePath.map(frame => Object.freeze(Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, typeof value === 'string' ? scrubLogText(value, secrets) : value]))))),
    });
}
exports.projectSQLLog = projectSQLLog;
//# sourceMappingURL=log-privacy.js.map