"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LoadedScalarSnapshot_values, _LoadedScalarSnapshot_owner, _LoadedScalarSnapshot_identityKey, _LoadedScalarSnapshot_origin, _LoadedScalarSnapshot_persistedVersion;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadedScalarSnapshot = exports.LoadedEntityIdentityError = void 0;
const query_snapshot_1 = require("./query-snapshot");
const mutation_version_1 = require("./mutation-version");
const checker_1 = require("./checker");
const object_location_1 = require("./object-location");
const loadedSnapshots = new WeakMap();
/** Stable, value-free conflict; paths remain canonical Checker locations. */
class LoadedEntityIdentityError extends checker_1.CheckException {
    constructor(field) {
        super([{ ruleId: 'entity_version_conflict', location: object_location_1.ObjectLocation.property(field),
                message: 'ENTITY_VERSION_CONFLICT: loaded entity identity must remain unchanged' }]);
        this.code = 'ENTITY_VERSION_CONFLICT';
        this.name = 'LoadedEntityIdentityError';
    }
}
exports.LoadedEntityIdentityError = LoadedEntityIdentityError;
/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
class LoadedScalarSnapshot {
    constructor(values = {}, key, version, origin = 'hydrated') {
        _LoadedScalarSnapshot_values.set(this, void 0);
        _LoadedScalarSnapshot_owner.set(this, void 0);
        _LoadedScalarSnapshot_identityKey.set(this, void 0);
        _LoadedScalarSnapshot_origin.set(this, void 0);
        _LoadedScalarSnapshot_persistedVersion.set(this, void 0);
        __classPrivateFieldSet(this, _LoadedScalarSnapshot_values, (0, query_snapshot_1.snapshotQuery)(values), "f");
        __classPrivateFieldSet(this, _LoadedScalarSnapshot_origin, origin, "f");
        if (origin === 'hydrated' && key && version !== undefined) {
            const exact = (0, mutation_version_1.entityVersion)(version);
            __classPrivateFieldSet(this, _LoadedScalarSnapshot_persistedVersion, exact, "f");
            if (exact !== 0) {
                if (values.id !== undefined)
                    __classPrivateFieldSet(this, _LoadedScalarSnapshot_identityKey, Object.freeze({ ...key }), "f");
                __classPrivateFieldSet(this, _LoadedScalarSnapshot_owner, Object.freeze({ key: Object.freeze({ ...key }), version: exact }), "f");
            }
        }
        // An explicit ID-only reference still has an immutable identity. A new
        // entity's temporary key with no native ID must remain unbound until save.
        if (!__classPrivateFieldGet(this, _LoadedScalarSnapshot_identityKey, "f") && key && values.id !== undefined)
            __classPrivateFieldSet(this, _LoadedScalarSnapshot_identityKey, Object.freeze({ ...key }), "f");
        Object.freeze(this);
    }
    /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
    values() { return (0, query_snapshot_1.snapshotQuery)(__classPrivateFieldGet(this, _LoadedScalarSnapshot_values, "f")); }
    get origin() { return __classPrivateFieldGet(this, _LoadedScalarSnapshot_origin, "f"); }
    get persistedVersion() { return __classPrivateFieldGet(this, _LoadedScalarSnapshot_persistedVersion, "f"); }
    /** @internal Exact canonical top-level difference for detached preparation. */
    changedField(values) {
        const fields = [...new Set([...Object.keys(__classPrivateFieldGet(this, _LoadedScalarSnapshot_values, "f")), ...Object.keys(values)])].sort();
        return fields.find(field => !Object.prototype.hasOwnProperty.call(__classPrivateFieldGet(this, _LoadedScalarSnapshot_values, "f"), field)
            || !Object.prototype.hasOwnProperty.call(values, field) || !sameValue(__classPrivateFieldGet(this, _LoadedScalarSnapshot_values, "f")[field], values[field]));
    }
    /** Validate even read-only nodes, before root attachment or FK normalization. */
    validateNativeIdentity(key, nativeID, nativeVersion) {
        const expected = __classPrivateFieldGet(this, _LoadedScalarSnapshot_identityKey, "f");
        if (expected && (expected.entity !== key.entity || !Object.is(expected.id, key.id)
            || !Object.is(expected.id, nativeID)))
            throw new LoadedEntityIdentityError('id');
        if (__classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f")) {
            let version;
            try {
                version = (0, mutation_version_1.entityVersion)(nativeVersion);
            }
            catch {
                throw new LoadedEntityIdentityError('version');
            }
            if (version !== __classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f").version)
                throw new LoadedEntityIdentityError('version');
        }
    }
    /** Normalize restored intent first. Clean old views may observe an advanced
     * ledger, but a dirty old view must never borrow its newer committed version. */
    validateMutationVersion(root, key) {
        if (!__classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f") || !root.hasPending(key))
            return;
        if (__classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f").key.entity !== key.entity || !Object.is(__classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f").key.id, key.id)
            || root.isNew(key) || root.originalVersion(key) !== __classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f").version) {
            throw new LoadedEntityIdentityError('version');
        }
    }
    /** @internal Generated hydration stores provenance outside entity/JSON state. */
    static captureFor(entity, values, key, version, origin = 'hydrated') {
        const snapshot = new LoadedScalarSnapshot(values, key, version, origin);
        loadedSnapshots.set(entity, snapshot);
        return snapshot;
    }
    /** @internal Mutation uses the loaded values, not already-edited properties. */
    static forEntity(entity) { return loadedSnapshots.get(entity); }
    /** @internal Rollback restores provenance together with authoritative entity state. */
    static restoreFor(entity, snapshot) {
        if (snapshot)
            loadedSnapshots.set(entity, snapshot);
        else
            loadedSnapshots.delete(entity);
    }
    /** @internal Called only after model-field admission, before completeness and Fix. */
    discardRestoredFields(root, key) {
        const owner = __classPrivateFieldGet(this, _LoadedScalarSnapshot_owner, "f");
        if (!owner || owner.key.entity !== key.entity || !Object.is(owner.key.id, key.id)
            || root.originalVersion(key) !== owner.version || root.isNew(key) || root.isDeleted(key))
            return;
        const restored = Object.create(null);
        for (const [field, value] of Object.entries(root.change(key))) {
            // Undefined is an unknown original, not a loaded null.
            const original = Object.getOwnPropertyDescriptor(__classPrivateFieldGet(this, _LoadedScalarSnapshot_values, "f"), field);
            if (field !== 'id' && field !== 'version' && original && 'value' in original && original.value !== undefined
                && sameValue(original.value, value))
                restored[field] = value;
        }
        root.discardFields(key, restored);
    }
}
exports.LoadedScalarSnapshot = LoadedScalarSnapshot;
_LoadedScalarSnapshot_values = new WeakMap(), _LoadedScalarSnapshot_owner = new WeakMap(), _LoadedScalarSnapshot_identityKey = new WeakMap(), _LoadedScalarSnapshot_origin = new WeakMap(), _LoadedScalarSnapshot_persistedVersion = new WeakMap();
/** Exact, bounded scalar/JSON comparison. No numeric or string coercion. */
function sameValue(a, b, budget = { nodes: 4096 }, depth = 0) {
    if (--budget.nodes < 0 || depth > 64 || typeof a !== typeof b)
        return false;
    if (typeof a === 'number')
        return Number.isFinite(a) && Number.isFinite(b) && Object.is(a, b);
    if (a === null || b === null || typeof a !== 'object')
        return Object.is(a, b);
    if (a instanceof Date || b instanceof Date)
        return a instanceof Date && b instanceof Date && Number.isFinite(a.getTime()) && a.getTime() === b.getTime();
    if (a instanceof Uint8Array || b instanceof Uint8Array)
        return a instanceof Uint8Array && b instanceof Uint8Array
            && a.length === b.length && a.every((value, index) => value === b[index]);
    if (Array.isArray(a) !== Array.isArray(b))
        return false;
    if (!Array.isArray(a) && (Object.getPrototypeOf(a) !== Object.prototype && Object.getPrototypeOf(a) !== null
        || Object.getPrototypeOf(b) !== Object.prototype && Object.getPrototypeOf(b) !== null))
        return false;
    if (Array.isArray(a) && a.length !== b.length)
        return false;
    const left = Object.getOwnPropertyDescriptors(a), right = Object.getOwnPropertyDescriptors(b);
    const keys = Object.keys(left).filter(key => left[key].enumerable);
    if (keys.length !== Object.keys(right).filter(key => right[key].enumerable).length)
        return false;
    return keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && right[key].enumerable
        && 'value' in left[key] && 'value' in right[key] && sameValue(left[key].value, right[key].value, budget, depth + 1));
}
//# sourceMappingURL=loaded-scalar-snapshot.js.map