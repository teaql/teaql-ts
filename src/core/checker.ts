import { UserContext } from './context';
import { CheckResult } from './i18n';

export interface EntityChecker {
  checkAndFix(context: UserContext, mutation: any, results: CheckResult[]): void;
}

export class CheckException extends Error {
  constructor(public readonly violations: readonly CheckResult[]) {
    super(`Check failed: ${violations.map(v => v.message ?? `${v.ruleId}:${v.location}`).join('; ')}`);
    this.name = 'CheckException';
  }
}
