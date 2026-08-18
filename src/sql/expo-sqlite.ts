import {
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  ColumnSchema,
  EntitySchema,
  LogicalColumnType,
  SqlQueryResult,
  SqlSession,
  standardAggregateFunction,
  TeaQLSqlDriver,
} from './core';

export type ExpoSQLiteBindValue = null | number | string | Uint8Array;

export interface ExpoSQLiteExecuteResult<T = Record<string, unknown>>
  extends AsyncIterableIterator<T> {
  changes: number;
  getAllAsync(): Promise<T[]>;
}

export interface ExpoSQLiteStatement {
  executeAsync<T = Record<string, unknown>>(
    params: ExpoSQLiteBindValue[],
  ): Promise<ExpoSQLiteExecuteResult<T>>;
  finalizeAsync(): Promise<void>;
}

export interface ExpoSQLiteDatabaseLike {
  execAsync(sql: string): Promise<void>;
  prepareAsync(sql: string): Promise<ExpoSQLiteStatement>;
  withExclusiveTransactionAsync(
    work: (transaction: ExpoSQLiteDatabaseLike) => Promise<void>,
  ): Promise<void>;
  closeAsync(): Promise<void>;
}

class ExpoSQLiteSession implements SqlSession {
  constructor(private readonly database: ExpoSQLiteDatabaseLike) {}

  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    const statement = await this.database.prepareAsync(sql);
    try {
      const result = await statement.executeAsync(values as ExpoSQLiteBindValue[]);
      const rows = await result.getAllAsync();
      return { rows, rowCount: rows.length || Number(result.changes || 0) };
    } finally {
      await statement.finalizeAsync();
    }
  }
}

/**
 * TeaQL SQL driver for an opened `expo-sqlite` database.
 *
 * The structural database type keeps `teaql-ts` importable in Node and browser
 * profiles. A React Native application opens the database with
 * `expo-sqlite.openDatabaseAsync()` and injects it here through UserContext.
 */
export class ExpoSQLiteDriver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  private initialized?: Promise<void>;

  constructor(private readonly database: ExpoSQLiteDatabaseLike) {
    if (!database) throw new Error('opened Expo SQLite database is required');
  }

  identifier(value: string): string {
    return `"${assertSafeIdentifier(value)}"`;
  }

  placeholder(_index: number): string {
    return '?';
  }

  encode(value: any, column?: ColumnSchema): ExpoSQLiteBindValue {
    if (column?.logicalType === 'json' && typeof value !== 'string') {
      return JSON.stringify(value);
    }
    if (column?.logicalType === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    return value as ExpoSQLiteBindValue;
  }

  contains(columnSql: string, placeholder: string): string {
    return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
  }

  aggregateFunction(name: string): string {
    return standardAggregateFunction(name);
  }

  private sqlType(type: LogicalColumnType): string {
    const types: Record<LogicalColumnType, string> = {
      boolean: 'INTEGER',
      double: 'REAL',
      decimal: 'NUMERIC',
      date: 'TEXT',
      datetime: 'TEXT',
      json: 'TEXT',
      integer: 'INTEGER',
      text: 'TEXT',
    };
    return types[type];
  }

  private initialize(): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.database.execAsync(
        'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;',
      );
    }
    return this.initialized;
  }

  async ensureSchema(schemas: Record<string, EntitySchema>): Promise<void> {
    await this.initialize();
    for (const schema of Object.values(schemas)) {
      const table = this.identifier(schema.table);
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${table} (` +
        '"id" INTEGER PRIMARY KEY, "version" INTEGER NOT NULL)',
      );
      const columns = await this.query(`PRAGMA table_info(${table})`);
      const existing = new Set(columns.rows.map(row => String(row.name)));
      for (const [field, column] of Object.entries(schema.columns)) {
        if (field === 'id' || field === 'version' ||
            existing.has(column.columnName)) continue;
        await this.query(
          `ALTER TABLE ${table} ADD COLUMN ` +
          `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}`,
        );
      }
    }
    await this.query(
      'CREATE TABLE IF NOT EXISTS teaql_id_space (' +
      'entity TEXT PRIMARY KEY, next_id INTEGER NOT NULL)',
    );
  }

  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    let value: T | undefined;
    await this.database.withExclusiveTransactionAsync(async transaction => {
      value = await work(new ExpoSQLiteSession(transaction));
    });
    return value as T;
  }

  async nextId(session: SqlSession, entity: string): Promise<string> {
    const current = await session.query(
      'SELECT next_id AS id FROM teaql_id_space WHERE entity = ?',
      [entity],
    );
    if (!current.rowCount) {
      await session.query(
        'INSERT INTO teaql_id_space(entity, next_id) VALUES (?, 1000)',
        [entity],
      );
      return '1000';
    }
    const next = Number(current.rows[0].id) + 1;
    await session.query(
      'UPDATE teaql_id_space SET next_id = ? WHERE entity = ?',
      [next, entity],
    );
    return String(next);
  }

  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    return new ExpoSQLiteSession(this.database).query(sql, values);
  }

  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    const statement = await this.database.prepareAsync(sql);
    try {
      const result = await statement.executeAsync(
        values as ExpoSQLiteBindValue[],
      );
      for await (const row of result) yield row;
    } finally {
      await statement.finalizeAsync();
    }
  }

  async close(): Promise<void> {
    await this.database.closeAsync();
  }
}

export class ExpoSQLiteTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(
    database: ExpoSQLiteDatabaseLike,
    schemas: Record<string, EntitySchema>,
  ) {
    super(new ExpoSQLiteDriver(database), schemas);
  }
}
