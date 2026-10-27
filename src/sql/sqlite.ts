import Database from 'better-sqlite3';
import { AsyncLocalStorage } from 'node:async_hooks';
import { resolve } from 'node:path';
import { startStandardNodeTelemetry } from '../telemetry/standard-node';
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

function soundex(value: unknown): string {
  const letters = String(value ?? '').toUpperCase().match(/[A-Z]/g) ?? [];
  if (!letters.length) return '?000';
  const groups: Record<string, string> = {};
  for (const [chars, code] of [['BFPV', '1'], ['CGJKQSXZ', '2'], ['DT', '3'], ['L', '4'], ['MN', '5'], ['R', '6']]) {
    for (const char of chars) groups[char] = code;
  }
  const first = letters[0]!;
  let result: string = first;
  let previous = groups[first] ?? '0';
  for (const letter of letters.slice(1)) {
    const current = groups[letter] ?? '0';
    if (current !== '0' && current !== previous) result += current;
    if (result.length === 4) break;
    previous = current;
  }
  return result.padEnd(4, '0');
}

class SQLiteAsyncGate {
  private tail: Promise<void> = Promise.resolve();
  private waiting = 0;

  get busy(): boolean { return this.waiting > 0; }

  async enter(): Promise<() => void> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(done => { release = done; });
    this.waiting += 1;
    await previous;
    return () => { this.waiting -= 1; release(); };
  }
}

const fileGates = new Map<string, { gate: SQLiteAsyncGate; users: number }>();
const transactionOwner = new AsyncLocalStorage<SQLiteDriver>();

export class SQLiteDriver implements TeaQLSqlDriver, SqlSession {
  readonly databaseKind = 'sqlite' as const;
  readonly topNRelationPlanPolicy = 'alwaysProbe' as const;
  private readonly database: Database.Database;
  private readonly gate: SQLiteAsyncGate;
  private readonly gateKey: string | null;
  private transactionActive = false;
  private soundexRegistered = false;

  constructor(filename: string) {
    if (!filename) throw new Error('filename is required');
    this.gateKey = filename === ':memory:' ? null : resolve(filename);
    const shared = this.gateKey === null ? null : fileGates.get(this.gateKey);
    if (shared?.gate.busy) throw new Error('SQLITE_BUSY');
    this.database = new Database(filename);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('foreign_keys = ON');
    if (this.gateKey === null) this.gate = new SQLiteAsyncGate();
    else if (shared) { shared.users += 1; this.gate = shared.gate; }
    else {
      this.gate = new SQLiteAsyncGate();
      fileGates.set(this.gateKey, { gate: this.gate, users: 1 });
    }
  }

  private async withConnection<T>(work: () => Promise<T> | T): Promise<T> {
    const owner = transactionOwner.getStore();
    if (owner === this && this.transactionActive) return work();
    if (owner?.gate === this.gate) throw new Error('SQLITE_CROSS_CONNECTION_REENTRY');
    const release = await this.gate.enter();
    try { return await work(); }
    finally { release(); }
  }

  identifier(value: string): string {
    return `"${assertSafeIdentifier(value)}"`;
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
    if (!this.soundexRegistered) {
      this.database.function('soundex', { deterministic: true }, soundex);
      this.soundexRegistered = true;
    }
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
          `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}` +
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

  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    if (transactionOwner.getStore()?.gate === this.gate) {
      throw new Error('SQLITE_TRANSACTION_REENTRY');
    }
    return this.withConnection(async () => {
      this.database.exec('BEGIN IMMEDIATE');
      this.transactionActive = true;
      try {
        const result = await transactionOwner.run(this, () => work(this));
        this.database.exec('COMMIT');
        return result;
      } catch (error) {
        this.database.exec('ROLLBACK');
        throw error;
      } finally { this.transactionActive = false; }
    });
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
    return this.withConnection(() => {
      const statement = this.database.prepare(sql);
      if (statement.reader) {
        const rows = statement.all(...values);
        return { rows, rowCount: rows.length };
      }
      const result = statement.run(...values);
      return { rows: [], rowCount: result.changes };
    });
  }

  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    const iterator = await this.withConnection(() => {
      const statement = this.database.prepare(sql);
      if (!statement.reader) throw new Error('stream() requires a SELECT statement');
      return statement.iterate(...values)[Symbol.iterator]();
    });
    try {
      while (true) {
        const next = await this.withConnection(() => iterator.next());
        if (next.done) return;
        // Hydration may issue another query before requesting the next row.
        // Release the gate while the consumer handles this yielded record.
        yield next.value;
      }
    } finally {
      await this.withConnection(() => { iterator.return?.(); });
    }
  }

  async close(): Promise<void> {
    await this.withConnection(() => { this.database.close(); });
    if (this.gateKey !== null) {
      const shared = fileGates.get(this.gateKey);
      if (shared && --shared.users === 0) fileGates.delete(this.gateKey);
    }
  }
}

export class SQLiteTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(filename: string, schemas: Record<string, EntitySchema>) {
    super(new SQLiteDriver(filename), schemas);
    this.attachStandardTelemetryStartup(startStandardNodeTelemetry());
  }
}
