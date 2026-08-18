"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteTeaQLClient = exports.SQLiteDriver = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const core_1 = require("./core");
class SQLiteDriver {
    constructor(filename) {
        if (!filename)
            throw new Error('filename is required');
        this.database = new better_sqlite3_1.default(filename);
        this.database.pragma('journal_mode = WAL');
        this.database.pragma('foreign_keys = ON');
    }
    identifier(value) {
        return `"${(0, core_1.assertSafeIdentifier)(value)}"`;
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
        if (column?.logicalType === 'date') {
            return value instanceof Date ? value.toISOString().slice(0, 10) : value;
        }
        if (column?.logicalType === 'datetime') {
            if (value instanceof Date)
                return value.getTime();
            if (typeof value === 'string') {
                const millis = Date.parse(value);
                if (!Number.isNaN(millis))
                    return millis;
            }
        }
        return value;
    }
    contains(columnSql, placeholder) {
        return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
    }
    aggregateFunction(name) {
        return (0, core_1.standardAggregateFunction)(name);
    }
    sqlType(type) {
        const types = {
            boolean: 'INTEGER',
            double: 'REAL',
            decimal: 'NUMERIC',
            date: 'TEXT',
            datetime: 'INTEGER',
            json: 'TEXT',
            integer: 'INTEGER',
            text: 'TEXT',
        };
        return types[type];
    }
    async ensureSchema(schemas) {
        for (const schema of Object.values(schemas)) {
            const table = this.identifier(schema.table);
            await this.query(`CREATE TABLE IF NOT EXISTS ${table} (` +
                '"id" INTEGER PRIMARY KEY, "version" INTEGER NOT NULL)');
            const columns = await this.query(`PRAGMA table_info(${table})`);
            const existing = new Set(columns.rows.map(row => String(row.name)));
            for (const [field, column] of Object.entries(schema.columns)) {
                if (field === 'id' || field === 'version' ||
                    existing.has(column.columnName))
                    continue;
                await this.query(`ALTER TABLE ${table} ADD COLUMN ` +
                    `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}`);
            }
        }
        await this.query('CREATE TABLE IF NOT EXISTS teaql_id_space (' +
            'entity TEXT PRIMARY KEY, next_id INTEGER NOT NULL)');
    }
    async transaction(work) {
        this.database.exec('BEGIN IMMEDIATE');
        try {
            const result = await work(this);
            this.database.exec('COMMIT');
            return result;
        }
        catch (error) {
            this.database.exec('ROLLBACK');
            throw error;
        }
    }
    async nextId(session, entity) {
        const current = await session.query('SELECT next_id AS id FROM teaql_id_space WHERE entity = ?', [entity]);
        if (!current.rowCount) {
            await session.query('INSERT INTO teaql_id_space(entity, next_id) VALUES (?, 1000)', [entity]);
            return '1000';
        }
        const next = Number(current.rows[0].id) + 1;
        await session.query('UPDATE teaql_id_space SET next_id = ? WHERE entity = ?', [next, entity]);
        return String(next);
    }
    async query(sql, values = []) {
        const statement = this.database.prepare(sql);
        if (statement.reader) {
            const rows = statement.all(...values);
            return { rows, rowCount: rows.length };
        }
        const result = statement.run(...values);
        return { rows: [], rowCount: result.changes };
    }
    async *stream(sql, values = []) {
        const statement = this.database.prepare(sql);
        if (!statement.reader)
            throw new Error('stream() requires a SELECT statement');
        for (const row of statement.iterate(...values))
            yield row;
    }
    async close() {
        this.database.close();
    }
}
exports.SQLiteDriver = SQLiteDriver;
class SQLiteTeaQLClient extends core_1.AbstractSQLTeaQLClient {
    constructor(filename, schemas) {
        super(new SQLiteDriver(filename), schemas);
    }
}
exports.SQLiteTeaQLClient = SQLiteTeaQLClient;
//# sourceMappingURL=sqlite.js.map