import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  BrowserSQLiteOpenOptions,
  BrowserSQLiteRequest,
  BrowserSQLiteResponse,
} from './browser-sqlite-protocol';

type WorkerScope = {
  postMessage(message: BrowserSQLiteResponse): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<BrowserSQLiteRequest>) => void): void;
};

export type BrowserSQLiteWorkerOptions = Readonly<{
  scope?: WorkerScope;
  /** Bundler-resolved URL for @sqlite.org/sqlite-wasm/sqlite3.wasm. */
  wasmUrl?: string;
}>;

type SQLiteDatabase = {
  exec(options: Record<string, unknown>): unknown;
  exec(sql: string): unknown;
  changes(total?: boolean): number;
  close(): void;
};

type SQLiteModule = {
  oo1: {
    DB: new (filename?: string, flags?: string) => SQLiteDatabase;
    OpfsDb?: new (filename: string, flags?: string) => SQLiteDatabase;
  };
};

/**
 * Installs the TeaQL SQLite/WASM RPC loop in the current dedicated worker.
 * Call this once from an application-owned worker entry point.
 */
export function startBrowserSQLiteWorker(options: BrowserSQLiteWorkerOptions = {}): void {
  const scope = options.scope ?? globalThis as unknown as WorkerScope;
  let sqlitePromise: Promise<SQLiteModule> | undefined;
  let database: SQLiteDatabase | undefined;
  let openOptions: Required<BrowserSQLiteOpenOptions> | undefined;
  let tail: Promise<void> = Promise.resolve();

  const sqlite = (): Promise<SQLiteModule> => {
    if (!sqlitePromise) {
      const initialize = sqlite3InitModule as unknown as (
        config?: { locateFile(file: string): string },
      ) => Promise<SQLiteModule>;
      sqlitePromise = initialize(options.wasmUrl
        ? { locateFile: (file: string) => file.endsWith('.wasm') ? options.wasmUrl! : file }
        : undefined);
    }
    return sqlitePromise;
  };

  const open = async (options: BrowserSQLiteOpenOptions = {}): Promise<void> => {
    database?.close();
    const storage = options.storage ?? 'memory';
    const databaseName = options.databaseName ?? 'teaql-browser.sqlite3';
    const module = await sqlite();
    if (storage === 'opfs') {
      if (!module.oo1.OpfsDb) {
        const error = new Error(
          'OPFS SQLite is unavailable. Serve COOP/COEP headers and use a compatible browser.',
        );
        error.name = 'BrowserSQLiteStorageUnavailableError';
        throw error;
      }
      database = new module.oo1.OpfsDb(`/${databaseName}`, 'c');
    } else {
      database = new module.oo1.DB(':memory:', 'ct');
    }
    openOptions = { storage, databaseName };
    database.exec('PRAGMA foreign_keys = ON');
  };

  const requireDatabase = (): SQLiteDatabase => {
    if (!database) throw new Error('Browser SQLite database is not open');
    return database;
  };

  const query = (sql: string, values: unknown[] = []): unknown => {
    if (typeof sql !== 'string' || !sql.trim()) throw new TypeError('SQL is required');
    if (!Array.isArray(values)) throw new TypeError('SQL bind values must be an array');
    const db = requireDatabase();
    const rows = db.exec({
      sql,
      bind: values,
      rowMode: 'object',
      returnValue: 'resultRows',
    }) as unknown[];
    const mutation = /^\s*(?:insert|update|delete|replace)\b/i.test(sql);
    return { rows, rowCount: rows.length || (mutation ? Number(db.changes()) : 0) };
  };

  const reset = async (): Promise<void> => {
    const db = requireDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
    const rows = db.exec({
      sql: "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      rowMode: 'object',
      returnValue: 'resultRows',
    }) as Array<{ name: unknown }>;
    for (const row of rows) {
      const name = String(row.name).replace(/"/g, '""');
      db.exec(`DROP TABLE IF EXISTS "${name}"`);
    }
    db.exec('PRAGMA foreign_keys = ON');
    if (!openOptions) throw new Error('Browser SQLite database is not open');
  };

  scope.addEventListener('message', event => {
    const request = event.data;
    if (!request || request.type !== 'teaql-browser-sqlite-request') return;
    tail = tail.then(async () => {
      try {
        let result: unknown;
        if (request.operation === 'open') result = await open(request.payload as BrowserSQLiteOpenOptions);
        else if (request.operation === 'query') {
          result = query(String(request.payload?.sql ?? ''), (request.payload?.values ?? []) as unknown[]);
        } else if (request.operation === 'reset') result = await reset();
        else if (request.operation === 'close') { database?.close(); database = undefined; }
        else throw new Error(`Unsupported Browser SQLite operation: ${String(request.operation)}`);
        scope.postMessage({
          type: 'teaql-browser-sqlite-response', requestId: request.requestId, result,
        });
      } catch (value) {
        const error = value instanceof Error ? value : new Error(String(value));
        scope.postMessage({
          type: 'teaql-browser-sqlite-response', requestId: request.requestId,
          error: {
            name: error.name,
            message: error.message,
            code: (error as Error & { code?: string }).code,
          },
        });
      }
    });
  });
}
