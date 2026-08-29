import {
  observeRuntimeOperation,
  RuntimeTelemetry,
  startRuntimeOperation,
} from '../core/telemetry';
import { CheckException, EntityChecker } from '../core/checker';
import { UserContext } from '../core/context';
import { mergeRuntimeBootstrap } from '../core/runtime-module';
import type { BootstrapEntity, RuntimeBootstrap } from '../core/runtime-module';
import { contextSchemaCapability } from '../core/schema-capability';
import { SelectQuery } from '../core/ast';

export type LogicalColumnType =
  | 'boolean'
  | 'double'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'json'
  | 'integer'
  | 'text';

export type ColumnSchema = {
  columnName: string;
  modelName?: string;
  logicalType: LogicalColumnType;
  decode: 'string' | 'number' | 'date' | 'native';
};

export type EntitySchema = {
  table: string;
  columns: Record<string, ColumnSchema>;
  relations?: Record<string, RelationSchema>;
};

export type RelationSchema = {
  targetEntity: string;
  localKey: string;
  foreignKey: string;
  many: boolean;
};

export type SqlQueryResult = {
  rows: any[];
  rowCount: number;
};

export type MutationResult = {
  success: boolean;
  id: string;
  version?: number;
  deleted?: boolean;
  persistedRecord?: Record<string, unknown>;
};

export interface SqlSession {
  query(sql: string, values?: any[]): Promise<SqlQueryResult>;
}

export interface TeaQLSqlDriver extends SqlSession {
  readonly databaseKind: SQLDatabaseKind;
  stream(sql: string, values?: any[]): AsyncIterable<any>;
  identifier(value: string): string;
  placeholder(index: number): string;
  encode(value: any, column?: ColumnSchema): any;
  contains(columnSql: string, placeholder: string): string;
  aggregateFunction(name: string): string;
  ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
  transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
  nextId(session: SqlSession, entity: string): Promise<string>;
  ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void>;
  close(): Promise<void>;
}

export async function ensureOptimisticIdFloor(
  session: SqlSession,
  placeholder: (index: number) => string,
  entity: string,
  floor: string,
): Promise<void> {
  const numericFloor = Number(floor);
  if (!Number.isSafeInteger(numericFloor) || numericFloor < 0) {
    throw new Error(`Invalid ID space floor ${floor} for ${entity}`);
  }
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const currentResult = await session.query(
      `SELECT current_level AS id FROM teaql_id_space WHERE type_name = ${placeholder(1)}`,
      [entity],
    );
    if (!currentResult.rowCount) {
      try {
        const inserted = await session.query(
          `INSERT INTO teaql_id_space(type_name, current_level) VALUES (${placeholder(1)}, ${placeholder(2)})`,
          [entity, numericFloor],
        );
        if (inserted.rowCount === 1) return;
      } catch (error) {
        const winner = await session.query(
          `SELECT current_level FROM teaql_id_space WHERE type_name = ${placeholder(1)}`,
          [entity],
        );
        if (!winner.rowCount) throw error;
      }
      continue;
    }
    const current = Number(currentResult.rows[0].id);
    if (current >= numericFloor) return;
    const updated = await session.query(
      `UPDATE teaql_id_space SET current_level = ${placeholder(1)} ` +
      `WHERE type_name = ${placeholder(2)} AND current_level = ${placeholder(3)}`,
      [numericFloor, entity, current],
    );
    if (updated.rowCount === 1) return;
    if (updated.rowCount !== 0) throw new Error(
      `ID space floor update for ${entity} changed ${updated.rowCount} rows on attempt ${attempt}`);
  }
  throw new Error(
    `Unable to synchronize ID space floor for ${entity} after 100 optimistic-lock attempts`);
}

function unquoteIdentifier(identifier: string): string {
  if ((identifier.startsWith('"') && identifier.endsWith('"')) ||
      (identifier.startsWith('`') && identifier.endsWith('`'))) {
    return identifier.slice(1, -1).replace(/""/g, '"').replace(/``/g, '`');
  }
  return identifier;
}

function sameBootstrapValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Date) left = left.getTime();
  if (right instanceof Date) right = right.getTime();
  return left !== null && left !== undefined && right !== null && right !== undefined &&
    String(left) === String(right);
}

export interface TeaQLDataService {
  executeMutation(mutation: any): Promise<MutationResult>;
  executeQuery<T = any>(query: any): Promise<T[]>;
  executeCount(query: any): Promise<number>;
  executeForStream<T = any>(query: any, chunkSize?: number): AsyncIterable<T[]>;
  executeFacetMembership?(outerQuery: any, relationName: string): Promise<Map<string, number>>;
  close?(): Promise<void>;
}

export type SQLExecutionOperation = 'select' | 'insert' | 'update' | 'delete';

export type SQLExecutionMetadata = Readonly<{
  operation: SQLExecutionOperation;
  parameterizedSQL: string;
  parameters: readonly unknown[];
  /** SQL with bind values rendered as literals, intended only for diagnostics. */
  debugSQL: string;
  elapsedMicros: number;
  resultCount?: number;
  affectedRows?: number;
  resultSummary: string;
}>;

/** Render provider placeholders as SQL literals so the statement can be copied into a SQL client. */
export type SQLDatabaseKind = 'postgresql' | 'mysql' | 'sqlite';

