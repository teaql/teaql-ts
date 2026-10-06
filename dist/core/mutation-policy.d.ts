export declare const MISSING_MUTATION_POLICY = "MUTATION-POLICY-001";
export declare const MISSING_MUTATION_POLICY_APPROVAL = "MUTATION-POLICY-002";
export type MutationOperationKind = 'create' | 'update' | 'delete' | 'recover';
export type MutationPolicyIdentity = Readonly<{
    policyId: string;
    version: string;
    fingerprint: string;
}>;
export type MutationOperation = Readonly<{
    kind: MutationOperationKind;
    entity: string;
    entityId?: unknown;
    originalVersion?: number;
    changedValues: Readonly<Record<string, unknown>>;
}>;
export type MutationPlan = Readonly<{
    executionId: string;
    requestKey: string;
    rootEntityType: string;
    auditReason: string;
    operations: readonly MutationOperation[];
}>;
export type MutationDecision = Readonly<{
    verdict: 'allow' | 'deny';
    code?: string;
    message?: string;
    fieldPaths?: readonly string[];
}>;
export interface MutationPolicy {
    readonly identity: MutationPolicyIdentity;
    review(context: unknown, plan: MutationPlan): MutationDecision;
}
export interface MutationPolicyRegistry {
    resolve(requestKey: string): MutationPolicy | undefined;
}
export type MutationPolicyApproval = Readonly<{
    policy: MutationPolicyIdentity;
    approvedBy: string;
    approvedAt: Date;
}>;
export interface MutationPolicyApprovalProvider {
    findApproval(identity: MutationPolicyIdentity): MutationPolicyApproval | undefined;
}
export type MutationPolicySource = 'generated_default' | 'customer';
export type MutationPolicyApprovalStatus = 'not_applicable' | 'missing' | 'approved';
export type MutationOperationSummary = Readonly<{
    kind: MutationOperationKind;
    entity: string;
    entityId?: unknown;
    changedFields: readonly string[];
}>;
export type MutationGovernanceSnapshot = Readonly<{
    executionId: string;
    requestKey: string;
    source: MutationPolicySource;
    policy?: MutationPolicyIdentity;
    approvalStatus: MutationPolicyApprovalStatus;
    warningCodes: readonly string[];
    operations: readonly MutationOperationSummary[];
}>;
export type MutationGovernanceWarning = Readonly<{
    snapshot: MutationGovernanceSnapshot;
    warningCode: string;
    firstOccurrence: boolean;
}>;
export interface MutationGovernanceSink {
    onWarning(context: unknown, warning: MutationGovernanceWarning): void;
}
export declare class MutationPolicyError extends Error {
    constructor(message: string);
}
export declare class DelegatingMutationPolicyRegistry implements MutationPolicyRegistry {
    private readonly resolver;
    constructor(resolver: (requestKey: string) => MutationPolicy | undefined);
    resolve(requestKey: string): MutationPolicy | undefined;
}
export declare class DelegatingMutationPolicyApprovalProvider implements MutationPolicyApprovalProvider {
    private readonly finder;
    constructor(finder: (identity: MutationPolicyIdentity) => MutationPolicyApproval | undefined);
    findApproval(identity: MutationPolicyIdentity): MutationPolicyApproval | undefined;
}
export declare class DelegatingMutationGovernanceSink implements MutationGovernanceSink {
    private readonly consumer;
    constructor(consumer: (context: unknown, warning: MutationGovernanceWarning) => void);
    onWarning(context: unknown, warning: MutationGovernanceWarning): void;
}
type MutationExecution = Readonly<{
    snapshot: MutationGovernanceSnapshot;
}>;
/** @internal Runtime state owned by one UserContext. */
export declare class MutationPolicyRuntimeState {
    private readonly profile;
    private readonly emittedWarnings;
    private graphActive;
    private graphReviewed;
    private preflight;
    private preflightKeys;
    private rootEntity?;
    private auditReason?;
    private remaining;
    private graphSnapshot?;
    setRegistry(registry: MutationPolicyRegistry): void;
    setApprovalProvider(provider: MutationPolicyApprovalProvider): void;
    setWarningSink(sink: MutationGovernanceSink): void;
    beginGraph(): void;
    endGraph(): void;
    recordPreflight(mutation: unknown): void;
    enterMutation(context: unknown, mutation: unknown): MutationExecution;
    ensureGraphComplete(): void;
    review(context: unknown, input: MutationPlan): MutationGovernanceSnapshot;
    private plan;
    private consume;
    private emitWarning;
}
export {};
//# sourceMappingURL=mutation-policy.d.ts.map