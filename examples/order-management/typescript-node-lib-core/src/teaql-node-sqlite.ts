import {
    SQLiteDriver,
    SQLiteTeaQLClient as RuntimeSQLiteTeaQLClient
} from "teaql-ts/sql/sqlite";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";

export { SQLiteDriver } from "teaql-ts/sql/sqlite";

export class SQLiteTeaQLClient extends RuntimeSQLiteTeaQLClient {
    constructor(filename: string) {
        super(filename, ENTITY_SCHEMAS);
    }
}