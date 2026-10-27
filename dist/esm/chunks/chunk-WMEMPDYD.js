import {
  startRuntimeOperation
} from "./chunk-WEYNFMW2.js";
import {
  __privateAdd,
  __privateGet,
  __privateMethod,
  __privateSet
} from "./chunk-AQT573VW.js";

// src/core/object-storage.ts
var StorageError = class extends Error {
  constructor(code) {
    super(`Object storage: ${code}`);
    this.code = code;
    this.name = "StorageError";
  }
};
var inspect = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var MAX_OBJECT_PUT_SIZE = 5 * 1024 ** 3;
var invalid = () => {
  throw new StorageError("InvalidInput");
};
function header(value) {
  if (typeof value !== "string" || !value || /[^\x20-\x7e]/.test(value)) invalid();
  return value;
}
var _value;
var ObjectKey = class {
  constructor(value) {
    __privateAdd(this, _value);
    if (typeof value !== "string" || !value || new TextEncoder().encode(value).length > 1024 || /[\x00-\x1f\x7f-\x9f]/.test(value)) invalid();
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      if (c >= 55296 && c <= 56319) {
        const n = value.charCodeAt(++i);
        if (!(n >= 56320 && n <= 57343)) invalid();
      } else if (c >= 56320 && c <= 57343) invalid();
    }
    __privateSet(this, _value, value);
  }
  get value() {
    return __privateGet(this, _value);
  }
  toString() {
    return "ObjectKey[masked]";
  }
  [inspect]() {
    return this.toString();
  }
};
_value = new WeakMap();
var _size, _mode, _contentType, _metadata;
var ObjectPutOptions = class {
  constructor(size, mode, contentType = "application/octet-stream", metadata = {}) {
    __privateAdd(this, _size);
    __privateAdd(this, _mode);
    __privateAdd(this, _contentType);
    __privateAdd(this, _metadata);
    if (!Number.isSafeInteger(size) || size < 0 || !["create_only", "replace"].includes(mode)) invalid();
    if (size > MAX_OBJECT_PUT_SIZE) throw new StorageError("TooLarge");
    header(contentType);
    for (const [key, value] of Object.entries(metadata)) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) invalid();
      header(value);
    }
    __privateSet(this, _size, size);
    __privateSet(this, _mode, mode);
    __privateSet(this, _contentType, contentType);
    __privateSet(this, _metadata, Object.freeze({ ...metadata }));
  }
  get size() {
    return __privateGet(this, _size);
  }
  get mode() {
    return __privateGet(this, _mode);
  }
  get contentType() {
    return __privateGet(this, _contentType);
  }
  get metadata() {
    return __privateGet(this, _metadata);
  }
  toString() {
    return `ObjectPutOptions[size=${this.size}, mode=${this.mode}, metadata=masked]`;
  }
  [inspect]() {
    return this.toString();
  }
};
_size = new WeakMap();
_mode = new WeakMap();
_contentType = new WeakMap();
_metadata = new WeakMap();
var _key, _size2, _contentType2, _etag, _lastModified, _metadata2;
var ObjectMetadata = class {
  constructor(key, size, contentType, etag, lastModified, metadata = {}) {
    __privateAdd(this, _key);
    __privateAdd(this, _size2);
    __privateAdd(this, _contentType2);
    __privateAdd(this, _etag);
    __privateAdd(this, _lastModified);
    __privateAdd(this, _metadata2);
    if (!Number.isSafeInteger(size) || size < 0) throw new StorageError("Unavailable");
    __privateSet(this, _key, key);
    __privateSet(this, _size2, size);
    __privateSet(this, _contentType2, contentType);
    __privateSet(this, _etag, etag);
    __privateSet(this, _lastModified, lastModified && new Date(lastModified));
    __privateSet(this, _metadata2, Object.freeze({ ...metadata }));
  }
  get key() {
    return __privateGet(this, _key);
  }
  get size() {
    return __privateGet(this, _size2);
  }
  get contentType() {
    return __privateGet(this, _contentType2);
  }
  get etag() {
    return __privateGet(this, _etag);
  }
  get lastModified() {
    return __privateGet(this, _lastModified) && new Date(__privateGet(this, _lastModified));
  }
  get customMetadata() {
    return __privateGet(this, _metadata2);
  }
  toString() {
    return `ObjectMetadata[size=${this.size}, details=masked]`;
  }
  [inspect]() {
    return this.toString();
  }
};
_key = new WeakMap();
_size2 = new WeakMap();
_contentType2 = new WeakMap();
_etag = new WeakMap();
_lastModified = new WeakMap();
_metadata2 = new WeakMap();
var _seconds, _disposition;
var ObjectReadUrlOptions = class {
  constructor(seconds = 300, disposition, filename) {
    __privateAdd(this, _seconds);
    __privateAdd(this, _disposition);
    if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 604800 || disposition !== void 0 && !["inline", "attachment"].includes(disposition)) invalid();
    if (filename !== void 0) {
      header(filename);
      if (!disposition || /[\/\\"]/.test(filename)) invalid();
    }
    __privateSet(this, _seconds, seconds);
    __privateSet(this, _disposition, disposition + (filename === void 0 ? "" : `; filename="${filename}"`));
    if (disposition === void 0) __privateSet(this, _disposition, void 0);
  }
  get seconds() {
    return __privateGet(this, _seconds);
  }
  get contentDisposition() {
    return __privateGet(this, _disposition);
  }
  toString() {
    return "ObjectReadUrlOptions[details=masked]";
  }
  [inspect]() {
    return this.toString();
  }
};
_seconds = new WeakMap();
_disposition = new WeakMap();
var _url, _expiresAt;
var ObjectReadUrl = class {
  constructor(url, expiresAt) {
    __privateAdd(this, _url);
    __privateAdd(this, _expiresAt);
    __privateSet(this, _url, url);
    __privateSet(this, _expiresAt, new Date(expiresAt));
  }
  get url() {
    return __privateGet(this, _url);
  }
  get expiresAt() {
    return new Date(__privateGet(this, _expiresAt));
  }
  toString() {
    return "ObjectReadUrl[url=masked]";
  }
  [inspect]() {
    return this.toString();
  }
};
_url = new WeakMap();
_expiresAt = new WeakMap();
function sanitized(error) {
  return error instanceof StorageError ? error : new StorageError("Unavailable");
}
var safe = (text) => String(text ?? "").replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
var _ended, _started;
var Receipt = class {
  constructor(invocation, operation) {
    this.invocation = invocation;
    this.operation = operation;
    __privateAdd(this, _ended, false);
    __privateAdd(this, _started, performance.now());
    this.scope = startRuntimeOperation(invocation.context.getResource("runtimeTelemetry"), { family: "object_storage", name: operation });
  }
  finish(outcome) {
    if (__privateGet(this, _ended)) return;
    __privateSet(this, _ended, true);
    if (outcome === "success") this.scope.success();
    else this.scope.failure(new StorageError(outcome === "cancelled" ? "Io" : outcome));
    const event = Object.freeze({ operation: this.operation, comment: safe(this.invocation.comment), traceId: safe(this.invocation.context.getResource("traceId")), outcome, elapsedMs: performance.now() - __privateGet(this, _started) });
    try {
      const observer = this.invocation.context.getResource("objectStorageObserver");
      if (observer) observer(event);
      else console.info(`ObjectStorage operation=${event.operation} comment=${event.comment} trace=${event.traceId} outcome=${event.outcome} elapsedMs=${event.elapsedMs.toFixed(3)}`);
    } catch {
    }
  }
};
_ended = new WeakMap();
_started = new WeakMap();
var _metadata3, _stream, _close;
var ObjectContent = class {
  constructor(metadata, stream, close) {
    __privateAdd(this, _metadata3);
    __privateAdd(this, _stream);
    __privateAdd(this, _close);
    __privateSet(this, _metadata3, metadata);
    __privateSet(this, _stream, stream);
    __privateSet(this, _close, close);
  }
  get metadata() {
    return __privateGet(this, _metadata3);
  }
  get stream() {
    return __privateGet(this, _stream);
  }
  close() {
    return __privateGet(this, _close).call(this);
  }
  toString() {
    return "ObjectContent[masked]";
  }
  [inspect]() {
    return this.toString();
  }
};
_metadata3 = new WeakMap();
_stream = new WeakMap();
_close = new WeakMap();
var _invocation, _provider, _ObjectStorage_instances, call_fn;
var ObjectStorage = class {
  constructor(context, comment) {
    __privateAdd(this, _ObjectStorage_instances);
    __privateAdd(this, _invocation);
    __privateAdd(this, _provider);
    if (typeof comment !== "string" || !comment.trim()) invalid();
    const provider = context.getResource("objectStorageProvider");
    if (!provider) throw new StorageError("NotConfigured");
    __privateSet(this, _invocation, Object.freeze({ context, comment }));
    __privateSet(this, _provider, provider);
  }
  async put(key, content, options) {
    const iterator = content[Symbol.asyncIterator]();
    let done = false;
    const owned = { next: async () => {
      const result = await iterator.next();
      if (result.done) done = true;
      return result;
    }, return: async () => {
      if (!done) {
        done = true;
        await iterator.return?.();
      }
      return { done: true, value: void 0 };
    }, [Symbol.asyncIterator]() {
      return this;
    } };
    return __privateMethod(this, _ObjectStorage_instances, call_fn).call(this, "put", async () => {
      try {
        return await __privateGet(this, _provider).put(__privateGet(this, _invocation), key, owned, options);
      } finally {
        await owned.return();
      }
    });
  }
  async putBytes(key, bytes, options) {
    return this.put(key, (async function* () {
      yield bytes;
    })(), options);
  }
  async get(key) {
    const receipt = new Receipt(__privateGet(this, _invocation), "get");
    let response;
    try {
      response = await (receipt.scope.run ? receipt.scope.run(() => __privateGet(this, _provider).get(__privateGet(this, _invocation), key)) : __privateGet(this, _provider).get(__privateGet(this, _invocation), key));
    } catch (error) {
      const safeError = sanitized(error);
      receipt.finish(safeError.code);
      throw safeError;
    }
    let closed = false, started = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      try {
        await response.close();
        receipt.finish("cancelled");
      } catch {
        receipt.finish("Io");
        throw new StorageError("Io");
      }
    };
    const stream = { [Symbol.asyncIterator]: async function* () {
      if (started || closed) throw new StorageError("Io");
      started = true;
      let remaining = response.metadata.size;
      try {
        for await (const bytes of response.stream) {
          if (!(bytes instanceof Uint8Array) || bytes.byteLength > remaining) throw new StorageError("Io");
          remaining -= bytes.byteLength;
          yield bytes;
        }
        if (remaining !== 0) throw new StorageError("Io");
        receipt.finish("success");
      } catch {
        receipt.finish("Io");
        throw new StorageError("Io");
      } finally {
        await close();
      }
    } };
    return new ObjectContent(response.metadata, stream, close);
  }
  async getBytes(key, maximumBytes) {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) invalid();
    const response = await this.get(key);
    try {
      if (response.metadata.size > maximumBytes) throw new StorageError("TooLarge");
      const chunks = [];
      let size = 0;
      for await (const block of response.stream) {
        if (block.byteLength > maximumBytes - size) throw new StorageError("TooLarge");
        size += block.byteLength;
        chunks.push(block);
      }
      const result = new Uint8Array(size);
      let offset = 0;
      for (const block of chunks) {
        result.set(block, offset);
        offset += block.byteLength;
      }
      return result;
    } finally {
      await response.close();
    }
  }
  head(key) {
    return __privateMethod(this, _ObjectStorage_instances, call_fn).call(this, "head", () => __privateGet(this, _provider).head(__privateGet(this, _invocation), key));
  }
  async exists(key) {
    return await this.head(key) !== void 0;
  }
  delete(key) {
    return __privateMethod(this, _ObjectStorage_instances, call_fn).call(this, "delete", () => __privateGet(this, _provider).delete(__privateGet(this, _invocation), key));
  }
  supportsVersionConditionalDelete() {
    return typeof __privateGet(this, _provider).deleteIfVersion === "function";
  }
  async deleteIfVersion(key, contentVersion) {
    if (typeof contentVersion !== "string" || !contentVersion || contentVersion.length > 256 || contentVersion.trim() !== contentVersion || /[\x00-\x1f\x7f-\x9f]/.test(contentVersion) || contentVersion === "*") invalid();
    const deleteIfVersion = __privateGet(this, _provider).deleteIfVersion;
    if (!deleteIfVersion) throw new StorageError("Unsupported");
    return __privateMethod(this, _ObjectStorage_instances, call_fn).call(this, "delete_if_version", async () => {
      const result = await deleteIfVersion.call(__privateGet(this, _provider), __privateGet(this, _invocation), key, contentVersion);
      if (result !== "deleted" && result !== "already_missing" && result !== "version_mismatch")
        throw new StorageError("Unavailable");
      return result;
    });
  }
  getReadUrl(key, options = new ObjectReadUrlOptions()) {
    return __privateMethod(this, _ObjectStorage_instances, call_fn).call(this, "read_url", () => __privateGet(this, _provider).getReadUrl(__privateGet(this, _invocation), key, options));
  }
};
_invocation = new WeakMap();
_provider = new WeakMap();
_ObjectStorage_instances = new WeakSet();
call_fn = async function(operation, work) {
  const receipt = new Receipt(__privateGet(this, _invocation), operation);
  try {
    const result = await (receipt.scope.run ? receipt.scope.run(work) : work());
    receipt.finish("success");
    return result;
  } catch (error) {
    const safeError = sanitized(error);
    receipt.finish(safeError.code);
    throw safeError;
  }
};

export {
  StorageError,
  MAX_OBJECT_PUT_SIZE,
  ObjectKey,
  ObjectPutOptions,
  ObjectMetadata,
  ObjectReadUrlOptions,
  ObjectReadUrl,
  ObjectContent,
  ObjectStorage
};
//# sourceMappingURL=chunk-WMEMPDYD.js.map
