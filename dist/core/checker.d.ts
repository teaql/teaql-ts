import { UserContext } from './context';
import { CheckResult } from './i18n';
export interface EntityChecker {
    checkAndFix(context: UserContext, mutation: any, results: CheckResult[]): void;
}
export declare class CheckException extends Error {
    readonly violations: readonly CheckResult[];
    private static readonly owned;
    constructor(violations: readonly CheckResult[]);
    /** @internal Preserve the exception identity when the graph finishes relocation. */
    refreshPresentation(results: readonly CheckResult[]): void;
}
//# sourceMappingURL=checker.d.ts.map