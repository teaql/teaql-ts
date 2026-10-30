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
var _BlobRef_key;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlobFieldSpec = exports.BlobRef = void 0;
/** Stable catalog identity. A Key is never a read URL or an authorization credential. */
class BlobRef {
    constructor(key) {
        _BlobRef_key.set(this, void 0);
        if (typeof key !== 'string' || !BlobRef.KEY.test(key)) {
            throw new TypeError('BLOB_REFERENCE_INVALID');
        }
        __classPrivateFieldSet(this, _BlobRef_key, key, "f");
        Object.freeze(this);
    }
    get key() { return __classPrivateFieldGet(this, _BlobRef_key, "f"); }
    static fromJSON(value) {
        if (typeof value !== 'string')
            throw new TypeError('BLOB_REFERENCE_INVALID');
        return new BlobRef(value);
    }
    static fromSQL(value) {
        if (typeof value !== 'string')
            throw new TypeError('BLOB_REFERENCE_INVALID');
        return new BlobRef(value);
    }
    equals(other) {
        return other instanceof BlobRef && this.key === other.key;
    }
    /** Generic JSON output must go through an authorized prepared view. */
    toJSON() { throw new Error('BLOB_PRESENTATION_REQUIRED'); }
    toString() { return 'BlobRef[masked]'; }
    [(_BlobRef_key = new WeakMap(), Symbol.for('nodejs.util.inspect.custom'))]() { return this.toString(); }
}
exports.BlobRef = BlobRef;
BlobRef.KEY = /^blob_[A-Za-z0-9_-]{1,123}$/;
const MIME_TYPES = Object.freeze({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    mp4: 'video/mp4', mp3: 'audio/mpeg',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
});
/** Trusted model restrictions; the server-selected profile may narrow them further. */
class BlobFieldSpec {
    constructor(entity, field, extensions, nullable, policyProfile) {
        this.protocolVersion = BlobFieldSpec.CAPABILITY;
        this.maxFiles = 1;
        if (!entity?.trim() || !field?.trim() || !policyProfile?.trim() ||
            entity !== entity.trim() || field !== field.trim() ||
            policyProfile !== policyProfile.trim()) {
            throw new TypeError('BLOB_POLICY_INVALID');
        }
        const normalized = [...new Set(extensions)].sort();
        if (!normalized.length || normalized.some(extension => !Object.prototype.hasOwnProperty.call(MIME_TYPES, extension))) {
            throw new TypeError('BLOB_FORMAT_NOT_ALLOWED');
        }
        this.entity = entity;
        this.field = field;
        this.allowedExtensions = Object.freeze(normalized);
        this.allowedContentTypes = Object.freeze([...new Set(normalized.map(extension => MIME_TYPES[extension]))].sort());
        this.nullable = nullable;
        this.policyProfile = policyProfile;
        Object.freeze(this);
    }
}
exports.BlobFieldSpec = BlobFieldSpec;
BlobFieldSpec.CAPABILITY = 'blob.v1';
//# sourceMappingURL=blob-ref.js.map