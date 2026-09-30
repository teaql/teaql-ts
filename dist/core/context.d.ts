import { SelectQuery } from './ast';
import { CheckResult, I18nCatalog, Locale } from './i18n';
import { MutationGovernanceSink, MutationGovernanceSnapshot, MutationPlan, MutationPolicyApprovalProvider, MutationPolicyRegistry } from './mutation-policy';
export type RetainedIdSet = {
    ids: BigUint64Array;
    expiresAt: number;
};
export interface IdSetPaginationStore {
    get(key: string): RetainedIdSet | undefined;
    put(key: string, value: RetainedIdSet): void;
    invalidate?(key: string): void;
}
export type ContextEntityRef = Readonly<{
    entity: string;
    id: string | number | bigint;
}>;
export type FixEvidence = Readonly<{
    entityType: string;
    modelPath: string;
    source: 'clock' | 'context';
    sourceLabel: string;
}>;
export declare class ContextRootError extends Error {
    readonly reason: 'missing' | 'type_mismatch';
    readonly expectedType: string;
    readonly activeRoot?: Readonly<{
        entity: string;
        id: string | number | bigint;
    }> | undefined;
    constructor(reason: 'missing' | 'type_mismatch', expectedType: string, activeRoot?: Readonly<{
        entity: string;
        id: string | number | bigint;
    }> | undefined);
}
export declare class UserContext {
    private readonly mutationPolicy;
    private readonly resources;
    private readonly continuousPageCursors;
    private readonly retainedIdSets;
    private readonly idSetBuilds;
    private readonly continuousPageRuntime;
    private readonly idSetPaginationRuntime;
    userIdentifier: string;
    continuousPagePlan: string;
    continuousPageCursorId?: string;
    idSetPaginationPlan: string;
    idSetPaginationCount?: number;
    idSetPaginationCountAccuracy: 'EXACT' | 'LOWER_BOUND' | 'UNKNOWN';
    locale: Locale;
    i18nCatalog: I18nCatalog;
    setLocaleCode(code: string): this;
    setLanguageCode(code: string): this;
    installI18nCatalog(catalog: I18nCatalog): this;
    installIdSetPaginationStore(store: IdSetPaginationStore): this;
    translateCheckResults(results: CheckResult[]): CheckResult[];
    withMutationPolicyRegistry(registry: MutationPolicyRegistry): this;
    withMutationPolicyApprovalProvider(provider: MutationPolicyApprovalProvider): this;
    withMutationGovernanceSink(sink: MutationGovernanceSink): this;
    reviewMutationPlan(plan: MutationPlan): MutationGovernanceSnapshot;
    /** @internal Used by governed data-service graph orchestration. */
    beginMutationPolicyGraph(): void;
    /** @internal Used by generated preflight after Checker/Fix. */
    recordMutationPolicyPreflight(mutation: unknown): void;
    /** @internal Called at the provider mutation boundary. */
    enterMutationPolicy(mutation: unknown): MutationGovernanceSnapshot;
    /** @internal Must run before the surrounding graph transaction commits. */
    ensureMutationPolicyGraphComplete(): void;
    /** @internal Always runs when the graph operation leaves its transaction. */
    endMutationPolicyGraph(): void;
    beginFixEvidence(): this;
    recordFixEvidence(evidence: FixEvidence): this;
    finishFixEvidence(): this;
    lastFixEvidence(): readonly FixEvidence[];
    insertResource<T>(name: string, resource: T): this;
    getResource<T>(name: string): T | undefined;
    removeResource(name: string): this;
    requireResource<T>(name: string): T;
    /**
     * Explicitly reconcile the installed Runtime Module with this context's data service.
     * Installing a module never performs schema changes.
     */
    ensureSchema(): Promise<void>;
    withActiveRoot(root: ContextEntityRef): this;
    requireActiveRoot(expectedType: string): ContextEntityRef;
    /**
     * Bind local optimization state without copying trusted runtime resources
     * into the query or federation JSON payload.
     */
    prepareQuery(query: SelectQuery): SelectQuery;
    private getContinuousPageCursor;
    private putContinuousPageCursor;
    private getRetainedIdSet;
    private idSetStore;
    private putRetainedIdSet;
    private singleFlightIdSetBuild;
}
//# sourceMappingURL=context.d.ts.map