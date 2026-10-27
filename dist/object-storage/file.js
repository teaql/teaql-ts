"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileObjectStorage = void 0;
/** Server-only file store with an explicit, authenticated HTTP read gateway. */
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_http_1 = require("node:http");
const node_path_1 = require("node:path");
const node_events_1 = require("node:events");
const object_storage_1 = require("../core/object-storage");
function hashKey(key) {
    return (0, node_crypto_1.createHash)('sha256').update(key.value, 'utf8').digest('hex');
}
function isMissing(error) {
    return error?.code === 'ENOENT';
}
function safeManifest(value) {
    const record = value;
    if (!record || typeof record.version !== 'string' || !/^[0-9a-f-]{36}$/.test(record.version) ||
        !Number.isSafeInteger(record.size) || record.size < 0 ||
        typeof record.contentType !== 'string' || !record.contentType ||
        typeof record.etag !== 'string' || !/^[0-9a-f]{64}$/.test(record.etag) ||
        typeof record.lastModified !== 'string' || !Number.isFinite(Date.parse(record.lastModified)) ||
        !record.metadata || typeof record.metadata !== 'object' || Array.isArray(record.metadata)) {
        throw new object_storage_1.StorageError('Unavailable');
    }
    return record;
}
class FileObjectStorage {
    constructor(root, signingKey) {
        if (typeof root !== 'string' || !root.startsWith('/') ||
            !(signingKey instanceof Uint8Array) || signingKey.byteLength !== 32) {
            throw new object_storage_1.StorageError('InvalidInput');
        }
        this.root = root;
        this.secret = Buffer.from(signingKey);
    }
    directory(hash) {
        return (0, node_path_1.join)(this.root, hash.slice(0, 2), hash);
    }
    async manifest(hash) {
        try {
            return safeManifest(JSON.parse(await (0, promises_1.readFile)((0, node_path_1.join)(this.directory(hash), 'manifest.json'), 'utf8')));
        }
        catch (error) {
            if (isMissing(error))
                return undefined;
            if (error instanceof object_storage_1.StorageError)
                throw error;
            throw new object_storage_1.StorageError('Unavailable');
        }
    }
    metadata(key, manifest) {
        return new object_storage_1.ObjectMetadata(key, manifest.size, manifest.contentType, manifest.etag, new Date(manifest.lastModified), manifest.metadata);
    }
    async put(_invocation, key, content, options) {
        const hash = hashKey(key);
        const directory = this.directory(hash);
        const version = (0, node_crypto_1.randomUUID)();
        const dataPath = (0, node_path_1.join)(directory, `data-${version}`);
        const temporaryManifest = (0, node_path_1.join)(directory, `manifest-${version}`);
        try {
            await (0, promises_1.mkdir)(directory, { recursive: true, mode: 0o700 });
        }
        catch {
            throw new object_storage_1.StorageError('Io');
        }
        let installed = false;
        try {
            const file = await (0, promises_1.open)(dataPath, 'wx', 0o600);
            const digest = (0, node_crypto_1.createHash)('sha256');
            let size = 0;
            try {
                for await (const block of content) {
                    if (!(block instanceof Uint8Array) || block.byteLength > options.size - size) {
                        throw new object_storage_1.StorageError('InvalidInput');
                    }
                    digest.update(block);
                    let offset = 0;
                    while (offset < block.byteLength) {
                        const written = await file.write(block, offset, block.byteLength - offset);
                        if (!written.bytesWritten)
                            throw new object_storage_1.StorageError('Io');
                        offset += written.bytesWritten;
                    }
                    size += block.byteLength;
                }
                if (size !== options.size)
                    throw new object_storage_1.StorageError('InvalidInput');
                await file.sync();
            }
            finally {
                await file.close();
            }
            const manifest = {
                version, size, contentType: options.contentType, etag: digest.digest('hex'),
                lastModified: new Date().toISOString(), metadata: { ...options.metadata },
            };
            const manifestFile = await (0, promises_1.open)(temporaryManifest, 'wx', 0o600);
            try {
                await manifestFile.writeFile(JSON.stringify(manifest));
                await manifestFile.sync();
            }
            finally {
                await manifestFile.close();
            }
            const destination = (0, node_path_1.join)(directory, 'manifest.json');
            if (options.mode === 'create_only') {
                try {
                    await (0, promises_1.link)(temporaryManifest, destination);
                }
                catch (error) {
                    if (error?.code === 'EEXIST')
                        throw new object_storage_1.StorageError('Conflict');
                    throw error;
                }
                await (0, promises_1.unlink)(temporaryManifest);
            }
            else
                await (0, promises_1.rename)(temporaryManifest, destination);
            installed = true;
            return this.metadata(key, manifest);
        }
        catch (error) {
            if (error instanceof object_storage_1.StorageError)
                throw error;
            throw new object_storage_1.StorageError('Io');
        }
        finally {
            if (!installed) {
                await Promise.allSettled([(0, promises_1.rm)(dataPath, { force: true }), (0, promises_1.rm)(temporaryManifest, { force: true })]);
            }
        }
    }
    async get(_invocation, key) {
        const hash = hashKey(key);
        const manifest = await this.manifest(hash);
        if (!manifest)
            throw new object_storage_1.StorageError('NotFound');
        const path = (0, node_path_1.join)(this.directory(hash), `data-${manifest.version}`);
        try {
            if ((await (0, promises_1.stat)(path)).size !== manifest.size)
                throw new object_storage_1.StorageError('Unavailable');
        }
        catch (error) {
            throw error instanceof object_storage_1.StorageError ? error : new object_storage_1.StorageError('Unavailable');
        }
        const stream = (0, node_fs_1.createReadStream)(path);
        return new object_storage_1.ObjectContent(this.metadata(key, manifest), stream, async () => { stream.destroy(); });
    }
    async head(_invocation, key) {
        const manifest = await this.manifest(hashKey(key));
        return manifest ? this.metadata(key, manifest) : undefined;
    }
    async delete(_invocation, key) {
        try {
            await (0, promises_1.unlink)((0, node_path_1.join)(this.directory(hashKey(key)), 'manifest.json'));
        }
        catch (error) {
            if (!isMissing(error))
                throw new object_storage_1.StorageError('Io');
        }
    }
    ticket(value) {
        const nonce = (0, node_crypto_1.randomBytes)(12);
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.secret, nonce);
        const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
        return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
    }
    unticket(token) {
        try {
            const bytes = Buffer.from(token, 'base64url');
            if (bytes.length < 29 || bytes.length > 4096 || bytes.toString('base64url') !== token)
                return undefined;
            const cipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.secret, bytes.subarray(0, 12));
            cipher.setAuthTag(bytes.subarray(12, 28));
            const ticket = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8'));
            if (!/^[0-9a-f]{64}$/.test(ticket.hash) || !/^[0-9a-f-]{36}$/.test(ticket.version) ||
                !Number.isSafeInteger(ticket.expiresAt) || ticket.expiresAt <= Date.now() ||
                (ticket.disposition !== undefined &&
                    (typeof ticket.disposition !== 'string' || /[^\x20-\x7e]/.test(ticket.disposition))))
                return undefined;
            return ticket;
        }
        catch {
            return undefined;
        }
    }
    async getReadUrl(_invocation, key, options) {
        if (!this.publicBaseUrl)
            throw new object_storage_1.StorageError('NotConfigured');
        const hash = hashKey(key);
        const manifest = await this.manifest(hash);
        if (!manifest)
            throw new object_storage_1.StorageError('NotFound');
        try {
            if ((await (0, promises_1.stat)((0, node_path_1.join)(this.directory(hash), `data-${manifest.version}`))).size !== manifest.size) {
                throw new object_storage_1.StorageError('Unavailable');
            }
        }
        catch (error) {
            throw error instanceof object_storage_1.StorageError ? error : new object_storage_1.StorageError('Unavailable');
        }
        const expiresAt = new Date(Date.now() + options.seconds * 1000);
        const token = this.ticket({ hash, version: manifest.version,
            expiresAt: expiresAt.getTime(), disposition: options.contentDisposition });
        return new object_storage_1.ObjectReadUrl(`${this.publicBaseUrl}/objects/${token}`, expiresAt);
    }
    /** Explicit host action. The returned URL can be advertised through a trusted reverse proxy. */
    async start(host = '127.0.0.1', port = 0, advertisedBaseUrl) {
        if (this.server || !Number.isSafeInteger(port) || port < 0 || port > 65535) {
            throw new object_storage_1.StorageError('InvalidInput');
        }
        try {
            await (0, promises_1.mkdir)(this.root, { recursive: true, mode: 0o700 });
        }
        catch {
            throw new object_storage_1.StorageError('Io');
        }
        const server = (0, node_http_1.createServer)((request, response) => { void this.serve(request, response); });
        try {
            server.listen(port, host);
            await (0, node_events_1.once)(server, 'listening');
            const address = server.address();
            const base = advertisedBaseUrl ?? `http://${host}:${address.port}`;
            const url = new URL(base);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
                url.search || url.hash || url.pathname !== '/' || !url.hostname) {
                throw new object_storage_1.StorageError('InvalidInput');
            }
            this.server = server;
            this.publicBaseUrl = url.origin;
            return this.publicBaseUrl;
        }
        catch (error) {
            server.close();
            throw error instanceof object_storage_1.StorageError ? error : new object_storage_1.StorageError('Unavailable');
        }
    }
    async close() {
        const server = this.server;
        this.server = undefined;
        this.publicBaseUrl = undefined;
        if (server)
            await new Promise(resolve => server.close(() => resolve()));
    }
    async serve(request, response) {
        try {
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                response.writeHead(405);
                response.end();
                return;
            }
            const path = request.url?.split('?')[0] ?? '';
            const match = /^\/objects\/([A-Za-z0-9_-]+)$/.exec(path);
            const ticket = match ? this.unticket(match[1]) : undefined;
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
            const dataPath = (0, node_path_1.join)(this.directory(ticket.hash), `data-${manifest.version}`);
            try {
                if ((await (0, promises_1.stat)(dataPath)).size !== manifest.size)
                    throw new Error('file size changed');
            }
            catch {
                response.writeHead(404);
                response.end();
                return;
            }
            const size = manifest.size;
            let start = 0, end = size - 1, partial = false;
            const range = request.headers.range;
            if (range !== undefined) {
                const bytes = /^bytes=(\d*)-(\d*)$/.exec(range);
                if (!bytes || size === 0 || (!bytes[1] && !bytes[2])) {
                    response.writeHead(416, { 'Content-Range': `bytes */${size}` });
                    response.end();
                    return;
                }
                if (!bytes[1]) {
                    const suffix = Number(bytes[2]);
                    if (!Number.isSafeInteger(suffix) || suffix < 1) {
                        response.writeHead(416, { 'Content-Range': `bytes */${size}` });
                        response.end();
                        return;
                    }
                    start = Math.max(0, size - suffix);
                }
                else {
                    start = Number(bytes[1]);
                    if (bytes[2])
                        end = Number(bytes[2]);
                }
                if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size ||
                    end < start) {
                    response.writeHead(416, { 'Content-Range': `bytes */${size}` });
                    response.end();
                    return;
                }
                end = Math.min(end, size - 1);
                partial = true;
            }
            const headers = {
                'Content-Type': manifest.contentType, 'Content-Length': partial ? end - start + 1 : size,
                'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff', ETag: `"${manifest.etag}"`,
                'Last-Modified': new Date(manifest.lastModified).toUTCString(),
            };
            if (ticket.disposition)
                headers['Content-Disposition'] = ticket.disposition;
            if (partial)
                headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
            response.writeHead(partial ? 206 : 200, headers);
            if (request.method === 'HEAD' || size === 0) {
                response.end();
                return;
            }
            const stream = (0, node_fs_1.createReadStream)(dataPath, { start, end });
            stream.on('error', () => response.destroy());
            response.on('close', () => stream.destroy());
            stream.pipe(response);
        }
        catch {
            if (!response.headersSent)
                response.writeHead(500);
            response.end();
        }
    }
    toString() { return 'FileObjectStorage[configuration=masked]'; }
    [Symbol.for('nodejs.util.inspect.custom')]() { return this.toString(); }
}
exports.FileObjectStorage = FileObjectStorage;
//# sourceMappingURL=file.js.map