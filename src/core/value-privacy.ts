/** Shared value privacy primitives; independent of SQL, contexts and providers. */
export const PLAINTEXT_LOG_ENV = 'TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS';
export const PLAINTEXT_LOG_ACK = 'I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK';
const redacted = '[REDACTED]';
let warned = false;

export function maskAuditValue(value: string): string {
  const scalars = Array.from(value);
  if (scalars.length < 8 || /^[0-9]+$/.test(value)) return '*'.repeat(scalars.length);
  return scalars.slice(0, 2).join('') + '*'.repeat(scalars.length - 4) + scalars.slice(-2).join('');
}
export function plaintextLogsEnabled(): boolean {
  const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const enabled = environment?.[PLAINTEXT_LOG_ENV] === PLAINTEXT_LOG_ACK;
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
  return !!value && typeof value === 'object' && credentialObject(value, new WeakSet<object>());
}
function credentialObject(value: unknown, seen: WeakSet<object>): boolean {
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.some(child => credentialObject(child, seen));
    return Object.entries(value).some(([key, child]) => credentialName(key) || credentialObject(child, seen));
  } finally { seen.delete(value); }
}
export function logValueStrings(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  return typeof value === 'object' ? objectStrings(value, new WeakSet<object>()) : [String(value)];
}
function objectStrings(value: unknown, seen: WeakSet<object>): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (typeof value === 'object') {
    if (seen.has(value)) return [];
    seen.add(value);
    try {
      if (Array.isArray(value)) return value.flatMap(child => objectStrings(child, seen));
      if (value instanceof Date) return [value.toISOString()];
      return Object.values(value).flatMap(child => objectStrings(child, seen));
    } finally { seen.delete(value); }
  }
  return [String(value)];
}
export function scrubLogText(text: string | undefined, values: readonly string[]): string | undefined {
  return [...new Set(values)].sort((a,b) => b.length - a.length)
    .reduce((result, value) => result?.split(value).join(redacted), text);
}
/** Internal shared structured-value implementation, not a public barrel API. */
export function businessMask(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if (seen.has(value)) return redacted;
    seen.add(value);
    try {
      if (Array.isArray(value)) return value.map(child => businessMask(child, seen));
      if ('type' in value) return businessMask((value as { value?: unknown }).value, seen);
      if (!(value instanceof Date)) return redacted;
    } finally { seen.delete(value); }
  }
  return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}
