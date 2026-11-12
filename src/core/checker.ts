import { UserContext } from './context';
import { CheckResult } from './i18n';

export interface EntityChecker {
  checkAndFix(context: UserContext, mutation: any, results: CheckResult[]): void;
}

export class CheckException extends Error {
  private static readonly owned=new WeakMap<CheckException,CheckResult[]>();
  constructor(public readonly violations: readonly CheckResult[]) {
    super(`Check failed: ${violations.map(v => v.message ?? `${v.ruleId}:${v.location}`).join('; ')}`);
    this.name = 'CheckException';
    const owned=[...violations];Object.defineProperty(this,'violations',{value:owned,enumerable:true});
    CheckException.owned.set(this,owned);
  }
  /** @internal Preserve the exception identity when the graph finishes relocation. */
  refreshPresentation(results:readonly CheckResult[]):void {
    const owned=CheckException.owned.get(this);if(!owned)return;
    if(results.length===owned.length&&results.every((result,index)=>result.message===owned[index].message))return;
    owned.splice(0,owned.length,...results);
    this.message=`Check failed: ${results.map(v=>v.message??`${v.ruleId}:${v.location}`).join('; ')}`;
  }
}
