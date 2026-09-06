import { UserContext } from '../core/context';
import {
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  canonicalRelationIndexes,
  ColumnSchema,
  ensureOptimisticIdFloor,
  EntitySchema,
  LogicalColumnType,
  SqlQueryResult,
  SqlSession,
  standardAggregateFunction,
  TeaQLSqlDriver,
} from './core';
import {
  BrowserSQLiteOpenOptions,
  BrowserSQLiteRequest,
  BrowserSQLiteResponse,
  BrowserSQLiteStorage,
  BrowserSQLiteWorkerLike,
} from './browser-sqlite-protocol';

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: Error): void;
};

class BrowserSQLiteTransport {
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private closed = false;

  private readonly onMessage = (event: MessageEvent<BrowserSQLiteResponse>): void => {
    const message = event.data;
    if (!message || message.type !== 'teaql-browser-sqlite-response') return;
    const pending = this.pending.get(message.requestId);
    if (!pending) return;
    this.pending.delete(message.requestId);
    if (message.error) {
      const error = new Error(message.error.message);
      error.name = message.error.name;
      if (message.error.code) (error as Error & { code?: string }).code = message.error.code;
      pending.reject(error);
    } else {
      pending.resolve(message.result);
    }
  };

  private readonly onError = (event: ErrorEvent): void => {
    const error = new Error(event.message || 'Browser SQLite worker failed');
    error.name = 'BrowserSQLiteWorkerError';
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  };

  constructor(private readonly worker: BrowserSQLiteWorkerLike) {
    worker.addEventListener('message', this.onMessage);
    worker.addEventListener('error', this.onError);
  }

  request<T>(operation: BrowserSQLiteRequest['operation'], payload?: Record<string, unknown>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Browser SQLite worker is closed'));
    const requestId = this.nextRequestId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve: value => resolve(value as T), reject });
      this.worker.postMessage({
        type: 'teaql-browser-sqlite-request', requestId, operation, payload,
      });
    });
  }

  async close(terminateWorker: boolean): Promise<void> {
    if (this.closed) return;
    try { await this.request<void>('close'); }
    finally {
      this.closed = true;
      this.worker.removeEventListener('message', this.onMessage);
      this.worker.removeEventListener('error', this.onError);
      if (terminateWorker) this.worker.terminate?.();
      const error = new Error('Browser SQLite worker is closed');
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    }
  }
}

class BrowserSQLiteSession implements SqlSession {
  constructor(private readonly transport: BrowserSQLiteTransport) {}

  query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    return this.transport.request<SqlQueryResult>('query', { sql, values });
  }
}

export type BrowserSQLiteDriverOptions = BrowserSQLiteOpenOptions & Readonly<{
  terminateWorkerOnClose?: boolean;
}>;

