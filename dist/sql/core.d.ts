import { RuntimeTelemetry } from '../core/telemetry';
import { UserContext } from '../core/context';
import { contextSchemaCapability } from '../core/schema-capability';
import { SelectQuery } from '../core/ast';
import { GraphMutationSession, MutationIntent } from '../core/request-intent';
import { TraceNode } from '../core/trace-chain';
import { SQLDatabaseKind, SQLParameterLogPolicy } from './log-rendering';
export type LogicalColumnType = 'boolean' | 'double' | 'decimal' | 'date' | 'datetime' | 'json' | 'integer' | 'text';
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
export declare function canonicalRelationIndexes(schemas: Record<string, EntitySchema>): CanonicalRelationIndex[];
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
export declare function ensureOptimisticIdFloor(session: SqlSession, placeholder: (index: number) => string, entity: string, floor: string): Promise<void>;
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
export type SQLTraceFrame = TraceNode & Readonly<{
    level: number;
}>;
export type SQLExecutionMetadata = Readonly<{
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
export declare class TextDiagnosticSQLLogSink implements DiagnosticSQLLogSink {
    private readonly writer;
    constructor(writer?: (text: string) => void);
    write(metadata: SQLExecutionMetadata): void;
}
export declare class SQLExecutionEvidenceStore implements RuntimeTelemetrySink {
    private mode;
    private entries;
    record(metadata: SQLExecutionMetadata): void;
    private setMode;
    enableAll(): this;
    enableSelect(): this;
    enableMutation(): this;
    disable(): this;
    snapshot(): readonly SQLExecutionMetadata[];
}
export declare abstract class AbstractSQLTeaQLClient implements TeaQLDataService {
    protected readonly driver: TeaQLSqlDriver;
    private schemaReady?;
    private bootstrapTail;
    readonly sqlTrace: string[];
    private readonly internalQueryToken;
    private readonly bindLogPolicies;
    private readonly derivedQueryBindings;
    private fieldLogPolicy;
    private bindValue;
    private readonly auditEvents;
    private auditSink?;
    private telemetrySink?;
    private diagnosticSQLLogSink?;
    private queryLoggingEnabled;
    private mutationLoggingEnabled;
    private runtimeTelemetry?;
    private readonly checkers;
    private userContext;
    private bootstrap;
    private graphMutationSession?;
    private activeGraph?;
    private graphAuditActions;
    private graphCommitActions;
    private graphRollbackActions;
    private graphSaveTail;
    private readonly schemas;
    protected constructor(driver: TeaQLSqlDriver, schemas: Record<string, EntitySchema>);
    /** Installs metadata only. Call context.ensureSchema() explicitly when schema changes are intended. */
    install(module: import('../core/runtime-module').RuntimeModule): this;
    setUserContext(context: UserContext): this;
    private schema;
    private toRuntimeMutationRecord;
    private encode;
    private decodeRow;
    get auditTrace(): ReadonlyArray<Readonly<Record<string, unknown>>>;
    setAuditSink(sink: (event: Readonly<Record<string, unknown>>) => void | Promise<void>): this;
    setRuntimeTelemetrySink(sink: RuntimeTelemetrySink | undefined): this;
    setDiagnosticSQLLogSink(sink: DiagnosticSQLLogSink | undefined): this;
    setQueryLoggingEnabled(enabled: boolean): this;
    setMutationLoggingEnabled(enabled: boolean): this;
    setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this;
    private recordSQL;
    private queryLogIntent;
    private executeLoggedSQL;
    /** Package-internal physical capability used only by UserContext.ensureSchema(). */
    [contextSchemaCapability](context: UserContext): Promise<void>;
    /** Allows a provider which replaces its physical store to require explicit schema reconciliation again. */
    protected invalidateSchemaState(): void;
    private ensureBootstrapData;
    private reconcileBootstrapEntity;
    executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T>;
    afterGraphCommit(work: () => void): void;
    afterGraphRollback(work: () => void): void;
    private requireGraphOwnership;
    private withMutationSession;
    preflightMutation(mutation: any): any;
    private checkAndFixMutation;
    executeMutation(mutation: any): Promise<MutationResult>;
    private readPersistedRecord;
    private decodeRowForSchema;
    private compileExpression;
    private filters;
    private groupBy;
    private aggregates;
    private orders;
    private compileQuery;
    executeQuery<T = any>(query: any): Promise<T[]>;
    private executeDerivedQuery;
    private descendantBindings;
    private executeQueryWithIntent;
    private prepareIdSetPage;
    executeFacetMembership(outerQuery: SelectQuery, relationName: string): Promise<Map<string, number>>;
    executeCount(query: any): Promise<number>;
    private prepareContinuousPage;
    private registerContinuousPage;
    executeForStream<T = any>(query: any, chunkSize?: number): AsyncIterable<T[]>;
    private enhanceRelations;
    private enhanceRelationAggregates;
    private emptyAggregateValue;
    private queryLimit;
    close(): Promise<void>;
}
export declare function assertSafeIdentifier(value: string): string;
export declare function standardAggregateFunction(name: string): string;
//# sourceMappingURL=core.d.ts.map