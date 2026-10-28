import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, constants, lstatSync, realpathSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
import { OfficeBlobContentVerifier } from './content-office';

export type LegacyOfficeVerifierLimits = Readonly<{
  maximumInputBytes: number;
  maximumConvertedBytes: number;
  concurrentVerifications: number;
}>;

const DEFAULT_LIMITS: LegacyOfficeVerifierLimits = Object.freeze({
  maximumInputBytes: 32 * 1024 * 1024,
  maximumConvertedBytes: 10 * 1024 * 1024,
  concurrentVerifications: 2,
});
const MIME: Readonly<Record<string, string>> = Object.freeze({
  doc: 'application/msword', xls: 'application/vnd.ms-excel',
});
const CFB = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function validContainer(data: Buffer): boolean {
  if (data.length < 1024 || !data.subarray(0, 8).equals(CFB) ||
      data.readUInt16LE(28) !== 0xfffe || data.readUInt16LE(32) !== 6) return false;
  const major = data.readUInt16LE(26);
  const shift = data.readUInt16LE(30);
  if (!(major === 3 && shift === 9 || major === 4 && shift === 12)) return false;
  const sectorSize = 2 ** shift;
  if (data.length % sectorSize || data.length < 2 * sectorSize) return false;
  const sectors = data.length / sectorSize - 1;
  const fatCount = data.readUInt32LE(44);
  const directory = data.readUInt32LE(48);
  const miniFat = data.readUInt32LE(60);
  const miniFatCount = data.readUInt32LE(64);
  const difat = data.readUInt32LE(68);
  const difatCount = data.readUInt32LE(72);
  return fatCount > 0 && fatCount <= sectors && directory < sectors &&
    data.readUInt32LE(56) === 4096 && miniFatCount <= sectors &&
    (miniFatCount === 0 || miniFat < sectors) && difatCount <= sectors &&
    (difatCount === 0 || difat < sectors);
}

/** Optional Linux DOC/XLS conversion adapter; the host provisions trusted tools and scratch. */
export class LegacyOfficeBlobContentVerifier implements BlobContentVerifier {
  private active = 0;
  private readonly limits: LegacyOfficeVerifierLimits;
  private readonly packageVerifier: OfficeBlobContentVerifier;

  constructor(readonly sofficePath: string, readonly bwrapPath: string,
              readonly prlimitPath: string, readonly scratchRoot: string,
              limits: LegacyOfficeVerifierLimits = DEFAULT_LIMITS) {
    if (![sofficePath, bwrapPath, prlimitPath, scratchRoot].every(value =>
      typeof value === 'string' && isAbsolute(value)) ||
      normalize(scratchRoot) !== scratchRoot || !limits ||
      !Number.isSafeInteger(limits.maximumInputBytes) ||
      limits.maximumInputBytes < 1 || limits.maximumInputBytes > 100 * 1024 * 1024 ||
      !Number.isSafeInteger(limits.maximumConvertedBytes) ||
      limits.maximumConvertedBytes < 1 || limits.maximumConvertedBytes > 10 * 1024 * 1024 ||
      !Number.isSafeInteger(limits.concurrentVerifications) ||
      limits.concurrentVerifications < 1 || limits.concurrentVerifications > 32) {
      throw new Error('BLOB_POLICY_INVALID');
    }
    this.limits = Object.freeze({ ...limits });
    this.packageVerifier = new OfficeBlobContentVerifier({
      maximumInputBytes: limits.maximumConvertedBytes,
      maximumDecodedBytes: 100 * 1024 * 1024,
      maximumParts: 10000,
      maximumElements: 2000000,
      concurrentVerifications: limits.concurrentVerifications,
    });
  }

  get supportedExtensions(): readonly string[] { return ['doc', 'xls']; }

  async validateReady(): Promise<void> {
    if (process.platform !== 'linux') throw new Error('BLOB_CAPABILITY_MISSING');
    try {
      for (const binary of [this.sofficePath, this.bwrapPath, this.prlimitPath]) {
        if (!statSync(binary).isFile()) throw new Error('not a file');
        accessSync(binary, constants.X_OK);
      }
      const root = lstatSync(this.scratchRoot);
      if (!root.isDirectory() || (root.mode & 0o7777) !== 0o700 ||
          root.uid !== process.getuid?.() || realpathSync(this.scratchRoot) !== this.scratchRoot) {
        throw new Error('unsafe scratch');
      }
      await this.packageVerifier.validateReady();
    } catch { throw new Error('BLOB_CAPABILITY_MISSING'); }
  }

