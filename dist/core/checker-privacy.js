"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateCheckerResults = exports.checkerRenderingWasAutomatic = exports.markCheckerRendering = exports.checkerTemplateLiteral = exports.checkerInputLength = exports.prepareCheckerResults = void 0;
const value_privacy_1 = require("./value-privacy");
const presentationToken = Symbol('TeaQL.CheckerPresentation');
// Tokens survive an application spread/relocation. Values contain only already
// projected inputs, numeric lengths and safe display text, never original input.
const presentations = new WeakMap();
// Raw redaction strings live only in the synchronous translation scope. Every
// owner removes its entries in finally, including nested/customer failures.
const active = new WeakMap();
const metadata = (r) => {
    const token = r[presentationToken];
    return token && presentations.get(token);
};
function retain(r, value) {
    const token = Object.freeze({});
    presentations.set(token, value);
    Object.defineProperty(r, presentationToken, { value: token, enumerable: true, configurable: true });
}
function originalLength(r) {
    const state = metadata(r);
    if (state?.masked && Object.is(state.value, r.inputValue) && state.length !== undefined)
        return state.length;
    return typeof r.inputValue === 'string' ? Array.from(r.inputValue).length : 0;
}
function kind(r, declaring, policy, allow) {
    const fields = r.location.segments.filter(s => s.kind === 'property').map(s => s.name);
    const field = fields[fields.length - 1] ?? '', configured = policy?.(r.entityType?.trim() ? r.entityType : declaring, field);
    if (fields.some(value_privacy_1.credentialName) || configured === 'credential' || (0, value_privacy_1.hasCredentials)(r.inputValue))
        return 'credential';
    return !allow && (configured === 'masked' || field.startsWith('#')) ? 'masked' : undefined;
}
function expectedValue(r, classification) {
    const value = r.systemValue;
    if (value === undefined || value === null || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean')
        return value;
    return classification === 'credential' || (0, value_privacy_1.hasCredentials)(value) ? '[REDACTED]' : value;
}
function frozenMask(value) {
    const masked = (0, value_privacy_1.businessMask)(value);
    const freeze = (v) => Array.isArray(v) ? Object.freeze(v.map(freeze)) : v;
    return freeze(masked);
}
function project(r, declaring, policy, allow) {
    const value = { ...r }, old = metadata(r), classification = kind(r, declaring, policy, allow);
    if (declaring && !value.entityType?.trim())
        value.entityType = declaring;
    const alreadySafe = old?.masked && Object.is(old.value, r.inputValue) && (old.kind === 'credential' || classification !== 'credential');
    let input = r.inputValue;
    if (!alreadySafe && input !== null && input !== undefined) {
        if (classification === 'credential')
            input = '[REDACTED]';
        else if (classification === 'masked')
            input = frozenMask(input);
    }
    const system = expectedValue(r, classification), changed = !Object.is(input, r.inputValue) || !Object.is(system, r.systemValue);
    if (Object.prototype.hasOwnProperty.call(r, 'inputValue'))
        value.inputValue = input;
    if (Object.prototype.hasOwnProperty.call(r, 'systemValue'))
        value.systemValue = system;
    const secrets = [
        ...(!Object.is(input, r.inputValue) ? (0, value_privacy_1.logValueStrings)(r.inputValue) : []),
        ...(!Object.is(system, r.systemValue) ? (0, value_privacy_1.logValueStrings)(r.systemValue) : []),
    ];
    const masked = !!alreadySafe || !Object.is(input, r.inputValue);
    const state = masked ? { masked: true, value: input, length: originalLength(r), kind: alreadySafe ? old.kind : classification } : {};
    if (!changed && old?.message !== undefined && old.message === r.message) {
        state.message = old.message;
        state.automatic = old.automatic;
    }
    return { value, state, changed, secrets };
}
function redactions(values) {
    return [...new Set(values.flatMap(value => value ? [value, JSON.stringify(value).slice(1, -1)] : []))].sort((a, b) => b.length - a.length);
}
function prepareCheckerResults(results, declaring, policy, checkedValues = []) {
    const allow = (0, value_privacy_1.plaintextLogsEnabled)(), rows = results.map(r => project(r, declaring, policy, allow));
    const inherited = results.flatMap(r => active.get(r)?.redactions ?? []);
    // Root/custom failures need not attach inputValue. Use only this invocation's
    // modeled checked fields; never guess a location from message text or retain
    // the payload on a Context or returned diagnostic.
    const checked = checkedValues.flatMap(values => Object.entries(values).flatMap(([field, value]) => {
        const configured = policy?.(declaring, field);
        const sensitive = (0, value_privacy_1.credentialName)(field) || (0, value_privacy_1.hasCredentials)(value) || configured === 'credential'
            || (!allow && (configured === 'masked' || field.startsWith('#')));
        return sensitive ? (0, value_privacy_1.logValueStrings)(value) : [];
    }));
    const known = redactions([...inherited, ...checked, ...rows.flatMap(r => r.secrets)]);
    const owned = rows.map(row => {
        // A previously safe public explanation may echo a newly sensitive sibling.
        // Recheck each new batch; the catalog can then regenerate public rule text.
        if (row.value.message !== undefined)
            row.value.message = (0, value_privacy_1.scrubLogText)(row.value.message, known);
        // The pre-translation text is safe, but a later catalog/hook must either
        // mark its own safe rendering or pass the final known-value scrub.
        retain(row.value, { ...row.state, message: row.value.message });
        active.set(row.value, { redactions: known, length: row.state.length ?? originalLength(row.value), input: row.value.inputValue, system: row.value.systemValue });
        return row.value;
    });
    return {
        values: owned,
        finish(translated) {
            const projected = translated.map(r => project(r, declaring, policy, allow));
            const all = redactions([...known, ...projected.flatMap(r => r.secrets)]);
            return projected.map(row => {
                if (row.state.message === undefined)
                    row.value.message = (0, value_privacy_1.scrubLogText)(row.value.message, all);
                retain(row.value, { ...row.state, message: row.value.message });
                return row.value;
            });
        },
        close() { for (const r of owned)
            active.delete(r); },
    };
}
exports.prepareCheckerResults = prepareCheckerResults;
/** Used only by the catalog while it owns an actively projected result. */
function checkerInputLength(result) { return active.get(result)?.length ?? originalLength(result); }
exports.checkerInputLength = checkerInputLength;
function checkerTemplateLiteral(result, text) {
    return (0, value_privacy_1.scrubLogText)(text, active.get(result)?.redactions ?? []) ?? '';
}
exports.checkerTemplateLiteral = checkerTemplateLiteral;
function markCheckerRendering(result) {
    const scope = active.get(result);
    if (scope && Object.is(scope.input, result.inputValue) && Object.is(scope.system, result.systemValue)) {
        retain(result, { ...metadata(result), message: result.message, automatic: true });
    }
}
exports.markCheckerRendering = markCheckerRendering;
function checkerRenderingWasAutomatic(result) {
    const state = metadata(result);
    return state?.automatic === true && state.message === result.message;
}
exports.checkerRenderingWasAutomatic = checkerRenderingWasAutomatic;
/** Invoke the unchanged customer Context hook, then reproject its output. */
function translateCheckerResults(context, results, declaring, policy, checkedValues = []) {
    if (!results.length) {
        const translated = context.translateCheckResults(results, declaring);
        if (!translated.length)
            return;
        const scope = prepareCheckerResults(translated, declaring, policy, checkedValues);
        try {
            results.splice(0, results.length, ...scope.finish(scope.values));
        }
        finally {
            scope.close();
        }
        return;
    }
    const scope = prepareCheckerResults(results, declaring, policy, checkedValues);
    try {
        const translated = context.translateCheckResults(scope.values, declaring);
        results.splice(0, results.length, ...scope.finish(translated));
    }
    finally {
        scope.close();
    }
}
exports.translateCheckerResults = translateCheckerResults;
//# sourceMappingURL=checker-privacy.js.map