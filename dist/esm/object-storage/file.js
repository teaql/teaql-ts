import {
  ObjectContent,
  ObjectMetadata,
  ObjectReadUrl,
  StorageError
} from "../chunks/chunk-MJFGQZSQ.js";
import "../chunks/chunk-WEYNFMW2.js";
import "../chunks/chunk-AQT573VW.js";

// src/object-storage/file.ts
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { link, mkdir, open, readFile, rename, rm, stat, unlink } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { once } from "node:events";
function hashKey(key) {
  return createHash("sha256").update(key.value, "utf8").digest("hex");
}
function isMissing(error) {
  return error?.code === "ENOENT";
}
function safeManifest(value) {
  const record = value;
  if (!record || typeof record.version !== "string" || !/^[0-9a-f-]{36}$/.test(record.version) || !Number.isSafeInteger(record.size) || record.size < 0 || typeof record.contentType !== "string" || !record.contentType || typeof record.etag !== "string" || !/^[0-9a-f]{64}$/.test(record.etag) || typeof record.lastModified !== "string" || !Number.isFinite(Date.parse(record.lastModified)) || !record.metadata || typeof record.metadata !== "object" || Array.isArray(record.metadata)) {
    throw new StorageError("Unavailable");
  }
  return record;
}
var FileObjectStorage = class {
  constructor(root, signingKey) {
    if (typeof root !== "string" || !root.startsWith("/") || !(signingKey instanceof Uint8Array) || signingKey.byteLength !== 32) {
      throw new StorageError("InvalidInput");
    }
    this.root = root;
    this.secret = Buffer.from(signingKey);
  }
  directory(hash) {
    return join(this.root, hash.slice(0, 2), hash);
  }
  async manifest(hash) {
    try {
      return safeManifest(JSON.parse(await readFile(join(this.directory(hash), "manifest.json"), "utf8")));
    } catch (error) {
      if (isMissing(error)) return void 0;
      if (error instanceof StorageError) throw error;
      throw new StorageError("Unavailable");
    }
  }
  metadata(key, manifest) {
    return new ObjectMetadata(
      key,
      manifest.size,
      manifest.contentType,
      manifest.etag,
      new Date(manifest.lastModified),
      manifest.metadata
    );
  }
  async put(_invocation, key, content, options) {
    const hash = hashKey(key);
    const directory = this.directory(hash);
    const version = randomUUID();
    const dataPath = join(directory, `data-${version}`);
    const temporaryManifest = join(directory, `manifest-${version}`);
    try {
      await mkdir(directory, { recursive: true, mode: 448 });
    } catch {
      throw new StorageError("Io");
    }
    let installed = false;
    try {
      const file = await open(dataPath, "wx", 384);
      const digest = createHash("sha256");
      let size = 0;
      try {
        for await (const block of content) {
          if (!(block instanceof Uint8Array) || block.byteLength > options.size - size) {
            throw new StorageError("InvalidInput");
          }
          digest.update(block);
          let offset = 0;
          while (offset < block.byteLength) {
            const written = await file.write(block, offset, block.byteLength - offset);
            if (!written.bytesWritten) throw new StorageError("Io");
            offset += written.bytesWritten;
          }
          size += block.byteLength;
        }
        if (size !== options.size) throw new StorageError("InvalidInput");
        await file.sync();
      } finally {
        await file.close();
      }
      const manifest = {
        version,
        size,
        contentType: options.contentType,
        etag: digest.digest("hex"),
        lastModified: (/* @__PURE__ */ new Date()).toISOString(),
        metadata: { ...options.metadata }
      };
      const manifestFile = await open(temporaryManifest, "wx", 384);
      try {
        await manifestFile.writeFile(JSON.stringify(manifest));
        await manifestFile.sync();
      } finally {
        await manifestFile.close();
      }
      const destination = join(directory, "manifest.json");
      if (options.mode === "create_only") {
        try {
          await link(temporaryManifest, destination);
        } catch (error) {
          if (error?.code === "EEXIST") throw new StorageError("Conflict");
          throw error;
        }
        await unlink(temporaryManifest);
      } else await rename(temporaryManifest, destination);
      installed = true;
      return this.metadata(key, manifest);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError("Io");
    } finally {
      if (!installed) {
        await Promise.allSettled([rm(dataPath, { force: true }), rm(temporaryManifest, { force: true })]);
      }
    }
  }
  async get(_invocation, key) {
    const hash = hashKey(key);
    const manifest = await this.manifest(hash);
    if (!manifest) throw new StorageError("NotFound");
    const path = join(this.directory(hash), `data-${manifest.version}`);
    try {
      if ((await stat(path)).size !== manifest.size) throw new StorageError("Unavailable");
    } catch (error) {
      throw error instanceof StorageError ? error : new StorageError("Unavailable");
    }
    const stream = createReadStream(path);
    return new ObjectContent(
      this.metadata(key, manifest),
      stream,
      async () => {
        stream.destroy();
      }
    );
  }
  async head(_invocation, key) {
    const manifest = await this.manifest(hashKey(key));
    return manifest ? this.metadata(key, manifest) : void 0;
  }
  async delete(_invocation, key) {
    try {
      await unlink(join(this.directory(hashKey(key)), "manifest.json"));
    } catch (error) {
      if (!isMissing(error)) throw new StorageError("Io");
    }
  }
  ticket(value) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.secret, nonce);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString("base64url");
  }
  unticket(token) {
    try {
      const bytes = Buffer.from(token, "base64url");
      if (bytes.length < 29 || bytes.length > 4096 || bytes.toString("base64url") !== token) return void 0;
      const cipher = createDecipheriv("aes-256-gcm", this.secret, bytes.subarray(0, 12));
      cipher.setAuthTag(bytes.subarray(12, 28));
      const ticket = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"));
      if (!/^[0-9a-f]{64}$/.test(ticket.hash) || !/^[0-9a-f-]{36}$/.test(ticket.version) || !Number.isSafeInteger(ticket.expiresAt) || ticket.expiresAt <= Date.now() || ticket.disposition !== void 0 && (typeof ticket.disposition !== "string" || /[^\x20-\x7e]/.test(ticket.disposition))) return void 0;
      return ticket;
    } catch {
      return void 0;
    }
  }
  async getReadUrl(_invocation, key, options) {
    if (!this.publicBaseUrl) throw new StorageError("NotConfigured");
    const hash = hashKey(key);
    const manifest = await this.manifest(hash);
    if (!manifest) throw new StorageError("NotFound");
    try {
      if ((await stat(join(this.directory(hash), `data-${manifest.version}`))).size !== manifest.size) {
        throw new StorageError("Unavailable");
      }
    } catch (error) {
      throw error instanceof StorageError ? error : new StorageError("Unavailable");
    }
    const expiresAt = new Date(Date.now() + options.seconds * 1e3);
    const token = this.ticket({
      hash,
      version: manifest.version,
      expiresAt: expiresAt.getTime(),
      disposition: options.contentDisposition
    });
    return new ObjectReadUrl(`${this.publicBaseUrl}/objects/${token}`, expiresAt);
  }
  /** Explicit host action. The returned URL can be advertised through a trusted reverse proxy. */
  async start(host = "127.0.0.1", port = 0, advertisedBaseUrl) {
    if (this.server || !Number.isSafeInteger(port) || port < 0 || port > 65535) {
      throw new StorageError("InvalidInput");
    }
    try {
      await mkdir(this.root, { recursive: true, mode: 448 });
    } catch {
      throw new StorageError("Io");
    }
    const server = createServer((request, response) => {
      void this.serve(request, response);
    });
    try {
      server.listen(port, host);
      await once(server, "listening");
      const address = server.address();
      const base = advertisedBaseUrl ?? `http://${host}:${address.port}`;
      const url = new URL(base);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/" || !url.hostname) {
        throw new StorageError("InvalidInput");
      }
      this.server = server;
      this.publicBaseUrl = url.origin;
      return this.publicBaseUrl;
    } catch (error) {
      server.close();
      throw error instanceof StorageError ? error : new StorageError("Unavailable");
    }
  }
  async close() {
    const server = this.server;
    this.server = void 0;
    this.publicBaseUrl = void 0;
    if (server) await new Promise((resolve) => server.close(() => resolve()));
  }
  async serve(request, response) {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405);
        response.end();
        return;
      }
      const path = request.url?.split("?")[0] ?? "";
      const match = /^\/objects\/([A-Za-z0-9_-]+)$/.exec(path);
      const ticket = match ? this.unticket(match[1]) : void 0;
      if (!ticket) {
        response.writeHead(404);
        response.end();
        return;
      }
      const manifest = await this.manifest(ticket.hash);
      if (!manifest || manifest.version !== ticket.version) {
        response.writeHead(404);
        response.end();
        return;
      }
      const dataPath = join(this.directory(ticket.hash), `data-${manifest.version}`);
      try {
        if ((await stat(dataPath)).size !== manifest.size) throw new Error("file size changed");
      } catch {
        response.writeHead(404);
        response.end();
        return;
      }
      const size = manifest.size;
      let start = 0, end = size - 1, partial = false;
      const range = request.headers.range;
      if (range !== void 0) {
        const bytes = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!bytes || size === 0 || !bytes[1] && !bytes[2]) {
          response.writeHead(416, { "Content-Range": `bytes */${size}` });
          response.end();
          return;
        }
        if (!bytes[1]) {
          const suffix = Number(bytes[2]);
          if (!Number.isSafeInteger(suffix) || suffix < 1) {
            response.writeHead(416, { "Content-Range": `bytes */${size}` });
            response.end();
            return;
          }
          start = Math.max(0, size - suffix);
        } else {
          start = Number(bytes[1]);
          if (bytes[2]) end = Number(bytes[2]);
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
          response.writeHead(416, { "Content-Range": `bytes */${size}` });
          response.end();
          return;
        }
        end = Math.min(end, size - 1);
        partial = true;
      }
      const headers = {
        "Content-Type": manifest.contentType,
        "Content-Length": partial ? end - start + 1 : size,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ETag: `"${manifest.etag}"`,
        "Last-Modified": new Date(manifest.lastModified).toUTCString()
      };
      if (ticket.disposition) headers["Content-Disposition"] = ticket.disposition;
      if (partial) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      response.writeHead(partial ? 206 : 200, headers);
      if (request.method === "HEAD" || size === 0) {
        response.end();
        return;
      }
      const stream = createReadStream(dataPath, { start, end });
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
    } catch {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    }
  }
  toString() {
    return "FileObjectStorage[configuration=masked]";
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
};
export {
  FileObjectStorage
};
//# sourceMappingURL=file.js.map
