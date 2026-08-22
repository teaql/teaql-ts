import { AbstractSQLTeaQLClient, ColumnSchema, EntitySchema, SqlQueryResult, SqlSession, TeaQLSqlDriver } from './core';
export type ExpoSQLiteBindValue = null | number | string | Uint8Array;
export interface ExpoSQLiteExecuteResult<T = Record<string, unknown>> extends AsyncIterableIterator<T> {
    changes: number;
    getAllAsync(): Promise<T[]>;
}
export interface ExpoSQLiteStatement {
    executeAsync<T = Record<string, unknown>>(params: ExpoSQLiteBindValue[]): Promise<ExpoSQLiteExecuteResult<T>>;
    finalizeAsync(): Promise<void>;
}
export interface ExpoSQLiteDatabaseLike {
    execAsync(sql: string): Promise<void>;
    prepareAsync(sql: string): Promise<ExpoSQLiteStatement>;
    withExclusiveTransactionAsync(work: (transaction: ExpoSQLiteDatabaseLike) => Promise<void>): Promise<void>;
    closeAsync(): Promise<void>;
}
/**
 * TeaQL SQL driver for an opened `expo-sqlite` database.
 *
 * The structural database type keeps `teaql-ts` importable in Node and browser
 * profiles. A React Native application opens the database with
 * `expo-sqlite.openDatabaseAsync()` and injects it here through UserContext.
 */
export declare class ExpoSQLiteDriver implements TeaQLSqlDriver {
    private readonly database;
    readonly databaseKind: "sqlite";
    private initialized?;
    constructor(database: ExpoSQLiteDatabaseLike);
    identifier(value: string): string;
    placeholder(_index: number): string;
    encode(value: any, column?: ColumnSchema): ExpoSQLiteBindValue;
    contains(columnSql: string, placeholder: string): string;
    aggregateFunction(name: string): string;
    private sqlType;
    private initialize;
    ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
    transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
    nextId(session: SqlSession, entity: string): Promise<string>;
    ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void>;
    query(sql: string, values?: any[]): Promise<SqlQueryResult>;
    stream(sql: string, values?: any[]): AsyncIterable<any>;
    close(): Promise<void>;
}
export declare class ExpoSQLiteTeaQLClient extends AbstractSQLTeaQLClient {
    constructor(database: ExpoSQLiteDatabaseLike, schemas: Record<string, EntitySchema>);
}
//# sourceMappingURL=expo-sqlite.d.ts.map