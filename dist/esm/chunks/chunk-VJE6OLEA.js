import {
  __privateAdd,
  __privateGet,
  __privateSet
} from "./chunk-AQT573VW.js";

// src/core/blob-ref.ts
var _key;
var _BlobRef = class _BlobRef {
  constructor(key) {
    __privateAdd(this, _key);
    if (typeof key !== "string" || !_BlobRef.KEY.test(key)) {
      throw new TypeError("BLOB_REFERENCE_INVALID");
    }
    __privateSet(this, _key, key);
    Object.freeze(this);
  }
  get key() {
    return __privateGet(this, _key);
  }
  static fromJSON(value) {
    if (typeof value !== "string") throw new TypeError("BLOB_REFERENCE_INVALID");
    return new _BlobRef(value);
  }
  static fromSQL(value) {
    if (typeof value !== "string") throw new TypeError("BLOB_REFERENCE_INVALID");
    return new _BlobRef(value);
  }
  equals(other) {
    return other instanceof _BlobRef && this.key === other.key;
  }
  /** Generic JSON output must go through an authorized prepared view. */
  toJSON() {
    throw new Error("BLOB_PRESENTATION_REQUIRED");
  }
  toString() {
    return "BlobRef[masked]";
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
};
_key = new WeakMap();
_BlobRef.KEY = /^blob_[A-Za-z0-9_-]{1,123}$/;
var BlobRef = _BlobRef;
var MIME_TYPES = Object.freeze({
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf"
});
var _BlobFieldSpec = class _BlobFieldSpec {
  constructor(entity, field, extensions, nullable, policyProfile) {
    this.protocolVersion = _BlobFieldSpec.CAPABILITY;
    this.maxFiles = 1;
    if (!entity?.trim() || !field?.trim() || !policyProfile?.trim() || entity !== entity.trim() || field !== field.trim() || policyProfile !== policyProfile.trim()) {
      throw new TypeError("BLOB_POLICY_INVALID");
    }
    const normalized = [...new Set(extensions)].sort();
    if (!normalized.length || normalized.some((extension) => !Object.prototype.hasOwnProperty.call(MIME_TYPES, extension))) {
      throw new TypeError("BLOB_FORMAT_NOT_ALLOWED");
    }
    this.entity = entity;
    this.field = field;
    this.allowedExtensions = Object.freeze(normalized);
    this.allowedContentTypes = Object.freeze([...new Set(normalized.map((extension) => MIME_TYPES[extension]))].sort());
    this.nullable = nullable;
    this.policyProfile = policyProfile;
    Object.freeze(this);
  }
};
_BlobFieldSpec.CAPABILITY = "blob.v1";
var BlobFieldSpec = _BlobFieldSpec;

export {
  BlobRef,
  BlobFieldSpec
};
//# sourceMappingURL=chunk-VJE6OLEA.js.map
