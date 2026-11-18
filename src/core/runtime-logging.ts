import type * as NodeFS from 'node:fs';
import type * as NodePath from 'node:path';
import type * as NodeURL from 'node:url';
import type {RuntimeOperation, RuntimeTelemetry, RuntimeTelemetryScope} from './telemetry';
import {runtimeErrorCategory, startRuntimeOperation} from './telemetry';

export type RuntimeLogLevel = 'INFO' | 'WARN' | 'ERROR';
export type RuntimeLogFormat = 'json' | 'human';
export type RuntimeLogRecord = Readonly<Record<string, unknown> & {
  timestamp: string; level: RuntimeLogLevel; log_name: string; runtime: 'typescript'; event: string; message: string;
}>;
export interface RuntimeLoggingOptions {
  logName?: string;
  logFormat?: RuntimeLogFormat;
  modelNames?: readonly string[];
  environment?: Readonly<Record<string, string | undefined>>;
  workingDirectory?: string;
  platform?: 'server' | 'browser';
}
export class RuntimeLoggingError extends Error {
  constructor() { super('Runtime logging initialization failed'); this.name = 'RuntimeLoggingError'; }
}

type Builtins = {fs: typeof NodeFS; path: typeof NodePath; url: typeof NodeURL};
const encoder = new TextEncoder();
const defaults = new Map<string, RuntimeLogger>();
let applicationLogger: RuntimeLogger | undefined;
const settings = ['TEAQL_DOMAIN', 'TEAQL_LOG_ENDPOINT', 'TEAQL_LOG_MAX_SIZE', 'TEAQL_LOG_MAX_FILES', 'TEAQL_LOG_FORMAT'] as const;
const eventFields = new Set(['timestamp', 'level', 'log_name', 'runtime', 'event', 'message']);
const humanHeader = /^\d{4}-\d\d-\d\dT\S+(?:Z|\+00:00) \[TeaQL\]\[.*\]\[(?:INFO|WARN|ERROR)\] .+ runtime=\S+$/u;

