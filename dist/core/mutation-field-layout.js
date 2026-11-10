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
var _MutationFieldLayout_fields, _MutationFieldLayout_immutable;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationFieldLayout = void 0;
const checker_1 = require("./checker");
const object_location_1 = require("./object-location");
/** Trusted generated model vocabulary, shared by instances, never inferred from input. */
class MutationFieldLayout {
    constructor(entity, fields, immutable = {}) {
        this.entity = entity;
        _MutationFieldLayout_fields.set(this, void 0);
        _MutationFieldLayout_immutable.set(this, void 0);
        __classPrivateFieldSet(this, _MutationFieldLayout_fields, new Set(fields), "f");
        __classPrivateFieldSet(this, _MutationFieldLayout_immutable, Object.freeze({ ...immutable }), "f");
        Object.freeze(this);
    }
    /** Admission must run before an equal value can disappear from pending intent. */
    validate(values, updating = false) {
        const violations = Object.keys(values).flatMap(field => {
            const ruleId = !__classPrivateFieldGet(this, _MutationFieldLayout_fields, "f").has(field) ? 'unknown_field'
                : updating && Object.prototype.hasOwnProperty.call(__classPrivateFieldGet(this, _MutationFieldLayout_immutable, "f"), field) ? __classPrivateFieldGet(this, _MutationFieldLayout_immutable, "f")[field] : undefined;
            return ruleId ? [{ ruleId, location: object_location_1.ObjectLocation.property(field),
                    message: ruleId === 'unknown_field' ? 'Expected a canonical model field name' : 'Field is immutable after create' }] : [];
        });
        if (violations.length)
            throw new checker_1.CheckException(violations);
    }
}
exports.MutationFieldLayout = MutationFieldLayout;
_MutationFieldLayout_fields = new WeakMap(), _MutationFieldLayout_immutable = new WeakMap();
//# sourceMappingURL=mutation-field-layout.js.map