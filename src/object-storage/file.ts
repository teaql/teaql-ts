/** Server-only file store with an explicit, authenticated HTTP read gateway. */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, open, readFile, rename, rm, stat, unlink } from 'node:fs/promises';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { once } from 'node:events';
import {
  ObjectByteStream, ObjectContent, ObjectKey, ObjectMetadata, ObjectPutOptions,
  ObjectReadUrl, ObjectReadUrlOptions, ObjectStorageProvider, StorageError,
  StorageInvocation,
} from '../core/object-storage';

type Manifest = {
  version: string;
  size: number;
  contentType: string;
  etag: string;
  lastModified: string;
  metadata: Record<string, string>;
};

type Ticket = { hash: string; version: string; expiresAt: number; disposition?: string };

function hashKey(key: ObjectKey): string {
  return createHash('sha256').update(key.value, 'utf8').digest('hex');
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

function safeManifest(value: unknown): Manifest {
  const record = value as Partial<Manifest>;
  if (!record || typeof record.version !== 'string' || !/^[0-9a-f-]{36}$/.test(record.version) ||
      !Number.isSafeInteger(record.size) || (record.size as number) < 0 ||
      typeof record.contentType !== 'string' || !record.contentType ||
      typeof record.etag !== 'string' || !/^[0-9a-f]{64}$/.test(record.etag) ||
      typeof record.lastModified !== 'string' || !Number.isFinite(Date.parse(record.lastModified)) ||
      !record.metadata || typeof record.metadata !== 'object' || Array.isArray(record.metadata)) {
    throw new StorageError('Unavailable');
  }
  return record as Manifest;
}

export class FileObjectStorage implements ObjectStorageProvider {
  private readonly root: string;
  private readonly secret: Buffer;
  private server?: Server;
  private publicBaseUrl?: string;

  constructor(root: string, signingKey: Uint8Array) {
    if (typeof root !== 'string' || !root.startsWith('/') ||
        !(signingKey instanceof Uint8Array) || signingKey.byteLength !== 32) {
      throw new StorageError('InvalidInput');
    }
    this.root = root;
    this.secret = Buffer.from(signingKey);
  }

  private directory(hash: string): string {
    return join(this.root, hash.slice(0, 2), hash);
  }

  private async manifest(hash: string): Promise<Manifest | undefined> {
    try { return safeManifest(JSON.parse(await readFile(join(this.directory(hash), 'manifest.json'), 'utf8'))); }
    catch (error) {
      if (isMissing(error)) return undefined;
      if (error instanceof StorageError) throw error;
      throw new StorageError('Unavailable');
    }
  }

  private metadata(key: ObjectKey, manifest: Manifest): ObjectMetadata {
    return new ObjectMetadata(key, manifest.size, manifest.contentType, manifest.etag,
      new Date(manifest.lastModified), manifest.metadata);
  }

  async put(_invocation: StorageInvocation, key: ObjectKey, content: ObjectByteStream,
            options: ObjectPutOptions): Promise<ObjectMetadata> {
    const hash = hashKey(key);
    const directory = this.directory(hash);
    const version = randomUUID();
    const dataPath = join(directory, `data-${version}`);
    const temporaryManifest = join(directory, `manifest-${version}`);
    try { await mkdir(directory, { recursive: true, mode: 0o700 }); }
    catch { throw new StorageError('Io'); }
    let installed = false;
    try {
      const file = await open(dataPath, 'wx', 0o600);
      const digest = createHash('sha256');
      let size = 0;
      try {
        for await (const block of content) {
          if (!(block instanceof Uint8Array) || block.byteLength > options.size - size) {
            throw new StorageError('InvalidInput');
          }
          digest.update(block);
          let offset = 0;
          while (offset < block.byteLength) {
            const written = await file.write(block, offset, block.byteLength - offset);
            if (!written.bytesWritten) throw new StorageError('Io');
            offset += written.bytesWritten;
          }
          size += block.byteLength;
        }
        if (size !== options.size) throw new StorageError('InvalidInput');
        await file.sync();
      } finally { await file.close(); }
      const manifest: Manifest = {
        version, size, contentType: options.contentType, etag: digest.digest('hex'),
        lastModified: new Date().toISOString(), metadata: { ...options.metadata },
      };
      const manifestFile = await open(temporaryManifest, 'wx', 0o600);
      try { await manifestFile.writeFile(JSON.stringify(manifest)); await manifestFile.sync(); }
      finally { await manifestFile.close(); }
      const destination = join(directory, 'manifest.json');
      if (options.mode === 'create_only') {
        try { await link(temporaryManifest, destination); }
        catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') throw new StorageError('Conflict');
          throw error;
        }
        await unlink(temporaryManifest);
      } else await rename(temporaryManifest, destination);
      installed = true;
      return this.metadata(key, manifest);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Io');
    } finally {
      if (!installed) {
        await Promise.allSettled([rm(dataPath, { force: true }), rm(temporaryManifest, { force: true })]);
      }
    }
  }

  async get(_invocation: StorageInvocation, key: ObjectKey): Promise<ObjectContent> {
    const hash = hashKey(key);
    const manifest = await this.manifest(hash);
    if (!manifest) throw new StorageError('NotFound');
    const path = join(this.directory(hash), `data-${manifest.version}`);
    try { if ((await stat(path)).size !== manifest.size) throw new StorageError('Unavailable'); }
    catch (error) { throw error instanceof StorageError ? error : new StorageError('Unavailable'); }
    const stream = createReadStream(path);
    return new ObjectContent(this.metadata(key, manifest), stream as unknown as ObjectByteStream,
      async () => { stream.destroy(); });
  }

  async head(_invocation: StorageInvocation, key: ObjectKey): Promise<ObjectMetadata | undefined> {
    const manifest = await this.manifest(hashKey(key));
    return manifest ? this.metadata(key, manifest) : undefined;
  }

  async delete(_invocation: StorageInvocation, key: ObjectKey): Promise<void> {
    try { await unlink(join(this.directory(hashKey(key)), 'manifest.json')); }
    catch (error) { if (!isMissing(error)) throw new StorageError('Io'); }
  }

  private ticket(value: Ticket): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secret, nonce);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
  }

  private unticket(token: string): Ticket | undefined {
    try {
      const bytes = Buffer.from(token, 'base64url');
      if (bytes.length < 29 || bytes.length > 4096 || bytes.toString('base64url') !== token) return undefined;
      const cipher = createDecipheriv('aes-256-gcm', this.secret, bytes.subarray(0, 12));
      cipher.setAuthTag(bytes.subarray(12, 28));
      const ticket = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8')) as Ticket;
      if (!/^[0-9a-f]{64}$/.test(ticket.hash) || !/^[0-9a-f-]{36}$/.test(ticket.version) ||
          !Number.isSafeInteger(ticket.expiresAt) || ticket.expiresAt <= Date.now() ||
          (ticket.disposition !== undefined &&
            (typeof ticket.disposition !== 'string' || /[^\x20-\x7e]/.test(ticket.disposition)))) return undefined;
      return ticket;
    } catch { return undefined; }
  }

  async getReadUrl(_invocation: StorageInvocation, key: ObjectKey,
                   options: ObjectReadUrlOptions): Promise<ObjectReadUrl> {
    if (!this.publicBaseUrl) throw new StorageError('NotConfigured');
    const hash = hashKey(key);
    const manifest = await this.manifest(hash);
    if (!manifest) throw new StorageError('NotFound');
    try {
      if ((await stat(join(this.directory(hash), `data-${manifest.version}`))).size !== manifest.size) {
        throw new StorageError('Unavailable');
      }
    } catch (error) { throw error instanceof StorageError ? error : new StorageError('Unavailable'); }
    const expiresAt = new Date(Date.now() + options.seconds * 1000);
    const token = this.ticket({ hash, version: manifest.version,
      expiresAt: expiresAt.getTime(), disposition: options.contentDisposition });
    return new ObjectReadUrl(`${this.publicBaseUrl}/objects/${token}`, expiresAt);
  }

  /** Explicit host action. The returned URL can be advertised through a trusted reverse proxy. */
  async start(host = '127.0.0.1', port = 0, advertisedBaseUrl?: string): Promise<string> {
    if (this.server || !Number.isSafeInteger(port) || port < 0 || port > 65535) {
      throw new StorageError('InvalidInput');
    }
    try { await mkdir(this.root, { recursive: true, mode: 0o700 }); }
    catch { throw new StorageError('Io'); }
    const server = createServer((request, response) => { void this.serve(request, response); });
    try {
      server.listen(port, host);
      await once(server, 'listening');
      const address = server.address() as AddressInfo;
      const base = advertisedBaseUrl ?? `http://${host}:${address.port}`;
      const url = new URL(base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
          url.search || url.hash || url.pathname !== '/' || !url.hostname) {
        throw new StorageError('InvalidInput');
      }
      this.server = server;
      this.publicBaseUrl = url.origin;
      return this.publicBaseUrl;
    } catch (error) {
      server.close();
      throw error instanceof StorageError ? error : new StorageError('Unavailable');
    }
  }

  async close(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    this.publicBaseUrl = undefined;
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  }

  private async serve(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
      const path = request.url?.split('?')[0] ?? '';
      const match = /^\/objects\/([A-Za-z0-9_-]+)$/.exec(path);
      const ticket = match ? this.unticket(match[1]) : undefined;
      if (!ticket) { response.writeHead(404); response.end(); return; }
      const manifest = await this.manifest(ticket.hash);
      if (!manifest || manifest.version !== ticket.version) { response.writeHead(404); response.end(); return; }
      const dataPath = join(this.directory(ticket.hash), `data-${manifest.version}`);
      try { if ((await stat(dataPath)).size !== manifest.size) throw new Error('file size changed'); }
      catch { response.writeHead(404); response.end(); return; }
      const size = manifest.size;
      let start = 0, end = size - 1, partial = false;
      const range = request.headers.range;
      if (range !== undefined) {
        const bytes = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!bytes || size === 0 || (!bytes[1] && !bytes[2])) {
          response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return;
        }
        if (!bytes[1]) {
          const suffix = Number(bytes[2]);
          if (!Number.isSafeInteger(suffix) || suffix < 1) {
            response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return;
          }
          start = Math.max(0, size - suffix);
        } else {
          start = Number(bytes[1]);
          if (bytes[2]) end = Number(bytes[2]);
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size ||
            end < start) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return; }
        end = Math.min(end, size - 1);
        partial = true;
      }
      const headers: Record<string, string | number> = {
        'Content-Type': manifest.contentType, 'Content-Length': partial ? end - start + 1 : size,
        'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff', ETag: `"${manifest.etag}"`,
        'Last-Modified': new Date(manifest.lastModified).toUTCString(),
      };
      if (ticket.disposition) headers['Content-Disposition'] = ticket.disposition;
      if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
      response.writeHead(partial ? 206 : 200, headers);
      if (request.method === 'HEAD' || size === 0) { response.end(); return; }
      const stream = createReadStream(dataPath, { start, end });
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch { if (!response.headersSent) response.writeHead(500); response.end(); }
  }

  toString(): string { return 'FileObjectStorage[configuration=masked]'; }
  [Symbol.for('nodejs.util.inspect.custom')](): string { return this.toString(); }
}
