export type LogicalColumnType = 'boolean' | 'double' | 'decimal' | 'date' | 'datetime' | 'json' | 'integer' | 'text';
export type ColumnSchema = {
    columnName: string;
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
export interface SqlSession {
    query(sql: string, values?: any[]): Promise<SqlQueryResult>;
}
export interface TeaQLSqlDriver extends SqlSession {
    stream(sql: string, values?: any[]): AsyncIterable<any>;
    identifier(value: string): string;
    placeholder(index: number): string;
    encode(value: any, column?: ColumnSchema): any;
    contains(columnSql: string, placeholder: string): string;
    aggregateFunction(name: string): string;
    ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
    transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
    nextId(session: SqlSession, entity: string): Promise<string>;
    close(): Promise<void>;
}
export interface TeaQLDataService {
    executeMutation(mutation: any): Promise<any>;
    executeQuery<T = any>(query: any): Promise<T[]>;
    executeForStream<T = any>(query: any, chunkSize?: number): AsyncIterable<T[]>;
    close?(): Promise<void>;
}
export declare abstract class AbstractSQLTeaQLClient implements TeaQLDataService {
    protected readonly driver: TeaQLSqlDriver;
    private readonly schemas;
    private schemaReady?;
    readonly sqlTrace: string[];
    private readonly internalQueryToken;
    private readonly auditEvents;
    private auditSink?;
    protected constructor(driver: TeaQLSqlDriver, schemas: Record<string, EntitySchema>);
    private schema;
    private encode;
    private decodeRow;
    get auditTrace(): ReadonlyArray<Readonly<Record<string, unknown>>>;
    setAuditSink(sink: (event: Readonly<Record<string, unknown>>) => void | Promise<void>): this;
    ensureSchema(): Promise<void>;
    executeMutation(mutation: any): Promise<any>;
    private compileExpression;
    private filters;
    private groupBy;
    private aggregates;
    private orders;
    private compileQuery;
    executeQuery<T = any>(query: any): Promise<T[]>;
    private prepareContinuousPage;
    private registerContinuousPage;
    executeForStream<T = any>(query: any, chunkSize?: number): AsyncIterable<T[]>;
    private enhanceRelations;
    private queryLimit;
    close(): Promise<void>;
}
export declare function assertSafeIdentifier(value: string): string;
export declare function standardAggregateFunction(name: string): string;
//# sourceMappingURL=core.d.ts.map