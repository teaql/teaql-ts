import type { UserContext } from './context';
import type { EntitySchema } from '../sql/core';
export type ContextFixResolver = (context: UserContext, input: Readonly<{
    entity: string;
    field: string;
    function: string;
    arguments: readonly string[];
    action: string;
    now: Date;
}>) => unknown;
/** Model-declared automatic Context assignments, independent from Check scope. */
export declare class ContextFix {
    /** @internal Runtime/generated-service entry; never inferred from field names. */
    static run<T>(context: UserContext, mutation: any, schema: EntitySchema | undefined, work: () => T): T;
    static apply(context: UserContext, mutation: any, field: string, functionName: string, args?: readonly string[]): void;
    /** @internal Register with a graph's failure actions before publishing Fix. */
    static captureUndo(mutation: any, schema: EntitySchema | undefined): (() => void) | undefined;
    private static validValue;
}
//# sourceMappingURL=context-fix.d.ts.map