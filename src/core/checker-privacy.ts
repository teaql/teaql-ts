import type { CheckResult } from './i18n';
import { businessMask, credentialName, hasCredentials, logValueStrings, plaintextLogsEnabled, scrubLogText } from './value-privacy';

/** Internal per-client metadata lookup, never stored on a shared UserContext. */
export type CheckerPrivacyPolicy = (entityType: string | undefined, field: string) => 'masked' | 'credential' | undefined;
type Kind = 'masked' | 'credential' | undefined;
type Presentation = { masked?: boolean; value?: unknown; length?: number; kind?: Kind; message?: string; automatic?:boolean };
const presentationToken = Symbol('TeaQL.CheckerPresentation');
// Tokens survive an application spread/relocation. Values contain only already
// projected inputs, numeric lengths and safe display text, never original input.
const presentations = new WeakMap<object, Presentation>();
type Hints = { redactions: readonly string[]; length: number; input: unknown; system: unknown };
// Raw redaction strings live only in the synchronous translation scope. Every
// owner removes its entries in finally, including nested/customer failures.
const active = new WeakMap<CheckResult, Hints>();
type Presented = CheckResult & { [presentationToken]?: object };
const metadata = (r: CheckResult): Presentation | undefined => {
  const token = (r as Presented)[presentationToken]; return token && presentations.get(token);
};
function retain(r: CheckResult, value: Presentation): void {
  const token = Object.freeze({}); presentations.set(token, value);
  Object.defineProperty(r, presentationToken, { value: token, enumerable: true, configurable: true });
}
function originalLength(r: CheckResult): number {
  const state = metadata(r);
  if (state?.masked && Object.is(state.value, r.inputValue) && state.length !== undefined) return state.length;
  return typeof r.inputValue === 'string' ? Array.from(r.inputValue).length : 0;
}
function kind(r: CheckResult, declaring: string | undefined, policy: CheckerPrivacyPolicy | undefined, allow: boolean): Kind {
  const fields = r.location.segments.filter(s => s.kind === 'property').map(s => (s as { name: string }).name);
  const field = fields[fields.length - 1] ?? '', configured = policy?.(r.entityType?.trim() ? r.entityType : declaring, field);
  if (fields.some(credentialName) || configured === 'credential' || hasCredentials(r.inputValue)) return 'credential';
  return !allow && (configured === 'masked' || field.startsWith('#')) ? 'masked' : undefined;
}
function expectedValue(r: CheckResult, classification: Kind): unknown {
  const value = r.systemValue;
  if (value === undefined || value === null || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return value;
  return classification === 'credential' || hasCredentials(value) ? '[REDACTED]' : value;
}
function frozenMask(value: unknown): unknown {
  const masked = businessMask(value);
  const freeze = (v: unknown): unknown => Array.isArray(v) ? Object.freeze(v.map(freeze)) : v;
  return freeze(masked);
}
function project(r: CheckResult, declaring: string | undefined, policy: CheckerPrivacyPolicy | undefined, allow: boolean): {
  value: CheckResult; state: Presentation; changed: boolean; secrets: string[];
} {
  const value: CheckResult = { ...r }, old = metadata(r), classification = kind(r, declaring, policy, allow);
  if (declaring && !value.entityType?.trim()) value.entityType = declaring;
  const alreadySafe = old?.masked && Object.is(old.value, r.inputValue) && (old.kind === 'credential' || classification !== 'credential');
  let input = r.inputValue;
  if (!alreadySafe && input !== null && input !== undefined) {
    if (classification === 'credential') input = '[REDACTED]';
    else if (classification === 'masked') input = frozenMask(input);
  }
  const system = expectedValue(r, classification), changed = !Object.is(input, r.inputValue) || !Object.is(system, r.systemValue);
  if (Object.prototype.hasOwnProperty.call(r, 'inputValue')) value.inputValue = input;
  if (Object.prototype.hasOwnProperty.call(r, 'systemValue')) value.systemValue = system;
  const secrets = [
    ...(!Object.is(input, r.inputValue) ? logValueStrings(r.inputValue) : []),
    ...(!Object.is(system, r.systemValue) ? logValueStrings(r.systemValue) : []),
  ];
  const masked = !!alreadySafe || !Object.is(input, r.inputValue);
  const state: Presentation = masked ? { masked: true, value: input, length: originalLength(r), kind: alreadySafe ? old!.kind : classification } : {};
  if (!changed && old?.message !== undefined && old.message === r.message) {state.message = old.message;state.automatic=old.automatic;}
  return { value, state, changed, secrets };
}
function redactions(values: readonly string[]): string[] {
  return [...new Set(values.flatMap(value => value ? [value, JSON.stringify(value).slice(1, -1)] : []))].sort((a,b) => b.length - a.length);
}
export function prepareCheckerResults(results: readonly CheckResult[], declaring?: string, policy?: CheckerPrivacyPolicy,
  checkedValues: readonly Readonly<Record<string, unknown>>[] = []) {
  const allow = plaintextLogsEnabled(), rows = results.map(r => project(r, declaring, policy, allow));
  const inherited = results.flatMap(r => active.get(r)?.redactions ?? []);
  // Root/custom failures need not attach inputValue. Use only this invocation's
  // modeled checked fields; never guess a location from message text or retain
  // the payload on a Context or returned diagnostic.
  const checked = checkedValues.flatMap(values => Object.entries(values).flatMap(([field, value]) => {
    const configured = policy?.(declaring, field);
    const sensitive = credentialName(field) || hasCredentials(value) || configured === 'credential'
      || (!allow && (configured === 'masked' || field.startsWith('#')));
    return sensitive ? logValueStrings(value) : [];
  }));
  const known = redactions([...inherited, ...checked, ...rows.flatMap(r => r.secrets)]);
  const owned = rows.map(row => {
    // A previously safe public explanation may echo a newly sensitive sibling.
    // Recheck each new batch; the catalog can then regenerate public rule text.
    if (row.value.message !== undefined) row.value.message = scrubLogText(row.value.message, known);
    // The pre-translation text is safe, but a later catalog/hook must either
    // mark its own safe rendering or pass the final known-value scrub.
    retain(row.value, { ...row.state, message: row.value.message });
    active.set(row.value, { redactions: known, length: row.state.length ?? originalLength(row.value), input: row.value.inputValue, system: row.value.systemValue });
    return row.value;
  });
  return {
    values: owned,
    finish(translated: readonly CheckResult[]): CheckResult[] {
      const projected = translated.map(r => project(r, declaring, policy, allow));
      const all = redactions([...known, ...projected.flatMap(r => r.secrets)]);
      return projected.map(row => {
        if (row.state.message === undefined) row.value.message = scrubLogText(row.value.message, all);
        retain(row.value, { ...row.state, message: row.value.message });
        return row.value;
      });
    },
    close(): void { for (const r of owned) active.delete(r); },
  };
}
/** Used only by the catalog while it owns an actively projected result. */
export function checkerInputLength(result: CheckResult): number { return active.get(result)?.length ?? originalLength(result); }
export function checkerTemplateLiteral(result: CheckResult, text: string): string {
  return scrubLogText(text, active.get(result)?.redactions ?? []) ?? '';
}
export function markCheckerRendering(result: CheckResult): void {
  const scope = active.get(result);
  if (scope && Object.is(scope.input, result.inputValue) && Object.is(scope.system, result.systemValue)) {
    retain(result, { ...metadata(result), message: result.message, automatic:true });
  }
}
export function checkerRenderingWasAutomatic(result:CheckResult):boolean {
  const state=metadata(result);return state?.automatic===true&&state.message===result.message;
}
/** Invoke the unchanged customer Context hook, then reproject its output. */
export function translateCheckerResults(context: { translateCheckResults(r: CheckResult[], entity?: string): CheckResult[] },
  results: CheckResult[], declaring: string, policy: CheckerPrivacyPolicy,
  checkedValues: readonly Readonly<Record<string, unknown>>[] = []): void {
  if (!results.length) {
    const translated = context.translateCheckResults(results, declaring);
    if (!translated.length) return;
    const scope = prepareCheckerResults(translated, declaring, policy, checkedValues);
    try { results.splice(0, results.length, ...scope.finish(scope.values)); } finally { scope.close(); }
    return;
  }
  const scope = prepareCheckerResults(results, declaring, policy, checkedValues);
  try {
    const translated = context.translateCheckResults(scope.values, declaring);
    results.splice(0, results.length, ...scope.finish(translated));
  } finally { scope.close(); }
}
