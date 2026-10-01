"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationPolicyRuntimeState = exports.DelegatingMutationGovernanceSink = exports.DelegatingMutationPolicyApprovalProvider = exports.DelegatingMutationPolicyRegistry = exports.MutationPolicyError = exports.MISSING_MUTATION_POLICY_APPROVAL = exports.MISSING_MUTATION_POLICY = void 0;
/** Governed application policy for complete mutation graphs. */
const request_intent_1 = require("./request-intent");
exports.MISSING_MUTATION_POLICY = 'MUTATION-POLICY-001';
exports.MISSING_MUTATION_POLICY_APPROVAL = 'MUTATION-POLICY-002';
class MutationPolicyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MutationPolicyError';
    }
}
exports.MutationPolicyError = MutationPolicyError;
class DelegatingMutationPolicyRegistry {
    constructor(resolver) {
        this.resolver = resolver;
    }
    resolve(requestKey) { return this.resolver(requestKey); }
}
exports.DelegatingMutationPolicyRegistry = DelegatingMutationPolicyRegistry;
class DelegatingMutationPolicyApprovalProvider {
    constructor(finder) {
        this.finder = finder;
    }
    findApproval(identity) {
        return this.finder(identity);
    }
}
exports.DelegatingMutationPolicyApprovalProvider = DelegatingMutationPolicyApprovalProvider;
class DelegatingMutationGovernanceSink {
    constructor(consumer) {
        this.consumer = consumer;
    }
    onWarning(context, warning) {
        this.consumer(context, warning);
    }
}
exports.DelegatingMutationGovernanceSink = DelegatingMutationGovernanceSink;
class ConsoleMutationGovernanceSink {
    onWarning(_context, warning) {
        if (!warning.firstOccurrence || typeof console === 'undefined')
            return;
        console.warn(`TeaQL mutation policy warning code=${warning.warningCode} ` +
            `requestKey=${warning.snapshot.requestKey} source=${warning.snapshot.source} ` +
            `approval=${warning.snapshot.approvalStatus}`);
    }
}
let executionSequence = 0;
/** @internal Runtime state owned by one UserContext. */
class MutationPolicyRuntimeState {
    constructor() {
        this.profile = {
            warningSink: new ConsoleMutationGovernanceSink(),
        };
        this.emittedWarnings = new Set();
        this.graphActive = false;
        this.graphReviewed = false;
        this.preflight = [];
        this.preflightKeys = [];
        this.remaining = new Map();
    }
    setRegistry(registry) { this.profile.registry = registry; }
    setApprovalProvider(provider) {
        this.profile.approvalProvider = provider;
    }
    setWarningSink(sink) { this.profile.warningSink = sink; }
    beginGraph() {
        if (this.graphActive)
            throw new MutationPolicyError('mutation policy graph is already active');
        this.graphActive = true;
        this.graphReviewed = false;
        this.preflight = [];
        this.preflightKeys = [];
        this.rootEntity = undefined;
        this.auditReason = undefined;
        this.remaining.clear();
        this.graphSnapshot = undefined;
    }
    endGraph() {
        this.graphActive = false;
        this.graphReviewed = false;
        this.preflight = [];
        this.preflightKeys = [];
        this.rootEntity = undefined;
        this.auditReason = undefined;
        this.remaining.clear();
        this.graphSnapshot = undefined;
    }
    recordPreflight(mutation) {
        if (!this.graphActive)
            return;
        if (this.graphReviewed) {
            throw new MutationPolicyError('mutation preflight cannot change after policy review');
        }
        const operation = operationFromMutation(mutation);
        this.rootEntity ?? (this.rootEntity = operation.entity);
        this.auditReason ?? (this.auditReason = mutationComment(mutation));
        this.preflight.push(operation);
        this.preflightKeys.push(operationMatchKey(mutation, operation));
    }
    enterMutation(context, mutation) {
        const operation = operationFromMutation(mutation);
        if (!this.graphActive) {
            return { snapshot: this.review(context, this.plan(operation.entity, mutationComment(mutation), [operation])) };
        }
        if (!this.graphReviewed) {
            if (this.profile.registry && this.preflight.length === 0) {
                throw new MutationPolicyError('customer mutation policy requires complete graph preflight before provider mutation');
            }
            // Legacy/manual graph callers without a customer policy remain usable.
            // Generated graphs provide the complete preflight and therefore share
            // one reviewed plan; the generated-default fallback reviews each legacy
            // operation independently and emits the stable missing-policy warning.
            if (!this.profile.registry && this.preflight.length === 0) {
                return { snapshot: this.review(context, this.plan(operation.entity, mutationComment(mutation), [operation])) };
            }
            const operations = this.preflight.length ? this.preflight : [operation];
            this.graphSnapshot = this.review(context, this.plan(this.rootEntity ?? operations[0].entity, this.auditReason ?? mutationComment(mutation), operations));
            this.remaining.clear();
            const plannedKeys = this.preflight.length
                ? this.preflightKeys : operations.map(operationSignature);
            for (const signature of plannedKeys) {
                this.remaining.set(signature, (this.remaining.get(signature) ?? 0) + 1);
            }
            this.graphReviewed = true;
        }
        this.consume(operationMatchKey(mutation, operation));
        return { snapshot: this.graphSnapshot };
    }
    ensureGraphComplete() {
        if (this.graphReviewed && this.remaining.size) {
            throw new MutationPolicyError('reviewed mutation plan contains operations that were not executed');
        }
    }
    review(context, input) {
        validatePlan(input);
        const plan = freezePlan(input);
        const policy = this.profile.registry?.resolve(plan.requestKey);
        let source;
        let identity;
        let approvalStatus;
        let warningCodes;
        if (!policy) {
            source = 'generated_default';
            approvalStatus = 'not_applicable';
            warningCodes = [exports.MISSING_MUTATION_POLICY];
        }
        else {
            identity = freezeIdentity(policy.identity);
            const decision = policy.review(context, plan);
            if (!decision || (decision.verdict !== 'allow' && decision.verdict !== 'deny')) {
                throw new MutationPolicyError('customer mutation policy returned an invalid decision');
            }
            if (decision.verdict === 'deny') {
                throw new MutationPolicyError(`[MUTATION POLICY DENIED] ${decision.code || 'MUTATION-POLICY-DENIED'}: ` +
                    `${decision.message || 'mutation rejected'}`);
            }
            source = 'customer';
            const approval = this.profile.approvalProvider?.findApproval(identity);
            approvalStatus = validApproval(approval, identity) ? 'approved' : 'missing';
            warningCodes = approvalStatus === 'approved'
                ? [] : [exports.MISSING_MUTATION_POLICY_APPROVAL];
        }
        const snapshot = Object.freeze({
            executionId: plan.executionId,
            requestKey: plan.requestKey,
            source,
            policy: identity,
            approvalStatus,
            warningCodes: Object.freeze([...warningCodes]),
            operations: Object.freeze(plan.operations.map(operation => Object.freeze({
                kind: operation.kind,
                entity: operation.entity,
                entityId: cloneAndFreeze(operation.entityId),
                changedFields: Object.freeze(Object.keys(operation.changedValues).sort()),
            }))),
        });
        for (const code of warningCodes)
            this.emitWarning(context, snapshot, code);
        return snapshot;
    }
    plan(root, reason, operations) {
        executionSequence += 1;
        return freezePlan({
            executionId: `teaql-mutation-${executionSequence}`,
            requestKey: `${root}.saveGraph`,
            rootEntityType: root,
            auditReason: new request_intent_1.MutationIntent(reason).comment,
            operations,
        });
    }
    consume(signature) {
        const count = this.remaining.get(signature) ?? 0;
        if (count < 1) {
            throw new MutationPolicyError('provider mutation is not present in the reviewed graph plan');
        }
        if (count === 1)
            this.remaining.delete(signature);
        else
            this.remaining.set(signature, count - 1);
    }
    emitWarning(context, snapshot, warningCode) {
        const policy = snapshot.policy
            ? `${snapshot.policy.policyId}:${snapshot.policy.version}:${snapshot.policy.fingerprint}`
            : 'none';
        const key = `${snapshot.requestKey}|${policy}|${warningCode}`;
        const firstOccurrence = !this.emittedWarnings.has(key);
        this.emittedWarnings.add(key);
        try {
            this.profile.warningSink.onWarning(context, Object.freeze({
                snapshot, warningCode, firstOccurrence,
            }));
        }
        catch {
            // Warning delivery must not change persistence semantics.
        }
    }
}
exports.MutationPolicyRuntimeState = MutationPolicyRuntimeState;
function operationFromMutation(value) {
    const entity = String(value?.entity ?? '').trim();
    const action = String(value?.action ?? '').toLowerCase();
    const kinds = {
        create: 'create', update: 'update', delete: 'delete', recover: 'recover',
    };
    if (!entity || !kinds[action]) {
        throw new MutationPolicyError('mutation must contain a supported entity operation');
    }
    const payload = value?.payload && typeof value.payload === 'object'
        ? value.payload : {};
    return Object.freeze({
        kind: kinds[action],
        entity,
        entityId: cloneAndFreeze(value?.id ?? payload.id),
        originalVersion: value?.version ?? value?.expectedVersion,
        changedValues: cloneRecord(payload),
    });
}
function mutationComment(value) {
    return new request_intent_1.MutationIntent(value?.comment).comment;
}
function validatePlan(plan) {
    new request_intent_1.MutationIntent(plan?.auditReason);
    if (!plan.executionId?.trim())
        throw new MutationPolicyError('execution id is required');
    if (!plan.requestKey?.trim())
        throw new MutationPolicyError('request key is required');
    if (!plan.rootEntityType?.trim())
        throw new MutationPolicyError('root entity type is required');
    if (!plan.operations.length)
        throw new MutationPolicyError('mutation plan is empty');
}
function freezeIdentity(identity) {
    if (!identity || !identity.policyId?.trim() || !identity.version?.trim()
        || !identity.fingerprint?.trim()) {
        throw new MutationPolicyError('customer mutation policy identity is invalid');
    }
    return Object.freeze({
        policyId: identity.policyId.trim(), version: identity.version.trim(),
        fingerprint: identity.fingerprint.trim(),
    });
}
function validApproval(approval, identity) {
    return !!approval && sameIdentity(approval.policy, identity)
        && !!approval.approvedBy?.trim() && approval.approvedAt instanceof Date
        && Number.isFinite(approval.approvedAt.getTime()) && approval.approvedAt.getTime() !== 0;
}
function sameIdentity(left, right) {
    return left.policyId === right.policyId && left.version === right.version
        && left.fingerprint === right.fingerprint;
}
function freezePlan(plan) {
    return Object.freeze({
        executionId: plan.executionId,
        requestKey: plan.requestKey,
        rootEntityType: plan.rootEntityType,
        auditReason: plan.auditReason,
        operations: Object.freeze(plan.operations.map(operation => Object.freeze({
            kind: operation.kind,
            entity: operation.entity,
            entityId: cloneAndFreeze(operation.entityId),
            originalVersion: operation.originalVersion,
            changedValues: cloneRecord(operation.changedValues),
        }))),
    });
}
function cloneAndFreeze(value, ancestors = new WeakSet()) {
    if (value === null || value === undefined || typeof value === 'string'
        || typeof value === 'number' || typeof value === 'boolean'
        || typeof value === 'bigint')
        return value;
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value === 'object') {
        if (ancestors.has(value)) {
            throw new MutationPolicyError('mutation policy values must not contain cycles');
        }
        ancestors.add(value);
        try {
            if (Array.isArray(value)) {
                return Object.freeze(value.map(item => cloneAndFreeze(item, ancestors)));
            }
            const record = value;
            if ('id' in record && Object.keys(record).some(key => key !== 'id')) {
                return cloneAndFreeze(record.id, ancestors);
            }
            return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, item]) => [key, cloneAndFreeze(item, ancestors)])));
        }
        finally {
            ancestors.delete(value);
        }
    }
    return String(value);
}
function cloneRecord(value) {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneAndFreeze(item)])));
}
function operationSignature(operation) {
    return canonicalJSON({
        kind: operation.kind,
        entity: operation.entity,
        entityId: operation.entityId,
        originalVersion: operation.originalVersion,
        changedValues: operation.changedValues,
    });
}
function operationMatchKey(mutation, operation) {
    const ledgerKey = mutation?.ledgerKey;
    if (ledgerKey && typeof ledgerKey === 'object'
        && String(ledgerKey.entity ?? '').trim()
        && ledgerKey.id !== undefined && ledgerKey.id !== null) {
        return `ledger:${String(ledgerKey.entity).trim()}:${canonicalJSON(ledgerKey.id)}`;
    }
    return `operation:${operationSignature(operation)}`;
}
function canonicalJSON(value) {
    if (typeof value === 'bigint')
        return JSON.stringify(`${value.toString()}n`);
    if (value === undefined)
        return '"<undefined>"';
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalJSON).join(',')}]`;
    return `{${Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJSON(item)}`).join(',')}}`;
}
//# sourceMappingURL=mutation-policy.js.map