export function debugSQL(
  parameterizedSQL: string,
  parameters: readonly unknown[],
  databaseKind: SQLDatabaseKind = 'sqlite',
): string {
  let positionalIndex = 0;
  let result = '';
  let state: 'sql' | 'single' | 'double' | 'line-comment' | 'block-comment' = 'sql';
  for (let index = 0; index < parameterizedSQL.length; index++) {
    const char = parameterizedSQL[index];
    const next = parameterizedSQL[index + 1] ?? '';
    if (state === 'sql' && char === "'") {
      result += char;
      state = 'single';
      continue;
    }
    if (state === 'sql' && char === '"') { result += char; state = 'double'; continue; }
    if (state === 'sql' && char === '-' && next === '-') {
      result += '--'; index++; state = 'line-comment'; continue;
    }
    if (state === 'sql' && char === '/' && next === '*') {
      result += '/*'; index++; state = 'block-comment'; continue;
    }
    if (state === 'single') {
      result += char;
      if (char === "'" && next === "'") result += parameterizedSQL[++index];
      else if (char === "'") state = 'sql';
      continue;
    }
    if (state === 'double') {
      result += char;
      if (char === '"' && next === '"') result += parameterizedSQL[++index];
      else if (char === '"') state = 'sql';
      continue;
    }
    if (state === 'line-comment') {
      result += char;
      if (char === '\r' || char === '\n') state = 'sql';
      continue;
    }
    if (state === 'block-comment') {
      result += char;
      if (char === '*' && next === '/') { result += '/'; index++; state = 'sql'; }
      continue;
    }
    if (char === '?') {
      result += positionalIndex < parameters.length
        ? sqlLiteral(parameters[positionalIndex++], databaseKind) : char;
      continue;
    }
    if (char === '$' && /[0-9]/.test(parameterizedSQL[index + 1] ?? '')) {
      let end = index + 1;
      while (/[0-9]/.test(parameterizedSQL[end] ?? '')) end++;
      const parameterIndex = Number(parameterizedSQL.slice(index + 1, end)) - 1;
      result += parameterIndex >= 0 && parameterIndex < parameters.length
        ? sqlLiteral(parameters[parameterIndex], databaseKind) : parameterizedSQL.slice(index, end);
      index = end - 1;
      continue;
    }
    if (parameterizedSQL.slice(index).match(/^@p[0-9]+/i)) {
      const placeholder = parameterizedSQL.slice(index).match(/^@p([0-9]+)/i)!;
      const parameterIndex = Number(placeholder[1]) - 1;
      result += parameterIndex >= 0 && parameterIndex < parameters.length
        ? sqlLiteral(parameters[parameterIndex], databaseKind) : placeholder[0];
      index += placeholder[0].length - 1;
      continue;
    }
    result += char;
  }
  return result;
}

function sqlLiteral(value: unknown, databaseKind: SQLDatabaseKind): string {
  if (value && typeof value === 'object' && 'type' in value) {
    const typed = value as { type: string; value?: unknown };
    if (typed.type === 'Null' || typed.type === 'TypedNull') return 'NULL';
    if (typed.type === 'Date') {
      const date = typed.value instanceof Date
        ? typed.value.toISOString().slice(0, 10) : String(typed.value);
      if (databaseKind === 'postgresql') return `DATE ${quoteSQLString(date)}`;
      if (databaseKind === 'mysql') return `CAST(${quoteSQLString(date)} AS DATE)`;
      return quoteSQLString(date);
    }
    if (typed.type === 'Timestamp') {
      if (databaseKind === 'sqlite') return String(typed.value);
      const iso = new Date(Number(typed.value)).toISOString();
      if (databaseKind === 'postgresql') return `TIMESTAMPTZ ${quoteSQLString(iso)}`;
      return `CAST(${quoteSQLString(iso.slice(0, 23).replace('T', ' '))} AS DATETIME(3))`;
    }
    if (typed.type === 'Bool') return typed.value ? 'TRUE' : 'FALSE';
    if (['I64', 'U64', 'F64', 'Decimal'].includes(typed.type)) return String(typed.value);
    if (typed.type === 'Text') return quoteSQLString(String(typed.value));
  }
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) {
    if (databaseKind === 'sqlite') return String(value.getTime());
    if (databaseKind === 'postgresql') return `TIMESTAMPTZ ${quoteSQLString(value.toISOString())}`;
    return `CAST(${quoteSQLString(value.toISOString().slice(0, 23).replace('T', ' '))} AS DATETIME(3))`;
  }
  if (value instanceof Uint8Array) {
    return `X'${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}'`;
  }
  if (typeof value === 'object') return quoteSQLString(JSON.stringify(value));
  return quoteSQLString(String(value));
}

function quoteSQLString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export interface RuntimeTelemetrySink {
  record(metadata: SQLExecutionMetadata): void;
}

export class SQLExecutionEvidenceStore implements RuntimeTelemetrySink {
  private mode: 'all' | 'select' | 'mutation' | 'disabled' = 'all';
  private entries: SQLExecutionMetadata[] = [];

  record(metadata: SQLExecutionMetadata): void {
    const isSelect = metadata.operation === 'select';
    if (this.mode === 'disabled' ||
        (this.mode === 'select' && !isSelect) ||
        (this.mode === 'mutation' && isSelect)) return;
    this.entries.push(Object.freeze({
      ...metadata,
      parameters: Object.freeze([...metadata.parameters]),
    }));
  }

  private setMode(mode: 'all' | 'select' | 'mutation' | 'disabled'): this {
    this.mode = mode;
    this.entries = [];
    return this;
  }

  enableAll(): this { return this.setMode('all'); }
  enableSelect(): this { return this.setMode('select'); }
  enableMutation(): this { return this.setMode('mutation'); }
  disable(): this { return this.setMode('disabled'); }
  snapshot(): readonly SQLExecutionMetadata[] { return [...this.entries]; }
}

type NormalizedAggregate = { func: string; field: string; retName: string };
type NormalizedOrder = { field: string; direction: string };

export abstract class AbstractSQLTeaQLClient implements TeaQLDataService {
  private schemaReady?: Promise<void>;
  public readonly sqlTrace: string[] = [];
  private readonly internalQueryToken = Symbol('teaql-internal-query');
  private readonly auditEvents: Readonly<Record<string, unknown>>[] = [];
  private auditSink?: (event: Readonly<Record<string, unknown>>) => void | Promise<void>;
  private telemetrySink?: RuntimeTelemetrySink;
  private runtimeTelemetry?: RuntimeTelemetry;
  private readonly checkers: Record<string, EntityChecker> = {};
  private userContext = new UserContext();
  private bootstrap: RuntimeBootstrap = {};

