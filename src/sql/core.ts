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
import { OrderBy, SelectQuery } from '../core/ast';
import { GraphCommittedError, GraphMutationSession, MutationIntent, MutationRequest, QueryIntent, QueryRequest } from '../core/request-intent';
import { canonicalSQLTracePath, cloneTraceNodes, queryTraceSource, TraceNode } from '../core/trace-chain';
import { projectSQLLog, logValueStrings, scrubLogText, credentialName, inheritSQLLogBindings, retainSQLLogProvenance } from '../core/log-privacy';
import type { SQLLogBindingSource } from '../core/log-privacy';
import { SQLDatabaseKind, SQLParameterLogPolicy } from './log-rendering';
import { queryDiagnosticOrigin, retainQueryDiagnosticOrigin } from '../core/query-snapshot';
import { executeRelationFacets } from '../core/facet';
import { SmartList } from '../core/smart-list';

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
  nullable?: boolean;
  /** Trusted model/application log policy, never taken from a query payload. */
  logPolicy?: SQLParameterLogPolicy;
};

export type EntitySchema = {
  table: string;
  columns: Record<string, ColumnSchema>;
  relations?: Record<string, RelationSchema>;
  auditMaskFields?: readonly string[];
};

export type RelationSchema = {
  targetEntity: string;
  localKey: string;
  foreignKey: string;
  many: boolean;
};

export type CanonicalRelationIndex = {
  name: string;
  table: string;
  foreignColumn: string;
  idColumn: string;
};

/** Canonical index for recent-child Top-N. Custom ordering needs an explicit model index. */
export function canonicalRelationIndexes(
  schemas: Record<string, EntitySchema>,
): CanonicalRelationIndex[] {
  const indexes = new Map<string, CanonicalRelationIndex>();
  for (const schema of Object.values(schemas)) {
    for (const relation of Object.values(schema.relations || {})) {
      if (!relation.many) continue;
      const target = schemas[relation.targetEntity];
      const foreignColumn = target?.columns[relation.foreignKey]?.columnName;
      const idColumn = target?.columns.id?.columnName;
      if (!target || !foreignColumn || !idColumn) continue;
      const raw = `idx_${target.table}_${foreignColumn}_${idColumn}`;
      let hash = 2166136261;
      for (let i = 0; i < raw.length; i += 1) {
        hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
      }
      const suffix = (hash >>> 0).toString(36);
      const name = raw.length <= 30
        ? raw
        : `${raw.slice(0, Math.max(1, 29 - suffix.length))}_${suffix}`;
      indexes.set(name, { name, table: target.table, foreignColumn, idColumn });
    }
  }
  return [...indexes.values()];
}

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
  /** Trusted internal result; use policy projection before diagnostics. */
  metadata?: SQLExecutionMetadata;
};

export interface SqlSession {
  query(sql: string, values?: any[]): Promise<SqlQueryResult>;
}

export interface TeaQLSqlDriver extends SqlSession {
  readonly databaseKind: SQLDatabaseKind;
  readonly topNRelationPlanPolicy?: 'window' | 'alwaysProbe';
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

function sameBootstrapValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Date) left = left.getTime();
  if (right instanceof Date) right = right.getTime();
  return left !== null && left !== undefined && right !== null && right !== undefined &&
    String(left) === String(right);
}

export interface TeaQLDataService {
  executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T>;
  preflightMutation(mutation: any): any;
  afterGraphCommit(work: () => void): void;
  afterGraphRollback(work: () => void): void;
  executeMutation(mutation: any): Promise<MutationResult>;
  executeQuery<T = any>(query: any): Promise<T[]>;
  executeCount(query: any): Promise<number>;
  executeForStream<T = any>(query: any, chunkSize?: number): AsyncIterable<T[]>;
  executeFacetMembership?(outerQuery: any, relationName: string): Promise<Map<string, number>>;
  close?(): Promise<void>;
}

export type SQLExecutionOperation = 'select' | 'insert' | 'update' | 'delete';
/** Statement/cursor completion, not transaction commit or business success. */
export type SQLExecutionOutcome = 'success' | 'failure' | 'cancelled';

type SQLLogIntent = { comment?: string; purpose?: string; auditReason?: string; tracePath?: readonly SQLTraceFrame[];
  mutationLineage?: readonly TraceNode[];
  inheritedBindings?: SQLLogBindingSource;
  /** Compiler-only target ID for free-text projection; never included in log metadata. */
  targetID?: unknown };

export type SQLTraceFrame = TraceNode & Readonly<{
  level: number;
}>;

function sqlTraceFrames(source: readonly TraceNode[]): readonly SQLTraceFrame[] {
  return Object.freeze(source.map((node, level) => Object.freeze({ ...node, level })));
}

function mutationLogIntent(request: MutationRequest<any>, mutation: any, provider: string,
  operation: SQLExecutionOperation, id: string, localBindings: SQLLogBindingSource): SQLLogIntent {
  const lineage = request.traceFor({ entity: String(mutation.entity), id });
  const path = canonicalSQLTracePath([...lineage, { kind: 'entity', name: String(mutation.entity),
    entityId: id, detail: '' }], provider, operation);
  return { auditReason: request.comment, tracePath: sqlTraceFrames(path.tracePath),
    mutationLineage: lineage, targetID: id,
    inheritedBindings: inheritSQLLogBindings(localBindings, request.graphSession?.logBindings) };
}

export type SQLExecutionMetadata = Readonly<{
  /** Ordered physical children of a logical mutation result. */
  statements?: readonly SQLExecutionMetadata[];
  operation: SQLExecutionOperation;
  executionOutcome?: SQLExecutionOutcome;
  comment?: string;
  purpose?: string;
  auditReason?: string;
  tracePath: readonly SQLTraceFrame[];
  /** Business responsibility, not the physical SQL route. */
  mutationLineage?: readonly TraceNode[];
  parameterizedSQL: string;
  parameters: readonly unknown[];
  /** SQL with bind values rendered as literals, intended only for diagnostics. */
  debugSQL: string;
  databaseKind?: SQLDatabaseKind;
  parameterLogPolicies?: readonly SQLParameterLogPolicy[];
  /** Set by the runtime SQL compiler, not by the incoming Q/TFP request. */
  sqlOrigin?: 'generated';
  maskedParameters?: readonly boolean[];
  logMode?: 'masked' | 'debug-plaintext';
  omissionReason?: 'untrusted-literal-sql' | 'policy-count-mismatch' | 'unsupported-or-mismatched-bindings';
  elapsedMicros: number;
  resultCount?: number;
  affectedRows?: number;
  resultSummary: string;
}>;

export { debugSQL, SQLDatabaseKind } from './log-rendering';

export interface RuntimeTelemetrySink {
  record(metadata: SQLExecutionMetadata): void;
}

/**
 * Policy-projected SQL diagnostic surface. Values are redacted by default;
 * selecting a custom sink does not grant plaintext access.
 */
export interface DiagnosticSQLLogSink {
  write(metadata: SQLExecutionMetadata): void;
}

export class TextDiagnosticSQLLogSink implements DiagnosticSQLLogSink {
  constructor(private readonly writer: (text: string) => void = text => console.debug(text)) {}

