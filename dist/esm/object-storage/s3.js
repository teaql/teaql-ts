import {
  ObjectContent,
  ObjectMetadata,
  ObjectReadUrl,
  StorageError
} from "../chunks/chunk-3BPR3EGQ.js";
import "../chunks/chunk-WEYNFMW2.js";
import {
  __privateAdd,
  __privateGet,
  __privateSet
} from "../chunks/chunk-AQT573VW.js";

// src/object-storage/s3.ts
import { PutObjectCommand, GetObjectCommand, HeadObjectCommand, HeadBucketCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdtemp, open, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function translate(error) {
  if (error instanceof StorageError) return error;
  const e = error;
  if (e.name === "NoSuchBucket") return new StorageError("Unavailable");
  if (e.name === "TimeoutError" || e.name === "RequestTimeout") return new StorageError("Timeout");
  switch (e.$metadata?.httpStatusCode) {
    case 401:
    case 403:
      return new StorageError("AccessDenied");
    case 404:
      return new StorageError("NotFound");
    case 409:
    case 412:
      return new StorageError("Conflict");
    case 408:
    case 504:
      return new StorageError("Timeout");
    case 413:
      return new StorageError("TooLarge");
    case 501:
      return new StorageError("Unsupported");
    case 400:
    case 422:
      return new StorageError("InvalidInput");
    default:
      return new StorageError("Unavailable");
  }
}
function metadata(key, result) {
  if (!Number.isSafeInteger(result.ContentLength) || !result.ETag?.trim()) throw new StorageError("Unavailable");
  return new ObjectMetadata(key, result.ContentLength, result.ContentType, result.ETag, result.LastModified, result.Metadata);
}
var _client, _bucket;
var S3ObjectStorage = class {
  constructor(client, bucket) {
    __privateAdd(this, _client);
    __privateAdd(this, _bucket);
    if (!bucket.trim()) throw new StorageError("InvalidInput");
    __privateSet(this, _client, client);
    __privateSet(this, _bucket, bucket);
  }
  async put(_, key, content, options) {
    let directory;
    try {
      directory = await mkdtemp(join(tmpdir(), "teaql-object-"));
    } catch {
      throw new StorageError("Io");
    }
    try {
      const file = join(directory, "upload");
      const handle = await open(file, "wx", 384);
      let size = 0;
      try {
        for await (const chunk of content) {
          if (!(chunk instanceof Uint8Array)) throw new StorageError("InvalidInput");
          size += chunk.byteLength;
          if (size > options.size) throw new StorageError("InvalidInput");
          let offset = 0;
          while (offset < chunk.byteLength) {
            const written = await handle.write(chunk, offset, chunk.byteLength - offset);
            if (!written.bytesWritten) throw new StorageError("Io");
            offset += written.bytesWritten;
          }
        }
      } catch (error) {
        throw error instanceof StorageError ? error : new StorageError("Io");
      } finally {
        await handle.close();
      }
      if (size !== options.size) throw new StorageError("InvalidInput");
      for (let attempt = 0; attempt < 3; attempt++) {
        const body = createReadStream(file);
        try {
          const result = await __privateGet(this, _client).send(new PutObjectCommand({ Bucket: __privateGet(this, _bucket), Key: key.value, Body: body, ContentLength: size, ContentType: options.contentType, Metadata: { ...options.metadata }, IfNoneMatch: options.mode === "create_only" ? "*" : void 0 }));
          if (!result.ETag?.trim()) throw new StorageError("Unavailable");
          return new ObjectMetadata(key, size, options.contentType, result.ETag, void 0, { ...options.metadata });
        } catch (error) {
          const safeError = translate(error);
          if (attempt === 2 || !["Timeout", "Unavailable"].includes(safeError.code) || error instanceof StorageError) throw safeError;
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        } finally {
          body.destroy();
        }
      }
      throw new StorageError("Unavailable");
    } catch (error) {
      throw error instanceof StorageError ? error : new StorageError("Io");
    } finally {
      try {
        await rm(directory, { recursive: true, force: true });
      } catch {
        throw new StorageError("Io");
      }
    }
  }
  async get(_, key) {
    let result;
    try {
      result = await __privateGet(this, _client).send(new GetObjectCommand({ Bucket: __privateGet(this, _bucket), Key: key.value }));
    } catch (error) {
      throw translate(error);
    }
    const body = result.Body;
    try {
      if (!body || !body[Symbol.asyncIterator]) throw new StorageError("Unavailable");
      return new ObjectContent(metadata(key, result), body, async () => {
        body.destroy();
      });
    } catch (error) {
      body?.destroy();
      throw translate(error);
    }
  }
  async head(_, key) {
    try {
      return metadata(key, await __privateGet(this, _client).send(new HeadObjectCommand({ Bucket: __privateGet(this, _bucket), Key: key.value })));
    } catch (error) {
      const safeError = translate(error);
      if (safeError.code !== "NotFound") throw safeError;
    }
    try {
      await __privateGet(this, _client).send(new HeadBucketCommand({ Bucket: __privateGet(this, _bucket) }));
      return void 0;
    } catch (error) {
      const safeError = translate(error);
      throw safeError.code === "NotFound" ? new StorageError("Unavailable") : safeError;
    }
  }
  async delete(_, key) {
    try {
      await __privateGet(this, _client).send(new DeleteObjectCommand({ Bucket: __privateGet(this, _bucket), Key: key.value }));
    } catch (error) {
      throw translate(error);
    }
  }
  async deleteIfVersion(invocation, key, contentVersion) {
    if (typeof contentVersion !== "string" || !contentVersion || contentVersion.length > 256 || contentVersion.trim() !== contentVersion || /[\x00-\x1f\x7f-\x9f]/.test(contentVersion) || contentVersion === "*") throw new StorageError("InvalidInput");
    try {
      await __privateGet(this, _client).send(new DeleteObjectCommand({
        Bucket: __privateGet(this, _bucket),
        Key: key.value,
        IfMatch: contentVersion
      }));
      return "deleted";
    } catch (error) {
      const safe = translate(error);
      if (safe.code === "NotFound" || safe.code === "Conflict" && error?.$metadata?.httpStatusCode === 412) {
        const current = await this.head(invocation, key);
        return current ? "version_mismatch" : "already_missing";
      }
      throw safe;
    }
  }
  async getReadUrl(_, key, options) {
    const date = /* @__PURE__ */ new Date();
    try {
      const url = await getSignedUrl(__privateGet(this, _client), new GetObjectCommand({ Bucket: __privateGet(this, _bucket), Key: key.value, ResponseContentDisposition: options.contentDisposition }), { expiresIn: options.seconds, signingDate: date });
      const headers = new URL(url).searchParams.get("X-Amz-SignedHeaders");
      if (headers && headers.toLowerCase() !== "host") throw new StorageError("Unsupported");
      return new ObjectReadUrl(url, new Date(date.getTime() + options.seconds * 1e3));
    } catch (error) {
      throw translate(error);
    }
  }
  close() {
    __privateGet(this, _client).destroy();
  }
  toString() {
    return "S3ObjectStorage[configuration=masked]";
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
};
_client = new WeakMap();
_bucket = new WeakMap();
export {
  S3ObjectStorage
};
//# sourceMappingURL=s3.js.map
