"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserContext = exports.ContextRootError = void 0;
const i18n_1 = require("./i18n");
const schema_capability_1 = require("./schema-capability");
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
    setLocaleCode(code) { const locale = (0, i18n_1.parseLocale)(code); this.locale = locale; return this; }
    setLanguageCode(code) { return this.setLocaleCode(code); }
    installI18nCatalog(catalog) { if (!catalog)
        throw new Error('catalog is required'); this.i18nCatalog = catalog; return this; }
    installIdSetPaginationStore(store) {
        if (!store)
            throw new Error('ID set pagination store is required');
        return this.insertResource('idSetPaginationStore', store);
    }
    translateCheckResults(results) { return results.map(result => this.i18nCatalog.translate(result, this.locale)); }
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