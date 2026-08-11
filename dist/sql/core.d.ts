export type LogicalColumnType = 'boolean' | 'double' | 'decimal' | 'date' | 'datetime' | 'json' | 'integer' | 'text';
export type ColumnSchema = {
    columnName: string;
    logicalType: LogicalColumnType;
    decode: 'string' | 'number' | 'date' | 'native';
};
export type EntitySchema = {
    table: string;
    columns: Record<string, ColumnSchema>;
};
export type SqlQueryResult = {
    rows: any[];
    rowCount: number;
};
export interface SqlSession {
    query(sql: string, values?: any[]): Promise<SqlQueryResult>;
}
export interface TeaQLSqlDriver extends SqlSession {
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
    close?(): Promise<void>;
}
export declare abstract class AbstractSQLTeaQLClient implements TeaQLDataService {
    protected readonly driver: TeaQLSqlDriver;
    private readonly schemas;
    private schemaReady?;
    protected constructor(driver: TeaQLSqlDriver, schemas: Record<string, EntitySchema>);
    private schema;
    private encode;
    private decodeRow;
    ensureSchema(): Promise<void>;
    executeMutation(mutation: any): Promise<any>;
    private compileExpression;
    private filters;
    private groupBy;
    private aggregates;
    private orders;
    executeQuery<T = any>(query: any): Promise<T[]>;
    close(): Promise<void>;
}
export declare function assertSafeIdentifier(value: string): string;
export declare function standardAggregateFunction(name: string): string;
//# sourceMappingURL=core.d.ts.map