  private async run(job: string, extension: string): Promise<void> {
    const output = join(job, 'output');
    const source = join(job, `source.${extension}`);
    const profile = pathToFileURL(join(job, 'profile')).href;
    const converted = extension + 'x';
    const args = ['--cpu=20:20', '--as=1073741824:1073741824',
      '--fsize=10485760:10485760', '--', this.bwrapPath,
      '--unshare-net', '--unshare-pid', '--die-with-parent',
      '--ro-bind', '/usr', '/usr', '--ro-bind', '/lib', '/lib',
      '--ro-bind', '/lib64', '/lib64', '--symlink', 'usr/bin', '/bin',
      '--ro-bind', '/etc', '/etc', '--dev', '/dev', '--proc', '/proc',
      '--dir', '/tmp', '--bind', job, job, '--clearenv',
      '--setenv', 'LC_ALL', 'C', '--setenv', 'PATH', '/usr/bin:/bin',
      '--setenv', 'HOME', job, '--setenv', 'TMPDIR', job,
      '--', this.sofficePath, `-env:UserInstallation=${profile}`,
      '--headless', '--nodefault', '--norestore', '--nolockcheck',
      '--convert-to', converted, '--outdir', output, source];
    await new Promise<void>((resolve, reject) => {
      let child;
      try {
        child = spawn(this.prlimitPath, args, { cwd: '/', detached: true,
          stdio: ['ignore', 'pipe', 'pipe'], env: { LC_ALL: 'C', PATH: '/usr/bin:/bin' },
          windowsHide: true });
      } catch { reject(new Error('BLOB_CAPABILITY_MISSING')); return; }
      let failed = false;
      let settled = false;
      const kill = () => {
        failed = true;
        if (child.pid) {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ }
        }
      };
      const timer = setTimeout(kill, 30000);
      const finish = (code: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code === 0 && !failed) resolve();
        else reject(new Error('BLOB_FORMAT_NOT_ALLOWED'));
      };
      for (const pipe of [child.stdout, child.stderr]) {
        let count = 0;
        pipe.on('data', (part: Buffer) => {
          count += part.length;
          if (count > 4096) kill();
        });
      }
      child.on('error', () => finish(null));
      child.on('close', finish);
    });
  }

  private async convert(data: Buffer, extension: string): Promise<Buffer> {
    let job: string;
    try { job = await mkdtemp(join(this.scratchRoot, 'legacy-office-')); }
    catch { throw new Error('BLOB_STORE_FAILED'); }
    try {
      await mkdir(join(job, 'output'), { mode: 0o700 });
      await mkdir(join(job, 'profile'), { mode: 0o700 });
      await writeFile(join(job, `source.${extension}`), data, { mode: 0o600, flag: 'wx' });
      await this.run(job, extension);
      const entries = await readdir(join(job, 'output'), { withFileTypes: true });
      if (entries.length !== 1 || entries[0].name !== `source.${extension}x` ||
          !entries[0].isFile()) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
      const path = join(job, 'output', entries[0].name);
      const size = lstatSync(path).size;
      if (size < 1 || size > this.limits.maximumConvertedBytes) {
        throw new Error('BLOB_FORMAT_NOT_ALLOWED');
      }
      const result = await readFile(path);
      if (result.length !== size) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
      return result;
    } catch (error) {
      if (error instanceof Error && ['BLOB_FORMAT_NOT_ALLOWED', 'BLOB_CAPABILITY_MISSING'].includes(error.message)) {
        throw error;
      }
      throw new Error('BLOB_STORE_FAILED');
    } finally {
      await rm(job, { recursive: true, force: true }).catch(() => {});
    }
  }

  async verify(content: ObjectByteStream, extension: string,
               maximumBytes: number): Promise<BlobVerifiedContent> {
    if (!Object.prototype.hasOwnProperty.call(MIME, extension)) {
      throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    }
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
      throw new Error('BLOB_POLICY_INVALID');
    }
    if (this.active >= this.limits.concurrentVerifications) {
      throw new Error('BLOB_VERIFICATION_BUSY');
    }
    this.active += 1;
    try {
      await this.validateReady();
      const bound = Math.min(maximumBytes, this.limits.maximumInputBytes);
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for await (const chunk of content) {
          if (!(chunk instanceof Uint8Array)) throw new Error('BLOB_STORE_FAILED');
          if (chunk.byteLength > bound - size) throw new Error('BLOB_SIZE_EXCEEDED');
          chunks.push(Buffer.from(chunk));
          size += chunk.byteLength;
        }
      } catch (error) {
        if (error instanceof Error && ['BLOB_SIZE_EXCEEDED', 'BLOB_STORE_FAILED'].includes(error.message)) {
          throw error;
        }
        throw new Error('BLOB_STORE_FAILED');
      }
      const data = Buffer.concat(chunks, size);
      if (!validContainer(data)) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
      const converted = await this.convert(data, extension);
      try {
        await this.packageVerifier.verify((async function* () { yield converted; })(),
          extension + 'x', converted.length);
      } catch { throw new Error('BLOB_FORMAT_NOT_ALLOWED'); }
      return Object.freeze({ sizeBytes: size,
        sha256: createHash('sha256').update(data).digest('hex'),
        contentType: MIME[extension] });
    } finally { this.active -= 1; }
  }
}
