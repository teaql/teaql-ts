"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserContext = exports.ContextRootError = void 0;
const i18n_1 = require("./i18n");
const entity_root_1 = require("./entity-root");
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
        this.entityRoot = new entity_root_1.EntityRoot();
        this.resources = new Map();
        this.continuousPageCursors = new Map();
        this.continuousPageRuntime = {
            owner: '',
            get: (key, offset) => this.getContinuousPageCursor(key, offset),
            put: (key, offset, cursor) => this.putContinuousPageCursor(key, offset, cursor),
            observe: (plan, cursorId) => { this.continuousPagePlan = plan; this.continuousPageCursorId = cursorId; },
        };
        this.userIdentifier = '';
        this.continuousPagePlan = 'DISABLED';
        this.locale = 'en';
        this.i18nCatalog = i18n_1.I18nCatalog.builtin;
    }
    setLocaleCode(code) { const locale = (0, i18n_1.parseLocale)(code); this.locale = locale; return this; }
    setLanguageCode(code) { return this.setLocaleCode(code); }
    installI18nCatalog(catalog) { if (!catalog)
        throw new Error('catalog is required'); this.i18nCatalog = catalog; return this; }
    translateCheckResults(results) { return results.map(result => this.i18nCatalog.translate(result, this.locale)); }
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
        return query.bindContinuousPageRuntime(this.continuousPageRuntime);
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
}
exports.UserContext = UserContext;
//# sourceMappingURL=context.js.map