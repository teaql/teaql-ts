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
var _LoadedScalarSnapshot_values;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadedScalarSnapshot = void 0;
const query_snapshot_1 = require("./query-snapshot");
/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
class LoadedScalarSnapshot {
    constructor(values = {}) {
        _LoadedScalarSnapshot_values.set(this, void 0);
        __classPrivateFieldSet(this, _LoadedScalarSnapshot_values, (0, query_snapshot_1.snapshotQuery)(values), "f");
        Object.freeze(this);
    }
    /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
    values() { return (0, query_snapshot_1.snapshotQuery)(__classPrivateFieldGet(this, _LoadedScalarSnapshot_values, "f")); }
}
exports.LoadedScalarSnapshot = LoadedScalarSnapshot;
_LoadedScalarSnapshot_values = new WeakMap();
//# sourceMappingURL=loaded-scalar-snapshot.js.map