  write(metadata: SQLExecutionMetadata): void {
    metadata = projectSQLLog(metadata);
    this.writer(
      `[TeaQL SQL][${metadata.operation}][${metadata.elapsedMicros}us] ${metadata.resultSummary}` +
      `${metadata.executionOutcome ? ` outcome=${metadata.executionOutcome}` : ''}\n` +
      `comment=${metadata.comment ?? ''} purpose=${metadata.purpose ?? ''} ` +
      `auditReason=${metadata.auditReason ?? ''} tracePath=${diagnosticJSON(metadata.tracePath)}` +
      ` mutationLineage=${diagnosticJSON(metadata.mutationLineage ?? [])}\n` +
      (metadata.omissionReason ? `SQL omitted: ${metadata.omissionReason}\n` : '') +
      `Debug SQL: ${metadata.debugSQL}`,
    );
  }
}

function diagnosticJSON(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    typeof item === 'bigint' ? item.toString() : item);
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
// Private to one relation load. Keys never enter records, wire requests,
// mutation state or UserContext; null hydration cannot erase membership.
type RelationAssembly = { field: string; keys: WeakMap<object, unknown> };

export abstract class AbstractSQLTeaQLClient implements TeaQLDataService {
  private schemaReady?: Promise<void>;
  private bootstrapTail: Promise<void> = Promise.resolve();
  public readonly sqlTrace: string[] = [];
  private readonly internalQueryToken = Symbol('teaql-internal-query');
  private readonly bindLogPolicies = new WeakMap<readonly unknown[], SQLParameterLogPolicy[]>();
  private readonly derivedQueryBindings = new WeakMap<object, SQLLogBindingSource>();
  private readonly derivedRelationAssembly = new WeakMap<object, RelationAssembly>();

  private fieldLogPolicy(schema: EntitySchema, field: string): SQLParameterLogPolicy {
    const column = schema.columns[field];
    const name = column?.modelName ?? column?.columnName ?? field;
    if (credentialName(name) || credentialName(field)) return 'credential';
    if (!schema.auditMaskFields) return 'unknown';
    if (schema.auditMaskFields?.includes(name) || schema.auditMaskFields?.includes(field)) return 'masked';
    return column?.logPolicy ?? 'unknown';
  }

  private bindValue(values: any[], value: unknown, policy: SQLParameterLogPolicy): void {
    const policies = this.bindLogPolicies.get(values) ?? values.map(() => 'unknown' as const);
    values.push(value);
    policies.push(policy);
    this.bindLogPolicies.set(values, policies);
  }
  private readonly auditEvents: Readonly<Record<string, unknown>>[] = [];
  private auditSink?: (event: Readonly<Record<string, unknown>>) => void | Promise<void>;
  private telemetrySink?: RuntimeTelemetrySink;
  private diagnosticSQLLogSink?: DiagnosticSQLLogSink = new TextDiagnosticSQLLogSink();
  private queryLoggingEnabled = true;
  private mutationLoggingEnabled = true;
  private runtimeTelemetry?: RuntimeTelemetry;
  private readonly checkers: Record<string, EntityChecker> = {};
  private userContext = new UserContext();
  private bootstrap: RuntimeBootstrap = {};
  private graphMutationSession?: SqlSession;
  private activeGraph?: GraphMutationSession;
  private graphAuditActions: Array<() => Promise<void>> = [];
  private graphCommitActions: Array<() => void> = [];
  private graphRollbackActions: Array<() => void> = [];
  private graphSaveTail: Promise<void> = Promise.resolve();
  private readonly schemas: Record<string, EntitySchema>;

  protected constructor(
    protected readonly driver: TeaQLSqlDriver,
    schemas: Record<string, EntitySchema>,
  ) { this.schemas = { ...schemas }; }

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

  setDiagnosticSQLLogSink(sink: DiagnosticSQLLogSink | undefined): this {
    this.diagnosticSQLLogSink = sink;
    return this;
  }

  setQueryLoggingEnabled(enabled: boolean): this {
    this.queryLoggingEnabled = enabled;
    return this;
  }

  setMutationLoggingEnabled(enabled: boolean): this {
    this.mutationLoggingEnabled = enabled;
    return this;
  }

  setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this {
    this.runtimeTelemetry = telemetry;
    return this;
  }

  private recordSQL(
    operation: SQLExecutionOperation, parameterizedSQL: string, parameters: readonly unknown[],
    startedAt: number, resultCount?: number, affectedRows?: number,
    intent: SQLLogIntent = {},
    executionOutcome: SQLExecutionOutcome = 'success',
    inherited?: SQLLogBindingSource,
  ): SQLExecutionMetadata {
    const isSelect = operation === 'select';
    const logsEnabled = isSelect ? this.queryLoggingEnabled : this.mutationLoggingEnabled;
    const { targetID, inheritedBindings, ...visibleIntent } = intent;
    const metadata = Object.freeze({
      operation, ...visibleIntent, executionOutcome,
      tracePath: sqlTraceFrames(intent.tracePath ?? []),
      ...(intent.mutationLineage ? { mutationLineage: cloneTraceNodes(intent.mutationLineage) } : {}),
      parameterizedSQL, parameters: Object.freeze([...parameters]),
      // Never build a plaintext SQL copy before the log policy boundary.
      debugSQL: '', databaseKind: this.driver.databaseKind, sqlOrigin: 'generated' as const,
      parameterLogPolicies: Object.freeze([...(this.bindLogPolicies.get(parameters) ?? parameters.map(() => 'unknown' as const))]),
      elapsedMicros: Math.max(0, (Date.now() - startedAt) * 1_000),
      resultCount, affectedRows,
      resultSummary: resultCount !== undefined
        ? `${resultCount} rows returned` : affectedRows !== undefined ? `${affectedRows} rows affected`
          : `statement ${executionOutcome}; row count unknown`,
    });
    const provenance = inheritedBindings && inherited
      ? inheritSQLLogBindings(inherited, inheritedBindings) : inheritedBindings ?? inherited;
    retainSQLLogProvenance(metadata, provenance, targetID === undefined ? [] : [targetID]);
    if (!this.telemetrySink && !(logsEnabled && this.diagnosticSQLLogSink)) return metadata;
    try {
      const projected = projectSQLLog(metadata);
      // Runtime diagnostics are fail-open and each sink is independent. A
      // broken application sink must not roll back a successful SQL mutation.
      try { this.telemetrySink?.record(projected); } catch { /* diagnostic sink failed */ }
      if (logsEnabled) {
        try { this.diagnosticSQLLogSink?.write(projected); } catch { /* diagnostic sink failed */ }
      }
    } catch { /* projection failure must not alter database execution */ }
    return metadata;
  }

  private queryLogIntent(query: any): SQLLogIntent {
    const request = new QueryRequest(query);
    const path = canonicalSQLTracePath(request.traceSource, this.driver.databaseKind, 'select');
    return { comment: request.comment, purpose: request.purpose, tracePath: sqlTraceFrames(path.tracePath) };
  }

  private async executeLoggedSQL(
    operation: SQLExecutionOperation, sql: string, values: any[],
    intent: SQLLogIntent,
    execute: () => Promise<SqlQueryResult>,
    inherited?: SQLLogBindingSource,
    statements?: SQLExecutionMetadata[],
  ): Promise<SqlQueryResult> {
    const startedAt = Date.now();
    let result: SqlQueryResult;
    try { result = await execute(); }
    catch (error) {
      // No exception text/cause/driver object enters a diagnostic sink. Preserve
      // the original error for the caller, even if a sink itself is broken.
      try {
        const metadata = this.recordSQL(operation, sql, values, startedAt, undefined, undefined, intent, 'failure', inherited);
        statements?.push(metadata);
      }
      finally { throw error; }
    }
    const metadata = this.recordSQL(operation, sql, values, startedAt,
      operation === 'select' ? result.rowCount : undefined,
      operation === 'select' ? undefined : result.rowCount, intent, 'success', inherited);
    statements?.push(metadata);
    return result;
  }

