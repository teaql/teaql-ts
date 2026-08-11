import { createPool, Pool, PoolConnection } from 'mysql2/promise';
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

class MySQLSession implements SqlSession {
  constructor(private readonly client: Pool | PoolConnection) {}

  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    const [raw]: any = await (this.client as any).query(sql, values);
    if (Array.isArray(raw)) return { rows: raw, rowCount: raw.length };
    return { rows: [], rowCount: Number(raw?.affectedRows || 0) };
  }
}

export class MySQLDriver implements TeaQLSqlDriver {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString) throw new Error('connectionString is required');
    this.pool = createPool(connectionString);
  }

  identifier(value: string): string {
    return `\`${assertSafeIdentifier(value)}\``;
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
    return `CAST(${columnSql} AS CHAR) LIKE CONCAT('%', ${placeholder}, '%')`;
  }

  aggregateFunction(name: string): string {
    const functions: Record<string, string> = {
      stddev: 'STDDEV_SAMP',
      stddevpop: 'STDDEV_POP',
      varsamp: 'VAR_SAMP',
      varpop: 'VAR_POP',
      bitand: 'BIT_AND',
      bitor: 'BIT_OR',
      bitxor: 'BIT_XOR',
    };
    return functions[String(name).toLowerCase()]
      || standardAggregateFunction(name);
  }

  private sqlType(type: LogicalColumnType): string {
    const types: Record<LogicalColumnType, string> = {
      boolean: 'BOOLEAN',
      double: 'DOUBLE',
      decimal: 'DECIMAL(65, 30)',
      date: 'DATE',
      datetime: 'DATETIME(6)',
      json: 'JSON',
      integer: 'BIGINT',
      text: 'TEXT',
    };
    return types[type];
  }

  async ensureSchema(schemas: Record<string, EntitySchema>): Promise<void> {
    for (const schema of Object.values(schemas)) {
      const table = this.identifier(schema.table);
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${table} (` +
        '`id` BIGINT PRIMARY KEY, `version` BIGINT NOT NULL)',
      );
      for (const [field, column] of Object.entries(schema.columns)) {
        if (field === 'id' || field === 'version') continue;
        const existing = await this.query(
          'SELECT 1 FROM information_schema.columns ' +
          'WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
          [schema.table, column.columnName],
        );
        if (!existing.rowCount) {
          await this.query(
            `ALTER TABLE ${table} ADD COLUMN ` +
            `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}`,
          );
        }
      }
    }
    await this.query(
      'CREATE TABLE IF NOT EXISTS teaql_id_space (' +
      'entity VARCHAR(255) PRIMARY KEY, next_id BIGINT NOT NULL)',
    );
  }

  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(new MySQLSession(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async nextId(session: SqlSession, entity: string): Promise<string> {
    await session.query(
      'INSERT INTO teaql_id_space(entity, next_id) VALUES (?, 1000) ' +
      'ON DUPLICATE KEY UPDATE next_id = next_id + 1',
      [entity],
    );
    const result = await session.query(
      'SELECT next_id AS id FROM teaql_id_space WHERE entity = ?',
      [entity],
    );
    return String(result.rows[0].id);
  }

  query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    return new MySQLSession(this.pool).query(sql, values);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export class MySQLTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(connectionString: string, schemas: Record<string, EntitySchema>) {
    super(new MySQLDriver(connectionString), schemas);
  }
}
