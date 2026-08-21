import { UserContext } from './context';
import { CheckResult } from './i18n';
export interface EntityChecker {
    checkAndFix(context: UserContext, mutation: any, results: CheckResult[]): void;
}
export declare class CheckException extends Error {
    readonly violations: readonly CheckResult[];
    constructor(violations: readonly CheckResult[]);
}
//# sourceMappingURL=checker.d.ts.map