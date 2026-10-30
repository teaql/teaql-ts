import { AbstractSQLTeaQLClient, ColumnSchema, EntitySchema, SqlQueryResult, SqlSession, TeaQLSqlDriver } from './core';
export declare class SQLiteDriver implements TeaQLSqlDriver, SqlSession {
    readonly databaseKind: "sqlite";
    readonly topNRelationPlanPolicy: "alwaysProbe";
    private readonly database;
    private readonly gate;
    private readonly gateKey;
    private transactionActive;
    private soundexRegistered;
    /** Maintenance must never cross the object-store boundary inside a graph SQL owner. */
    assertNoCurrentTransaction(): void;
    constructor(filename: string);
    /** Same established file gate, or the exact same in-memory connection.
     * Separate :memory: connections deliberately have different gates. */
    sharesDatabase(driver: TeaQLSqlDriver): boolean;
    private withConnection;
    identifier(value: string): string;
    placeholder(_index: number): string;
    encode(value: any, column?: ColumnSchema): any;
    contains(columnSql: string, placeholder: string): string;
    aggregateFunction(name: string): string;
    private sqlType;
    ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
    transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
    nextId(session: SqlSession, entity: string): Promise<string>;
    ensureIdFloor(session: SqlSession, entity: string, floor: string): Promise<void>;
    query(sql: string, values?: any[]): Promise<SqlQueryResult>;
    stream(sql: string, values?: any[]): AsyncIterable<any>;
    close(): Promise<void>;
}
export declare class SQLiteTeaQLClient extends AbstractSQLTeaQLClient {
    constructor(filename: string, schemas: Record<string, EntitySchema>);
    usesSqlDatabase(driver: TeaQLSqlDriver): boolean;
}
//# sourceMappingURL=sqlite.d.ts.map