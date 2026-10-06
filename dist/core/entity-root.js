"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRoot = void 0;
const identity = (key) => `${key.entity}\u0000${typeof key.id}:${String(key.id)}`;
/** Pending mutation ledger shared by one generated object graph. */
class EntityRoot {
    constructor() {
        this.changes = new Map();
        this.originalVersions = new Map();
        this.newKeys = new Map();
        this.deletedKeys = new Map();
        this.traces = new Map();
    }
    /** A complete per-entity lineage replaces, rather than extends, graph fallback. */
    setTraceChain(key, nodes) {
        this.traces.set(identity(key), { key: Object.freeze({ ...key }), nodes: (0, trace_chain_1.cloneTraceNodes)(nodes) });
    }
    traceChain(key) { return this.traces.get(identity(key))?.nodes; }
    set(key, field, value) {
        if (!field.trim())
            throw new TypeError('field is required');
        const id = identity(key);
        const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: {} };
        entry.values[field] = value;
        this.changes.set(id, entry);
    }
    snapshot() {
        return [...this.changes.values()].map(entry => ({
            key: Object.freeze({ ...entry.key }),
            values: Object.freeze({ ...entry.values }),
        }));
    }
    change(key) {
        return Object.freeze({ ...(this.changes.get(identity(key))?.values ?? {}) });
    }
    mergeFrom(other) {
        if (other === this)
            return;
        // Validate the whole explicit merge before copying any pending state.
        for (const entry of other.snapshotVersions())
            this.requireMatchingVersion(entry.key, entry.version);
        for (const entry of other.snapshot())
            for (const [field, value] of Object.entries(entry.values))
                this.set(entry.key, field, value);
        for (const key of other.newKeys.values())
            this.markAsNew(key);
        for (const key of other.deletedKeys.values())
            this.markAsDeleted(key);
        for (const entry of other.snapshotVersions())
            this.setOriginalVersion(entry.key, entry.version);
        for (const entry of other.traces.values())
            this.setTraceChain(entry.key, entry.nodes);
    }
    /** Import one explicitly reached entity, never its foreign graph or ownership. */
    mergeEntityFrom(other, key) {
        if (other === this)
            return;
        const version = other.originalVersion(key);
        if (version !== undefined)
            this.requireMatchingVersion(key, version);
        for (const [field, value] of Object.entries(other.change(key)))
            this.set(key, field, value);
        if (other.isNew(key))
            this.markAsNew(key);
        if (other.isDeleted(key))
            this.markAsDeleted(key);
        if (version !== undefined)
            this.setOriginalVersion(key, version);
        const trace = other.traceChain(key);
        if (trace)
            this.setTraceChain(key, trace);
    }
    hasPending(key) {
        const id = identity(key);
        return this.newKeys.has(id) || this.deletedKeys.has(id)
            || Object.keys(this.changes.get(id)?.values ?? {}).length > 0;
    }
    snapshotVersions() { return [...this.originalVersions.values()]; }
    rekey(oldKey, newKey) {
        const oldId = identity(oldKey);
        const newId = identity(newKey);
        if (oldId === newId)
            return;
        const loadedVersion = this.originalVersion(oldKey);
        if (loadedVersion !== undefined)
            this.requireMatchingVersion(newKey, loadedVersion);
        const entry = this.changes.get(oldId);
        if (entry) {
            this.changes.delete(oldId);
            for (const [field, value] of Object.entries(entry.values))
                this.set(newKey, field, value);
        }
        const version = this.originalVersions.get(oldId);
        if (version !== undefined) {
            this.originalVersions.delete(oldId);
            this.originalVersions.set(newId, { key: Object.freeze({ ...newKey }), version: version.version });
        }
        if (this.newKeys.delete(oldId))
            this.newKeys.set(newId, Object.freeze({ ...newKey }));
        if (this.deletedKeys.delete(oldId))
            this.deletedKeys.set(newId, Object.freeze({ ...newKey }));
        const trace = this.traces.get(oldId);
        if (trace) {
            this.traces.delete(oldId);
            this.setTraceChain(newKey, trace.nodes);
        }
    }
    clearEntity(key) {
        const id = identity(key);
        this.changes.delete(id);
        this.newKeys.delete(id);
        this.deletedKeys.delete(id);
        this.traces.delete(id);
    }
    requireMatchingVersion(key, version) {
        const original = this.originalVersion(key);
        if (original !== undefined && original !== version) {
            throw new Error('ENTITY_VERSION_CONFLICT: one graph cannot contain different loaded versions of the same typed entity');
        }
    }
    setOriginalVersion(key, version) {
        this.requireMatchingVersion(key, version);
        this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version });
    }
    /** @internal Accept only the authoritative result after this key committed. */
    acceptCommittedVersion(key, version) {
        if (this.hasPending(key))
            throw new Error('ENTITY_COMMIT_PENDING: clear committed changes before accepting the persisted version');
        this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version });
    }
    originalVersion(key) { return this.originalVersions.get(identity(key))?.version; }
    markAsNew(key) { this.newKeys.set(identity(key), Object.freeze({ ...key })); }
    isNew(key) { return this.newKeys.has(identity(key)); }
    markAsDeleted(key) { const id = identity(key); this.changes.delete(id); this.deletedKeys.set(id, Object.freeze({ ...key })); }
    isDeleted(key) { return this.deletedKeys.has(identity(key)); }
    clearCommitted() {
        this.changes.clear();
        this.newKeys.clear();
        this.deletedKeys.clear();
        this.traces.clear();
    }
}
exports.EntityRoot = EntityRoot;
const trace_chain_1 = require("./trace-chain");
//# sourceMappingURL=entity-root.js.map