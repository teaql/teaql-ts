import {
    SQLiteDriver,
    SQLiteTeaQLClient as RuntimeSQLiteTeaQLClient
} from "teaql-ts/sql/sqlite";
import { GENERATED_RUNTIME_MODULE } from "./runtime-module";

export { SQLiteDriver } from "teaql-ts/sql/sqlite";

export class SQLiteTeaQLClient extends RuntimeSQLiteTeaQLClient {
    constructor(filename: string) {
        super(filename, {});
        this.install(GENERATED_RUNTIME_MODULE);
    }
}