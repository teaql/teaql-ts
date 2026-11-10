"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserContext = exports.ContextRootError = void 0;
const business_clock_1 = require("./business-clock");
const object_storage_1 = require("./object-storage");
const i18n_1 = require("./i18n");
const checker_privacy_1 = require("./checker-privacy");
const internal_id_1 = require("./internal-id");
const schema_capability_1 = require("./schema-capability");
const mutation_policy_1 = require("./mutation-policy");
const resourceIdentities = new WeakMap();
let nextResourceIdentity = 1;
function resourceIdentity(value) {
    if (!value || (typeof value !== 'object' && typeof value !== 'function'))
        return String(value);
    const object = value;
    let identity = resourceIdentities.get(object);
    if (!identity) {
        identity = nextResourceIdentity++;
        resourceIdentities.set(object, identity);
    }
    return String(identity);
}
class ContextRootError extends Error {
    constructor(reason, expectedType, activeRoot) {
        super(`context root ${reason}: expected ${expectedType}`);
        this.reason = reason;
        this.expectedType = expectedType;
        this.activeRoot = activeRoot;
        this.name = 'ContextRootError';
    }
}
exports.ContextRootError = ContextRootError;
class UserContext {
    constructor() {
        this.businessClock = new business_clock_1.SystemBusinessClock();
        this.mutationPolicy = new mutation_policy_1.MutationPolicyRuntimeState();
        this.resources = new Map();
        this.continuousPageCursors = new Map();
        this.retainedIdSets = new Map();
        this.idSetBuilds = new Map();
        this.continuousPageRuntime = {
            owner: '',
            get: (key, offset) => this.getContinuousPageCursor(key, offset),
            put: (key, offset, cursor) => this.putContinuousPageCursor(key, offset, cursor),
            observe: (plan, cursorId) => { this.continuousPagePlan = plan; this.continuousPageCursorId = cursorId; },
        };
        this.idSetPaginationRuntime = {
            owner: '',
            scope: '',
            get: (key) => this.idSetStore().get(key),
            put: (key, value) => this.idSetStore().put(key, value),
            build: (key, builder) => this.singleFlightIdSetBuild(key, builder),
            observe: (plan, count) => {
                this.idSetPaginationPlan = plan;
                this.idSetPaginationCount = count;
                this.idSetPaginationCountAccuracy = plan === 'ID_SET_BUILD' || plan === 'ID_SET_HIT'
                    ? 'EXACT'
                    : plan === 'ID_SET_FALLBACK_LIMIT_EXCEEDED' ? 'LOWER_BOUND' : 'UNKNOWN';
            },
        };
        this.userIdentifier = '';
        this.continuousPagePlan = 'DISABLED';
        this.idSetPaginationPlan = 'ID_SET_DISABLED';
        this.idSetPaginationCountAccuracy = 'UNKNOWN';
        this.locale = 'en';
        this.i18nCatalog = i18n_1.I18nCatalog.builtin;
    }
    withInternalIdGenerator(generator) {
        if (!generator || typeof generator.generateId !== 'function') {
            throw new TypeError('Internal ID generator must provide generateId(entity, context)');
        }
        return this.insertResource('idGenerator', generator);
    }
    /** Reserve before constructing an entity. Failure must never choose another allocator. */
    async generateInternalId(entity) {
        if (typeof entity !== 'string' || !entity.trim() || entity !== entity.trim()) {
            throw new TypeError('Internal ID entity type is required');
        }
        if (this.resources.has('idGenerator')) {
            const generator = this.getResource('idGenerator');
            if (!generator || typeof generator.generateId !== 'function') {
                throw new TypeError('Configured internal ID generator must provide generateId(entity, context)');
            }
            return (0, internal_id_1.internalId)(await generator.generateId(entity, this));
        }
        const service = this.requireResource('dataService');
        if (typeof service.reserveInternalId !== 'function') {
            throw new TypeError('Configured data service must provide reserveInternalId(entity, context)');
        }
        return (0, internal_id_1.internalId)(await service.reserveInternalId(entity, this));
    }
    withBusinessClock(clock) {
        if (!clock || typeof clock.now !== 'function')
            throw new TypeError('Business clock must provide now()');
        this.businessClock = clock;
        return this;
    }
    businessTime() {
        const value = this.businessClock.now();
        if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
            throw new TypeError('Business clock returned an invalid Date');
        return new Date(value.getTime());
    }
    /** UTC calendar date derived from the same business-clock provider. */
    businessDate() { return this.businessTime().toISOString().slice(0, 10); }
    withObjectStorage(provider) { return this.insertResource('objectStorageProvider', provider); }
    withObjectStorageObserver(observer) { return this.insertResource('objectStorageObserver', observer); }
    objectStorage(comment) { return new object_storage_1.ObjectStorage(this, comment); }
    /** Runtime-owned outer boundary used by generated Q execution, never SDK code. */
    async withQueryRequest(query, work) {
        const service = this.requireResource('dataService');
        return service.withQueryRequest ? service.withQueryRequest(query, work) : work();
    }
    setLocaleCode(code) { const locale = (0, i18n_1.parseLocale)(code); this.locale = locale; return this; }
    setLanguageCode(code) { return this.setLocaleCode(code); }
    installI18nCatalog(catalog) { if (!catalog)
        throw new Error('catalog is required'); this.i18nCatalog = catalog; return this; }
    installIdSetPaginationStore(store) {
        if (!store)
            throw new Error('ID set pagination store is required');
        return this.insertResource('idSetPaginationStore', store);
    }
    translateCheckResults(results, declaringEntityType) {
        if (!results.length)
            return results;
        const scope = (0, checker_privacy_1.prepareCheckerResults)(results, declaringEntityType);
        try {
            const translated = scope.values.map(result => this.i18nCatalog.translate(result, this.locale));
            results.splice(0, results.length, ...scope.finish(translated));
            return results;
        }
        finally {
            scope.close();
        }
    }
    withMutationPolicyRegistry(registry) {
        if (!registry || typeof registry.resolve !== 'function') {
            throw new TypeError('mutation policy registry must expose resolve(requestKey)');
        }
        this.mutationPolicy.setRegistry(registry);
        return this;
    }
    withMutationPolicyApprovalProvider(provider) {
        if (!provider || typeof provider.findApproval !== 'function') {
            throw new TypeError('mutation policy approval provider must expose findApproval(identity)');
        }
        this.mutationPolicy.setApprovalProvider(provider);
        return this;
    }
    withMutationGovernanceSink(sink) {
        if (!sink || typeof sink.onWarning !== 'function') {
            throw new TypeError('mutation governance sink must expose onWarning(context, warning)');
        }
        this.mutationPolicy.setWarningSink(sink);
        return this;
    }
    reviewMutationPlan(plan) {
        return this.mutationPolicy.review(this, plan);
    }
    /** @internal Used by governed data-service graph orchestration. */
    beginMutationPolicyGraph() { this.mutationPolicy.beginGraph(); }
    /** @internal Generated post-Fix snapshots are reviewed before provider work. */
    prepareMutationPolicyGraph(rootEntity) { this.mutationPolicy.prepareGraphReview(this, rootEntity); }
    /** @internal Used by generated preflight after Checker/Fix. */
    recordMutationPolicyPreflight(mutation) {
        this.mutationPolicy.recordPreflight(mutation);
    }
    /** @internal Called at the provider mutation boundary. */
    enterMutationPolicy(mutation) {
        return this.mutationPolicy.enterMutation(this, mutation).snapshot;
    }
    /** @internal Must run before the surrounding graph transaction commits. */
    ensureMutationPolicyGraphComplete() { this.mutationPolicy.ensureGraphComplete(); }
    /** @internal Always runs when the graph operation leaves its transaction. */
    endMutationPolicyGraph() { this.mutationPolicy.endGraph(); }
    beginFixEvidence() { return this.insertResource('fixEvidenceCurrent', []); }
    recordFixEvidence(evidence) {
        const label = String(evidence.sourceLabel || '');
        const normalized = label.toLowerCase();
        if (!evidence.entityType || !evidence.modelPath || !label
            || normalized.includes('authorization') || normalized.includes('cookie') || normalized.includes('token=')) {
            throw new TypeError('Fix evidence must contain only safe framework provenance labels');
        }
        const current = this.getResource('fixEvidenceCurrent') ?? [];
        if (!this.getResource('fixEvidenceCurrent'))
            this.insertResource('fixEvidenceCurrent', current);
        current.push(Object.freeze({ ...evidence }));
        return this;
    }
    finishFixEvidence() {
        const current = this.getResource('fixEvidenceCurrent') ?? [];
        this.insertResource('fixEvidenceLast', Object.freeze([...current]));
        return this.removeResource('fixEvidenceCurrent');
    }
    lastFixEvidence() {
        return this.getResource('fixEvidenceLast') ?? [];
    }
    insertResource(name, resource) {
        this.resources.set(name, resource);
        return this;
    }
    getResource(name) {
        return this.resources.get(name);
    }
    removeResource(name) { this.resources.delete(name); return this; }
    requireResource(name) {
        const resource = this.getResource(name);
        if (resource === undefined) {
            throw new Error(`Required UserContext resource is missing: ${name}`);
        }
        return resource;
    }
    /**
     * Explicitly reconcile the installed Runtime Module with this context's data service.
     * Installing a module never performs schema changes.
     */
    ensureSchema() {
        const service = this.requireResource('dataService');
        const ensure = service[schema_capability_1.contextSchemaCapability];
        if (!ensure) {
            throw new Error('Configured dataService is not a schema-aware TeaQL provider');
        }
        return ensure.call(service, this);
    }
    withActiveRoot(root) {
        if (!root || !root.entity || root.id === undefined || root.id === null) {
            throw new TypeError('active root must be a typed entity reference');
        }
        return this.insertResource('activeRoot', Object.freeze({ ...root }));
    }
    requireActiveRoot(expectedType) {
        const root = this.getResource('activeRoot');
        if (!root)
            throw new ContextRootError('missing', expectedType);
        if (root.entity !== expectedType)
            throw new ContextRootError('type_mismatch', expectedType, root);
        // A request root must identify a persisted object, never an unset/temporary
        // key or a rounded JS number. Exact wide strings/bigints keep their type;
        // the provider remains responsible for its supported numeric range.
        const id = root.id;
        const valid = typeof id === 'number' ? Number.isSafeInteger(id) && id > 0
            : typeof id === 'bigint' ? id > 0n : typeof id === 'string' && /^[1-9][0-9]*$/.test(id);
        if (!valid)
            throw new ContextRootError('invalid_id', expectedType, root);
        return root;
    }
    /**
     * Bind local optimization state without copying trusted runtime resources
     * into the query or federation JSON payload.
     */
    prepareQuery(query) {
        this.continuousPageRuntime.owner = this.userIdentifier;
        this.idSetPaginationRuntime.owner = this.userIdentifier;
        const activeRoot = this.getResource('activeRoot');
        this.idSetPaginationRuntime.scope = [
            this.userIdentifier,
            activeRoot ? `${activeRoot.entity}:${String(activeRoot.id)}` : '-',
            resourceIdentity(this.getResource('dataService')),
        ].join('|');
        return query
            .bindContinuousPageRuntime(this.continuousPageRuntime)
            .bindIdSetPaginationRuntime(this.idSetPaginationRuntime);
    }
    getContinuousPageCursor(key, offset) {
        const storeKey = `${key}:${offset}`;
        const cursor = this.continuousPageCursors.get(storeKey);
        if (cursor && cursor.expiresAt <= Date.now()) {
            this.continuousPageCursors.delete(storeKey);
            return undefined;
        }
        return cursor;
    }
    putContinuousPageCursor(key, offset, cursor) {
        if (this.continuousPageCursors.size >= 4096) {
            const oldest = [...this.continuousPageCursors.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
            if (oldest)
                this.continuousPageCursors.delete(oldest[0]);
        }
        this.continuousPageCursors.set(`${key}:${offset}`, cursor);
    }
    getRetainedIdSet(key) {
        const value = this.retainedIdSets.get(key);
        if (value && value.expiresAt <= Date.now()) {
            this.retainedIdSets.delete(key);
            return undefined;
        }
        return value;
    }
    idSetStore() {
        return this.getResource('idSetPaginationStore') ?? {
            get: key => this.getRetainedIdSet(key),
            put: (key, value) => this.putRetainedIdSet(key, value),
            invalidate: key => { this.retainedIdSets.delete(key); },
        };
    }
    putRetainedIdSet(key, value) {
        const memoryCeiling = 256 * 1024 * 1024;
        if (value.ids.byteLength > memoryCeiling) {
            throw new Error('ID set exceeds the process-local store memory ceiling');
        }
        const retainedBytes = () => [...this.retainedIdSets.values()]
            .reduce((sum, retained) => sum + retained.ids.byteLength, 0);
        while (this.retainedIdSets.size >= 64
            || retainedBytes() + value.ids.byteLength > memoryCeiling) {
            const oldest = [...this.retainedIdSets.entries()]
                .sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
            if (!oldest)
                break;
            this.retainedIdSets.delete(oldest[0]);
        }
        this.retainedIdSets.set(key, value);
    }
    async singleFlightIdSetBuild(key, builder) {
        const existing = this.idSetBuilds.get(key);
        if (existing)
            return { value: await existing, built: false };
        const pending = builder();
        this.idSetBuilds.set(key, pending);
        try {
            return { value: await pending, built: true };
        }
        finally {
            this.idSetBuilds.delete(key);
        }
    }
}
exports.UserContext = UserContext;
//# sourceMappingURL=context.js.map