  /** Package-internal physical capability used only by UserContext.ensureSchema(). */
  async [contextSchemaCapability](context: UserContext): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.driver.ensureSchema(this.schemas);
    }
    await this.schemaReady;
    const predecessor = this.bootstrapTail;
    let release!: () => void;
    this.bootstrapTail = new Promise<void>(resolve => { release = resolve; });
    await predecessor;
    this.userContext = context;
    const previousActor = context.getResource<string>('bootstrapActor');
    const previousCategory = context.getResource<string>('bootstrapCategory');
    context.insertResource('bootstrapActor', 'teaql-generated-bootstrap');
    context.insertResource('bootstrapCategory', 'runtime-bootstrap');
    try {
        if (this.bootstrap.ensure) {
          await this.bootstrap.ensure(context);
        } else {
          await this.ensureBootstrapData();
        }
    } finally {
      if (previousActor === undefined) context.removeResource('bootstrapActor');
      else context.insertResource('bootstrapActor', previousActor);
      if (previousCategory === undefined) context.removeResource('bootstrapCategory');
      else context.insertResource('bootstrapCategory', previousCategory);
      release();
    }
  }

  /** Allows a provider which replaces its physical store to require explicit schema reconciliation again. */
  protected invalidateSchemaState(): void {
    this.schemaReady = undefined;
  }

  private async ensureBootstrapData(): Promise<void> {
    const records = [
      ...(this.bootstrap.defaultDomainRoot ? [this.bootstrap.defaultDomainRoot] : []),
      ...(this.bootstrap.constants ?? []),
    ];
    if (!records.length) return;
    await this.executeGraphSave(new MutationIntent('reconcile model bootstrap data'), async graph => {
      for (const record of records) await this.reconcileBootstrapEntity(this.graphMutationSession!, graph, record);
    });
  }

  private async reconcileBootstrapEntity(session: SqlSession, graph: GraphMutationSession, record: BootstrapEntity): Promise<void> {
    const schema = this.schema(record.entity);
    const entries = Object.entries(record.values ?? {}).map(([field, value]) => {
      const column = schema.columns[field];
      if (!column) throw new Error(`Unknown bootstrap field ${record.entity}.${field}`);
      return {
        column: column.columnName,
        value: this.driver.encode(value, column),
      };
    });
    const query = new SelectQuery(record.entity).filter({ id: { $eq: record.id } }).limit(1)
      .comment('inspect model bootstrap record').purpose('ensure model-defined root and constants');
    query.prepareForList();
    const request = new QueryRequest(query);
    // Reconciliation must see an existing tombstone too. Normal list SQL adds
    // version > 0 and would attempt a duplicate INSERT for a deleted constant.
    // This fixed primary-key lookup still owns validated query intent and logs.
    const sql = `SELECT * FROM ${this.driver.identifier(schema.table)} WHERE ` +
      `${this.driver.identifier(schema.columns.id?.columnName ?? 'id')} = ${this.driver.placeholder(1)}`;
    const values = [record.id];
    this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, 'id')]);
    const current = await this.executeLoggedSQL('select', sql, values, this.queryLogIntent(request.query),
      () => session.query(sql, values));
    if (!current.rowCount) {
      await this.executeMutation(graph.request({ entity: record.entity, action: 'Create',
        id: record.id, version: 0, payload: { ...record.values } }));
    } else {
      const row = current.rows[0];
      const changed = entries.filter(entry => !sameBootstrapValue(row[entry.column], entry.value));
      if (changed.length) {
        // Checker sees the fully loaded object, not a partial update projection.
        await this.executeMutation(graph.request({ entity: record.entity, action: 'Update',
          id: record.id, version: Number(row[schema.columns.version?.columnName ?? 'version']),
          payload: { ...this.decodeRowForSchema(schema, row), ...record.values } }));
      }
    }
    await this.driver.ensureIdFloor(session, record.entity, record.id);
  }

  async executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T> {
    // Root intent is mandatory before lifecycle initialization or provider work.
    const graph = new GraphMutationSession(intent);
    // Generated child saves call their within-graph entry point directly. Every
    // public/root save comes through here and is queued, so an unrelated async
    // save cannot accidentally join another graph's transaction merely because
    // this client currently has an active session.
    const predecessor = this.graphSaveTail;
    let release!: () => void;
    this.graphSaveTail = new Promise<void>(resolve => { release = resolve; });
    await predecessor;
    let fixEvidenceStarted = false;
    let mutationPolicyGraphStarted = false;
    let committed = false;
    try {
      this.graphCommitActions = [];
      this.graphRollbackActions = [];
      this.graphAuditActions = [];
      this.userContext.insertResource('fixTime', new Date());
      this.userContext.beginFixEvidence();
      fixEvidenceStarted = true;
      this.userContext.beginMutationPolicyGraph();
      mutationPolicyGraphStarted = true;
      const result = await this.driver.transaction(async session => {
        this.graphMutationSession = session;
        this.activeGraph = graph;
        try {
          const value = await work(graph);
          this.userContext.ensureMutationPolicyGraphComplete();
          return value;
        }
        finally { this.graphMutationSession = undefined; this.activeGraph = undefined; }
      });
      committed = true;
      let failure: unknown;
      let failed = false;
      // Cleanup and other audit events must continue after one sink fails.
      for (const action of [...this.graphCommitActions, ...this.graphAuditActions]) {
        try { await action(); } catch (error) { if (!failed) failure = error; failed = true; }
      }
      if (failed) throw new GraphCommittedError(failure);
      return result;
    } catch (error) {
      if (!committed) {
        // Keep the original execution failure even if a restore callback fails.
        for (const action of [...this.graphRollbackActions].reverse()) {
          try { action(); } catch { /* independent rollback restorations continue */ }
        }
      }
      throw error;
    } finally {
      this.graphCommitActions = [];
      this.graphRollbackActions = [];
      this.graphAuditActions = [];
      if (mutationPolicyGraphStarted) this.userContext.endMutationPolicyGraph();
      this.userContext.removeResource('fixTime');
      if (fixEvidenceStarted) this.userContext.finishFixEvidence();
      release();
    }
  }

  afterGraphCommit(work: () => void): void {
    if (!this.graphMutationSession) throw new Error('No graph save is active');
    this.graphCommitActions.push(work);
  }

  afterGraphRollback(work: () => void): void {
    if (!this.graphMutationSession) throw new Error('No graph save is active');
    this.graphRollbackActions.push(work);
  }

  private requireGraphOwnership(request: MutationRequest<any>): void {
    if (request.graphSession !== this.activeGraph ||
        (this.graphMutationSession !== undefined && request.graphSession === undefined)) {
      throw new Error('GRAPH_MUTATION_SESSION_REQUIRED: use the explicit active graph request capability');
    }
  }

  private async withMutationSession<T>(request: MutationRequest<any>, work: (session: SqlSession) => Promise<T>): Promise<T> {
    this.requireGraphOwnership(request);
    return request.graphSession ? work(this.graphMutationSession!) : this.driver.transaction(work);
  }

  preflightMutation(mutation: any): any {
    const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
    this.requireGraphOwnership(request);
    mutation = this.checkAndFixMutation(request);
    if (request.graphSession) {
      const schema = this.schema(mutation.entity);
      request.graphSession.captureLogBindings(this.mutationLogBindings(request, mutation, schema));
    }
    this.userContext.recordMutationPolicyPreflight(mutation);
    return mutation;
  }

  private mutationLogBindings(request: MutationRequest<any>, mutation: any, schema: EntitySchema): SQLLogBindingSource {
    const source = (values: Record<string, unknown>): SQLLogBindingSource => {
      const record = this.toRuntimeMutationRecord(schema, values);
      const fields = Object.keys(record);
      return { parameterizedSQL: '', sqlOrigin: 'generated', parameters: fields.map(field => record[field]),
        parameterLogPolicies: fields.map(field => this.fieldLogPolicy(schema, field)) };
    };
    return inheritSQLLogBindings(source(mutation.payload || {}), source(request.loadedValues()));
  }

  private checkAndFixMutation(mutation: any): any {
    const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
    this.requireGraphOwnership(request);
    mutation = request.mutation;
    // The ledger exposes immutable snapshots. Fixers receive a mutable working
    // payload and every derived value is copied back into the graph ledger.
    mutation = { ...mutation, payload: { ...(mutation?.payload ?? {}) } };
    Object.defineProperty(mutation, 'comment', { value: request.comment, enumerable: true });
    const checker = this.checkers[String(mutation.entity)];
    if (!checker) return mutation;
    const results: import('../core/i18n').CheckResult[] = [];
    const ownsFixTime = this.userContext.getResource<Date>('fixTime') === undefined;
    if (ownsFixTime) this.userContext.insertResource('fixTime', new Date()).beginFixEvidence();
    try {
      checker.checkAndFix(this.userContext, mutation, results);
      if (mutation.ledgerKey && mutation.ledgerRoot) {
        for (const [field, value] of Object.entries(mutation.payload || {})) {
          mutation.ledgerRoot.set(mutation.ledgerKey, field, value);
        }
      }
      this.userContext.translateCheckResults(results);
      if (results.length) throw new CheckException(results);
      return mutation;
    } finally {
      if (ownsFixTime) this.userContext.removeResource('fixTime').finishFixEvidence();
    }
  }

  async executeMutation(mutation: any): Promise<MutationResult> {
    // Validate before Checker, policy, telemetry and transaction/provider work.
    const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
    this.requireGraphOwnership(request);
    mutation = request.mutation;
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: 'mutation',
      name: `${String(mutation?.entity || 'unknown')}.${String(mutation?.action || 'unknown').toLowerCase()}`,
      attributes: {
        'teaql.entity.type': String(mutation?.entity || 'unknown'),
        'teaql.mutation.kind': String(mutation?.action || 'unknown').toLowerCase(),
      },
    });
    try {
      mutation = this.checkAndFixMutation(request);
      const mutationGovernance = this.userContext.enterMutationPolicy(mutation);
      const schema = this.schema(mutation.entity);
      const mutationRecord = this.toRuntimeMutationRecord(schema, mutation.payload || {});
      const diagnosticBindings = this.mutationLogBindings(request, mutation, schema);
      const table = this.driver.identifier(schema.table);
      const statements: SQLExecutionMetadata[] = [];
      const result = await observeRuntimeOperation(this.runtimeTelemetry, {
        family: 'provider',
        name: `${this.driver.databaseKind}.mutation`,
        attributes: {
          'teaql.provider.kind': this.driver.databaseKind,
          'teaql.provider.operation': String(mutation.action).toLowerCase(),
        },
      }, () => this.withMutationSession(request, async session => {
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
        this.bindLogPolicies.set(values, fields.map(field => this.fieldLogPolicy(schema, field)));
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        const intent = mutationLogIntent(request, mutation, this.driver.databaseKind, 'insert', id, diagnosticBindings);
        await this.executeLoggedSQL('insert', sql, values, intent, () => session.query(sql, values), undefined, statements);
        return {
          success: true,
          id,
          version,
          persistedRecord: await this.readPersistedRecord(session, schema, id, intent, sql, values, statements),
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
        this.bindLogPolicies.set(values, fields.map(field => this.fieldLogPolicy(schema, field)));
        const assignments = fields.map((field, index) =>
          `${this.driver.identifier(schema.columns[field].columnName)} = ` +
          this.driver.placeholder(index + 1),
        );
        const versionColumn = this.driver.identifier('version');
        assignments.push(`${versionColumn} = ${versionColumn} + 1`);
        this.bindValue(values, String(mutation.id), this.fieldLogPolicy(schema, 'id'));
        const predicates = [
          `${this.driver.identifier('id')} = ${this.driver.placeholder(values.length)}`,
        ];
        if (mutation.version !== undefined && mutation.version !== null) {
          this.bindValue(values, Number(mutation.version), this.fieldLogPolicy(schema, 'version'));
          predicates.push(
            `${versionColumn} = ${this.driver.placeholder(values.length)}`,
          );
        }
        const sql = `UPDATE ${table} SET ${assignments.join(', ')} ` +
          `WHERE ${predicates.join(' AND ')}`;
        const intent = mutationLogIntent(request, mutation, this.driver.databaseKind, 'update', String(mutation.id), diagnosticBindings);
        const result = await this.executeLoggedSQL('update', sql, values, intent, () => session.query(sql, values), undefined, statements);
        if (result.rowCount !== 1) {
          throw new Error(
            `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`,
          );
        }
        const persistedRecord = await this.readPersistedRecord(
          session, schema, String(mutation.id), intent, sql, values, statements,
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
        this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, 'id')]);
        const predicates = [
          `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`,
        ];
        if (mutation.version !== undefined && mutation.version !== null) {
          this.bindValue(values, Number(mutation.version), this.fieldLogPolicy(schema, 'version'));
          predicates.push(
            `${this.driver.identifier('version')} = ` +
            this.driver.placeholder(values.length),
          );
        }
        const sql = `UPDATE ${table} SET ${versionColumn} = -(${versionColumn} + 1) ` +
          `WHERE ${predicates.join(' AND ')}`;
        const intent = mutationLogIntent(request, mutation, this.driver.databaseKind, 'delete', String(mutation.id), diagnosticBindings);
        const result = await this.executeLoggedSQL('delete', sql, values, intent, () => session.query(sql, values), undefined, statements);
        if (result.rowCount !== 1) {
          throw new Error(
            `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`,
          );
        }
        const persistedRecord = await this.readPersistedRecord(
          session, schema, String(mutation.id), intent, sql, values, statements,
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
      const auditProjection = request.auditProjection({ entity: String(mutation.entity), id: result.id }, mutation.payload, diagnosticBindings);
      const event = Object.freeze({
        entity: mutation.entity,
        action: mutation.action,
        id: String(result.id),
        ...auditProjection,
        recordedAt: new Date().toISOString(),
        actor: this.userContext.getResource<string>('bootstrapActor'),
        category: this.userContext.getResource<string>('bootstrapCategory'),
        changedFields: Object.freeze(Object.keys(mutation.payload || {}).sort()),
        version: result.version,
        mutationGovernance,
      });
      const publish = async () => {
        this.auditEvents.push(event);
        if (this.auditSink) await observeRuntimeOperation(this.runtimeTelemetry, {
          family: 'audit',
          name: `${mutation.entity}.audit`,
          attributes: {
            'teaql.entity.type': String(mutation.entity),
            'teaql.mutation.kind': String(mutation.action).toLowerCase(),
            'teaql.audit.changed_field_count': Object.keys(mutation.payload || {}).length,
          },
        }, async () => this.auditSink!(event));
      };
      if (request.graphSession) this.graphAuditActions.push(publish);
      else {
        try { await publish(); } catch (error) { throw new GraphCommittedError(error); }
      }
      scope.success();
      const metadata = Object.freeze({ ...statements[0], statements: Object.freeze([...statements]) });
      retainSQLLogProvenance(metadata, inheritSQLLogBindings(diagnosticBindings, request.graphSession?.logBindings), [result.id]);
      return { ...result, metadata };
    } catch (error) {
      scope.failure(error);
      throw error;
    }
  }

  private async readPersistedRecord(
    session: SqlSession, schema: EntitySchema, id: string,
    intent: SQLLogIntent, writeSQL: string, writeValues: any[],
    statements: SQLExecutionMetadata[],
  ): Promise<Record<string, unknown>> {
    const projection = Object.entries(schema.columns).map(([field, column]) =>
      `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`,
    ).join(', ');
    const sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)} WHERE ` +
      `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`;
    const values = [id];
    this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, 'id')]);
    const startedAt = Date.now();
    let result: SqlQueryResult | undefined;
    const inherited: SQLLogBindingSource = { parameterizedSQL: writeSQL, parameters: writeValues,
      parameterLogPolicies: this.bindLogPolicies.get(writeValues), sqlOrigin: 'generated' };
    const root = intent.tracePath?.find(node => node.kind === 'operation')?.name ?? 'unknown';
    const path = canonicalSQLTracePath([
      ...queryTraceSource(root, intent.auditReason!, 'verify persisted mutation result'),
      ...(intent.tracePath ?? []).filter(node => node.kind === 'relation'),
    ], this.driver.databaseKind, 'select');
    const readIntent = { ...intent, tracePath: sqlTraceFrames(path.tracePath),
      comment: intent.auditReason, purpose: 'verify persisted mutation result' };
    const recordReadback = (outcome: SQLExecutionOutcome) => statements.push(
      this.recordSQL('select', sql, values, startedAt, result?.rowCount, undefined, readIntent, outcome, inherited));
    let record: Record<string, unknown>;
    try {
      result = await session.query(sql, values);
      if (result.rowCount !== 1) throw new Error(`Persisted ${schema.table}(${id}) could not be read back`);
      record = this.decodeRowForSchema(schema, result.rows[0]);
    } catch (error) {
      // Write success remains a separate statement fact. A snapshot validation
      // failure means SELECT success with its real count, not a driver failure.
      const outcome: SQLExecutionOutcome = result ? 'success'
        : error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
          ? 'cancelled' : 'failure';
      try { recordReadback(outcome); } finally { throw error; }
    }
    recordReadback('success');
    return record;
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
        const logPolicy = this.fieldLogPolicy(schema, field);
        if (predicate?.$eq !== undefined) {
          const value = predicate.$eq?.id ?? predicate.$eq;
          if (value === null) return `${quotedField} IS NULL`;
          this.bindValue(values, this.encode(value, column), logPolicy);
          return `${quotedField} = ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$ne !== undefined) {
          const value = predicate.$ne?.id ?? predicate.$ne;
          if (value === null) return `${quotedField} IS NOT NULL`;
          this.bindValue(values, this.encode(value, column), logPolicy);
          return `${quotedField} <> ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$soundLike !== undefined) {
          this.bindValue(values, String(predicate.$soundLike), logPolicy);
          return `SOUNDEX(${quotedField}) = SOUNDEX(${this.driver.placeholder(values.length)})`;
        }
        if (predicate?.$contains !== undefined) {
          this.bindValue(values, String(predicate.$contains), logPolicy);
          return this.driver.contains(
            quotedField,
            this.driver.placeholder(values.length),
          );
        }
        if (predicate?.$notContains !== undefined) {
          this.bindValue(values, String(predicate.$notContains), logPolicy);
          return `NOT (${this.driver.contains(quotedField, this.driver.placeholder(values.length))})`;
        }
        for (const [operator, prefix, suffix, negative] of [
          ['$startsWith', '', '%', false],
          ['$notStartsWith', '', '%', true],
          ['$endsWith', '%', '', false],
          ['$notEndsWith', '%', '', true],
        ] as const) {
          if (predicate?.[operator] !== undefined) {
            this.bindValue(values, `${prefix}${String(predicate[operator])}${suffix}`, logPolicy);
            const like = `${quotedField} LIKE ${this.driver.placeholder(values.length)}`;
            return negative ? `NOT (${like})` : like;
          }
        }
        if (Array.isArray(predicate?.$in)) {
          if (!predicate.$in.length) return 'FALSE';
          const placeholders = predicate.$in.map((value: any) => {
            this.bindValue(values, this.encode(value?.id ?? value, column), logPolicy);
            return this.driver.placeholder(values.length);
          });
          return `${quotedField} IN (${placeholders.join(', ')})`;
        }
        if (Array.isArray(predicate?.$notIn)) {
          if (!predicate.$notIn.length) return 'TRUE';
          const placeholders = predicate.$notIn.map((value: any) => {
            this.bindValue(values, this.encode(value?.id ?? value, column), logPolicy);
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
          this.bindValue(values, this.encode(predicate.$between[0], column), logPolicy);
          const lower = this.driver.placeholder(values.length);
          this.bindValue(values, this.encode(predicate.$between[1], column), logPolicy);
          const upper = this.driver.placeholder(values.length);
          return `${quotedField} BETWEEN ${lower} AND ${upper}`;
        }
        if (predicate?.$isNull === true) return `${quotedField} IS NULL`;
        if (predicate?.$isNull === false) return `${quotedField} IS NOT NULL`;
        if (predicate?.$gte !== undefined) {
          this.bindValue(values, this.encode(predicate.$gte, column), logPolicy);
          return `${quotedField} >= ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$lte !== undefined) {
          this.bindValue(values, this.encode(predicate.$lte, column), logPolicy);
          return `${quotedField} <= ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$gt !== undefined) {
          this.bindValue(values, this.encode(predicate.$gt, column), logPolicy);
          return `${quotedField} > ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$lt !== undefined) {
          this.bindValue(values, this.encode(predicate.$lt, column), logPolicy);
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

  private async compileQuery(query: any, recordTrace = true): Promise<{
    sql: string;
    values: any[];
    aggregateNames: string[];
  }> {
    // Internal execution changes query shape/limits, never the intent contract.
    new QueryIntent(query?._comment ?? query?.commentText, query?._purpose ?? query?.purposeText);
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
      this.bindValue(values, offset, 'plain');
      predicates.push(`${rank} > ${this.driver.placeholder(values.length)}`);
      if (limit > 0) {
        this.bindValue(values, offset + limit, 'plain');
        predicates.push(`${rank} <= ${this.driver.placeholder(values.length)}`);
      }
      sql = `SELECT * FROM (${sql}) AS ${this.driver.identifier('__teaql_partitioned')} ` +
        `WHERE ${predicates.join(' AND ')} ORDER BY ${rank}`;
    } else if (orders.length) {
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    if (!partitionBy && limit > 0) {
      this.bindValue(values, limit, 'plain');
      sql += ` LIMIT ${this.driver.placeholder(values.length)}`;
    }
    if (!partitionBy && offset > 0) {
      this.bindValue(values, offset, 'plain');
      sql += ` OFFSET ${this.driver.placeholder(values.length)}`;
    }
    if (recordTrace) this.sqlTrace.push(sql);
    return { sql, values, aggregateNames };
  }

  async executeQuery<T = any>(query: any): Promise<T[]> {
    const request = query instanceof QueryRequest ? query : new QueryRequest(query);
    // Keep the existing builder hard-limit normalization contract. Intent is
    // already validated; the private execution snapshot is normalized again.
    if (!(query instanceof QueryRequest) && query?.[this.internalQueryToken] !== true
      && typeof query?.prepareForList === 'function') query.prepareForList();
    return this.executeQueryWithIntent<T>(request.query, this.derivedQueryBindings.get(query),
      this.derivedRelationAssembly.get(query));
  }

  private async executeDerivedQuery<T>(query: object, inherited: SQLLogBindingSource | undefined,
    intent: QueryIntent, assembly?: RelationAssembly): Promise<T[]> {
    // Only fresh execution-local child requests are registered. Keep virtual
    // executeQuery dispatch for existing subclasses; no provenance on wire data.
    const captured = new QueryRequest(query, intent).query;
    if (inherited) this.derivedQueryBindings.set(captured, inherited);
    if (assembly) this.derivedRelationAssembly.set(captured, assembly);
    try { return await this.executeQuery<T>(captured); }
    finally {
      this.derivedQueryBindings.delete(captured);
      this.derivedRelationAssembly.delete(captured);
    }
  }

  private descendantBindings(query: any, sql: string, values: any[], inherited?: SQLLogBindingSource): SQLLogBindingSource | undefined {
    if (!query.relations?.length && !query.relationAggregates?.length) return undefined;
    return inheritSQLLogBindings({ parameterizedSQL: sql, parameters: values,
      parameterLogPolicies: this.bindLogPolicies.get(values), sqlOrigin: 'generated' }, inherited);
  }

  private async queryTreeBindings(query: any, sql: string, values: any[], inherited?: SQLLogBindingSource): Promise<SQLLogBindingSource> {
    let source = inheritSQLLogBindings({ parameterizedSQL: sql, parameters: values,
      parameterLogPolicies: this.bindLogPolicies.get(values), sqlOrigin: 'generated' }, inherited);
    const intent = new QueryIntent(query._comment ?? query.commentText, query._purpose ?? query.purposeText);
    const stack: any[] = [query];
    const visited = new Set<object>();
    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      if (current !== query) {
        // Pure compilation, not a physical query or an sqlTrace entry.
        const compiled = await this.compileQuery(new QueryRequest(current, intent).query, false);
        source = inheritSQLLogBindings({ parameterizedSQL: compiled.sql, parameters: compiled.values,
          parameterLogPolicies: this.bindLogPolicies.get(compiled.values), sqlOrigin: 'generated' }, source);
      }
      const origin = queryDiagnosticOrigin(current);
      if (origin) stack.push(origin);
      for (const child of [...(current.relations ?? []), ...(current.relationAggregates ?? []), ...(current.facets ?? [])]) {
        if (child.query) stack.push(child.query);
      }
    }
    return source;
  }

  private async executeQueryWithIntent<T = any>(query: any, inherited?: SQLLogBindingSource,
    assembly?: RelationAssembly): Promise<T[]> {
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
    const idSetPrepared = internal ? { query, execution: undefined } : await this.prepareIdSetPage(query);
    const prepared = internal ? idSetPrepared : await this.prepareContinuousPage(idSetPrepared.query);
    query = new QueryRequest(query).withQuery(prepared.query).query;
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    inherited = await this.queryTreeBindings(query, sql, values, inherited);
    const result = await this.executeLoggedSQL('select', sql, values, this.queryLogIntent(query),
      () => observeRuntimeOperation(this.runtimeTelemetry, {
      family: 'provider',
      name: `${this.driver.databaseKind}.query`,
      attributes: {
        'teaql.provider.kind': this.driver.databaseKind,
        'teaql.provider.operation': 'query',
      },
    }, () => this.driver.query(sql, values)), inherited);
    const rows = result.rows.map(row =>
      this.decodeRow(query.entity, row, aggregateNames),
    );
    if (idSetPrepared.execution?.pageIds) {
      const positions = new Map<string, number>(
        idSetPrepared.execution.pageIds.map(
          (id: any, index: number): [string, number] => [String(id), index],
        ),
      );
      rows.sort((left: any, right: any) =>
        (positions.get(String(left.id)) ?? Number.MAX_SAFE_INTEGER)
        - (positions.get(String(right.id)) ?? Number.MAX_SAFE_INTEGER));
    }
    const descendantBindings = this.descendantBindings(query, sql, values, inherited);
    if (assembly) for (const row of rows) assembly.keys.set(row, row[assembly.field]);
    await this.enhanceQueryRows(rows, query, descendantBindings);
    if (!internal) await this.registerContinuousPage(query, prepared.execution, rows);
    scope.success({ attributes: { 'teaql.result.cardinality': rows.length } });
    return rows as T[];
    } catch (error) {
      scope.failure(error);
      throw error;
    }
  }

  private async prepareIdSetPage(query: any): Promise<{ query: any; execution?: any }> {
    const options = query.localIdSetPaginationOptions?.();
    const runtime = query.localIdSetPaginationRuntime?.();
    if (!options || !runtime) { runtime?.observe('ID_SET_DISABLED'); return { query }; }
    const limit = this.queryLimit(query);
    if (!limit || query.localContinuousPageOptions?.() || this.aggregates(query).length
      || this.groupBy(query).length || query.__teaqlPartitionBy) {
      runtime.observe('ID_SET_FALLBACK_UNSUPPORTED_SHAPE');
      return { query };
    }
    if ((query.orderItems || []).some((order: any) => order.expr != null)) {
      runtime.observe('ID_SET_FALLBACK_NON_DETERMINISTIC_ORDER');
      return { query };
    }
    if (!this.orders(query).some(order => order.field === 'id')) {
      query = query.clone().order(OrderBy.asc('id'));
    }
    const normalized = query.clone();
    normalized.offsetValue = 0;
    normalized.limitValue = 0;
    normalized.selectItems = [];
    normalized.relations = [];
    normalized.commentText = undefined;
    normalized.purposeText = undefined;
    normalized.clearIdSetPaginationRuntime();
    normalized.clearContinuousPageRuntime();
    const rawKey = `${options.namespace}|${runtime.scope}|${JSON.stringify(normalized)}`;
    let hash = 2166136261;
    for (let i = 0; i < rawKey.length; i++) hash = Math.imul(hash ^ rawKey.charCodeAt(i), 16777619);
    const queryKey = `teaql:id-set:v1:${(hash >>> 0).toString(16)}`;
    let retained: any;
    let cacheHit = false;
    try { retained = runtime.get(queryKey); }
    catch { runtime.observe('ID_SET_FALLBACK_STORE_UNAVAILABLE'); return { query }; }
    if (!retained) {
      let buildResult: any;
      try {
        buildResult = await runtime.build(queryKey, async () => {
          const existing = runtime.get(queryKey);
          if (existing) return existing;
          const idQuery = query.clone();
          idQuery.selectItems = ['id'];
          idQuery.relations = [];
          idQuery.relationAggregates = [];
          idQuery.facets = [];
          idQuery.offsetValue = 0;
          idQuery.limitValue = options.maxIds + 1;
          idQuery.clearIdSetPaginationRuntime();
          idQuery.clearContinuousPageRuntime();
          (idQuery as any)[this.internalQueryToken] = true;
          const idRows = await this.executeQuery<any>(idQuery);
          if (idRows.length > options.maxIds) return undefined;
          let ids: BigUint64Array;
          try { ids = BigUint64Array.from(idRows.map(row => BigInt(row.id))); }
          catch { throw new Error('ID_SET_UNSUPPORTED_ID'); }
          const value = { ids, expiresAt: Date.now() + options.ttlSeconds * 1000 };
          runtime.put(queryKey, value);
          return value;
        });
      } catch (error) {
        runtime.observe(error instanceof Error && error.message === 'ID_SET_UNSUPPORTED_ID'
          ? 'ID_SET_FALLBACK_UNSUPPORTED_SHAPE'
          : 'ID_SET_FALLBACK_STORE_UNAVAILABLE');
        return { query };
      }
      retained = buildResult.value;
      if (!retained) {
        runtime.observe('ID_SET_FALLBACK_LIMIT_EXCEEDED', options.maxIds + 1);
        return { query };
      }
      cacheHit = !buildResult.built;
      runtime.observe(cacheHit ? 'ID_SET_HIT' : 'ID_SET_BUILD', retained.ids.length);
    } else {
      cacheHit = true;
      runtime.observe('ID_SET_HIT', retained.ids.length);
    }
    const offset = Number(query.offsetValue || query._offset || 0);
    const pageIds = Array.from(retained.ids.slice(offset, offset + limit));
    const page = query.clone();
    page.offsetValue = 0;
    page.limitValue = Math.max(pageIds.length, 1);
    page.filterCondition = page.filterCondition
      ? { $and: [page.filterCondition, { id: { $in: pageIds } }] }
      : { id: { $in: pageIds } };
    page.clearIdSetPaginationRuntime();
    runtime.observe(cacheHit ? 'ID_SET_HIT' : 'ID_SET_BUILD', retained.ids.length);
    return { query: page, execution: { pageIds, totalCount: retained.ids.length } };
  }

  async executeFacetMembership(
    outerQuery: SelectQuery,
    relationName: string,
  ): Promise<Map<string, number>> {
    const request = new QueryRequest(outerQuery);
    outerQuery = request.query;
    const query = request.withQuery(outerQuery.clone()).query;
    retainQueryDiagnosticOrigin(outerQuery, query);
    query.facets = [];
    query.relations = [];
    query.relationAggregates = [];
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
    const request = query instanceof QueryRequest ? query : new QueryRequest(query);
    query = request.query;
    if (typeof query?.forExactCount !== 'function') {
      throw new Error('TeaQL exact count requires the formal runtime SelectQuery');
    }
    const alias = '__teaql_total';
    const rows = await this.executeQuery<Record<string, unknown>>(request.withQuery(query.forExactCount(alias)).query);
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

  executeForStream<T = any>(query: any, chunkSize = 1000): AsyncIterable<T[]> {
    // Capture before returning the lazy iterator. No SQL/cursor is opened here.
    // Preserve the asynchronous failure contract, but never re-read a builder
    // that the caller may "repair" or repurpose before the first poll.
    try {
      const request = query instanceof QueryRequest
        ? new QueryRequest(query.query, query.intent) : new QueryRequest(query);
      return this.executeCapturedStream<T>(request.query, chunkSize);
    } catch (error) {
      return (async function* (): AsyncIterable<T[]> { throw error; })();
    }
  }

  private async *executeCapturedStream<T>(query: any, chunkSize: number): AsyncIterable<T[]> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('stream chunk size must be a positive integer');
    }
    if (Array.isArray(query.facets) && query.facets.length > 0) {
      throw new Error('QRY-F01_STREAM_UNSUPPORTED: execute facets with executeForList');
    }
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    const inherited = await this.queryTreeBindings(query, sql, values);
    const startedAt = Date.now();
    let outcome: SQLExecutionOutcome = 'cancelled';
    let delivered = 0;
    let chunk: any[] = [];
    const descendantBindings = this.descendantBindings(query, sql, values, inherited);
    try {
      for await (const rawRow of this.driver.stream(sql, values)) {
        chunk.push(this.decodeRow(query.entity, rawRow, aggregateNames));
        if (chunk.length === chunkSize) {
          await this.enhanceQueryRows(chunk, query, descendantBindings);
          delivered += chunk.length;
          yield chunk as T[];
          chunk = [];
        }
      }
      if (chunk.length) {
        await this.enhanceQueryRows(chunk, query, descendantBindings);
        delivered += chunk.length;
        yield chunk as T[];
      }
      outcome = 'success';
    } catch (error) {
      outcome = 'failure';
      throw error;
    } finally {
      // Generator.return()/consumer break also closes the driver's cursor. Report
      // only delivered rows, not prefetched rows, and never stringify an error.
      if (outcome === 'failure') {
        try { this.recordSQL('select', sql, values, startedAt, delivered, undefined,
          this.queryLogIntent(query), outcome, inherited); } catch { /* preserve driver failure */ }
      } else {
        this.recordSQL('select', sql, values, startedAt, delivered, undefined,
          this.queryLogIntent(query), outcome, inherited);
      }
    }
  }

  private async enhanceQueryRows(rows: any[], query: any, inherited?: SQLLogBindingSource): Promise<void> {
    if (!rows.length) return;
    const names = [...(query.relations ?? []).map((load: any) => load.name),
      ...(query.relationAggregates ?? []).map((aggregate: any) => aggregate.relationName)];
    if (!names.length) return;
    const schema = this.schema(query.entity);
    const keys = new Map<string, unknown[]>();
    for (const name of names) {
      const relation = schema.relations?.[name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${name}`);
      if (!keys.has(relation.localKey)) keys.set(relation.localKey, rows.map(row => row[relation.localKey]));
    }
    // Lists and each streamed chunk capture before aliases or sibling loads can
    // replace any scalar key. Keep existing execution order and trace sources.
    await this.enhanceRelationAggregates(rows, query, keys, inherited);
    await this.enhanceRelations(rows, query, keys, inherited);
  }

  private async enhanceRelations(parents: any[], query: any, keys: ReadonlyMap<string, readonly unknown[]>,
    inherited?: SQLLogBindingSource): Promise<void> {
    if (!parents.length || !Array.isArray(query.relations) || !query.relations.length) return;
    const parentSchema = this.schema(query.entity);
    const intent = new QueryIntent(query._comment ?? query.commentText, query._purpose ?? query.purposeText);
    for (const load of query.relations) {
      const relation = parentSchema.relations?.[load.name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${load.name}`);
      const parentKeys = keys.get(relation.localKey)!;
      const parentIds = parentKeys
        .filter(value => value !== undefined && value !== null);
      const limit = load.query ? this.queryLimit(load.query) : undefined;
      const threshold = load.query?.localTopNProbeParentThreshold?.();
      const boundedTopN = relation.many && limit !== undefined;
      const providerAlwaysProbe = this.driver.topNRelationPlanPolicy === 'alwaysProbe';
      const useProbes = boundedTopN && (threshold === undefined
        ? providerAlwaysProbe
        : threshold > 0 && parentIds.length <= threshold);
      const selectedPlan = useProbes ? 'bounded_probes' : 'window';
      const relationScope = startRuntimeOperation(this.runtimeTelemetry, {
        family: 'relation_load',
        name: `${query.entity}.${String(load.name)}`,
        attributes: {
          'teaql.entity.type': String(query.entity),
          'teaql.relation.name': String(load.name),
          'teaql.relation.parent_count': parentIds.length,
          'teaql.relation.per_parent_limit': limit ?? 0,
          'teaql.relation.configured_probe_threshold': threshold ?? 'provider-default',
          'teaql.relation.selected_plan': selectedPlan,
          'teaql.relation.probe_count': useProbes ? parentIds.length : 0,
        },
      });
      try {
      if (!parentIds.length && !(relation.many && load.query?.facets?.length)) {
        for (const parent of parents) parent[load.name] = relation.many ? [] : null;
        relationScope.success({ attributes: { 'teaql.result.cardinality': 0 } });
        continue;
      }
      const childQuery = {
        ...(load.query || {}),
        entity: relation.targetEntity,
        _filters: [...this.filters(load.query || {})],
        relations: [...(load.query?.relations || [])],
        orderItems: [...(load.query?.orderItems || [])],
        __teaqlPartitionBy: boundedTopN && !useProbes
          ? relation.foreignKey
          : undefined,
        commentText: query?._comment ?? query?.commentText,
        purposeText: query?._purpose ?? query?.purposeText,
      };
      if (boundedTopN && !childQuery.orderItems.some((order: any) => order.field === 'id')) {
        childQuery.orderItems.push(OrderBy.asc('id'));
      }
      if (typeof childQuery.clearContinuousPageRuntime === 'function') childQuery.clearContinuousPageRuntime();
      childQuery[this.internalQueryToken] = true;
      const children: any[] = [];
      const assembly: RelationAssembly = { field: relation.foreignKey, keys: new WeakMap() };
      if (useProbes) {
        for (const parentId of parentIds) {
          const probeQuery = {
            ...childQuery,
            _filters: [...childQuery._filters, { [relation.foreignKey]: { $eq: parentId } }],
            __teaqlPartitionBy: undefined,
          };
          children.push(...await this.executeDerivedQuery<any>(
            new QueryRequest(query).derive(probeQuery, load.name).query, inherited, intent, assembly));
        }
      } else {
        childQuery._filters.push({ [relation.foreignKey]: { $in: parentIds } });
        children.push(...await this.executeDerivedQuery<any>(
          new QueryRequest(query).derive(childQuery, load.name).query, inherited, intent, assembly));
      }
      for (const child of children) delete child.__teaql_partition_rank;
      const buckets = new Map<any, any[]>();
      for (const child of children) {
        if (!assembly.keys.has(child)) throw new Error('Relation assembly lost its captured row identity');
        const key = assembly.keys.get(child);
        const bucket = buckets.get(key) || [];
        bucket.push(child);
        buckets.set(key, bucket);
      }
      for (const [index, parent] of parents.entries()) {
        const related = buckets.get(parentKeys[index]) || [];
        if (relation.many && load.query?.facets?.length) {
          // Each loaded collection owns its own facet membership. The full
          // filtered child set, not its Top-N page or other parents, is counted.
          const facetQuery: SelectQuery = load.query.clone();
          facetQuery.entity = relation.targetEntity;
          // A missing local key means no relationship, never orphan rows with
          // a NULL foreign key. Empty IN compiles to an unsatisfiable predicate.
          const key = parentKeys[index];
          const membership = { [relation.foreignKey]: key === null || key === undefined
            ? { $in: [] } : { $eq: key } };
          facetQuery.filterCondition = facetQuery.filterCondition
            ? { $and: [facetQuery.filterCondition, membership] } : membership;
          retainQueryDiagnosticOrigin(query, facetQuery);
          const derived = new QueryRequest(query).derive(facetQuery, load.name).query;
          parent[load.name] = new SmartList(related, { facets:
            await executeRelationFacets(this, item => item, derived, facetQuery.facets) });
        } else {
          parent[load.name] = relation.many ? related : (related[0] ?? null);
        }
      }
      relationScope.success({ attributes: { 'teaql.result.cardinality': children.length } });
      } catch (error) {
        relationScope.failure(error);
        throw error;
      }
    }
  }

  private async enhanceRelationAggregates(parents: any[], query: any, keys: ReadonlyMap<string, readonly unknown[]>,
    inherited?: SQLLogBindingSource): Promise<void> {
    const aggregates = query.relationAggregates;
    if (!parents.length || !Array.isArray(aggregates) || !aggregates.length) return;
    const parentSchema = this.schema(query.entity);
    const intent = new QueryIntent(query._comment ?? query.commentText, query._purpose ?? query.purposeText);
    for (const aggregate of aggregates) {
      const relation = parentSchema.relations?.[aggregate.relationName];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${aggregate.relationName}`);
      const parentKeys = keys.get(relation.localKey)!;
      const parentIds = parentKeys
        .filter(value => value !== undefined && value !== null);
      if (!parentIds.length) {
        for (const parent of parents) {
          parent[aggregate.alias] = aggregate.singleResult
            ? this.emptyAggregateValue(aggregate.query)
            : {};
        }
        continue;
      }
      const childQuery: SelectQuery = aggregate.query.clone();
      childQuery.entity = relation.targetEntity;
      childQuery.selectItems = [];
      childQuery.properties = [];
      childQuery.orderItems = [];
      childQuery.limitValue = 0;
      childQuery.offsetValue = 0;
      childQuery.relations = [];
      childQuery.relationAggregates = [];
      if (!childQuery.aggregateItems.length) {
        childQuery.aggregate('Count', 'id', aggregate.alias);
      }
      if (!childQuery.groupByItems.includes(relation.foreignKey)) {
        childQuery.groupBy(relation.foreignKey);
      }
      childQuery.filterCondition = {
        ...(childQuery.filterCondition || {}),
        [relation.foreignKey]: { $in: parentIds },
      };
      (childQuery as any)[this.internalQueryToken] = true;
      childQuery.commentText = query?._comment ?? query?.commentText;
      childQuery.purposeText = query?._purpose ?? query?.purposeText;
      const rows = await this.executeDerivedQuery<any>(
        new QueryRequest(query).derive(childQuery, aggregate.relationName).query, inherited, intent);
      const buckets = new Map<any, any>();
      for (const row of rows) buckets.set(row[relation.foreignKey], row);
      for (const [index, parent] of parents.entries()) {
        const row = buckets.get(parentKeys[index]);
        if (!row) {
          parent[aggregate.alias] = aggregate.singleResult
            ? this.emptyAggregateValue(aggregate.query)
            : {};
        } else if (aggregate.singleResult) {
          parent[aggregate.alias] = row[childQuery.aggregateItems[0].alias] ?? null;
        } else {
          parent[aggregate.alias] = Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== relation.foreignKey),
          );
        }
      }
    }
  }

  private emptyAggregateValue(query: SelectQuery): unknown {
    const aggregate = query.aggregateItems[0];
    return !aggregate || String(aggregate.function).toLowerCase() === 'count' ? 0 : null;
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