/** SQLite/WASM driver. SQL runs in the caller-supplied dedicated Web Worker. */
export class BrowserSQLiteDriver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  private accessTail: Promise<void> = Promise.resolve();

  private constructor(
    private readonly transport: BrowserSQLiteTransport,
    readonly options: Required<BrowserSQLiteDriverOptions>,
  ) {}

  static async open(
    worker: BrowserSQLiteWorkerLike,
    options: BrowserSQLiteDriverOptions = {},
  ): Promise<BrowserSQLiteDriver> {
    const normalized: Required<BrowserSQLiteDriverOptions> = {
      storage: options.storage ?? 'memory',
      databaseName: normalizeDatabaseName(options.databaseName ?? 'teaql-browser.sqlite3'),
      terminateWorkerOnClose: options.terminateWorkerOnClose ?? true,
    };
    const transport = new BrowserSQLiteTransport(worker);
    await transport.request('open', normalized);
    return new BrowserSQLiteDriver(transport, normalized);
  }

  identifier(value: string): string { return `"${assertSafeIdentifier(value)}"`; }
  placeholder(_index: number): string { return '?'; }
  contains(columnSql: string, placeholder: string): string {
    return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
  }
  aggregateFunction(name: string): string { return standardAggregateFunction(name); }

  encode(value: any, column?: ColumnSchema): any {
    if (value === null || value === undefined) return value;
    if (column?.logicalType === 'json' && typeof value !== 'string') return JSON.stringify(value);
    if (column?.logicalType === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    return value;
  }

  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    const predecessor = this.accessTail;
    let release!: () => void;
    this.accessTail = new Promise<void>(resolve => { release = resolve; });
    await predecessor;
    try { return await work(); }
    finally { release(); }
  }

  query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    return this.exclusive(() => this.transport.request<SqlQueryResult>('query', { sql, values }));
  }

  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    // The first browser profile intentionally buffers. True streaming is a later capability.
    const result = await this.query(sql, values);
    for (const row of result.rows) yield row;
  }

  transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      const session = new BrowserSQLiteSession(this.transport);
      await session.query('BEGIN IMMEDIATE');
      try {
        const result = await work(session);
        await session.query('COMMIT');
        return result;
      } catch (error) {
        try { await session.query('ROLLBACK'); } catch { /* preserve the business error */ }
        throw error;
      }
    });
  }

  async ensureSchema(schemas: Record<string, EntitySchema>): Promise<void> {
    for (const schema of Object.values(schemas)) {
      const table = this.identifier(schema.table);
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${table} (` +
        '"id" INTEGER PRIMARY KEY, "version" INTEGER NOT NULL)',
      );
      const columns = await this.query(`PRAGMA table_info(${table})`);
      const existing = new Set(columns.rows.map(row => String(row.name)));
      for (const [field, column] of Object.entries(schema.columns)) {
        if (field === 'id' || field === 'version' || existing.has(column.columnName)) continue;
        await this.query(
          `ALTER TABLE ${table} ADD COLUMN ` +
          `${this.identifier(column.columnName)} ${sqliteType(column.logicalType)}` +
          `${column.nullable === false ? ' NOT NULL' : ''}`,
        );
      }
    }
    for (const index of canonicalRelationIndexes(schemas)) {
      await this.query(
        `CREATE INDEX IF NOT EXISTS ${this.identifier(index.name)} ON ` +
        `${this.identifier(index.table)} (` +
        `${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`,
      );
    }
    await this.query(
      'CREATE TABLE IF NOT EXISTS teaql_id_space (' +
      'type_name TEXT PRIMARY KEY, current_level INTEGER NOT NULL)',
    );
  }

  async nextId(session: SqlSession, entity: string): Promise<string> {
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const current = await session.query(
        'SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?', [entity],
      );
      if (!current.rowCount) {
        try {
          const inserted = await session.query(
            'INSERT INTO teaql_id_space(type_name, current_level) VALUES (?, 1)', [entity],
          );
          if (inserted.rowCount === 1) return '1';
        } catch (error) {
          const winner = await session.query(
            'SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?', [entity],
          );
          if (!winner.rowCount) throw error;
        }
        continue;
      }
      const previous = Number(current.rows[0].id);
      const next = previous + 1;
      const updated = await session.query(
        'UPDATE teaql_id_space SET current_level = ? WHERE type_name = ? AND current_level = ?',
        [next, entity, previous],
      );
      if (updated.rowCount === 1) return String(next);
      if (updated.rowCount !== 0) {
        throw new Error(`ID space update for ${entity} changed ${updated.rowCount} rows`);
      }
    }
    throw new Error(`Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`);
  }

  ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void> {
    return ensureOptimisticIdFloor(session, index => this.placeholder(index), entity, floor);
  }

  reset(): Promise<void> {
    return this.exclusive(() => this.transport.request('reset', this.options));
  }

  close(): Promise<void> {
    return this.exclusive(() => this.transport.close(this.options.terminateWorkerOnClose));
  }
}

/** TeaQL SQL client for browser-local SQLite/WASM. */
export class BrowserSQLiteTeaQLClient extends AbstractSQLTeaQLClient {
  private constructor(private readonly browserDriver: BrowserSQLiteDriver,
                      schemas: Record<string, EntitySchema>) {
    super(browserDriver, schemas);
  }

  static async open(
    worker: BrowserSQLiteWorkerLike,
    schemas: Record<string, EntitySchema>,
    options: BrowserSQLiteDriverOptions = {},
  ): Promise<BrowserSQLiteTeaQLClient> {
    return new BrowserSQLiteTeaQLClient(await BrowserSQLiteDriver.open(worker, options), schemas);
  }

  get storage(): BrowserSQLiteStorage {
    return this.browserDriver.options.storage;
  }

  /** Drops browser-local data, then explicitly reconciles schema and generated bootstrap data. */
  async reset(context: UserContext): Promise<void> {
    await this.browserDriver.reset();
    this.invalidateSchemaState();
    await context.ensureSchema();
  }
}

function sqliteType(type: LogicalColumnType): string {
  const types: Record<LogicalColumnType, string> = {
    boolean: 'INTEGER', double: 'REAL', decimal: 'NUMERIC', date: 'TEXT',
    datetime: 'TEXT', json: 'TEXT', integer: 'INTEGER', text: 'TEXT',
  };
  return types[type];
}

function normalizeDatabaseName(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.includes('/') || normalized.includes('\\') || normalized === '.' || normalized === '..') {
    throw new TypeError('Browser SQLite databaseName must be a simple file name');
  }
  return normalized;
}

export type {
  BrowserSQLiteOpenOptions,
  BrowserSQLiteStorage,
  BrowserSQLiteWorkerLike,
} from './browser-sqlite-protocol';
