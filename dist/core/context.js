"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserContext = void 0;
class UserContext {
    constructor() {
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
    }
    insertResource(name, resource) {
        this.resources.set(name, resource);
        return this;
    }
    getResource(name) {
        return this.resources.get(name);
    }
    requireResource(name) {
        const resource = this.getResource(name);
        if (resource === undefined) {
            throw new Error(`Required UserContext resource is missing: ${name}`);
        }
        return resource;
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