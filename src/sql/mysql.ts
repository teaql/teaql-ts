import { createPool as createCallbackPool, Pool as CallbackPool } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
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
  canonicalRelationIndexes,
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
  readonly databaseKind = 'mysql' as const;
  private readonly callbackPool: CallbackPool;
  private readonly pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString) throw new Error('connectionString is required');
    this.callbackPool = createCallbackPool({ uri: connectionString, timezone: 'Z' });
    this.pool = this.callbackPool.promise();
  }

  identifier(value: string): string {
    return `\`${assertSafeIdentifier(value)}\``;
  }

  placeholder(_index: number): string {
    return '?';
  }

  encode(value: any, column?: ColumnSchema): any {
    if (value === null || value === undefined) return value;
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
    for (const index of canonicalRelationIndexes(schemas)) {
      const existing = await this.query(
        'SELECT 1 FROM information_schema.statistics ' +
        'WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
        [index.table, index.name],
      );
      if (!existing.rowCount) {
        await this.query(
          `CREATE INDEX ${this.identifier(index.name)} ON ` +
          `${this.identifier(index.table)} (` +
          `${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`,
        );
      }
    }
    await this.query(
      'CREATE TABLE IF NOT EXISTS teaql_id_space (' +
      'type_name VARCHAR(255) PRIMARY KEY, current_level BIGINT NOT NULL)',
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
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const result = await session.query(
        'SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?', [entity]);
      if (!result.rowCount) {
        try {
          const inserted = await session.query(
            'INSERT INTO teaql_id_space(type_name, current_level) VALUES (?, 1)', [entity]);
          if (inserted.rowCount === 1) return '1';
        } catch (error) {
          const winner = await session.query(
            'SELECT current_level FROM teaql_id_space WHERE type_name = ?', [entity]);
          if (!winner.rowCount) throw error;
        }
        continue;
      }
      const previous = Number(result.rows[0].id);
      const next = previous + 1;
      const updated = await session.query(
        'UPDATE teaql_id_space SET current_level = ? ' +
        'WHERE type_name = ? AND current_level = ?', [next, entity, previous]);
      if (updated.rowCount === 1) return String(next);
      if (updated.rowCount !== 0) throw new Error(
        `ID space update for ${entity} changed ${updated.rowCount} rows`);
    }
    throw new Error(`Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`);
  }

  ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void> {
    return ensureOptimisticIdFloor(session, index => this.placeholder(index), entity, floor);
  }

  query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    return new MySQLSession(this.pool).query(sql, values);
  }

  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    const connection = await new Promise<any>((resolve, reject) => {
      this.callbackPool.getConnection((error, value) => error ? reject(error) : resolve(value));
    });
    const readable = connection.query(sql, values).stream();
    try {
      for await (const row of readable) yield row;
    } finally {
      readable.destroy();
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.callbackPool.promise().end();
  }
}

export class MySQLTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(connectionString: string, schemas: Record<string, EntitySchema>) {
    super(new MySQLDriver(connectionString), schemas);
  }
}
