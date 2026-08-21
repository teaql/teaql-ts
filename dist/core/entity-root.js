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
    }
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
        for (const entry of other.snapshot())
            for (const [field, value] of Object.entries(entry.values))
                this.set(entry.key, field, value);
        for (const key of other.newKeys.values())
            this.markAsNew(key);
        for (const key of other.deletedKeys.values())
            this.markAsDeleted(key);
        for (const entry of other.snapshotVersions())
            this.setOriginalVersion(entry.key, entry.version);
    }
    snapshotVersions() { return [...this.originalVersions.values()]; }
    rekey(oldKey, newKey) {
        const oldId = identity(oldKey);
        const newId = identity(newKey);
        if (oldId === newId)
            return;
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
    }
    clearEntity(key) {
        const id = identity(key);
        this.changes.delete(id);
        this.newKeys.delete(id);
        this.deletedKeys.delete(id);
    }
    setOriginalVersion(key, version) { this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version }); }
    originalVersion(key) { return this.originalVersions.get(identity(key))?.version; }
    markAsNew(key) { this.newKeys.set(identity(key), Object.freeze({ ...key })); }
    isNew(key) { return this.newKeys.has(identity(key)); }
    markAsDeleted(key) { const id = identity(key); this.changes.delete(id); this.deletedKeys.set(id, Object.freeze({ ...key })); }
    isDeleted(key) { return this.deletedKeys.has(identity(key)); }
    clearCommitted() {
        this.changes.clear();
        this.newKeys.clear();
        this.deletedKeys.clear();
    }
}
exports.EntityRoot = EntityRoot;
//# sourceMappingURL=entity-root.js.map