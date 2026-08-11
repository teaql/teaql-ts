"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLTeaQLClient = exports.MySQLDriver = void 0;
const promise_1 = require("mysql2/promise");
const core_1 = require("./core");
class MySQLSession {
    constructor(client) {
        this.client = client;
    }
    async query(sql, values = []) {
        const [raw] = await this.client.query(sql, values);
        if (Array.isArray(raw))
            return { rows: raw, rowCount: raw.length };
        return { rows: [], rowCount: Number(raw?.affectedRows || 0) };
    }
}
class MySQLDriver {
    constructor(connectionString) {
        if (!connectionString)
            throw new Error('connectionString is required');
        this.pool = (0, promise_1.createPool)(connectionString);
    }
    identifier(value) {
        return `\`${(0, core_1.assertSafeIdentifier)(value)}\``;
    }
    placeholder(_index) {
        return '?';
    }
    encode(value, column) {
        if (column?.logicalType === 'json' && typeof value !== 'string') {
            return JSON.stringify(value);
        }
        if (column?.logicalType === 'boolean')
            return value ? 1 : 0;
        return value;
    }
    contains(columnSql, placeholder) {
        return `CAST(${columnSql} AS CHAR) LIKE CONCAT('%', ${placeholder}, '%')`;
    }
    aggregateFunction(name) {
        const functions = {
            stddev: 'STDDEV_SAMP',
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
            double: 'DOUBLE',
            decimal: 'DECIMAL(65, 30)',
            date: 'DATE',
            datetime: 'DATETIME(6)',
            json: 'JSON',
            integer: 'BIGINT',
            text: 'TEXT',
        };
        return types[type];
    }
    async ensureSchema(schemas) {
        for (const schema of Object.values(schemas)) {
            const table = this.identifier(schema.table);
            await this.query(`CREATE TABLE IF NOT EXISTS ${table} (` +
                '`id` BIGINT PRIMARY KEY, `version` BIGINT NOT NULL)');
            for (const [field, column] of Object.entries(schema.columns)) {
                if (field === 'id' || field === 'version')
                    continue;
                const existing = await this.query('SELECT 1 FROM information_schema.columns ' +
                    'WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [schema.table, column.columnName]);
                if (!existing.rowCount) {
                    await this.query(`ALTER TABLE ${table} ADD COLUMN ` +
                        `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}`);
                }
            }
        }
        await this.query('CREATE TABLE IF NOT EXISTS teaql_id_space (' +
            'entity VARCHAR(255) PRIMARY KEY, next_id BIGINT NOT NULL)');
    }
    async transaction(work) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await work(new MySQLSession(connection));
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    async nextId(session, entity) {
        await session.query('INSERT INTO teaql_id_space(entity, next_id) VALUES (?, 1000) ' +
            'ON DUPLICATE KEY UPDATE next_id = next_id + 1', [entity]);
        const result = await session.query('SELECT next_id AS id FROM teaql_id_space WHERE entity = ?', [entity]);
        return String(result.rows[0].id);
    }
    query(sql, values = []) {
        return new MySQLSession(this.pool).query(sql, values);
    }
    async close() {
        await this.pool.end();
    }
}
exports.MySQLDriver = MySQLDriver;
class MySQLTeaQLClient extends core_1.AbstractSQLTeaQLClient {
    constructor(connectionString, schemas) {
        super(new MySQLDriver(connectionString), schemas);
    }
}
exports.MySQLTeaQLClient = MySQLTeaQLClient;
//# sourceMappingURL=mysql.js.map