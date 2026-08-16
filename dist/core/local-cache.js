"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localCache = exports.LocalCache = void 0;
/** Process-local cache with optional TTL in seconds. */
class LocalCache {
    constructor() {
        this.entries = new Map();
    }
    put(key, value, timeToLiveInSeconds) {
        const expiresAt = timeToLiveInSeconds !== undefined && timeToLiveInSeconds > 0
            ? Date.now() + timeToLiveInSeconds * 1000
            : undefined;
        this.entries.set(key, { value, expiresAt });
    }
    get(key) {
        const entry = this.entries.get(key);
        if (entry === undefined)
            return undefined;
        if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }
    remove(key) {
        this.entries.delete(key);
    }
    clear() {
        this.entries.clear();
    }
}
exports.LocalCache = LocalCache;
exports.localCache = new LocalCache();
//# sourceMappingURL=local-cache.js.map