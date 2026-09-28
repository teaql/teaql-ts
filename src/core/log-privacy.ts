import type { SQLExecutionMetadata } from '../sql/core';
import { renderSQL, sqlLiteral, SQLParameterLogPolicy } from '../sql/log-rendering';

export const PLAINTEXT_LOG_ENV = 'TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS';
export const PLAINTEXT_LOG_ACK = 'I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK';
const redacted = '[REDACTED]';
const redactedSQL = '[REDACTED SQL; NOT REPLAYABLE]';
const debugLabel = '-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN\n';
let warned = false;

/** Business-field masking; credentials always need complete redaction instead. */
export function maskAuditValue(value: string): string {
  const scalars = Array.from(value);
  if (scalars.length < 8 || /^[0-9]+$/.test(value)) return '*'.repeat(scalars.length);
  return scalars.slice(0, 2).join('') + '*'.repeat(scalars.length - 4) + scalars.slice(-2).join('');
}

export function plaintextLogsEnabled(): boolean {
  // Browsers have no trusted process environment: remain redacted there.
  const enabled = typeof process !== 'undefined' && process.env?.[PLAINTEXT_LOG_ENV] === PLAINTEXT_LOG_ACK;
  if (enabled && !warned) {
    warned = true;
    console.warn('TeaQL: sensitive plaintext logging enabled; application data may be written to disk. Authentication secrets remain redacted.');
  }
  return enabled;
}

export function credentialName(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['password', 'passwd', 'passphrase', 'privatekey', 'secret', 'accesstoken',
    'refreshtoken', 'idtoken', 'apikey', 'authorization', 'credential', 'sessiontoken',
    'magiclinktoken'].some(word => normalized.includes(word));
}

export function hasCredentials(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasCredentials);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, child]) => credentialName(key) || hasCredentials(child));
  }
  return false;
}

export function logValueStrings(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(logValueStrings);
  if (value instanceof Date) return [value.toISOString()];
  if (typeof value === 'object') return Object.values(value).flatMap(logValueStrings);
  return [String(value)];
}

export function scrubLogText(text: string | undefined, values: readonly string[]): string | undefined {
  return [...new Set(values)].sort((a,b) => b.length - a.length)
    .reduce((result, value) => result?.split(value).join(redacted), text);
}

const projections = new WeakMap<SQLExecutionMetadata, boolean>();
// A debug record can later reach a sink after debug is disabled. Keep only its
// already-safe alternative, never raw source parameters/provenance on a record.
const safeAlternatives = new WeakMap<SQLExecutionMetadata, SQLExecutionMetadata>();

/** Internal SQL compiler/runtime plumbing, never a request or wire option. */
export type SQLLogBindingSource = Pick<SQLExecutionMetadata,
  'parameterizedSQL' | 'parameters' | 'parameterLogPolicies' | 'sqlOrigin'>;

function bindingPolicies(metadata: SQLLogBindingSource): SQLParameterLogPolicy[] {
  const supplied = metadata.parameterLogPolicies;
  const valid = !!supplied && supplied.length === metadata.parameters.length;
  const credentialStatement = credentialName(metadata.parameterizedSQL)
    && (metadata.sqlOrigin !== 'generated' || !valid);
  return metadata.parameters.map((value, index) => {
    if (credentialStatement || hasCredentials(value)) return 'credential';
    const policy = valid ? supplied[index] : undefined;
    return policy === 'plain' || policy === 'masked' || policy === 'credential' ? policy : 'unknown';
  });
}

function bindingIsMasked(policy: SQLParameterLogPolicy, allow: boolean): boolean {
  return policy === 'credential' || policy === 'unknown' || (!allow && policy !== 'plain');
}

function copyLogValue(value: unknown): unknown {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return Object.freeze(value.map(copyLogValue));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, copyLogValue(child)])));
  return value;
}

/** Internal compiler plumbing: snapshot and flatten ancestor binding policies.
 * Never attach this raw provenance to a query payload or projected log record. */
export function inheritSQLLogBindings(source: SQLLogBindingSource, inherited?: SQLLogBindingSource): SQLLogBindingSource {
  const sources = inherited ? [inherited, source] : [source];
  return Object.freeze({
    parameterizedSQL: '', sqlOrigin: 'generated' as const,
    parameters: Object.freeze(sources.flatMap(item => item.parameters.map(copyLogValue))),
    parameterLogPolicies: Object.freeze(sources.flatMap(bindingPolicies)),
  });
}

function businessMask(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(businessMask);
  if (value && typeof value === 'object' && 'type' in value) {
    return businessMask((value as { value?: unknown }).value);
  }
  if (typeof value === 'object' && !(value instanceof Date)) return redacted;
  return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}

