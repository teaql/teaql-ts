import type { CheckResult } from './i18n';
/** Internal per-client metadata lookup, never stored on a shared UserContext. */
export type CheckerPrivacyPolicy = (entityType: string | undefined, field: string) => 'masked' | 'credential' | undefined;
export declare function prepareCheckerResults(results: readonly CheckResult[], declaring?: string, policy?: CheckerPrivacyPolicy, checkedValues?: readonly Readonly<Record<string, unknown>>[]): {
    values: CheckResult[];
    finish(translated: readonly CheckResult[]): CheckResult[];
    close(): void;
};
/** Used only by the catalog while it owns an actively projected result. */
export declare function checkerInputLength(result: CheckResult): number;
export declare function checkerTemplateLiteral(result: CheckResult, text: string): string;
export declare function markCheckerRendering(result: CheckResult): void;
/** Invoke the unchanged customer Context hook, then reproject its output. */
export declare function translateCheckerResults(context: {
    translateCheckResults(r: CheckResult[], entity?: string): CheckResult[];
}, results: CheckResult[], declaring: string, policy: CheckerPrivacyPolicy, checkedValues?: readonly Readonly<Record<string, unknown>>[]): void;
//# sourceMappingURL=checker-privacy.d.ts.map