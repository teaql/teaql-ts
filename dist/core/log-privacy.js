"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectSQLLog = exports.inheritSQLLogBindings = exports.privateLogValueStrings = exports.retainSQLLogProvenance = exports.scrubLogText = exports.logValueStrings = exports.hasCredentials = exports.credentialName = exports.plaintextLogsEnabled = exports.maskAuditValue = exports.PLAINTEXT_LOG_ACK = exports.PLAINTEXT_LOG_ENV = void 0;
const log_rendering_1 = require("../sql/log-rendering");
exports.PLAINTEXT_LOG_ENV = 'TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS';
exports.PLAINTEXT_LOG_ACK = 'I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK';
const redacted = '[REDACTED]';
const redactedSQL = '[REDACTED SQL; NOT REPLAYABLE]';
const debugLabel = '-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN\n';
let warned = false;
/** Business-field masking; credentials always need complete redaction instead. */
function maskAuditValue(value) {
    const scalars = Array.from(value);
    if (scalars.length < 8 || /^[0-9]+$/.test(value))
        return '*'.repeat(scalars.length);
    return scalars.slice(0, 2).join('') + '*'.repeat(scalars.length - 4) + scalars.slice(-2).join('');
}
exports.maskAuditValue = maskAuditValue;
function plaintextLogsEnabled() {
    // Browsers have no trusted process environment: remain redacted there.
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
    if (Array.isArray(value))
        return value.some(hasCredentials);
    if (value && typeof value === 'object') {
        return Object.entries(value).some(([key, child]) => credentialName(key) || hasCredentials(child));
    }
    return false;
}
exports.hasCredentials = hasCredentials;
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
const projections = new WeakMap();
// A debug record can later reach a sink after debug is disabled. Keep only its
// already-safe alternative, never raw source parameters/provenance on a record.
const safeAlternatives = new WeakMap();
const rawProvenance = new WeakMap();
/** @internal Keep result reprojection safe without serializing raw provenance. */
function retainSQLLogProvenance(metadata, bindings, intentValues = []) {
    rawProvenance.set(metadata, { bindings: bindings ? inheritSQLLogBindings(bindings) : undefined,
        intentValues: Object.freeze(intentValues.map(copyLogValue)) });
}
exports.retainSQLLogProvenance = retainSQLLogProvenance;
function bindingPolicies(metadata) {
    const supplied = metadata.parameterLogPolicies;
    const valid = !!supplied && supplied.length === metadata.parameters.length;
    const credentialStatement = credentialName(metadata.parameterizedSQL)
        && (metadata.sqlOrigin !== 'generated' || !valid);
    return metadata.parameters.map((value, index) => {
        if (credentialStatement || hasCredentials(value))
            return 'credential';
        const policy = valid ? supplied[index] : undefined;
        return policy === 'plain' || policy === 'masked' || policy === 'credential' ? policy : 'unknown';
    });
}
function bindingIsMasked(policy, allow) {
    return policy === 'credential' || policy === 'unknown' || (!allow && policy !== 'plain');
}
/** Audit is always safe-mode; explicitly public loaded scalars are not secrets. */
function privateLogValueStrings(source) {
    if (!source)
        return [];
    const policies = bindingPolicies(source);
    return source.parameters.flatMap((value, index) => bindingIsMasked(policies[index], false) ? logValueStrings(value) : []);
}
exports.privateLogValueStrings = privateLogValueStrings;
function copyLogValue(value) {
    if (value instanceof Date)
        return new Date(value.getTime());
    if (value instanceof Uint8Array)
        return new Uint8Array(value);
    if (Array.isArray(value))
        return Object.freeze(value.map(copyLogValue));
    if (value && typeof value === 'object')
        return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyLogValue(child)])));
    return value;
}
/** Internal compiler plumbing: snapshot and flatten ancestor binding policies.
 * Never attach this raw provenance to a query payload or projected log record. */
function inheritSQLLogBindings(source, inherited) {
    const sources = inherited ? [inherited, source] : [source];
    return Object.freeze({
        parameterizedSQL: '', sqlOrigin: 'generated',
        parameters: Object.freeze(sources.flatMap(item => item.parameters.map(copyLogValue))),
        parameterLogPolicies: Object.freeze(sources.flatMap(bindingPolicies)),
    });
}
exports.inheritSQLLogBindings = inheritSQLLogBindings;
function businessMask(value) {
    if (value === null || value === undefined)
        return null;
    if (Array.isArray(value))
        return value.map(businessMask);
    if (value && typeof value === 'object' && 'type' in value) {
        return businessMask(value.value);
    }
    if (typeof value === 'object' && !(value instanceof Date))
        return redacted;
    return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}