export function projectSQLLog(metadata: SQLExecutionMetadata, inherited?: SQLLogBindingSource,
  intentValues: readonly unknown[] = []): SQLExecutionMetadata {
  const allow = plaintextLogsEnabled() && metadata.logMode !== 'masked';
  const prior = projections.get(metadata);
  // Safe projections cannot recover raw values. If debug gets disabled, reproject.
  if (prior !== undefined && (!prior || allow)) return metadata;
  const safe = safeAlternatives.get(metadata);
  if (!allow && safe) return safe;
  const projected = projectWithPolicy(metadata, allow, inherited, intentValues);
  projections.set(projected, allow);
  if (allow) {
    const alternative = projectWithPolicy(metadata, false, inherited, intentValues);
    projections.set(alternative, false);
    safeAlternatives.set(projected, alternative);
  }
  return projected;
}

function projectWithPolicy(metadata: SQLExecutionMetadata, allow: boolean, inherited?: SQLLogBindingSource,
  intentValues: readonly unknown[] = []): SQLExecutionMetadata {
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
    secrets.push(...inherited.parameters.flatMap((value, index) =>
      bindingIsMasked(inheritedPolicies[index], allow) ? logValueStrings(value) : []));
  }
  const intentSecrets = [...secrets, ...intentValues.flatMap(logValueStrings)];
  // Copies/serialization discard the private safe alternative. Their old debug
  // intent has unknown provenance, so fail closed when returning to safe mode.
  const unknownDebugIntent = !allow && metadata.logMode === 'debug-plaintext' && !inherited;
  const intentText = (value: string | undefined): string | undefined =>
    unknownDebugIntent && value ? redacted : scrubLogText(value, intentSecrets);
  const safeValues = metadata.parameters.map((value, index) => {
    if (!masked[index]) return copyLogValue(value);
    return policies[index] === 'masked' ? businessMask(value) : redacted;
  });
  const bareTemplate = metadata.parameterizedSQL.replace(/\$[0-9]+|@p[0-9]+/gi, '?');
  // Unclassified literal SQL needs a real parser/provenance before it is safe to log.
  // Compiled runtime SQL has trusted identifiers and fixed literals, not injected values.
  const unsafeSQL = (!allow || credentialStatement) && metadata.sqlOrigin !== 'generated'
    && /['"`$]|--|\/\*|\b\d+\b|:[A-Za-z_]/.test(bareTemplate);
  const kind = metadata.databaseKind ?? 'sqlite';
  let rendered = redactedSQL;
  let omissionReason: SQLExecutionMetadata['omissionReason'] = unsafeSQL
    ? 'untrusted-literal-sql' : !policiesValid ? 'policy-count-mismatch' : undefined;
  if (!unsafeSQL && policiesValid) {
    try {
      rendered = renderSQL(metadata.parameterizedSQL, safeValues, kind, index =>
        sqlLiteral(safeValues[index], kind) + (masked[index] ? ' /* masked */' : ''));
      rendered = (allow
        ? (masked.some(Boolean) ? '-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN; PARTIALLY MASKED; NOT REPLAYABLE\n' : debugLabel)
        : '-- TeaQL MASKED; NOT REPLAYABLE\n') + rendered;
    } catch {
      // Do not include driver exceptions or source SQL in this diagnostic failure.
      rendered = redactedSQL;
      omissionReason = 'unsupported-or-mismatched-bindings';
    }
  }
  const projected = Object.freeze({
    ...metadata,
    parameterizedSQL: unsafeSQL ? redactedSQL : metadata.sqlOrigin === 'generated'
      ? metadata.parameterizedSQL : scrubLogText(metadata.parameterizedSQL, secrets)!,
    parameters: Object.freeze(safeValues),
    parameterLogPolicies: Object.freeze(policies),
    maskedParameters: Object.freeze(masked),
    logMode: allow ? 'debug-plaintext' as const : 'masked' as const,
    omissionReason,
    debugSQL: rendered,
    comment: intentText(metadata.comment),
    purpose: intentText(metadata.purpose),
    auditReason: intentText(metadata.auditReason),
    // Counts are operational metadata, not a copy of a masked numeric binding.
    resultSummary: metadata.resultCount !== undefined ? `${metadata.resultCount} rows returned`
      : metadata.affectedRows !== undefined ? `${metadata.affectedRows} rows affected`
      : scrubLogText(metadata.resultSummary, secrets)!,
    tracePath: Object.freeze(metadata.tracePath.map(frame => Object.freeze(
      Object.fromEntries(Object.entries(frame).map(([key,value]) =>
        [key, typeof value === 'string' ? intentText(value) : value])),
    ))) as SQLExecutionMetadata['tracePath'],
  });
  return projected;
}
