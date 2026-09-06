import { UserContext } from '../core/context';
import { AbstractSQLTeaQLClient, ColumnSchema, EntitySchema, SqlQueryResult, SqlSession, TeaQLSqlDriver } from './core';
import { BrowserSQLiteOpenOptions, BrowserSQLiteStorage, BrowserSQLiteWorkerLike } from './browser-sqlite-protocol';
export type BrowserSQLiteDriverOptions = BrowserSQLiteOpenOptions & Readonly<{
    terminateWorkerOnClose?: boolean;
}>;
/** SQLite/WASM driver. SQL runs in the caller-supplied dedicated Web Worker. */
export declare class BrowserSQLiteDriver implements TeaQLSqlDriver {
    private readonly transport;
    readonly options: Required<BrowserSQLiteDriverOptions>;
    readonly databaseKind: "sqlite";
    private accessTail;
    private constructor();
    static open(worker: BrowserSQLiteWorkerLike, options?: BrowserSQLiteDriverOptions): Promise<BrowserSQLiteDriver>;
    identifier(value: string): string;
    placeholder(_index: number): string;
    contains(columnSql: string, placeholder: string): string;
    aggregateFunction(name: string): string;
    encode(value: any, column?: ColumnSchema): any;
    private exclusive;
    query(sql: string, values?: any[]): Promise<SqlQueryResult>;
    stream(sql: string, values?: any[]): AsyncIterable<any>;
    transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
    ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
    nextId(session: SqlSession, entity: string): Promise<string>;
    ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void>;
    reset(): Promise<void>;
    close(): Promise<void>;
}
/** TeaQL SQL client for browser-local SQLite/WASM. */
export declare class BrowserSQLiteTeaQLClient extends AbstractSQLTeaQLClient {
    private readonly browserDriver;
    private constructor();
    static open(worker: BrowserSQLiteWorkerLike, schemas: Record<string, EntitySchema>, options?: BrowserSQLiteDriverOptions): Promise<BrowserSQLiteTeaQLClient>;
    get storage(): BrowserSQLiteStorage;
    /** Drops browser-local data, then explicitly reconciles schema and generated bootstrap data. */
    reset(context: UserContext): Promise<void>;
}
export type { BrowserSQLiteOpenOptions, BrowserSQLiteStorage, BrowserSQLiteWorkerLike, } from './browser-sqlite-protocol';
//# sourceMappingURL=browser-sqlite.d.ts.map