function projectSQLLog(metadata, inherited, intentValues = []) {
    const allow = plaintextLogsEnabled() && metadata.logMode !== 'masked';
    const prior = projections.get(metadata);
    // Safe projections cannot recover raw values. If debug gets disabled, reproject.
    if (prior !== undefined && (!prior || allow))
        return metadata;
    const safe = safeAlternatives.get(metadata);
    if (!allow && safe)
        return safe;
    const projected = projectWithPolicy(metadata, allow, inherited, intentValues);
    projections.set(projected, allow);
    if (allow) {
        const alternative = projectWithPolicy(metadata, false, inherited, intentValues);
        projections.set(alternative, false);
        safeAlternatives.set(projected, alternative);
    }
    return projected;
}
exports.projectSQLLog = projectSQLLog;
function projectWithPolicy(metadata, allow, inherited, intentValues = []) {
    const retained = rawProvenance.get(metadata);
    if (retained?.bindings)
        inherited = inheritSQLLogBindings(retained.bindings, inherited);
    if (retained)
        intentValues = [...intentValues, ...retained.intentValues];
    const supplied = metadata.parameterLogPolicies;
    const policiesValid = !supplied || supplied.length === metadata.parameters.length;
    // Compiler-owned bindings identify credentials individually. Selecting a
    // credential column must not override unrelated ordinary/masked policies.
    const credentialStatement = credentialName(metadata.parameterizedSQL)
        && (metadata.sqlOrigin !== 'generated' || !supplied || !policiesValid);
    const policies = bindingPolicies(metadata);
    const masked = policies.map(policy => bindingIsMasked(policy, allow));
    const secrets = metadata.parameters.flatMap((value, index) => masked[index] ? logValueStrings(value) : []);
    if (inherited) {
        const inheritedPolicies = bindingPolicies(inherited);
        secrets.push(...inherited.parameters.flatMap((value, index) => bindingIsMasked(inheritedPolicies[index], allow) ? logValueStrings(value) : []));
    }
    const intentSecrets = [...secrets, ...intentValues.flatMap(logValueStrings)];
    // Copies/serialization discard the private safe alternative. Their old debug
    // intent has unknown provenance, so fail closed when returning to safe mode.
    const unknownDebugIntent = !allow && metadata.logMode === 'debug-plaintext' && !inherited;
    const intentText = (value) => unknownDebugIntent && value ? redacted : scrubLogText(value, intentSecrets);
    const safeValues = metadata.parameters.map((value, index) => {
        if (!masked[index])
            return copyLogValue(value);
        return policies[index] === 'masked' ? businessMask(value) : redacted;
    });
    const bareTemplate = metadata.parameterizedSQL.replace(/\$[0-9]+|@p[0-9]+/gi, '?');
    // Unclassified literal SQL needs a real parser/provenance before it is safe to log.
    // Compiled runtime SQL has trusted identifiers and fixed literals, not injected values.
    const unsafeSQL = (!allow || credentialStatement) && metadata.sqlOrigin !== 'generated'
        && /['"`$]|--|\/\*|\b\d+\b|:[A-Za-z_]/.test(bareTemplate);
    const kind = metadata.databaseKind ?? 'sqlite';
    let rendered = redactedSQL;
    let omissionReason = unsafeSQL
        ? 'untrusted-literal-sql' : !policiesValid ? 'policy-count-mismatch' : undefined;
    if (!unsafeSQL && policiesValid) {
        try {
            rendered = (0, log_rendering_1.renderSQL)(metadata.parameterizedSQL, safeValues, kind, index => (0, log_rendering_1.sqlLiteral)(safeValues[index], kind) + (masked[index] ? ' /* masked */' : ''));
            rendered = (allow
                ? (masked.some(Boolean) ? '-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN; PARTIALLY MASKED; NOT REPLAYABLE\n' : debugLabel)
                : '-- TeaQL MASKED; NOT REPLAYABLE\n') + rendered;
        }
        catch {
            // Do not include driver exceptions or source SQL in this diagnostic failure.
            rendered = redactedSQL;
            omissionReason = 'unsupported-or-mismatched-bindings';
        }
    }
    const projected = Object.freeze({
        ...metadata,
        ...(metadata.statements ? { statements: Object.freeze(metadata.statements.map(statement => projectWithPolicy(statement, allow, inheritSQLLogBindings(metadata, inherited), intentValues))) } : {}),
        parameterizedSQL: unsafeSQL ? redactedSQL : metadata.sqlOrigin === 'generated'
            ? metadata.parameterizedSQL : scrubLogText(metadata.parameterizedSQL, secrets),
        parameters: Object.freeze(safeValues),
        parameterLogPolicies: Object.freeze(policies),
        maskedParameters: Object.freeze(masked),
        logMode: allow ? 'debug-plaintext' : 'masked',
        omissionReason,
        debugSQL: rendered,
        comment: intentText(metadata.comment),
        purpose: intentText(metadata.purpose),
        auditReason: intentText(metadata.auditReason),
        // Counts are operational metadata, not a copy of a masked numeric binding.
        resultSummary: metadata.resultCount !== undefined ? `${metadata.resultCount} rows returned`
            : metadata.affectedRows !== undefined ? `${metadata.affectedRows} rows affected`
                : scrubLogText(metadata.resultSummary, secrets),
        tracePath: Object.freeze(metadata.tracePath.map(frame => Object.freeze(Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, key !== 'entityId' && typeof value === 'string' ? intentText(value) : value]))))),
        // Typed identity is structural (as in the audit event's id), not prose.
        ...(metadata.mutationLineage ? { mutationLineage: Object.freeze(metadata.mutationLineage.map(node => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== 'entityId' && typeof value === 'string' ? intentText(value) : value]))))) } : {}),
    });
    return projected;
}
//# sourceMappingURL=log-privacy.js.map