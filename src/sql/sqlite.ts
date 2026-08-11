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
  TeaQLSqlDriver,
} from './core';

export class SQLiteDriver implements TeaQLSqlDriver, SqlSession {
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
      datetime: 'TEXT',
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
      'entity TEXT PRIMARY KEY, next_id INTEGER NOT NULL)',
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
    const statement = this.database.prepare(sql);
    if (statement.reader) {
      const rows = statement.all(...values);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...values);
    return { rows: [], rowCount: result.changes };
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