function serverPlatform(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node
    && !(typeof window !== 'undefined' && typeof window.document !== 'undefined');
}
function builtins(): Builtins {
  // Type-only Node imports above disappear from browser output. Published ESM
  // server entries provide createRequire; CommonJS uses its native loader.
  const load = typeof require === 'function' ? require :
    typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function'
      ? (name: string) => (process as any).getBuiltinModule(name) : undefined;
  if (!load) throw new RuntimeLoggingError();
  return {fs: load('node:fs'), path: load('node:path'), url: load('node:url')};
}
function environment(): Readonly<Record<string, string | undefined>> {
  const values: Record<string, string | undefined> = {};
  for (const key of settings) values[key] = process.env[key];
  return values;
}
function validName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name !== '.' && name !== '..'
    && !/[<>:"/\\|?*\u0000-\u001f\u007f]/u.test(name) && !/[. ]$/u.test(name)
    && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu.test(name)
    && !/[\uD800-\uDFFF]/u.test(name) && encoder.encode(name).byteLength <= 255;
}
export function parseRuntimeLogSize(value: string): bigint {
  const match = /^([0-9]+)\s*(K|KB|M|MB|G|GB)?$/u.exec(value.trim().toUpperCase());
  if (!match) throw new RuntimeLoggingError();
  const multiplier = ({K: 1024n, KB: 1024n, M: 1048576n, MB: 1048576n, G: 1073741824n, GB: 1073741824n} as Record<string, bigint>)[match[2]] ?? 1n;
  const result = BigInt(match[1]) * multiplier;
  if (result <= 0n || result > 9223372036854775807n) throw new RuntimeLoggingError();
  return result;
}
function json(record: unknown): string {
  return JSON.stringify(record, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
}
function humanText(value: string, escapeBackslash: boolean): string {
  return value.replace(/[\\\u0000-\u001f\u007f-\u009f\u2028\u2029\ud800-\udfff]/gu, c =>
    c === '\\' ? escapeBackslash ? '\\\\' : c : '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
function prefix(record: RuntimeLogRecord): string {
  return `[TeaQL][${humanText(record.log_name, true)}][${record.level}] ${humanText(record.event, true)}`;
}
function humanRecord(record: RuntimeLogRecord): string {
  let output = `${humanText(record.timestamp, true)} ${prefix(record)} runtime=${record.runtime}\n  ${humanText(record.message, true)}\n`;
  for (const key of Object.keys(record).filter(key => !eventFields.has(key)).sort()) {
    const value = record[key];
    if (key === 'sql' && typeof value === 'string') {
      output += '  sql:\n' + value.split('\n').map(line => '    ' + humanText(line, true) + '\n').join('');
    } else output += '  ' + humanText(key, true) + '=' + humanText(json(value), false) + '\n';
  }
  return output;
}
function diagnosticFailure(name: string, code: string, server: boolean): void {
  const record: RuntimeLogRecord = {timestamp: new Date().toISOString(), level: 'ERROR', log_name: name, runtime: 'typescript',
    event: 'logging.failure', message: 'Runtime logging failed', error_code: code};
  try {
    if (server) builtins().fs.writeSync(2, json(record) + '\n');
    else console.error(`[TeaQL][${name}][ERROR] logging.failure`, record);
  } catch { /* Logging errors never replace the business outcome. */ }
}

/** Resolve and open once during application composition, then share with contexts. */
export class RuntimeLogger {
  readonly logName: string;
  readonly logFormat: RuntimeLogFormat;
  readonly path?: string;
  readonly maxSize: bigint;
  readonly maxFiles: number;
  private readonly server: boolean;
  private readonly native?: Builtins;
  private readonly stream?: string;

  constructor(options: RuntimeLoggingOptions = {}) {
    this.server = options.platform === 'server' || options.platform !== 'browser' && serverPlatform();
    let validated = 'teaql';
    try {
      // Browsers never read server environment variables, including TEAQL_DOMAIN.
      const env = this.server ? options.environment ?? environment() : {};
      const name = options.logName !== undefined ? options.logName : env.TEAQL_DOMAIN ||
        (options.modelNames?.length === 1 ? options.modelNames[0] : 'teaql');
      if (!validName(name)) throw new RuntimeLoggingError();
      this.logName = validated = name;
      const format = options.logFormat !== undefined ? options.logFormat : env.TEAQL_LOG_FORMAT ?? 'json';
      if (format !== 'json' && format !== 'human') throw new RuntimeLoggingError();
      this.logFormat = format;
      this.maxSize = parseRuntimeLogSize(env.TEAQL_LOG_MAX_SIZE ?? '50M');
      const retention = env.TEAQL_LOG_MAX_FILES ?? '7';
      if (!/^[0-9]+$/u.test(retention) || BigInt(retention) > 2147483647n) throw new RuntimeLoggingError();
      this.maxFiles = Number(retention);
      if (this.server) {
        this.native = builtins();
        const {fs, path, url} = this.native;
        let endpoint = env.TEAQL_LOG_ENDPOINT || `./logs/${name}.log`;
        if (['stdout', 'stderr', '-'].includes(endpoint)) this.stream = endpoint;
        else {
          if (endpoint.startsWith('file:')) {
            const parsed = new URL(endpoint);
            if (parsed.hostname && parsed.hostname !== 'localhost' || parsed.search || parsed.hash) throw new RuntimeLoggingError();
            endpoint = url.fileURLToPath(parsed);
          } else if (endpoint.includes('://')) throw new RuntimeLoggingError();
          let destination = path.resolve(options.workingDirectory ?? process.cwd(), endpoint);
          fs.mkdirSync(path.dirname(destination), {recursive: true});
          destination = path.join(fs.realpathSync(path.dirname(destination)), path.basename(destination));
          try { destination = fs.realpathSync(destination); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          this.path = destination;
        }
      }
      this.emit(this.record('INFO', 'runtime.start', 'TeaQL runtime started', {}));
    } catch {
      diagnosticFailure(validated, 'log_destination_unavailable', this.server);
      throw new RuntimeLoggingError();
    }
  }

  private record(level: RuntimeLogLevel, event: string, message: string, fields: Readonly<Record<string, unknown>>): RuntimeLogRecord {
    return Object.freeze({...fields, timestamp: new Date().toISOString(), level, log_name: this.logName,
      runtime: 'typescript' as const, event, message});
  }
  /** Only already-redacted SQL, audit and free-text projections belong here. */
  write(level: RuntimeLogLevel, event: string, message: string, safeFields: Readonly<Record<string, unknown>> = {}): boolean {
    try {
      if (!['INFO', 'WARN', 'ERROR'].includes(level)) throw new Error();
      this.emit(this.record(level, event, message, safeFields)); return true;
    } catch { diagnosticFailure(this.logName, 'log_write_failed', this.server); return false; }
  }

  private archives(): Array<{number: number; path: string}> {
    const {fs, path} = this.native!;
    const prefix = path.basename(this.path!) + '.';
    return fs.readdirSync(path.dirname(this.path!)).filter(name => name.startsWith(prefix) && /^[1-9][0-9]*$/u.test(name.slice(prefix.length)))
      .map(name => {
        const number = Number(name.slice(prefix.length)); const file = path.join(path.dirname(this.path!), name);
        if (!Number.isSafeInteger(number) || !fs.lstatSync(file).isFile()) throw new Error();
        return {number, path: file};
      }).sort((a, b) => b.number - a.number);
  }
  private emit(record: RuntimeLogRecord): void {
    if (!this.server) {
      const method = record.level === 'WARN' ? 'warn' : record.level === 'ERROR' ? 'error' : 'info';
      console[method](this.logFormat === 'human' ? humanRecord(JSON.parse(json(record))) : prefix(record), record); return;
    }
    const {fs} = this.native!;
    const encoded = json(record);
    const bytes = encoder.encode(this.logFormat === 'human' ? humanRecord(JSON.parse(encoded)) : encoded + '\n');
    if (this.stream) { fs.writeSync(this.stream === 'stderr' ? 2 : 1, bytes); return; }
    const lockPath = this.path + '.lock';
    const deadline = Date.now() + 30_000;
    let ownership: number;
    while (true) {
      try { ownership = fs.openSync(lockPath, 'wx', 0o600); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || Date.now() >= deadline) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      }
    }
    try {
      this.checkPresentation(); // No archive or active-file mutation on a mismatch.
      const archives = this.archives();
      for (const archive of archives) if (archive.number > this.maxFiles) fs.unlinkSync(archive.path);
      let active: NodeFS.BigIntStats | undefined;
      try { active = fs.statSync(this.path!, {bigint: true}); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (active) {
        if (!active.isFile()) throw new Error();
        if (active.size > 0n && (active.size + BigInt(bytes.byteLength) > this.maxSize || active.mtime.toISOString().slice(0, 10) !== new Date().toISOString().slice(0, 10))) {
          for (const archive of archives.filter(item => item.number <= this.maxFiles))
            if (archive.number === this.maxFiles) fs.unlinkSync(archive.path);
            else fs.renameSync(archive.path, this.path + '.' + (archive.number + 1));
          if (this.maxFiles === 0) fs.unlinkSync(this.path!); else fs.renameSync(this.path!, this.path + '.1');
        }
      }
      // Reopen inside ownership so every process follows another's rotation.
      const output = fs.openSync(this.path!, 'a', 0o600);
      try {
        let offset = 0;
        while (offset < bytes.byteLength) {
          const count = fs.writeSync(output, bytes, offset, bytes.byteLength - offset);
          if (count <= 0) throw new Error(); offset += count;
        }
      } finally { fs.closeSync(output); }
    } finally { try { fs.closeSync(ownership); } finally { fs.unlinkSync(lockPath); } }
  }

  private checkPresentation(): void {
    const {fs} = this.native!;
    let active: NodeFS.Stats;
    try { active = fs.statSync(this.path!); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (!active.isFile()) throw new RuntimeLoggingError();
    if (active.size === 0) return;
    const input = fs.openSync(this.path!, 'r');
    let first: string;
    try {
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = new Uint8Array(4096);
        const count = fs.readSync(input, chunk, 0, chunk.length, null);
        if (!count) throw new RuntimeLoggingError();
        const newline = chunk.subarray(0, count).indexOf(10);
        const bytes = chunk.subarray(0, newline < 0 ? count : newline);
        chunks.push(bytes); size += bytes.length;
        if (newline >= 0) break;
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      first = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    } finally { fs.closeSync(input); }
    if (this.logFormat === 'human' && humanHeader.test(first)) return;
    if (this.logFormat === 'json') {
      try {
        const record = JSON.parse(first);
        if (record && !Array.isArray(record) && [...eventFields].every(key => typeof record[key] === 'string')
          && ['INFO', 'WARN', 'ERROR'].includes(record.level)) return;
      } catch { /* Reject incompatible content before rotation. */ }
    }
    throw new RuntimeLoggingError();
  }
}

export function defaultRuntimeLogger(): RuntimeLogger {
  if (applicationLogger) return applicationLogger;
  const server = serverPlatform();
  const env = server ? environment() : {};
  const cwd = server ? process.cwd() : '';
  const key = json([server, cwd, env]);
  let logger = defaults.get(key);
  if (!logger) { logger = new RuntimeLogger({environment: env, workingDirectory: cwd}); defaults.set(key, logger); }
  return logger;
}

/** Configure the shared application destination before constructing contexts. */
export function initializeRuntimeLogging(options: RuntimeLoggingOptions = {}): RuntimeLogger {
  if (applicationLogger || defaults.size) throw new RuntimeLoggingError();
  applicationLogger = new RuntimeLogger(options);
  return applicationLogger;
}

export function loggingTelemetry(delegate: RuntimeTelemetry | undefined, logger: RuntimeLogger): RuntimeTelemetry {
  return {
    start(operation: RuntimeOperation): RuntimeTelemetryScope {
      const original = startRuntimeOperation(delegate, operation);
      let ended = false;
      function finish(error?: unknown): boolean {
        if (ended) return false; ended = true;
        const category = error === undefined ? undefined : error instanceof Error &&
          /^(CheckException|RequestIntentError|MutationIntentError)$/u.test(error.constructor.name) ? 'validation' :
          error instanceof Error && error.constructor.name === 'MutationPolicyError' ? 'authorization' : runtimeErrorCategory(error);
        const outcome = error === undefined ? 'success' : 'failure';
        const level = error === undefined ? 'INFO' : ['validation', 'authorization', 'conflict'].includes(category!) ? 'WARN' : 'ERROR';
        logger.write(level, `operation.${outcome}`, `TeaQL operation ${outcome}`, {
          category: operation.family.toUpperCase(), outcome, error_code: category, trace_id: original.correlation?.()?.traceId,
        });
        return true;
      }
      return {...original,
        success(attributes) { if (finish()) original.success(attributes); },
        failure(error) { if (finish(error)) original.failure(error); },
      };
    },
    recordsSQLDiagnostics: () => delegate?.recordsSQLDiagnostics?.() ?? false,
    recordDiagnostic: event => delegate?.recordDiagnostic?.(event),
    inject: carrier => delegate?.inject?.(carrier),
    flush: () => delegate?.flush?.(),
    shutdown: () => delegate?.shutdown?.(),
  };
}
