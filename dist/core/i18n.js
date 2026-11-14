"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nCatalog = exports.checkResultToWire = exports.parseLocale = exports.UnsupportedLocaleError = exports.locales = void 0;
const builtin_messages_v1_json_1 = __importDefault(require("./builtin-messages-v1.json"));
const checker_privacy_1 = require("./checker-privacy");
exports.locales = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'es', 'pt', 'ar', 'th', 'id', 'fil', 'uk', 'vi'];
class UnsupportedLocaleError extends Error {
    constructor(localeCode) {
        super(`Unsupported locale: ${localeCode}`);
        this.localeCode = localeCode;
    }
}
exports.UnsupportedLocaleError = UnsupportedLocaleError;
const aliases = { 'en-us': 'en', 'en-gb': 'en', 'zh': 'zh-CN', 'zh-hans': 'zh-CN', 'zh-sg': 'zh-CN', 'cn': 'zh-CN', 'zh-hant': 'zh-TW', 'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW', 'tw': 'zh-TW', 'ja-jp': 'ja', 'ko-kr': 'ko', 'de-de': 'de', 'fr-fr': 'fr', 'es-mx': 'es', 'pt-br': 'pt', 'pt-pt': 'pt', 'ar-sa': 'ar', 'th-th': 'th', 'id-id': 'id', 'tl': 'fil', 'fil-ph': 'fil', 'uk-ua': 'uk', 'vi-vn': 'vi' };
function parseLocale(code) { if (typeof code !== 'string' || !code.trim())
    throw new UnsupportedLocaleError(code); const normalized = code.trim().replace(/_/g, '-').toLowerCase(); const canonical = exports.locales.find(v => v.toLowerCase() === normalized); if (canonical)
    return canonical; const alias = aliases[normalized]; if (!alias)
    throw new UnsupportedLocaleError(code); return alias; }
exports.parseLocale = parseLocale;
function checkResultToWire(result, profile = 'camelCase') { return { ruleId: result.ruleId, entityType: result.entityType, location: result.location.segments, instancePath: result.location.instancePath(profile), sourceInstancePath: result.sourceInstancePath, inputValue: result.inputValue, systemValue: result.systemValue, message: result.message }; }
exports.checkResultToWire = checkResultToWire;
class I18nCatalog {
    constructor(data, fallback) {
        this.data = data;
        this.fallback = fallback;
        if (data.schema !== 'teaql.i18n/v1')
            throw new Error('Unsupported i18n schema');
        Object.keys(data.locales).forEach(parseLocale);
    }
    message(locale, key) { return this.data.locales[locale]?.messages[key] ?? this.fallback?.data.locales[locale]?.messages[key] ?? this.data.locales.en?.messages[key] ?? this.fallback?.data.locales.en?.messages[key] ?? key; }
    applicationMessage(locale, key) { return this === I18nCatalog.builtin ? undefined : this.data.locales[locale]?.messages[key]; }
    translate(result, locale) {
        const keys = { required: 'checker.required', min: 'checker.min', max: 'checker.max', min_str_len: 'checker.minLength', min_length: 'checker.minLength', max_str_len: 'checker.maxLength', max_length: 'checker.maxLength' };
        const key = keys[result.ruleId.toLowerCase()] ?? `checker.${result.ruleId.toLowerCase()}`;
        const template = this.message(locale, key);
        // An opaque customer diagnostic has no template to rerender. Keep its text
        // while the canonical location still carries the full relocated path.
        if (template === key && result.message?.trim())
            return result;
        const input = String(result.inputValue);
        const values = { '{location}': result.location.nativePath(), '{system}': String(result.systemValue),
            '{input}': input, '{input_len}': String((0, checker_privacy_1.checkerInputLength)(result)) };
        const publicTemplate = template === I18nCatalog.builtin.message(locale, key);
        // Scrub literal/customer template text separately from typed substitutions.
        // A credential such as "1" must not rewrite the numeric bound 12 or a true
        // validation length merely because the same digit appears there.
        result.message = template.split(/(\{(?:location|system|input|input_len)\})/g)
            .map(part => Object.prototype.hasOwnProperty.call(values, part) ? values[part] : publicTemplate ? part : (0, checker_privacy_1.checkerTemplateLiteral)(result, part)).join('');
        (0, checker_privacy_1.markCheckerRendering)(result);
        return result;
    }
}
exports.I18nCatalog = I18nCatalog;
I18nCatalog.builtin = new I18nCatalog(builtin_messages_v1_json_1.default);
//# sourceMappingURL=i18n.js.map