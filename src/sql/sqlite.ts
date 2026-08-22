import Database from 'better-sqlite3';
import {
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  ColumnSchema,
  EntitySchema,
  LogicalColumnType,
  SqlQueryResult,
  SqlSession,
  standardAggregateFunction,
  ensureOptimisticIdFloor,
  TeaQLSqlDriver,
} from './core';

export class SQLiteDriver implements TeaQLSqlDriver, SqlSession {
  readonly databaseKind = 'sqlite' as const;
  private readonly database: Database.Database;

  constructor(filename: string) {
    if (!filename) throw new Error('filename is required');
    this.database = new Database(filename);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('foreign_keys = ON');
  }

  identifier(value: string): string {
    return `"${assertSafeIdentifier(value)}"`;
  }

  placeholder(_index: number): string {
    return '?';
  }

  encode(value: any, column?: ColumnSchema): any {
    if (column?.logicalType === 'json' && typeof value !== 'string') {
      return JSON.stringify(value);
    }
    if (column?.logicalType === 'boolean') return value ? 1 : 0;
    if (column?.logicalType === 'date') {
      return value instanceof Date ? value.toISOString().slice(0, 10) : value;
    }
    if (column?.logicalType === 'datetime') {
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'string') {
        const millis = Date.parse(value);
        if (!Number.isNaN(millis)) return millis;
      }
    }
    return value;
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
      datetime: 'INTEGER',
      json: 'TEXT',
      integer: 'INTEGER',
      text: 'TEXT',
    };
    return types[type];
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
      'type_name TEXT PRIMARY KEY, current_level INTEGER NOT NULL)',
    );
  }

  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(this);
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  async nextId(session: SqlSession, entity: string): Promise<string> {
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const current = await session.query(
        'SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?',
        [entity],
      );
      if (!current.rowCount) {
        try {
          const inserted = await session.query(
            'INSERT INTO teaql_id_space(type_name, current_level) VALUES (?, 1)',
            [entity],
          );
          if (inserted.rowCount === 1) return '1';
        } catch (error) {
          const winner = await session.query(
            'SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?',
            [entity],
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
    throw new Error(
      `Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`,
    );
  }

  ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void> {
    return ensureOptimisticIdFloor(session, index => this.placeholder(index), entity, floor);
  }

  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    const statement = this.database.prepare(sql);
    if (statement.reader) {
      const rows = statement.all(...values);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...values);
    return { rows: [], rowCount: result.changes };
  }

  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    const statement = this.database.prepare(sql);
    if (!statement.reader) throw new Error('stream() requires a SELECT statement');
    for (const row of statement.iterate(...values)) yield row;
  }

  async close(): Promise<void> {
    this.database.close();
  }
}

export class SQLiteTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(filename: string, schemas: Record<string, EntitySchema>) {
    super(new SQLiteDriver(filename), schemas);
  }
}
