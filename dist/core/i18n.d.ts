export declare const locales: readonly ["en", "zh-CN", "zh-TW", "ja", "ko", "de", "fr", "es", "pt", "ar", "th", "id", "fil", "uk", "vi"];
export type Locale = typeof locales[number];
export declare class UnsupportedLocaleError extends Error {
    readonly localeCode: unknown;
    constructor(localeCode: unknown);
}
export declare function parseLocale(code: unknown): Locale;
type LocaleData = {
    messages: Record<string, string>;
    vocabulary: Record<string, string>;
};
export type CatalogData = {
    schema: string;
    defaultLocale: string;
    locales: Record<string, LocaleData>;
};
export interface CheckResult {
    ruleId: string;
    location: string;
    inputValue?: unknown;
    systemValue?: unknown;
    message?: string;
}
export declare class I18nCatalog {
    private readonly data;
    private readonly fallback?;
    static readonly builtin: I18nCatalog;
    constructor(data: CatalogData, fallback?: I18nCatalog | undefined);
    message(locale: Locale, key: string): string;
    translate(result: CheckResult, locale: Locale): CheckResult;
}
export {};
//# sourceMappingURL=i18n.d.ts.map