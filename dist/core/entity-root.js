"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRoot = void 0;
const mutation_version_1 = require("./mutation-version");
const query_snapshot_1 = require("./query-snapshot");
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
        const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: Object.create(null) };
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
    /** @internal A save-attempt undo of selected fields on one typed identity.
     * No lifecycle/version/trace changes or unrelated caller edits are reverted. */
    captureFields(key, fields) {
        const id = identity(key), before = this.changes.get(id)?.values ?? {};
        const captured = new Map(fields.map(field => [field, {
                present: Object.prototype.hasOwnProperty.call(before, field), value: (0, query_snapshot_1.snapshotQuery)(before[field]),
            }]));
        return () => {
            const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: Object.create(null) };
            for (const [field, value] of captured) {
                if (value.present)
                    entry.values[field] = (0, query_snapshot_1.snapshotQuery)(value.value);
                else
                    delete entry.values[field];
            }
            if (Object.keys(entry.values).length)
                this.changes.set(id, entry);
            else
                this.changes.delete(id);
        };
    }
    /** @internal Remove only the exact intents observed during baseline comparison. */
    discardFields(key, observed) {
        const id = identity(key), entry = this.changes.get(id);
        if (!entry)
            return;
        for (const [field, value] of Object.entries(observed)) {
            if (Object.prototype.hasOwnProperty.call(entry.values, field) && Object.is(entry.values[field], value))
                delete entry.values[field];
        }
        if (!Object.keys(entry.values).length)
            this.changes.delete(id);
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
    setOriginalVersion(key, input) {
        const version = (0, mutation_version_1.entityVersion)(input);
        this.requireMatchingVersion(key, version);
        this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version });
    }
    /** @internal Accept only the authoritative result after this key committed. */
    acceptCommittedVersion(key, input) {
        const version = (0, mutation_version_1.entityVersion)(input);
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