  protected constructor(
    protected readonly driver: TeaQLSqlDriver,
    private readonly schemas: Record<string, EntitySchema>,
  ) {}

  /** Installs metadata only. Call context.ensureSchema() explicitly when schema changes are intended. */
  install(module: import('../core/runtime-module').RuntimeModule): this {
    Object.assign(this.schemas, module.schemas);
    Object.assign(this.checkers, module.checkers);
    this.bootstrap = mergeRuntimeBootstrap(this.bootstrap, module.bootstrap);
    return this;
  }

  setUserContext(context: UserContext): this { this.userContext = context; return this; }

  private schema(entity: string): EntitySchema {
    const schema = this.schemas[entity];
    if (!schema) throw new Error(`Unknown TeaQL entity: ${entity}`);
    return schema;
  }

  private toRuntimeMutationRecord(
    schema: EntitySchema,
    canonicalRecord: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [canonicalName, value] of Object.entries(canonicalRecord)) {
      const runtimeName = schema.columns[canonicalName]
        ? canonicalName
        : Object.keys(schema.columns).find(
          name => schema.columns[name].modelName === canonicalName ||
            schema.columns[name].columnName === canonicalName,
        );
      if (runtimeName) result[runtimeName] = value;
    }
    return result;
  }

  private encode(value: any, column?: ColumnSchema): any {
    const normalized = value?.id ?? value;
    if (normalized === undefined) return undefined;
    return this.driver.encode(normalized, column);
  }

  private decodeRow(entity: string, row: any, aggregateNames: string[] = []): any {
    const schema = this.schema(entity);
    const result = { ...row };
    for (const [field, column] of Object.entries(schema.columns)) {
      const value = result[field];
      if (value === null || value === undefined) continue;
      if (column.decode === 'number') result[field] = Number(value);
      if (column.decode === 'string') result[field] = String(value);
      if (column.decode === 'date' && value instanceof Date) {
        result[field] = value.toISOString();
      }
      if (column.logicalType === 'boolean') result[field] = Boolean(value);
    }
    for (const name of aggregateNames) {
      if (result[name] !== null && result[name] !== undefined) {
        result[name] = Number(result[name]);
      }
    }
    return result;
  }

  get auditTrace(): ReadonlyArray<Readonly<Record<string, unknown>>> {
    return [...this.auditEvents];
  }

  setAuditSink(sink: (event: Readonly<Record<string, unknown>>) => void | Promise<void>): this {
    this.auditSink = sink;
    return this;
  }

  setRuntimeTelemetrySink(sink: RuntimeTelemetrySink | undefined): this {
    this.telemetrySink = sink;
    return this;
  }

  setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this {
    this.runtimeTelemetry = telemetry;
    return this;
  }

  private recordSQL(
    operation: SQLExecutionOperation, parameterizedSQL: string, parameters: readonly unknown[],
    startedAt: number, resultCount?: number, affectedRows?: number,
  ): void {
    this.telemetrySink?.record(Object.freeze({
      operation, parameterizedSQL, parameters: Object.freeze([...parameters]),
      debugSQL: debugSQL(parameterizedSQL, parameters, this.driver.databaseKind),
      elapsedMicros: Math.max(0, (Date.now() - startedAt) * 1_000),
      resultCount, affectedRows,
      resultSummary: resultCount !== undefined
        ? `Fetched ${resultCount} rows` : `Affected ${affectedRows ?? 0} rows`,
    }));
  }

  /** Package-internal physical capability used only by UserContext.ensureSchema(). */
  async [contextSchemaCapability](context: UserContext): Promise<void> {
    this.userContext = context;
    if (!this.schemaReady) {
      this.schemaReady = this.driver.ensureSchema(this.schemas)
        .then(() => this.ensureBootstrapData());
    }
    return this.schemaReady;
  }

  private async ensureBootstrapData(): Promise<void> {
    const records = [
      ...(this.bootstrap.defaultDomainRoot ? [this.bootstrap.defaultDomainRoot] : []),
      ...(this.bootstrap.constants ?? []),
    ];
    if (!records.length) return;
    await this.driver.transaction(async session => {
      for (const record of records) await this.reconcileBootstrapEntity(session, record);
    });
  }

  private async reconcileBootstrapEntity(session: SqlSession, record: BootstrapEntity): Promise<void> {
    const schema = this.schema(record.entity);
    const table = this.driver.identifier(schema.table);
    const idColumn = this.driver.identifier(schema.columns.id?.columnName ?? 'id');
    const versionColumn = this.driver.identifier(schema.columns.version?.columnName ?? 'version');
    const entries = Object.entries(record.values ?? {}).map(([field, value]) => {
      const column = schema.columns[field];
      if (!column) throw new Error(`Unknown bootstrap field ${record.entity}.${field}`);
      return {
        column: this.driver.identifier(column.columnName),
        value: this.driver.encode(value, column),
      };
    });
    const current = await session.query(
      `SELECT * FROM ${table} WHERE ${idColumn} = ${this.driver.placeholder(1)}`,
      [record.id],
    );
    if (!current.rowCount) {
      const columns = [idColumn, versionColumn, ...entries.map(entry => entry.column)];
      const values = [record.id, 1, ...entries.map(entry => entry.value)];
      const placeholders = values.map((_, index) => this.driver.placeholder(index + 1));
      await session.query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values,
      );
    } else {
      const row = current.rows[0];
      const changed = entries.filter(entry => !sameBootstrapValue(row[unquoteIdentifier(entry.column)], entry.value));
      if (changed.length) {
        const assignments = changed.map((entry, index) =>
          `${entry.column} = ${this.driver.placeholder(index + 1)}`);
        assignments.push(`${versionColumn} = ${versionColumn} + 1`);
        await session.query(
          `UPDATE ${table} SET ${assignments.join(', ')} WHERE ${idColumn} = ` +
          this.driver.placeholder(changed.length + 1),
          [...changed.map(entry => entry.value), record.id],
        );
      }
    }
    await this.driver.ensureIdFloor(session, record.entity, record.id);
  }

  async executeMutation(mutation: any): Promise<MutationResult> {
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: 'mutation',
      name: `${String(mutation?.entity || 'unknown')}.${String(mutation?.action || 'unknown').toLowerCase()}`,
      attributes: {
        'teaql.entity.type': String(mutation?.entity || 'unknown'),
        'teaql.mutation.kind': String(mutation?.action || 'unknown').toLowerCase(),
      },
    });
    try {
      if (!String(mutation?.comment || '').trim()) {
        throw new Error('Security audit failure: audit reason is required before mutation');
      }
      // EntityRoot.change() deliberately returns an immutable ledger snapshot.
      // Checkers also own context-derived fixes, so give that boundary a mutable
      // working payload without weakening the ledger's immutability contract.
      mutation = { ...mutation, payload: { ...(mutation?.payload ?? {}) } };
      const checker = this.checkers[String(mutation.entity)];
      if (checker) {
        const results: import('../core/i18n').CheckResult[] = [];
        this.userContext.insertResource('fixTime', new Date());
        try {
          checker.checkAndFix(this.userContext, mutation, results);
          if (mutation.ledgerKey) {
            for (const [field, value] of Object.entries(mutation.payload || {})) {
              this.userContext.entityRoot.set(mutation.ledgerKey, field, value);
            }
          }
          this.userContext.translateCheckResults(results);
          if (results.length) throw new CheckException(results);
        } finally {
          this.userContext.removeResource('fixTime');
        }
      }
      const schema = this.schema(mutation.entity);
      const mutationRecord = this.toRuntimeMutationRecord(schema, mutation.payload || {});
      const table = this.driver.identifier(schema.table);
      const result = await observeRuntimeOperation(this.runtimeTelemetry, {
        family: 'provider',
        name: `${this.driver.databaseKind}.mutation`,
        attributes: {
          'teaql.provider.kind': this.driver.databaseKind,
          'teaql.provider.operation': String(mutation.action).toLowerCase(),
        },
      }, () => this.driver.transaction(async session => {
      if (mutation.action === 'Create') {
        const id = mutation.id
          ? String(mutation.id)
          : await this.driver.nextId(session, mutation.entity);
        if (mutation.id) {
          await this.driver.ensureIdFloor(session, mutation.entity, id);
        }
        const version = Number(mutation.version || 0) + 1;
        const record: Record<string, unknown> = { ...mutationRecord, id, version };
        const fields = Object.keys(schema.columns)
          .filter(field => record[field] !== undefined);
        const columns = fields.map(field =>
          this.driver.identifier(schema.columns[field].columnName),
        ).join(', ');
        const placeholders = fields.map((_, index) =>
          this.driver.placeholder(index + 1),
        ).join(', ');
        const values = fields.map(field =>
          this.encode(record[field], schema.columns[field]),
        );
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        const startedAt = Date.now();
        const mutationResult = await session.query(sql, values);
        this.recordSQL('insert', sql, values, startedAt, undefined, mutationResult.rowCount);
        return {
          success: true,
          id,
          version,
          persistedRecord: await this.readPersistedRecord(session, schema, id),
        };
      }

      if (mutation.action === 'Update') {
        const fields = Object.keys(schema.columns).filter(field =>
          field !== 'id' && field !== 'version' &&
          mutationRecord[field] !== undefined,
        );
        const values = fields.map(field =>
          this.encode(mutationRecord[field], schema.columns[field]),
        );
        const assignments = fields.map((field, index) =>
          `${this.driver.identifier(schema.columns[field].columnName)} = ` +
          this.driver.placeholder(index + 1),
        );
        const versionColumn = this.driver.identifier('version');
        assignments.push(`${versionColumn} = ${versionColumn} + 1`);
        values.push(String(mutation.id));
        const predicates = [
          `${this.driver.identifier('id')} = ${this.driver.placeholder(values.length)}`,
        ];
        if (mutation.version !== undefined && mutation.version !== null) {
          values.push(Number(mutation.version));
          predicates.push(
            `${versionColumn} = ${this.driver.placeholder(values.length)}`,
          );
        }
        const sql = `UPDATE ${table} SET ${assignments.join(', ')} ` +
          `WHERE ${predicates.join(' AND ')}`;
        const startedAt = Date.now();
        const result = await session.query(sql, values);
        this.recordSQL('update', sql, values, startedAt, undefined, result.rowCount);
        if (result.rowCount !== 1) {
          throw new Error(
            `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`,
          );
        }
        const persistedRecord = await this.readPersistedRecord(
          session, schema, String(mutation.id),
        );
        return {
          success: true,
          id: String(mutation.id),
          version: Number(persistedRecord.version),
          persistedRecord,
        };
      }

      if (mutation.action === 'Delete') {
        const versionColumn = this.driver.identifier('version');
        const values: any[] = [String(mutation.id)];
        const predicates = [
          `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`,
        ];
        if (mutation.version !== undefined && mutation.version !== null) {
          values.push(Number(mutation.version));
          predicates.push(
            `${this.driver.identifier('version')} = ` +
            this.driver.placeholder(values.length),
          );
        }
        const sql = `UPDATE ${table} SET ${versionColumn} = -(${versionColumn} + 1) ` +
          `WHERE ${predicates.join(' AND ')}`;
        const startedAt = Date.now();
        const result = await session.query(sql, values);
        this.recordSQL('delete', sql, values, startedAt, undefined, result.rowCount);
        if (result.rowCount !== 1) {
          throw new Error(
            `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`,
          );
        }
        const persistedRecord = await this.readPersistedRecord(
          session, schema, String(mutation.id),
        );
        return {
          success: true,
          id: String(mutation.id),
          version: Number(persistedRecord.version),
          deleted: true,
          persistedRecord,
        };
      }

      throw new Error(`Unsupported mutation action: ${mutation.action}`);
      }));
      const event = Object.freeze({
        entity: mutation.entity,
        action: mutation.action,
        id: String(result.id),
        reason: String(mutation.comment),
        recordedAt: new Date().toISOString(),
      });
      this.auditEvents.push(event);
      if (this.auditSink) {
        await observeRuntimeOperation(this.runtimeTelemetry, {
          family: 'audit',
          name: `${mutation.entity}.audit`,
          attributes: {
            'teaql.entity.type': String(mutation.entity),
            'teaql.mutation.kind': String(mutation.action).toLowerCase(),
            'teaql.audit.changed_field_count': Object.keys(mutation.payload || {}).length,
          },
        }, async () => this.auditSink!(event));
      }
      scope.success();
      return result;
    } catch (error) {
      scope.failure(error);
      throw error;
    }
  }

  private async readPersistedRecord(
    session: SqlSession, schema: EntitySchema, id: string,
  ): Promise<Record<string, unknown>> {
    const projection = Object.entries(schema.columns).map(([field, column]) =>
      `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`,
    ).join(', ');
    const result = await session.query(
      `SELECT ${projection} FROM ${this.driver.identifier(schema.table)} WHERE ` +
      `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`,
      [id],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Persisted ${schema.table}(${id}) could not be read back`);
    }
    return this.decodeRowForSchema(schema, result.rows[0]);
  }

  private decodeRowForSchema(schema: EntitySchema, row: any): Record<string, unknown> {
    const result = { ...row };
    for (const [field, column] of Object.entries(schema.columns)) {
      const value = result[field];
      if (value === null || value === undefined) continue;
      if (column.decode === 'number') result[field] = Number(value);
      if (column.decode === 'string') result[field] = String(value);
      if (column.decode === 'date' && value instanceof Date) result[field] = value.toISOString();
      if (column.logicalType === 'boolean') result[field] = Boolean(value);
    }
    return result;
  }

  private compileExpression(
    expression: any,
    schema: EntitySchema,
    values: any[],
  ): string {
    if (Array.isArray(expression?.$and)) {
      const parts = expression.$and.map((item: any) =>
        this.compileExpression(item, schema, values),
      );
      return `(${parts.join(' AND ')})`;
    }
    const parts = Object.entries(expression || {}).map(
      ([field, predicate]: [string, any]) => {
        const column = schema.columns[field];
        if (!column) throw new Error(`Unknown field ${field} for SQL query`);
        const quotedField = this.driver.identifier(column.columnName);
        if (predicate?.$eq !== undefined) {
          const value = predicate.$eq?.id ?? predicate.$eq;
          if (value === null) return `${quotedField} IS NULL`;
          values.push(this.encode(value, column));
          return `${quotedField} = ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$ne !== undefined) {
          const value = predicate.$ne?.id ?? predicate.$ne;
          if (value === null) return `${quotedField} IS NOT NULL`;
          values.push(this.encode(value, column));
          return `${quotedField} <> ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$soundLike !== undefined) {
          values.push(String(predicate.$soundLike));
          return `SOUNDEX(${quotedField}) = SOUNDEX(${this.driver.placeholder(values.length)})`;
        }
        if (predicate?.$contains !== undefined) {
          values.push(String(predicate.$contains));
          return this.driver.contains(
            quotedField,
            this.driver.placeholder(values.length),
          );
        }
        if (predicate?.$notContains !== undefined) {
          values.push(String(predicate.$notContains));
          return `NOT (${this.driver.contains(quotedField, this.driver.placeholder(values.length))})`;
        }
        for (const [operator, prefix, suffix, negative] of [
          ['$startsWith', '', '%', false],
          ['$notStartsWith', '', '%', true],
          ['$endsWith', '%', '', false],
          ['$notEndsWith', '%', '', true],
        ] as const) {
          if (predicate?.[operator] !== undefined) {
            values.push(`${prefix}${String(predicate[operator])}${suffix}`);
            const like = `${quotedField} LIKE ${this.driver.placeholder(values.length)}`;
            return negative ? `NOT (${like})` : like;
          }
        }
        if (Array.isArray(predicate?.$in)) {
          if (!predicate.$in.length) return 'FALSE';
          const placeholders = predicate.$in.map((value: any) => {
            values.push(this.encode(value?.id ?? value, column));
            return this.driver.placeholder(values.length);
          });
          return `${quotedField} IN (${placeholders.join(', ')})`;
        }
        if (Array.isArray(predicate?.$notIn)) {
          if (!predicate.$notIn.length) return 'TRUE';
          const placeholders = predicate.$notIn.map((value: any) => {
            values.push(this.encode(value?.id ?? value, column));
            return this.driver.placeholder(values.length);
          });
          return `${quotedField} NOT IN (${placeholders.join(', ')})`;
        }
        for (const [operator, negative] of [
          ['$inSubquery', false],
          ['$notInSubquery', true],
        ] as const) {
          const subquery = predicate?.[operator];
          if (subquery !== undefined) {
            const childQuery = subquery.query;
            const childSchema = this.schema(childQuery?.entity);
            const projectedField = String(subquery.field);
            const projectedColumn = childSchema.columns[projectedField];
            if (!projectedColumn) {
              throw new Error(
                `Unknown subquery projection ${projectedField} for ${childQuery?.entity}`,
              );
            }
            const childPredicates = this.filters(childQuery).map(item =>
              this.compileExpression(item, childSchema, values),
            );
            if (childSchema.columns.version) {
              childPredicates.push(
                `${this.driver.identifier(childSchema.columns.version.columnName)} > 0`,
              );
            }
            // A NULL projected by a NOT IN subquery makes the predicate
            // UNKNOWN for every outer row. Orphan relations are handled by
            // the explicit unknown predicate and must not poison HaveNo or
            // negative relation matching.
            if (negative) {
              childPredicates.push(
                `${this.driver.identifier(projectedColumn.columnName)} IS NOT NULL`,
              );
            }
            const where = childPredicates.length
              ? ` WHERE ${childPredicates.join(' AND ')}`
              : '';
            const sql = `SELECT ${this.driver.identifier(projectedColumn.columnName)} ` +
              `FROM ${this.driver.identifier(childSchema.table)}${where}`;
            return `${quotedField} ${negative ? 'NOT IN' : 'IN'} (${sql})`;
          }
        }
        if (Array.isArray(predicate?.$between) && predicate.$between.length === 2) {
          values.push(this.encode(predicate.$between[0], column));
          const lower = this.driver.placeholder(values.length);
          values.push(this.encode(predicate.$between[1], column));
          const upper = this.driver.placeholder(values.length);
          return `${quotedField} BETWEEN ${lower} AND ${upper}`;
        }
        if (predicate?.$isNull === true) return `${quotedField} IS NULL`;
        if (predicate?.$isNull === false) return `${quotedField} IS NOT NULL`;
        if (predicate?.$gte !== undefined) {
          values.push(this.encode(predicate.$gte, column));
          return `${quotedField} >= ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$lte !== undefined) {
          values.push(this.encode(predicate.$lte, column));
          return `${quotedField} <= ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$gt !== undefined) {
          values.push(this.encode(predicate.$gt, column));
          return `${quotedField} > ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$lt !== undefined) {
          values.push(this.encode(predicate.$lt, column));
          return `${quotedField} < ${this.driver.placeholder(values.length)}`;
        }
        throw new Error(`Unsupported query predicate for ${field}: ${JSON.stringify(predicate)}`);
      },
    );
    return parts.length ? `(${parts.join(' AND ')})` : 'TRUE';
  }

  private filters(query: any): any[] {
    if (Array.isArray(query._filters) && query._filters.length) return query._filters;
    return query.filterCondition ? [query.filterCondition] : [];
  }

  private groupBy(query: any): string[] {
    return query._groupBy || query.groupByItems || [];
  }

  private aggregates(query: any): NormalizedAggregate[] {
    if (Array.isArray(query._aggregates)) return query._aggregates;
    return (query.aggregateItems || []).map((aggregate: any) => ({
      func: aggregate.function,
      field: aggregate.field,
      retName: aggregate.alias,
    }));
  }

  private orders(query: any): NormalizedOrder[] {
    if (Array.isArray(query._orderBy)) {
      return query._orderBy.map((order: any) => ({
        field: order.f,
        direction: order.d,
      }));
    }
    return (query.orderItems || []).map((order: any) => ({
      field: order.field,
      direction: order.direction,
    }));
  }

  private async compileQuery(query: any): Promise<{
    sql: string;
    values: any[];
    aggregateNames: string[];
  }> {
    const internal = query?.[this.internalQueryToken] === true;
    const purpose = query?._purpose ?? query?.purposeText;
    const comment = query?._comment ?? query?.commentText;
    if (!internal && (!String(purpose || '').trim() || !String(comment || '').trim())) {
      throw new Error('Security audit failure: purpose and comment are required before query execution');
    }
    const schema = this.schema(query.entity);
    const values: any[] = [];
    const groupProperties = this.groupBy(query);
    const groupFields = groupProperties.map(field => {
      if (!schema.columns[field]) throw new Error(`Unknown group field: ${field}`);
      return this.driver.identifier(schema.columns[field].columnName);
    });
    const groupProjection = groupProperties.map(field =>
      `${this.driver.identifier(schema.columns[field].columnName)} AS ` +
      this.driver.identifier(field),
    );
    const aggregateNames: string[] = [];
    const requestedFields = Array.isArray(query.selectItems) && query.selectItems.length
      ? [...new Set(['id', 'version', ...query.selectItems])]
      : Object.keys(schema.columns);
    for (const field of requestedFields) {
      if (!schema.columns[field]) throw new Error(`Unknown selected field: ${field}`);
    }
    let projection = requestedFields.map(field => {
      const column = schema.columns[field];
      return `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`;
    }).join(', ');
    const aggregates = this.aggregates(query);
    if (aggregates.length) {
      const aggregateProjection = aggregates.map(aggregate => {
        if (!schema.columns[aggregate.field]) {
          throw new Error(`Unknown aggregate field: ${aggregate.field}`);
        }
        aggregateNames.push(aggregate.retName);
        return `${this.driver.aggregateFunction(aggregate.func)}(` +
          `${this.driver.identifier(schema.columns[aggregate.field].columnName)}) AS ` +
          this.driver.identifier(aggregate.retName);
      });
      projection = [...groupProjection, ...aggregateProjection].join(', ');
    }

    const partitionBy = query.__teaqlPartitionBy as string | undefined;
    const orders = this.orders(query);
    const orderClauses = orders.map(order => {
      if (!schema.columns[order.field]) {
        throw new Error(`Unknown order field: ${order.field}`);
      }
      const direction = String(order.direction).toLowerCase() === 'desc'
        ? 'DESC'
        : 'ASC';
      return `${this.driver.identifier(schema.columns[order.field].columnName)} ${direction}`;
    });
    if (partitionBy) {
      const partitionColumn = schema.columns[partitionBy];
      if (!partitionColumn) throw new Error(`Unknown partition field: ${partitionBy}`);
      const windowOrder = orderClauses.length ? ` ORDER BY ${orderClauses.join(', ')}` : '';
      projection += `, ROW_NUMBER() OVER (PARTITION BY ` +
        `${this.driver.identifier(partitionColumn.columnName)}${windowOrder}) AS ` +
        this.driver.identifier('__teaql_partition_rank');
    }

    let sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)}`;
    const filters = this.filters(query);
    const predicates = filters.map(expression =>
      this.compileExpression(expression, schema, values),
    );
    if (schema.columns.version) {
      predicates.push(
        `${this.driver.identifier(schema.columns.version.columnName)} > 0`,
      );
    }
    if (predicates.length) {
      sql += ` WHERE ${predicates.join(' AND ')}`;
    }
    if (groupFields.length) sql += ` GROUP BY ${groupFields.join(', ')}`;
    const limit = query._limit !== undefined
      ? Number(query._limit)
      : Number(query.limitValue || 0);
    const offset = query._offset !== undefined
      ? Number(query._offset)
      : Number(query.offsetValue || 0);
    if (partitionBy) {
      const rank = this.driver.identifier('__teaql_partition_rank');
      const predicates: string[] = [];
      values.push(offset);
      predicates.push(`${rank} > ${this.driver.placeholder(values.length)}`);
      if (limit > 0) {
        values.push(offset + limit);
        predicates.push(`${rank} <= ${this.driver.placeholder(values.length)}`);
      }
      sql = `SELECT * FROM (${sql}) AS ${this.driver.identifier('__teaql_partitioned')} ` +
        `WHERE ${predicates.join(' AND ')} ORDER BY ${rank}`;
    } else if (orders.length) {
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    if (!partitionBy && limit > 0) {
      values.push(limit);
      sql += ` LIMIT ${this.driver.placeholder(values.length)}`;
    }
    if (!partitionBy && offset > 0) {
      values.push(offset);
      sql += ` OFFSET ${this.driver.placeholder(values.length)}`;
    }
    this.sqlTrace.push(sql);
    return { sql, values, aggregateNames };
  }

  async executeQuery<T = any>(query: any): Promise<T[]> {
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: 'query',
      name: `${String(query?.entity || 'unknown')}.list`,
      attributes: { 'teaql.entity.type': String(query?.entity || 'unknown') },
    });
    try {
    const internal = query?.[this.internalQueryToken] === true;
    if (!internal) {
      if (typeof query?.prepareForList !== 'function') {
        throw new Error('TeaQL list execution requires the formal runtime SelectQuery');
      }
      query.prepareForList();
    }
    const prepared = internal ? { query, execution: undefined } : await this.prepareContinuousPage(query);
    query = prepared.query;
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    const startedAt = Date.now();
    const result = await observeRuntimeOperation(this.runtimeTelemetry, {
      family: 'provider',
      name: `${this.driver.databaseKind}.query`,
      attributes: {
        'teaql.provider.kind': this.driver.databaseKind,
        'teaql.provider.operation': 'query',
      },
    }, () => this.driver.query(sql, values));
    this.recordSQL('select', sql, values, startedAt, result.rowCount);
    const rows = result.rows.map(row =>
      this.decodeRow(query.entity, row, aggregateNames),
    );
    await this.enhanceRelations(rows, query);
    if (!internal) await this.registerContinuousPage(query, prepared.execution, rows);
    scope.success({ attributes: { 'teaql.result.cardinality': rows.length } });
    return rows as T[];
    } catch (error) {
      scope.failure(error);
      throw error;
    }
  }

  async executeFacetMembership(
    outerQuery: SelectQuery,
    relationName: string,
  ): Promise<Map<string, number>> {
    const query = outerQuery.clone();
    query.facets = [];
    query.relations = [];
    query.orderItems = [];
    query.offsetValue = 0;
    query.limitValue = 0;
    query.selectItems = [];
    query.groupByItems = [relationName];
    query.aggregateItems = [{ function: 'Count', field: 'id', alias: '__teaql_facet_count' }];
    (query as any)[this.internalQueryToken] = true;
    const rows = await this.executeQuery<Record<string, unknown>>(query);
    return new Map(rows.flatMap(row => {
      const value = row[relationName];
      const count = Number(row.__teaql_facet_count ?? 0);
      return value === null || value === undefined ? [] : [[String(value), count]];
    }));
  }

  async executeCount(query: any): Promise<number> {
    if (typeof query?.forExactCount !== 'function') {
      throw new Error('TeaQL exact count requires the formal runtime SelectQuery');
    }
    const alias = '__teaql_total';
    const rows = await this.executeQuery<Record<string, unknown>>(query.forExactCount(alias));
    const value = rows[0]?.[alias];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`TeaQL provider did not return exact count alias ${alias}`);
    }
    return value;
  }

  private async prepareContinuousPage(query: any): Promise<{ query: any; execution?: any }> {
    const options = query.localContinuousPageOptions?.();
    const runtime = query.localContinuousPageRuntime?.();
    if (!options || !runtime) { runtime?.observe('DISABLED'); return { query }; }
    const orders = this.orders(query);
    const limit = this.queryLimit(query);
    if (!limit || orders.length !== 1 || orders[0].field !== 'id' || this.aggregates(query).length || this.groupBy(query).length || query.__teaqlPartitionBy) {
      runtime.observe('OFFSET_FALLBACK:UNSUPPORTED_QUERY_SHAPE'); return { query };
    }
    const clone = Object.assign(Object.create(Object.getPrototypeOf(query)), query);
    clone.orderItems = [...(query.orderItems || [])]; clone.relations = [...(query.relations || [])];
    Object.defineProperty(clone, 'continuousPageFetchOptions', { enumerable: false, writable: true, value: options });
    Object.defineProperty(clone, 'continuousPageRuntimeContext', { enumerable: false, writable: true, value: runtime });
    const offset = Number(query.offsetValue || query._offset || 0);
    const normalized = { ...JSON.parse(JSON.stringify(clone)), offsetValue: 0, _offset: 0, commentText: undefined, purposeText: undefined };
    const rawKey = `${options.namespace}|${runtime.owner}|${JSON.stringify(normalized)}`;
    let hash = 2166136261; for (let i = 0; i < rawKey.length; i++) hash = Math.imul(hash ^ rawKey.charCodeAt(i), 16777619);
    const queryKey = `teaql:continuous-page:v1:${(hash >>> 0).toString(16)}`;
    const execution: any = { queryKey, offset, limit, direction: String(orders[0].direction).toLowerCase(), ttlSeconds: options.ttlSeconds, runtime, optimized: false };
    if (offset === 0) { runtime.observe('OFFSET_FALLBACK:FIRST_PAGE'); return { query: clone, execution }; }
    let cursor: any; try {
      cursor = await observeRuntimeOperation(this.runtimeTelemetry, {
        family: 'cache',
        name: 'continuous_page.get',
        attributes: { 'teaql.cache.operation': 'get' },
      }, () => runtime.get(queryKey, offset));
    } catch { runtime.observe('OFFSET_FALLBACK:STORE_UNAVAILABLE'); return { query: clone, execution }; }
    if (!cursor) { runtime.observe('OFFSET_FALLBACK:CACHE_MISS'); return { query: clone, execution }; }
    const seek = { id: { [execution.direction === 'desc' ? '$lt' : '$gt']: cursor.boundary } };
    clone.filterCondition = clone.filterCondition ? { $and: [clone.filterCondition, seek] } : seek;
    clone.offsetValue = 0; if (clone._offset !== undefined) clone._offset = 0;
    execution.optimized = true; execution.cursorId = cursor.cursorId;
    runtime.observe('CURSOR_SEEK', cursor.cursorId);
    return { query: clone, execution };
  }

  private async registerContinuousPage(_query: any, execution: any, rows: any[]): Promise<void> {
    if (!execution || rows.length !== execution.limit || !rows.length || rows[rows.length - 1].id === undefined) return;
    try {
      await observeRuntimeOperation(this.runtimeTelemetry, {
        family: 'cache',
        name: 'continuous_page.put',
        attributes: { 'teaql.cache.operation': 'put' },
      }, () => execution.runtime.put(execution.queryKey, execution.offset + rows.length, {
        cursorId: `cpg_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`,
        boundary: rows[rows.length - 1].id,
        expiresAt: Date.now() + execution.ttlSeconds * 1000,
      }));
    } catch { execution.runtime.observe('OFFSET_FALLBACK:STORE_UNAVAILABLE'); return; }
    if (execution.optimized) execution.runtime.observe('CURSOR_SEEK', execution.cursorId);
  }

  async *executeForStream<T = any>(query: any, chunkSize = 1000): AsyncIterable<T[]> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('stream chunk size must be a positive integer');
    }
    if (Array.isArray(query.facets) && query.facets.length > 0) {
      throw new Error('QRY-F01_STREAM_UNSUPPORTED: execute facets with executeForList');
    }
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    let chunk: any[] = [];
    for await (const rawRow of this.driver.stream(sql, values)) {
      chunk.push(this.decodeRow(query.entity, rawRow, aggregateNames));
      if (chunk.length === chunkSize) {
        await this.enhanceRelations(chunk, query);
        yield chunk as T[];
        chunk = [];
      }
    }
    if (chunk.length) {
      await this.enhanceRelations(chunk, query);
      yield chunk as T[];
    }
  }

  private async enhanceRelations(parents: any[], query: any): Promise<void> {
    if (!parents.length || !Array.isArray(query.relations) || !query.relations.length) return;
    const parentSchema = this.schema(query.entity);
    for (const load of query.relations) {
      const relationScope = startRuntimeOperation(this.runtimeTelemetry, {
        family: 'relation_load',
        name: `${query.entity}.${String(load.name)}`,
        attributes: {
          'teaql.entity.type': String(query.entity),
          'teaql.relation.name': String(load.name),
        },
      });
      try {
      const relation = parentSchema.relations?.[load.name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${load.name}`);
      const parentIds = parents
        .map(parent => parent[relation.localKey])
        .filter(value => value !== undefined && value !== null);
      if (!parentIds.length) {
        for (const parent of parents) parent[load.name] = relation.many ? [] : null;
        continue;
      }
      const childQuery = {
        ...(load.query || {}),
        entity: relation.targetEntity,
        _filters: [...this.filters(load.query || {})],
        relations: [...(load.query?.relations || [])],
        __teaqlPartitionBy: load.query && this.queryLimit(load.query) !== undefined
          ? relation.foreignKey
          : undefined,
      };
      if (typeof childQuery.clearContinuousPageRuntime === 'function') childQuery.clearContinuousPageRuntime();
      childQuery[this.internalQueryToken] = true;
      childQuery._filters.push({ [relation.foreignKey]: { $in: parentIds } });
      const children = await this.executeQuery<any>(childQuery);
      for (const child of children) delete child.__teaql_partition_rank;
      const buckets = new Map<any, any[]>();
      for (const child of children) {
        const key = child[relation.foreignKey];
        const bucket = buckets.get(key) || [];
        bucket.push(child);
        buckets.set(key, bucket);
      }
      for (const parent of parents) {
        const related = buckets.get(parent[relation.localKey]) || [];
        parent[load.name] = relation.many ? related : (related[0] ?? null);
      }
      relationScope.success({ attributes: { 'teaql.result.cardinality': children.length } });
      } catch (error) {
        relationScope.failure(error);
        throw error;
      }
    }
  }

  private queryLimit(query: any): number | undefined {
    if (query._limit !== undefined) return Number(query._limit);
    if (query.limitValue !== undefined && Number(query.limitValue) > 0) {
      return Number(query.limitValue);
    }
    return undefined;
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}

export function assertSafeIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return value;
}

export function standardAggregateFunction(name: string): string {
  const functions: Record<string, string> = {
    count: 'COUNT',
    sum: 'SUM',
    avg: 'AVG',
    min: 'MIN',
    max: 'MAX',
  };
  const sqlFunction = functions[String(name).toLowerCase()];
  if (!sqlFunction) throw new Error(`Unsupported aggregate: ${name}`);
  return sqlFunction;
}
