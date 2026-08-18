"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLTeaQLClient = exports.PostgreSQLDriver = void 0;
const pg_1 = require("pg");
const pg_query_stream_1 = __importDefault(require("pg-query-stream"));
const core_1 = require("./core");
class PostgreSQLSession {
    constructor(client) {
        this.client = client;
    }
    async query(sql, values = []) {
        const result = await this.client.query(sql, values);
        return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    }
}
class PostgreSQLDriver {
    constructor(connectionString) {
        this.databaseKind = 'postgresql';
        if (!connectionString)
            throw new Error('connectionString is required');
        this.pool = new pg_1.Pool({ connectionString });
    }
    identifier(value) {
        return `"${(0, core_1.assertSafeIdentifier)(value)}"`;
    }
    placeholder(index) {
        return `$${index}`;
    }
    encode(value, column) {
        if (column?.logicalType === 'json' && typeof value !== 'string') {
            return JSON.stringify(value);
        }
        return value;
    }
    contains(columnSql, placeholder) {
        return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
    }
    aggregateFunction(name) {
        const functions = {
            stddev: 'STDDEV',
            stddevpop: 'STDDEV_POP',
            varsamp: 'VAR_SAMP',
            varpop: 'VAR_POP',
            bitand: 'BIT_AND',
            bitor: 'BIT_OR',
            bitxor: 'BIT_XOR',
        };
        return functions[String(name).toLowerCase()]
            || (0, core_1.standardAggregateFunction)(name);
    }
    sqlType(type) {
        const types = {
            boolean: 'BOOLEAN',
            double: 'DOUBLE PRECISION',
            decimal: 'NUMERIC',
            date: 'DATE',
            datetime: 'TIMESTAMPTZ',
            json: 'JSONB',
            integer: 'BIGINT',
            text: 'TEXT',
        };
        return types[type];
    }
    async ensureSchema(schemas) {
        await this.transaction(async (session) => {
            for (const schema of Object.values(schemas)) {
                const table = this.identifier(schema.table);
                await session.query(`CREATE TABLE IF NOT EXISTS ${table} (` +
                    '"id" BIGINT PRIMARY KEY, "version" BIGINT NOT NULL)');
                for (const [field, column] of Object.entries(schema.columns)) {
                    if (field === 'id' || field === 'version')
                        continue;
                    await session.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ` +
                        `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}`);
                }
            }
            await session.query('CREATE TABLE IF NOT EXISTS teaql_id_space (' +
                'entity VARCHAR(255) PRIMARY KEY, next_id BIGINT NOT NULL)');
        });
    }
    async transaction(work) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await work(new PostgreSQLSession(client));
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async nextId(session, entity) {
        const result = await session.query('INSERT INTO teaql_id_space(entity, next_id) VALUES ($1, 1000) ' +
            'ON CONFLICT(entity) DO UPDATE SET next_id = teaql_id_space.next_id + 1 ' +
            'RETURNING next_id::text AS id', [entity]);
        return result.rows[0].id;
    }
    query(sql, values = []) {
        return new PostgreSQLSession(this.pool).query(sql, values);
    }
    async *stream(sql, values = []) {
        const client = await this.pool.connect();
        const cursor = client.query(new pg_query_stream_1.default(sql, values));
        try {
            for await (const row of cursor)
                yield row;
        }
        finally {
            cursor.destroy();
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgreSQLDriver = PostgreSQLDriver;
class PostgreSQLTeaQLClient extends core_1.AbstractSQLTeaQLClient {
    constructor(connectionString, schemas) {
        super(new PostgreSQLDriver(connectionString), schemas);
    }
}
exports.PostgreSQLTeaQLClient = PostgreSQLTeaQLClient;
//# sourceMappingURL=postgres.js.map