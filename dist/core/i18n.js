"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nCatalog = exports.parseLocale = exports.UnsupportedLocaleError = exports.locales = void 0;
const builtin_messages_v1_json_1 = __importDefault(require("./builtin-messages-v1.json"));
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
class I18nCatalog {
    constructor(data, fallback) {
        this.data = data;
        this.fallback = fallback;
        if (data.schema !== 'teaql.i18n/v1')
            throw new Error('Unsupported i18n schema');
        Object.keys(data.locales).forEach(parseLocale);
    }
    message(locale, key) { return this.data.locales[locale]?.messages[key] ?? this.fallback?.data.locales[locale]?.messages[key] ?? this.data.locales.en?.messages[key] ?? this.fallback?.data.locales.en?.messages[key] ?? key; }
    translate(result, locale) { const keys = { required: 'checker.required', min: 'checker.min', max: 'checker.max', min_str_len: 'checker.minLength', min_length: 'checker.minLength', max_str_len: 'checker.maxLength', max_length: 'checker.maxLength' }; const key = keys[result.ruleId.toLowerCase()] ?? `checker.${result.ruleId.toLowerCase()}`; const input = String(result.inputValue); const length = typeof result.inputValue === 'string' ? [...result.inputValue].length : 0; result.message = this.message(locale, key).split('{location}').join(result.location).split('{system}').join(String(result.systemValue)).split('{input}').join(input).split('{input_len}').join(String(length)); return result; }
}
exports.I18nCatalog = I18nCatalog;
I18nCatalog.builtin = new I18nCatalog(builtin_messages_v1_json_1.default);
//# sourceMappingURL=i18n.js.map