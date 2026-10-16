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
var _S3ObjectStorage_client, _S3ObjectStorage_bucket;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3ObjectStorage = void 0;
/** Server-only adapter. SDK types and filesystem dependencies stay outside core. */
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const object_storage_1 = require("../core/object-storage");
function translate(error) {
    if (error instanceof object_storage_1.StorageError)
        return error;
    const e = error;
    if (e.name === 'NoSuchBucket')
        return new object_storage_1.StorageError('Unavailable');
    if (e.name === 'TimeoutError' || e.name === 'RequestTimeout')
        return new object_storage_1.StorageError('Timeout');
    switch (e.$metadata?.httpStatusCode) {
        case 401:
        case 403: return new object_storage_1.StorageError('AccessDenied');
        case 404: return new object_storage_1.StorageError('NotFound');
        case 409:
        case 412: return new object_storage_1.StorageError('Conflict');
        case 408:
        case 504: return new object_storage_1.StorageError('Timeout');
        case 413: return new object_storage_1.StorageError('TooLarge');
        case 501: return new object_storage_1.StorageError('Unsupported');
        case 400:
        case 422: return new object_storage_1.StorageError('InvalidInput');
        default: return new object_storage_1.StorageError('Unavailable');
    }
}
function metadata(key, result) {
    if (!Number.isSafeInteger(result.ContentLength) || !result.ETag?.trim())
        throw new object_storage_1.StorageError('Unavailable');
    return new object_storage_1.ObjectMetadata(key, result.ContentLength, result.ContentType, result.ETag, result.LastModified, result.Metadata);
}
class S3ObjectStorage {
    constructor(client, bucket) {
        _S3ObjectStorage_client.set(this, void 0);
        _S3ObjectStorage_bucket.set(this, void 0);
        if (!bucket.trim())
            throw new object_storage_1.StorageError('InvalidInput');
        __classPrivateFieldSet(this, _S3ObjectStorage_client, client, "f");
        __classPrivateFieldSet(this, _S3ObjectStorage_bucket, bucket, "f");
    }
    async put(_, key, content, options) {
        let directory;
        try {
            directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'teaql-object-'));
        }
        catch {
            throw new object_storage_1.StorageError('Io');
        }
        try {
            const file = (0, node_path_1.join)(directory, 'upload');
            const handle = await (0, promises_1.open)(file, 'wx', 0o600);
            let size = 0;
            try {
                for await (const chunk of content) {
                    if (!(chunk instanceof Uint8Array))
                        throw new object_storage_1.StorageError('InvalidInput');
                    size += chunk.byteLength;
                    if (size > options.size)
                        throw new object_storage_1.StorageError('InvalidInput');
                    let offset = 0;
                    while (offset < chunk.byteLength) {
                        const written = await handle.write(chunk, offset, chunk.byteLength - offset);
                        if (!written.bytesWritten)
                            throw new object_storage_1.StorageError('Io');
                        offset += written.bytesWritten;
                    }
                }
            }
            catch (error) {
                throw error instanceof object_storage_1.StorageError ? error : new object_storage_1.StorageError('Io');
            }
            finally {
                await handle.close();
            }
            if (size !== options.size)
                throw new object_storage_1.StorageError('InvalidInput');
            // Node SDK bodies are streams. Reopen the staged file for bounded retries.
            for (let attempt = 0; attempt < 3; attempt++) {
                const body = (0, node_fs_1.createReadStream)(file);
                try {
                    const result = await __classPrivateFieldGet(this, _S3ObjectStorage_client, "f").send(new client_s3_1.PutObjectCommand({ Bucket: __classPrivateFieldGet(this, _S3ObjectStorage_bucket, "f"), Key: key.value, Body: body, ContentLength: size, ContentType: options.contentType, Metadata: { ...options.metadata }, IfNoneMatch: options.mode === 'create_only' ? '*' : undefined }));
                    if (!result.ETag?.trim())
                        throw new object_storage_1.StorageError('Unavailable');
                    return new object_storage_1.ObjectMetadata(key, size, options.contentType, result.ETag, undefined, { ...options.metadata });
                }
                catch (error) {
                    const safeError = translate(error);
                    if (attempt === 2 || !['Timeout', 'Unavailable'].includes(safeError.code) || error instanceof object_storage_1.StorageError)
                        throw safeError;
                    await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
                }
                finally {
                    body.destroy();
                }
            }
            throw new object_storage_1.StorageError('Unavailable');
        }
        catch (error) {
            throw error instanceof object_storage_1.StorageError ? error : new object_storage_1.StorageError('Io');
        }
        finally {
            try {
                await (0, promises_1.rm)(directory, { recursive: true, force: true });
            }
            catch {
                throw new object_storage_1.StorageError('Io');
            }
        }
    }
    async get(_, key) {
        let result;
        try {
            result = await __classPrivateFieldGet(this, _S3ObjectStorage_client, "f").send(new client_s3_1.GetObjectCommand({ Bucket: __classPrivateFieldGet(this, _S3ObjectStorage_bucket, "f"), Key: key.value }));
        }
        catch (error) {
            throw translate(error);
        }
        const body = result.Body;
        try {
            if (!body || !body[Symbol.asyncIterator])
                throw new object_storage_1.StorageError('Unavailable');
            return new object_storage_1.ObjectContent(metadata(key, result), body, async () => { body.destroy(); });
        }
        catch (error) {
            body?.destroy();
            throw translate(error);
        }
    }
    async head(_, key) {
        try {
            return metadata(key, await __classPrivateFieldGet(this, _S3ObjectStorage_client, "f").send(new client_s3_1.HeadObjectCommand({ Bucket: __classPrivateFieldGet(this, _S3ObjectStorage_bucket, "f"), Key: key.value })));
        }
        catch (error) {
            const safeError = translate(error);
            if (safeError.code !== 'NotFound')
                throw safeError;
        }
        try {
            await __classPrivateFieldGet(this, _S3ObjectStorage_client, "f").send(new client_s3_1.HeadBucketCommand({ Bucket: __classPrivateFieldGet(this, _S3ObjectStorage_bucket, "f") }));
            return undefined;
        }
        catch (error) {
            const safeError = translate(error);
            throw safeError.code === 'NotFound' ? new object_storage_1.StorageError('Unavailable') : safeError;
        }
    }
    async delete(_, key) { try {
        await __classPrivateFieldGet(this, _S3ObjectStorage_client, "f").send(new client_s3_1.DeleteObjectCommand({ Bucket: __classPrivateFieldGet(this, _S3ObjectStorage_bucket, "f"), Key: key.value }));
    }
    catch (error) {
        throw translate(error);
    } }
    async getReadUrl(_, key, options) {
        const date = new Date();
        try {
            const url = await (0, s3_request_presigner_1.getSignedUrl)(__classPrivateFieldGet(this, _S3ObjectStorage_client, "f"), new client_s3_1.GetObjectCommand({ Bucket: __classPrivateFieldGet(this, _S3ObjectStorage_bucket, "f"), Key: key.value, ResponseContentDisposition: options.contentDisposition }), { expiresIn: options.seconds, signingDate: date });
            const headers = new URL(url).searchParams.get('X-Amz-SignedHeaders');
            if (headers && headers.toLowerCase() !== 'host')
                throw new object_storage_1.StorageError('Unsupported');
            return new object_storage_1.ObjectReadUrl(url, new Date(date.getTime() + options.seconds * 1000));
        }
        catch (error) {
            throw translate(error);
        }
    }
    close() { __classPrivateFieldGet(this, _S3ObjectStorage_client, "f").destroy(); }
    toString() { return 'S3ObjectStorage[configuration=masked]'; }
    [(_S3ObjectStorage_client = new WeakMap(), _S3ObjectStorage_bucket = new WeakMap(), Symbol.for('nodejs.util.inspect.custom'))]() { return this.toString(); }
}
exports.S3ObjectStorage = S3ObjectStorage;
//# sourceMappingURL=s3.js.map