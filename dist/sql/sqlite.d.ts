import { AbstractSQLTeaQLClient, ColumnSchema, EntitySchema, SqlQueryResult, SqlSession, TeaQLSqlDriver } from './core';
export declare class SQLiteDriver implements TeaQLSqlDriver, SqlSession {
    private readonly database;
    constructor(filename: string);
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
export declare class SQLiteTeaQLClient extends AbstractSQLTeaQLClient {
    constructor(filename: string, schemas: Record<string, EntitySchema>);
}
//# sourceMappingURL=sqlite.d.ts.map