import { SelectQuery } from './ast';
import { BusinessClock } from './business-clock';
import { ObjectStorage, ObjectStorageProvider, ObjectStorageObserver } from './object-storage';
import { CheckResult, I18nCatalog, Locale } from './i18n';
import { CheckerPrivacyPolicy } from './checker-privacy';
import { CheckerMessageConfiguration, CheckerMessageRenderer, CheckerMessageWarning, CheckerPresentationModel, CheckerValidationOrigin } from './natural-messages';
import { InternalIdGenerator } from './internal-id';
import { MutationGovernanceSink, MutationGovernanceSnapshot, MutationPlan, MutationPolicyApprovalProvider, MutationPolicyRegistry } from './mutation-policy';
/** Trusted adapter inputs for one synchronous Checker invocation, never retained by Context. */
export type CheckerMessageInput = Readonly<{
    defaultModel?: CheckerPresentationModel;
    privacyPolicy?: CheckerPrivacyPolicy;
    checkedValues?: readonly Readonly<Record<string, unknown>>[];
}>;
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
    readonly reason: 'missing' | 'type_mismatch' | 'invalid_id';
    readonly expectedType: string;
    readonly activeRoot?: Readonly<{
        entity: string;
        id: string | number | bigint;
    }> | undefined;
    constructor(reason: 'missing' | 'type_mismatch' | 'invalid_id', expectedType: string, activeRoot?: Readonly<{
        entity: string;
        id: string | number | bigint;
    }> | undefined);
}
export declare class UserContext {
    withInternalIdGenerator(generator: InternalIdGenerator): this;
    /** Reserve before constructing an entity. Failure must never choose another allocator. */
    generateInternalId(entity: string): Promise<string>;
    private businessClock;
    withBusinessClock(clock: BusinessClock): this;
    businessTime(): Date;
    /** UTC calendar date derived from the same business-clock provider. */
    businessDate(): string;
    withObjectStorage(provider: ObjectStorageProvider): this;
    withObjectStorageObserver(observer: ObjectStorageObserver): this;
    objectStorage(comment: string): ObjectStorage;
    /** Runtime-owned outer boundary used by generated Q execution, never SDK code. */
    withQueryRequest<T>(query: SelectQuery, work: () => Promise<T>): Promise<T>;
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
    private naturalCatalog;
    private naturalModel;
    private naturalRenderer;
    private naturalWarning;
    get checkerPresentationModel(): CheckerPresentationModel;
    installCheckerPresentationModel(model: CheckerPresentationModel): this;
    installCheckerMessageCatalog(source: string): this;
    installCheckerMessageRenderer(renderer: CheckerMessageRenderer): this;
    installCheckerMessageWarning(sink: (code: CheckerMessageWarning) => void): this;
    /** Immutable configuration, not a closure capturing this Context. */
    captureCheckerMessages(defaultModel?: CheckerPresentationModel): CheckerMessageConfiguration;
    translateCheckResultsFrom(origin: string, results: CheckResult[], input?: CheckerMessageInput): CheckResult[];
    /** Runtime graph boundary supplies an already-captured immutable origin. */
    renderCheckerGraphResults(results: readonly CheckResult[], config: CheckerMessageConfiguration, origin: CheckerValidationOrigin): CheckResult[];
    setLocaleCode(code: string): this;
    setLanguageCode(code: string): this;
    installI18nCatalog(catalog: I18nCatalog): this;
    installIdSetPaginationStore(store: IdSetPaginationStore): this;
    translateCheckResults(results: CheckResult[], declaringEntityType?: string): CheckResult[];
    withMutationPolicyRegistry(registry: MutationPolicyRegistry): this;
    withMutationPolicyApprovalProvider(provider: MutationPolicyApprovalProvider): this;
    withMutationGovernanceSink(sink: MutationGovernanceSink): this;
    reviewMutationPlan(plan: MutationPlan): MutationGovernanceSnapshot;
    /** @internal Used by governed data-service graph orchestration. */
    beginMutationPolicyGraph(): void;
    /** @internal Generated post-Fix snapshots are reviewed before provider work. */
    prepareMutationPolicyGraph(rootEntity?: string): void;
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