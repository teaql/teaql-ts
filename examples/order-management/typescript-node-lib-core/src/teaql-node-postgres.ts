import {
    PostgreSQLDriver,
    PostgreSQLTeaQLClient as RuntimePostgreSQLTeaQLClient
} from "teaql-ts/sql/postgres";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";

export { PostgreSQLDriver } from "teaql-ts/sql/postgres";

export class PostgreSQLTeaQLClient extends RuntimePostgreSQLTeaQLClient {
    constructor(connectionString: string) {
        super(connectionString, ENTITY_SCHEMAS);
    }
}