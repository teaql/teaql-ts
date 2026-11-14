import { Locale } from '../i18n';
export type MessageShape = 'one' | 'two' | 'deep';
export type SafeArguments = Readonly<Record<string, string>>;
export type MessageSelection = Readonly<{
    locale: Locale;
    render: (args: SafeArguments, literal?: (text: string) => string) => string;
}>;
/** Project now, retaining only safe nodes, never a callback over the invocation. */
export declare function projectMessageSelection(selection: MessageSelection, project: (text: string) => string): MessageSelection;
export declare function object(value: unknown): Record<string, unknown>;
export declare function text(value: unknown): string;
export declare function keys(value: Record<string, unknown>, allowed: readonly string[]): void;
/** Strict JSON reader: duplicate keys reject before a map can overwrite them. */
export declare function strictJson(source: string): unknown;
export declare function ordinal(position: bigint): string;
/** Compiled, immutable, data-only catalog; no dynamic evaluation or runtime I/O. */
export declare class CheckerMessageCatalog {
    #private;
    static readonly builtin: CheckerMessageCatalog;
    private constructor();
    static fromJson(source: string): CheckerMessageCatalog;
    private static parse;
    lookup(locale: Locale, rule: string, shape: MessageShape): MessageSelection | undefined;
    override(locale: Locale, rule: string, shape: MessageShape): MessageSelection | undefined;
    select(locale: Locale, rule: string, shape: MessageShape): MessageSelection;
    private patterns;
    /** A finite location-pattern view; no raw application template is retained. */
    projectPatterns(locale: Locale, project: (text: string) => string): CheckerMessageCatalog;
    reference(locale: Locale, relation: string): string;
    item(locale: Locale, relation: string, index: number, classifier: string): string;
    separator(locale: Locale): string;
}
//# sourceMappingURL=catalog.d.ts.map