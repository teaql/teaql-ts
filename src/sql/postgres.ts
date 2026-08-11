import { Pool, PoolClient } from 'pg';
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

class PostgreSQLSession implements SqlSession {
  constructor(private readonly client: Pool | PoolClient) {}

  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    const result = await this.client.query(sql, values);
    return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
  }
}

export class PostgreSQLDriver implements TeaQLSqlDriver {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString) throw new Error('connectionString is required');
    this.pool = new Pool({ connectionString });
  }

  identifier(value: string): string {
    return `"${assertSafeIdentifier(value)}"`;
  }

  placeholder(index: number): string {
    return `$${index}`;
  }

  encode(value: any, column?: ColumnSchema): any {
    if (column?.logicalType === 'json' && typeof value !== 'string') {
      return JSON.stringify(value);
    }
    return value;
  }

  contains(columnSql: string, placeholder: string): string {
    return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
  }

  aggregateFunction(name: string): string {
    const functions: Record<string, string> = {
      stddev: 'STDDEV',
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
      double: 'DOUBLE PRECISION',
      decimal: 'NUMERIC',
      date: 'DATE',
      datetime: 'TIMESTAMPTZ',
      json: 'JSONB',
      integer: 'BIGINT',
      text: 'TEXT',
    };
    return types[type];
  }

  async ensureSchema(schemas: Record<string, EntitySchema>): Promise<void> {
    await this.transaction(async session => {
      for (const schema of Object.values(schemas)) {
        const table = this.identifier(schema.table);
        await session.query(
          `CREATE TABLE IF NOT EXISTS ${table} (` +
          '"id" BIGINT PRIMARY KEY, "version" BIGINT NOT NULL)',
        );
        for (const [field, column] of Object.entries(schema.columns)) {
          if (field === 'id' || field === 'version') continue;
          await session.query(
            `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ` +
            `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}`,
          );
        }
      }
      await session.query(
        'CREATE TABLE IF NOT EXISTS teaql_id_space (' +
        'entity VARCHAR(255) PRIMARY KEY, next_id BIGINT NOT NULL)',
      );
    });
  }

  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(new PostgreSQLSession(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async nextId(session: SqlSession, entity: string): Promise<string> {
    const result = await session.query(
      'INSERT INTO teaql_id_space(entity, next_id) VALUES ($1, 1000) ' +
      'ON CONFLICT(entity) DO UPDATE SET next_id = teaql_id_space.next_id + 1 ' +
      'RETURNING next_id::text AS id',
      [entity],
    );
    return result.rows[0].id;
  }

  query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    return new PostgreSQLSession(this.pool).query(sql, values);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export class PostgreSQLTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(connectionString: string, schemas: Record<string, EntitySchema>) {
    super(new PostgreSQLDriver(connectionString), schemas);
  }
}
