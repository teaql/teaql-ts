"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _CheckerMessageCatalog_locales, _CheckerMessageCatalog_application;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckerMessageCatalog = exports.ordinal = exports.strictJson = exports.keys = exports.text = exports.object = exports.projectMessageSelection = void 0;
const builtin_v1_json_1 = __importDefault(require("./builtin-v1.json"));
const i18n_1 = require("../i18n");
const selectionTemplates = new WeakMap();
function selectionFor(locale, template) {
    const selection = Object.freeze({ locale, render: (args, literal) => render(template, args, literal) });
    selectionTemplates.set(selection, template);
    return selection;
}
/** Project now, retaining only safe nodes, never a callback over the invocation. */
function projectMessageSelection(selection, project) {
    const template = selectionTemplates.get(selection);
    if (!template)
        return invalid();
    return selectionFor(selection.locale, Object.freeze(template.map(node => typeof node === 'string' ? project(node) : node)));
}
exports.projectMessageSelection = projectMessageSelection;
const invalid = () => { throw new TypeError('Invalid Checker message catalog'); };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return invalid();
    return value;
}
exports.object = object;
function text(value) { if (typeof value !== 'string' || !value.trim())
    return invalid(); return value; }
exports.text = text;
function keys(value, allowed) {
    if (Object.keys(value).some(key => !allowed.includes(key)))
        invalid();
}
exports.keys = keys;
/** Strict JSON reader: duplicate keys reject before a map can overwrite them. */
function strictJson(source) {
    if (typeof source !== 'string')
        return invalid();
    let offset = 0;
    const whitespace = () => { while (/[\t\n\r ]/.test(source[offset] ?? 'x'))
        offset++; };
    function string() {
        if (source[offset] !== '"')
            return invalid();
        const start = offset++;
        while (offset < source.length) {
            const c = source[offset++];
            if (c === '"') {
                try {
                    return JSON.parse(source.slice(start, offset));
                }
                catch {
                    return invalid();
                }
            }
            if (c === '\\')
                offset++;
        }
        return invalid();
    }
    function value() {
        whitespace();
        if (source[offset] === '{') {
            offset++;
            whitespace();
            const result = Object.create(null), seen = new Set();
            if (source[offset] === '}') {
                offset++;
                return result;
            }
            for (;;) {
                whitespace();
                const name = string();
                if (seen.has(name))
                    return invalid();
                seen.add(name);
                whitespace();
                if (source[offset++] !== ':')
                    return invalid();
                result[name] = value();
                whitespace();
                const next = source[offset++];
                if (next === '}')
                    return result;
                if (next !== ',')
                    return invalid();
            }
        }
        if (source[offset] === '[') {
            offset++;
            whitespace();
            const result = [];
            if (source[offset] === ']') {
                offset++;
                return result;
            }
            for (;;) {
                result.push(value());
                whitespace();
                const next = source[offset++];
                if (next === ']')
                    return result;
                if (next !== ',')
                    return invalid();
            }
        }
        if (source[offset] === '"')
            return string();
        const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(offset));
        if (!token)
            return invalid();
        offset += token[0].length;
        try {
            return JSON.parse(token[0]);
        }
        catch {
            return invalid();
        }
    }
    const result = value();
    whitespace();
    if (offset !== source.length)
        return invalid();
    return result;
}
exports.strictJson = strictJson;
function compile(source, allowed, required) {
    const input = text(source), nodes = [], seen = new Set();
    let literal = '';
    for (let i = 0; i < input.length;) {
        const c = input[i];
        if ((c === '{' || c === '}') && input[i + 1] === c) {
            literal += c;
            i += 2;
            continue;
        }
        if (c === '}')
            return invalid();
        if (c !== '{') {
            literal += c;
            i++;
            continue;
        }
        const end = input.indexOf('}', i + 1);
        if (end < 0)
            return invalid();
        const name = input.slice(i + 1, end);
        if (!allowed.includes(name))
            return invalid();
        if (literal)
            nodes.push(literal);
        nodes.push(Object.freeze({ argument: name }));
        literal = '';
        seen.add(name);
        i = end + 1;
    }
    if (literal)
        nodes.push(literal);
    if (required.some(name => !seen.has(name)))
        return invalid();
    return Object.freeze(nodes);
}
function render(template, args, literal) {
    return template.map(node => typeof node === 'string' ? (literal ? literal(node) : node) : args[node.argument] ?? '-').join('');
}
function ordinal(position) {
    const last = position % 100n, ending = last >= 11n && last <= 13n ? 'th' : position % 10n === 1n ? 'st' : position % 10n === 2n ? 'nd' : position % 10n === 3n ? 'rd' : 'th';
    return String(position) + ending;
}
exports.ordinal = ordinal;
/** Compiled, immutable, data-only catalog; no dynamic evaluation or runtime I/O. */
class CheckerMessageCatalog {
    constructor(data, application) {
        _CheckerMessageCatalog_locales.set(this, void 0);
        _CheckerMessageCatalog_application.set(this, void 0);
        __classPrivateFieldSet(this, _CheckerMessageCatalog_locales, data, "f");
        __classPrivateFieldSet(this, _CheckerMessageCatalog_application, application, "f");
        Object.freeze(this);
    }
    static fromJson(source) { return this.parse(source, false); }
    static parse(source, complete) {
        const root = object(strictJson(source));
        keys(root, ['schema', 'defaultLocale', 'locales']);
        if (root.schema !== 'teaql.checker-messages/v1' || root.defaultLocale !== 'en')
            return invalid();
        const entries = Object.create(null);
        for (const [code, value] of Object.entries(object(root.locales))) {
            const locale = (0, i18n_1.parseLocale)(code);
            if (own(entries, locale))
                return invalid();
            const entry = object(value);
            keys(entry, ['rules', 'locationPatterns']);
            const rules = Object.create(null);
            for (const [rule, shapes] of Object.entries(entry.rules === undefined ? {} : object(entry.rules))) {
                if (!rule.startsWith('checker.') || rule.length === 8)
                    return invalid();
                const templates = Object.create(null);
                for (const [shape, source] of Object.entries(object(shapes))) {
                    if (!['one', 'two', 'deep'].includes(shape))
                        return invalid();
                    let allowed = ['field', 'system', 'input', 'input_len', 'unit'];
                    const required = ['field'];
                    if (['checker.required', 'checker.invalid'].includes(rule))
                        allowed = ['field'];
                    else if (['checker.min', 'checker.max'].includes(rule)) {
                        allowed = ['field', 'system', 'input'];
                        required.push('system');
                    }
                    else if (['checker.minLength', 'checker.maxLength'].includes(rule)) {
                        allowed = ['field', 'system', 'input_len', 'unit'];
                        required.push('system', 'input_len', 'unit');
                    }
                    if (shape !== 'one') {
                        const owner = shape === 'two' ? 'object' : 'objectPath';
                        allowed.push(owner);
                        required.push(owner);
                    }
                    templates[shape] = compile(source, allowed, required);
                }
                rules[rule] = Object.freeze(templates);
            }
            let patterns;
            if (entry.locationPatterns !== undefined) {
                const p = object(entry.locationPatterns);
                keys(p, ['reference', 'item', 'separator']);
                const reference = compile(p.reference, ['relation'], ['relation']), item = compile(p.item, ['relation', 'position', 'ordinal', 'classifier'], ['relation']);
                if (!item.some(node => typeof node !== 'string' && ['position', 'ordinal'].includes(node.argument)))
                    return invalid();
                const separator = text(p.separator);
                if (/[{}\r\n\u0000-\u001f\u007f-\u009f]/u.test(separator))
                    return invalid();
                patterns = Object.freeze({ reference, item, separator });
            }
            entries[locale] = Object.freeze({ rules: Object.freeze(rules), patterns });
        }
        if (complete)
            for (const locale of i18n_1.locales) {
                const entry = entries[locale];
                if (!entry?.patterns)
                    return invalid();
                for (const rule of ['checker.required', 'checker.min', 'checker.max', 'checker.minLength', 'checker.maxLength', 'checker.invalid'])
                    for (const shape of ['one', 'two', 'deep'])
                        if (!entry.rules[rule]?.[shape])
                            return invalid();
            }
        return new CheckerMessageCatalog(Object.freeze(entries), !complete);
    }
    lookup(locale, rule, shape) {
        const template = __classPrivateFieldGet(this, _CheckerMessageCatalog_locales, "f")[locale]?.rules[rule]?.[shape];
        return template && selectionFor(locale, template);
    }
    override(locale, rule, shape) { return __classPrivateFieldGet(this, _CheckerMessageCatalog_application, "f") ? this.lookup(locale, rule, shape) : undefined; }
    select(locale, rule, shape) {
        for (const candidate of [locale, 'en']) {
            const selected = this.lookup(candidate, rule, shape) ?? CheckerMessageCatalog.builtin.lookup(candidate, rule, shape);
            if (selected)
                return selected;
        }
        return CheckerMessageCatalog.builtin.lookup(locale, 'checker.invalid', shape);
    }
    patterns(locale) { return __classPrivateFieldGet(this, _CheckerMessageCatalog_locales, "f")[locale]?.patterns ?? __classPrivateFieldGet(CheckerMessageCatalog.builtin, _CheckerMessageCatalog_locales, "f")[locale].patterns; }
    /** A finite location-pattern view; no raw application template is retained. */
    projectPatterns(locale, project) {
        const patterns = __classPrivateFieldGet(this, _CheckerMessageCatalog_locales, "f")[locale]?.patterns;
        if (this === CheckerMessageCatalog.builtin || !patterns)
            return CheckerMessageCatalog.builtin;
        const safe = (nodes) => Object.freeze(nodes.map(node => typeof node === 'string' ? project(node) : node));
        return new CheckerMessageCatalog(Object.freeze({ [locale]: Object.freeze({ rules: Object.freeze({}), patterns: Object.freeze({
                    reference: safe(patterns.reference), item: safe(patterns.item), separator: project(patterns.separator)
                }) }) }), false);
    }
    reference(locale, relation) { return render(this.patterns(locale).reference, { relation }); }
    item(locale, relation, index, classifier) {
        if (!Number.isSafeInteger(index) || index < 0)
            return invalid();
        const position = BigInt(index) + 1n;
        return render(this.patterns(locale).item, { relation, position: String(position), ordinal: ordinal(position), classifier });
    }
    separator(locale) { return this.patterns(locale).separator; }
}
exports.CheckerMessageCatalog = CheckerMessageCatalog;
_CheckerMessageCatalog_locales = new WeakMap(), _CheckerMessageCatalog_application = new WeakMap();
CheckerMessageCatalog.builtin = CheckerMessageCatalog.parse(JSON.stringify(builtin_v1_json_1.default), true);
//# sourceMappingURL=catalog.js.map