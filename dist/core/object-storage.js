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
var _ObjectKey_value, _ObjectPutOptions_size, _ObjectPutOptions_mode, _ObjectPutOptions_contentType, _ObjectPutOptions_metadata, _ObjectMetadata_key, _ObjectMetadata_size, _ObjectMetadata_contentType, _ObjectMetadata_etag, _ObjectMetadata_lastModified, _ObjectMetadata_metadata, _ObjectReadUrlOptions_seconds, _ObjectReadUrlOptions_disposition, _ObjectReadUrl_url, _ObjectReadUrl_expiresAt, _Receipt_ended, _Receipt_started, _ObjectContent_metadata, _ObjectContent_stream, _ObjectContent_close, _ObjectStorage_instances, _ObjectStorage_invocation, _ObjectStorage_provider, _ObjectStorage_call;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStorage = exports.ObjectContent = exports.ObjectReadUrl = exports.ObjectReadUrlOptions = exports.ObjectMetadata = exports.ObjectPutOptions = exports.ObjectKey = exports.MAX_OBJECT_PUT_SIZE = exports.StorageError = void 0;
const telemetry_1 = require("./telemetry");
class StorageError extends Error {
    constructor(code) {
        super(`Object storage: ${code}`);
        this.code = code;
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
const inspect = Symbol.for('nodejs.util.inspect.custom');
exports.MAX_OBJECT_PUT_SIZE = 5 * 1024 ** 3;
const invalid = () => { throw new StorageError('InvalidInput'); };
function header(value) { if (typeof value !== 'string' || !value || /[^\x20-\x7e]/.test(value))
    invalid(); return value; }
class ObjectKey {
    constructor(value) {
        _ObjectKey_value.set(this, void 0);
        if (typeof value !== 'string' || !value || new TextEncoder().encode(value).length > 1024 || /[\x00-\x1f\x7f-\x9f]/.test(value))
            invalid();
        // Reject isolated UTF-16 surrogates; TextEncoder would otherwise replace them.
        for (let i = 0; i < value.length; i++) {
            const c = value.charCodeAt(i);
            if (c >= 0xd800 && c <= 0xdbff) {
                const n = value.charCodeAt(++i);
                if (!(n >= 0xdc00 && n <= 0xdfff))
                    invalid();
            }
            else if (c >= 0xdc00 && c <= 0xdfff)
                invalid();
        }
        __classPrivateFieldSet(this, _ObjectKey_value, value, "f");
    }
    get value() { return __classPrivateFieldGet(this, _ObjectKey_value, "f"); }
    toString() { return 'ObjectKey[masked]'; }
    [(_ObjectKey_value = new WeakMap(), inspect)]() { return this.toString(); }
}
exports.ObjectKey = ObjectKey;
class ObjectPutOptions {
    constructor(size, mode, contentType = 'application/octet-stream', metadata = {}) {
        _ObjectPutOptions_size.set(this, void 0);
        _ObjectPutOptions_mode.set(this, void 0);
        _ObjectPutOptions_contentType.set(this, void 0);
        _ObjectPutOptions_metadata.set(this, void 0);
        if (!Number.isSafeInteger(size) || size < 0 || !['create_only', 'replace'].includes(mode))
            invalid();
        if (size > exports.MAX_OBJECT_PUT_SIZE)
            throw new StorageError('TooLarge');
        header(contentType);
        for (const [key, value] of Object.entries(metadata)) {
            if (!/^[a-z0-9][a-z0-9-]*$/.test(key))
                invalid();
            header(value);
        }
        __classPrivateFieldSet(this, _ObjectPutOptions_size, size, "f");
        __classPrivateFieldSet(this, _ObjectPutOptions_mode, mode, "f");
        __classPrivateFieldSet(this, _ObjectPutOptions_contentType, contentType, "f");
        __classPrivateFieldSet(this, _ObjectPutOptions_metadata, Object.freeze({ ...metadata }), "f");
    }
    get size() { return __classPrivateFieldGet(this, _ObjectPutOptions_size, "f"); }
    get mode() { return __classPrivateFieldGet(this, _ObjectPutOptions_mode, "f"); }
    get contentType() { return __classPrivateFieldGet(this, _ObjectPutOptions_contentType, "f"); }
    get metadata() { return __classPrivateFieldGet(this, _ObjectPutOptions_metadata, "f"); }
    toString() { return `ObjectPutOptions[size=${this.size}, mode=${this.mode}, metadata=masked]`; }
    [(_ObjectPutOptions_size = new WeakMap(), _ObjectPutOptions_mode = new WeakMap(), _ObjectPutOptions_contentType = new WeakMap(), _ObjectPutOptions_metadata = new WeakMap(), inspect)]() { return this.toString(); }
}
exports.ObjectPutOptions = ObjectPutOptions;
class ObjectMetadata {
    constructor(key, size, contentType, etag, lastModified, metadata = {}) {
        _ObjectMetadata_key.set(this, void 0);
        _ObjectMetadata_size.set(this, void 0);
        _ObjectMetadata_contentType.set(this, void 0);
        _ObjectMetadata_etag.set(this, void 0);
        _ObjectMetadata_lastModified.set(this, void 0);
        _ObjectMetadata_metadata.set(this, void 0);
        if (!Number.isSafeInteger(size) || size < 0)
            throw new StorageError('Unavailable');
        __classPrivateFieldSet(this, _ObjectMetadata_key, key, "f");
        __classPrivateFieldSet(this, _ObjectMetadata_size, size, "f");
        __classPrivateFieldSet(this, _ObjectMetadata_contentType, contentType, "f");
        __classPrivateFieldSet(this, _ObjectMetadata_etag, etag, "f");
        __classPrivateFieldSet(this, _ObjectMetadata_lastModified, lastModified && new Date(lastModified), "f");
        __classPrivateFieldSet(this, _ObjectMetadata_metadata, Object.freeze({ ...metadata }), "f");
    }
    get key() { return __classPrivateFieldGet(this, _ObjectMetadata_key, "f"); }
    get size() { return __classPrivateFieldGet(this, _ObjectMetadata_size, "f"); }
    get contentType() { return __classPrivateFieldGet(this, _ObjectMetadata_contentType, "f"); }
    get etag() { return __classPrivateFieldGet(this, _ObjectMetadata_etag, "f"); }
    get lastModified() { return __classPrivateFieldGet(this, _ObjectMetadata_lastModified, "f") && new Date(__classPrivateFieldGet(this, _ObjectMetadata_lastModified, "f")); }
    get customMetadata() { return __classPrivateFieldGet(this, _ObjectMetadata_metadata, "f"); }
    toString() { return `ObjectMetadata[size=${this.size}, details=masked]`; }
    [(_ObjectMetadata_key = new WeakMap(), _ObjectMetadata_size = new WeakMap(), _ObjectMetadata_contentType = new WeakMap(), _ObjectMetadata_etag = new WeakMap(), _ObjectMetadata_lastModified = new WeakMap(), _ObjectMetadata_metadata = new WeakMap(), inspect)]() { return this.toString(); }
}
exports.ObjectMetadata = ObjectMetadata;
class ObjectReadUrlOptions {
    constructor(seconds = 300, disposition, filename) {
        _ObjectReadUrlOptions_seconds.set(this, void 0);
        _ObjectReadUrlOptions_disposition.set(this, void 0);
        if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 604800 || disposition !== undefined && !['inline', 'attachment'].includes(disposition))
            invalid();
        if (filename !== undefined) {
            if (typeof filename !== 'string' || !filename || !disposition || /[\x00-\x1f\x7f-\x9f\/\\"]/.test(filename) ||
                new TextEncoder().encode(filename).length > 1024)
                invalid();
            for (let i = 0; i < filename.length; i++) {
                const c = filename.charCodeAt(i);
                if (c >= 0xd800 && c <= 0xdbff) {
                    const n = filename.charCodeAt(++i);
                    if (!(n >= 0xdc00 && n <= 0xdfff))
                        invalid();
                }
                else if (c >= 0xdc00 && c <= 0xdfff)
                    invalid();
            }
        }
        __classPrivateFieldSet(this, _ObjectReadUrlOptions_seconds, seconds, "f");
        __classPrivateFieldSet(this, _ObjectReadUrlOptions_disposition, disposition + (filename === undefined ? '' :
            [...filename].every(c => c.charCodeAt(0) <= 126) ? `; filename="${filename}"` :
                `; filename="${[...filename].map(c => c.codePointAt(0) <= 126 ? c : '_').join('')}"; filename*=UTF-8''${[...new TextEncoder().encode(filename)].map(b => b >= 65 && b <= 90 || b >= 97 && b <= 122 || b >= 48 && b <= 57 || [45, 46, 95, 126].includes(b) ?
                    String.fromCharCode(b) : `%${b.toString(16).toUpperCase().padStart(2, '0')}`).join('')}`), "f");
        if (disposition === undefined)
            __classPrivateFieldSet(this, _ObjectReadUrlOptions_disposition, undefined, "f");
    }
    get seconds() { return __classPrivateFieldGet(this, _ObjectReadUrlOptions_seconds, "f"); }
    get contentDisposition() { return __classPrivateFieldGet(this, _ObjectReadUrlOptions_disposition, "f"); }
    toString() { return 'ObjectReadUrlOptions[details=masked]'; }
    [(_ObjectReadUrlOptions_seconds = new WeakMap(), _ObjectReadUrlOptions_disposition = new WeakMap(), inspect)]() { return this.toString(); }
}
exports.ObjectReadUrlOptions = ObjectReadUrlOptions;
class ObjectReadUrl {
    constructor(url, expiresAt) {
        _ObjectReadUrl_url.set(this, void 0);
        _ObjectReadUrl_expiresAt.set(this, void 0);
        __classPrivateFieldSet(this, _ObjectReadUrl_url, url, "f");
        __classPrivateFieldSet(this, _ObjectReadUrl_expiresAt, new Date(expiresAt), "f");
    }
    get url() { return __classPrivateFieldGet(this, _ObjectReadUrl_url, "f"); }
    get expiresAt() { return new Date(__classPrivateFieldGet(this, _ObjectReadUrl_expiresAt, "f")); }
    toString() { return 'ObjectReadUrl[url=masked]'; }
    [(_ObjectReadUrl_url = new WeakMap(), _ObjectReadUrl_expiresAt = new WeakMap(), inspect)]() { return this.toString(); }
}
exports.ObjectReadUrl = ObjectReadUrl;
function sanitized(error) { return error instanceof StorageError ? error : new StorageError('Unavailable'); }
const safe = (text) => String(text ?? '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
class Receipt {
    constructor(invocation, operation) {
        this.invocation = invocation;
        this.operation = operation;
        _Receipt_ended.set(this, false);
        _Receipt_started.set(this, performance.now());
        this.scope = (0, telemetry_1.startRuntimeOperation)(invocation.context.getResource('runtimeTelemetry'), { family: 'object_storage', name: operation });
    }
    finish(outcome) {
        if (__classPrivateFieldGet(this, _Receipt_ended, "f"))
            return;
        __classPrivateFieldSet(this, _Receipt_ended, true, "f");
        if (outcome === 'success')
            this.scope.success();
        else
            this.scope.failure(new StorageError(outcome === 'cancelled' ? 'Io' : outcome));
        const event = Object.freeze({ operation: this.operation, comment: safe(this.invocation.comment), traceId: safe(this.invocation.context.getResource('traceId')), outcome, elapsedMs: performance.now() - __classPrivateFieldGet(this, _Receipt_started, "f") });
        try {
            const observer = this.invocation.context.getResource('objectStorageObserver');
            if (observer)
                observer(event);
            else
                console.info(`ObjectStorage operation=${event.operation} comment=${event.comment} trace=${event.traceId} outcome=${event.outcome} elapsedMs=${event.elapsedMs.toFixed(3)}`);
        }
        catch { /* fail open */ }
    }
}
_Receipt_ended = new WeakMap(), _Receipt_started = new WeakMap();
class ObjectContent {
    constructor(metadata, stream, close) {
        _ObjectContent_metadata.set(this, void 0);
        _ObjectContent_stream.set(this, void 0);
        _ObjectContent_close.set(this, void 0);
        __classPrivateFieldSet(this, _ObjectContent_metadata, metadata, "f");
        __classPrivateFieldSet(this, _ObjectContent_stream, stream, "f");
        __classPrivateFieldSet(this, _ObjectContent_close, close, "f");
    }
    get metadata() { return __classPrivateFieldGet(this, _ObjectContent_metadata, "f"); }
    get stream() { return __classPrivateFieldGet(this, _ObjectContent_stream, "f"); }
    close() { return __classPrivateFieldGet(this, _ObjectContent_close, "f").call(this); }
    toString() { return 'ObjectContent[masked]'; }
    [(_ObjectContent_metadata = new WeakMap(), _ObjectContent_stream = new WeakMap(), _ObjectContent_close = new WeakMap(), inspect)]() { return this.toString(); }
}
exports.ObjectContent = ObjectContent;
class ObjectStorage {
    constructor(context, comment) {
        _ObjectStorage_instances.add(this);
        _ObjectStorage_invocation.set(this, void 0);
        _ObjectStorage_provider.set(this, void 0);
        if (typeof comment !== 'string' || !comment.trim())
            invalid();
        const provider = context.getResource('objectStorageProvider');
        if (!provider)
            throw new StorageError('NotConfigured');
        __classPrivateFieldSet(this, _ObjectStorage_invocation, Object.freeze({ context, comment }), "f");
        __classPrivateFieldSet(this, _ObjectStorage_provider, provider, "f");
    }
    async put(key, content, options) {
        const iterator = content[Symbol.asyncIterator]();
        let done = false;
        const owned = { next: async () => { const result = await iterator.next(); if (result.done)
                done = true; return result; }, return: async () => { if (!done) {
                done = true;
                await iterator.return?.();
            } return { done: true, value: undefined }; }, [Symbol.asyncIterator]() { return this; } };
        return __classPrivateFieldGet(this, _ObjectStorage_instances, "m", _ObjectStorage_call).call(this, 'put', async () => { try {
            return await __classPrivateFieldGet(this, _ObjectStorage_provider, "f").put(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key, owned, options);
        }
        finally {
            await owned.return();
        } });
    }
    async putBytes(key, bytes, options) { return this.put(key, (async function* () { yield bytes; })(), options); }
    async get(key) {
        const receipt = new Receipt(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), 'get');
        let response;
        try {
            response = await (receipt.scope.run ? receipt.scope.run(() => __classPrivateFieldGet(this, _ObjectStorage_provider, "f").get(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key)) : __classPrivateFieldGet(this, _ObjectStorage_provider, "f").get(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key));
        }
        catch (error) {
            const safeError = sanitized(error);
            receipt.finish(safeError.code);
            throw safeError;
        }
        let closed = false, started = false;
        const close = async () => { if (closed)
            return; closed = true; try {
            await response.close();
            receipt.finish('cancelled');
        }
        catch {
            receipt.finish('Io');
            throw new StorageError('Io');
        } };
        const stream = { [Symbol.asyncIterator]: async function* () {
                if (started || closed)
                    throw new StorageError('Io');
                started = true;
                let remaining = response.metadata.size;
                try {
                    for await (const bytes of response.stream) {
                        if (!(bytes instanceof Uint8Array) || bytes.byteLength > remaining)
                            throw new StorageError('Io');
                        remaining -= bytes.byteLength;
                        yield bytes;
                    }
                    if (remaining !== 0)
                        throw new StorageError('Io');
                    receipt.finish('success');
                }
                catch {
                    receipt.finish('Io');
                    throw new StorageError('Io');
                }
                finally {
                    await close();
                }
            } };
        return new ObjectContent(response.metadata, stream, close);
    }
    async getBytes(key, maximumBytes) {
        if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
            invalid();
        const response = await this.get(key);
        try {
            if (response.metadata.size > maximumBytes)
                throw new StorageError('TooLarge');
            const chunks = [];
            let size = 0;
            for await (const block of response.stream) {
                if (block.byteLength > maximumBytes - size)
                    throw new StorageError('TooLarge');
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
        }
        finally {
            await response.close();
        }
    }
    head(key) { return __classPrivateFieldGet(this, _ObjectStorage_instances, "m", _ObjectStorage_call).call(this, 'head', () => __classPrivateFieldGet(this, _ObjectStorage_provider, "f").head(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key)); }
    async exists(key) { return (await this.head(key)) !== undefined; }
    delete(key) { return __classPrivateFieldGet(this, _ObjectStorage_instances, "m", _ObjectStorage_call).call(this, 'delete', () => __classPrivateFieldGet(this, _ObjectStorage_provider, "f").delete(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key)); }
    supportsVersionConditionalDelete() { return typeof __classPrivateFieldGet(this, _ObjectStorage_provider, "f").deleteIfVersion === 'function'; }
    async deleteIfVersion(key, contentVersion) {
        if (typeof contentVersion !== 'string' || !contentVersion ||
            contentVersion.length > 256 || contentVersion.trim() !== contentVersion ||
            /[\x00-\x1f\x7f-\x9f]/.test(contentVersion) || contentVersion === '*')
            invalid();
        const deleteIfVersion = __classPrivateFieldGet(this, _ObjectStorage_provider, "f").deleteIfVersion;
        if (!deleteIfVersion)
            throw new StorageError('Unsupported');
        return __classPrivateFieldGet(this, _ObjectStorage_instances, "m", _ObjectStorage_call).call(this, 'delete_if_version', async () => {
            const result = await deleteIfVersion.call(__classPrivateFieldGet(this, _ObjectStorage_provider, "f"), __classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key, contentVersion);
            if (result !== 'deleted' && result !== 'already_missing' && result !== 'version_mismatch')
                throw new StorageError('Unavailable');
            return result;
        });
    }
    getReadUrl(key, options = new ObjectReadUrlOptions()) { return __classPrivateFieldGet(this, _ObjectStorage_instances, "m", _ObjectStorage_call).call(this, 'read_url', () => __classPrivateFieldGet(this, _ObjectStorage_provider, "f").getReadUrl(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), key, options)); }
}
exports.ObjectStorage = ObjectStorage;
_ObjectStorage_invocation = new WeakMap(), _ObjectStorage_provider = new WeakMap(), _ObjectStorage_instances = new WeakSet(), _ObjectStorage_call = async function _ObjectStorage_call(operation, work) { const receipt = new Receipt(__classPrivateFieldGet(this, _ObjectStorage_invocation, "f"), operation); try {
    const result = await (receipt.scope.run ? receipt.scope.run(work) : work());
    receipt.finish('success');
    return result;
}
catch (error) {
    const safeError = sanitized(error);
    receipt.finish(safeError.code);
    throw safeError;
} };
//# sourceMappingURL=object-storage.js.map