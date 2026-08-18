import { AbstractSQLTeaQLClient, ColumnSchema, EntitySchema, SqlQueryResult, SqlSession, TeaQLSqlDriver } from './core';
export declare class MySQLDriver implements TeaQLSqlDriver {
    readonly databaseKind: "mysql";
    private readonly callbackPool;
    private readonly pool;
    constructor(connectionString: string);
    identifier(value: string): string;
    placeholder(_index: number): string;
    encode(value: any, column?: ColumnSchema): any;
    contains(columnSql: string, placeholder: string): string;
    aggregateFunction(name: string): string;
    private sqlType;
    ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
    transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
    nextId(session: SqlSession, entity: string): Promise<string>;
    query(sql: string, values?: any[]): Promise<SqlQueryResult>;
    stream(sql: string, values?: any[]): AsyncIterable<any>;
    close(): Promise<void>;
}
export declare class MySQLTeaQLClient extends AbstractSQLTeaQLClient {
    constructor(connectionString: string, schemas: Record<string, EntitySchema>);
}
//# sourceMappingURL=mysql.d.ts.map