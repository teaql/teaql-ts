"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLTeaQLClient = exports.MySQLDriver = void 0;
const mysql2_1 = require("mysql2");
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
        this.databaseKind = 'mysql';
        if (!connectionString)
            throw new Error('connectionString is required');
        this.callbackPool = (0, mysql2_1.createPool)({ uri: connectionString, timezone: 'Z' });
        this.pool = this.callbackPool.promise();
    }
    identifier(value) {
        return `\`${(0, core_1.assertSafeIdentifier)(value)}\``;
    }
    placeholder(_index) {
        return '?';
    }
    encode(value, column) {
        if (value === null || value === undefined)
            return value;
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
        for (const index of (0, core_1.canonicalRelationIndexes)(schemas)) {
            const existing = await this.query('SELECT 1 FROM information_schema.statistics ' +
                'WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', [index.table, index.name]);
            if (!existing.rowCount) {
                await this.query(`CREATE INDEX ${this.identifier(index.name)} ON ` +
                    `${this.identifier(index.table)} (` +
                    `${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`);
            }
        }
        await this.query('CREATE TABLE IF NOT EXISTS teaql_id_space (' +
            'type_name VARCHAR(255) PRIMARY KEY, current_level BIGINT NOT NULL)');
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
        for (let attempt = 1; attempt <= 100; attempt += 1) {
            const result = await session.query('SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?', [entity]);
            if (!result.rowCount) {
                try {
                    const inserted = await session.query('INSERT INTO teaql_id_space(type_name, current_level) VALUES (?, 1)', [entity]);
                    if (inserted.rowCount === 1)
                        return '1';
                }
                catch (error) {
                    const winner = await session.query('SELECT current_level FROM teaql_id_space WHERE type_name = ?', [entity]);
                    if (!winner.rowCount)
                        throw error;
                }
                continue;
            }
            const previous = Number(result.rows[0].id);
            const next = previous + 1;
            const updated = await session.query('UPDATE teaql_id_space SET current_level = ? ' +
                'WHERE type_name = ? AND current_level = ?', [next, entity, previous]);
            if (updated.rowCount === 1)
                return String(next);
            if (updated.rowCount !== 0)
                throw new Error(`ID space update for ${entity} changed ${updated.rowCount} rows`);
        }
        throw new Error(`Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`);
    }
    ensureIdFloor(session, entity, floor) {
        return (0, core_1.ensureOptimisticIdFloor)(session, index => this.placeholder(index), entity, floor);
    }
    query(sql, values = []) {
        return new MySQLSession(this.pool).query(sql, values);
    }
    async *stream(sql, values = []) {
        const connection = await new Promise((resolve, reject) => {
            this.callbackPool.getConnection((error, value) => error ? reject(error) : resolve(value));
        });
        const readable = connection.query(sql, values).stream();
        try {
            for await (const row of readable)
                yield row;
        }
        finally {
            readable.destroy();
            connection.release();
        }
    }
    async close() {
        await this.callbackPool.promise().end();
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