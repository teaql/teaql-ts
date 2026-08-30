import { Pool, PoolClient } from 'pg';
import QueryStream from 'pg-query-stream';
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

class PostgreSQLSession implements SqlSession {
  constructor(private readonly client: Pool | PoolClient) {}

  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    const result = await this.client.query(sql, values);
    return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
  }
}

export class PostgreSQLDriver implements TeaQLSqlDriver {
  readonly databaseKind = 'postgresql' as const;
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
            `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}` +
            `${column.nullable === false ? ' NOT NULL' : ''}`,
          );
        }
      }
      for (const index of canonicalRelationIndexes(schemas)) {
        await session.query(
          `CREATE INDEX IF NOT EXISTS ${this.identifier(index.name)} ON ` +
          `${this.identifier(index.table)} (` +
          `${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`,
        );
      }
      await session.query(
        'CREATE TABLE IF NOT EXISTS teaql_id_space (' +
        'type_name VARCHAR(255) PRIMARY KEY, current_level BIGINT NOT NULL)',
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
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const result = await session.query(
        'SELECT current_level::text AS id FROM teaql_id_space WHERE type_name = $1',
        [entity],
      );
      if (!result.rowCount) {
        try {
          const inserted = await session.query(
            'INSERT INTO teaql_id_space(type_name, current_level) VALUES ($1, 1)',
            [entity],
          );
          if (inserted.rowCount === 1) return '1';
        } catch (error) {
          const winner = await session.query(
            'SELECT current_level FROM teaql_id_space WHERE type_name = $1', [entity]);
          if (!winner.rowCount) throw error;
        }
        continue;
      }
      const previous = Number(result.rows[0].id);
      const next = previous + 1;
      const updated = await session.query(
        'UPDATE teaql_id_space SET current_level = $1 ' +
        'WHERE type_name = $2 AND current_level = $3',
        [next, entity, previous],
      );
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
    return new PostgreSQLSession(this.pool).query(sql, values);
  }

  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    const client = await this.pool.connect();
    const cursor = client.query(new QueryStream(sql, values));
    try {
      for await (const row of cursor as any) yield row;
    } finally {
      cursor.destroy();
      client.release();
    }
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
