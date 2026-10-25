"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteTeaQLClient = exports.SQLiteDriver = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const decimal_1 = require("../core/decimal");
const long_1 = require("../core/long");
const local_time_1 = require("../core/local-time");
const standard_node_1 = require("../telemetry/standard-node");
const core_1 = require("./core");
function soundex(value) {
    const letters = String(value ?? '').toUpperCase().match(/[A-Z]/g) ?? [];
    if (!letters.length)
        return '?000';
    const groups = {};
    for (const [chars, code] of [['BFPV', '1'], ['CGJKQSXZ', '2'], ['DT', '3'], ['L', '4'], ['MN', '5'], ['R', '6']]) {
        for (const char of chars)
            groups[char] = code;
    }
    const first = letters[0];
    let result = first;
    let previous = groups[first] ?? '0';
    for (const letter of letters.slice(1)) {
        const current = groups[letter] ?? '0';
        if (current !== '0' && current !== previous)
            result += current;
        if (result.length === 4)
            break;
        previous = current;
    }
    return result.padEnd(4, '0');
}
class SQLiteDriver {
    constructor(filename) {
        this.databaseKind = 'sqlite';
        this.topNRelationPlanPolicy = 'alwaysProbe';
        this.soundexRegistered = false;
        if (!filename)
            throw new Error('filename is required');
        this.database = new better_sqlite3_1.default(filename);
        this.database.pragma('journal_mode = WAL');
        this.database.pragma('foreign_keys = ON');
        const exactText = (value) => {
            if (typeof value !== 'string')
                throw new TypeError('Inexact SQLite Decimal value');
            return (0, decimal_1.decimal)(value);
        };
        this.database.function('teaql_decimal_cmp', { deterministic: true }, (left, right) => left === null || right === null ? null : (0, decimal_1.compareDecimals)(exactText(left), exactText(right)));
        this.database.function('teaql_decimal_order_key', { deterministic: true }, (value) => value === null ? null : (0, decimal_1.decimalOrderKey)(exactText(value)));
        const exactLong = (value) => {
            if (typeof value !== 'string')
                throw new TypeError('Inexact SQLite Long value');
            return (0, long_1.long)(value);
        };
        this.database.function('teaql_long_cmp', { deterministic: true }, (left, right) => left === null || right === null ? null : (0, long_1.compareLongs)(exactLong(left), exactLong(right)));
        this.database.function('teaql_long_order_key', { deterministic: true }, (value) => value === null ? null : (0, long_1.longOrderKey)(exactLong(value)));
        this.database.aggregate('teaql_decimal_sum', {
            start: () => ({ value: null }),
            step: (state, next) => {
                if (next !== null)
                    state.value = state.value === null ? exactText(next)
                        : (0, decimal_1.addDecimals)(state.value, exactText(next));
            },
            result: state => state.value,
        });
        for (const [name, order] of [['teaql_decimal_min', -1], ['teaql_decimal_max', 1]]) {
            this.database.aggregate(name, {
                start: () => ({ value: null }),
                step: (state, next) => {
                    if (next === null)
                        return;
                    const value = exactText(next);
                    if (state.value === null || (0, decimal_1.compareDecimals)(value, state.value) === order)
                        state.value = value;
                },
                result: state => state.value,
            });
        }
    }
    identifier(value) {
        return `"${(0, core_1.assertSafeIdentifier)(value)}"`;
    }
    placeholder(_index) {
        return '?';
    }
    encode(value, column) {
        if (value === null || value === undefined)
            return value;
        if (column?.logicalType === 'decimal' && column.decode === 'decimal')
            return (0, decimal_1.decimal)(value);
        if (column?.logicalType === 'long')
            return (0, long_1.long)(value);
        if (column?.logicalType === 'time')
            return (0, local_time_1.localTime)(value);
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
    decimalComparison(columnSql, operator, placeholder) {
        return `teaql_decimal_cmp(${columnSql}, ${placeholder}) ${operator} 0`;
    }
    decimalOrderExpression(columnSql) {
        return `teaql_decimal_order_key(${columnSql})`;
    }
    longComparison(columnSql, operator, placeholder) {
        return `teaql_long_cmp(${columnSql}, ${placeholder}) ${operator} 0`;
    }
    longOrderExpression(columnSql) {
        return `teaql_long_order_key(${columnSql})`;
    }
    decimalAggregateFunction(name) {
        const functions = {
            sum: 'teaql_decimal_sum', min: 'teaql_decimal_min', max: 'teaql_decimal_max',
        };
        const result = functions[name.toLowerCase()];
        if (!result)
            throw new Error(`EXACT_DECIMAL_UNSUPPORTED: ${name} requires an explicit exact rounding policy`);
        return result;
    }
    sqlType(type, decode) {
        const types = {
            boolean: 'INTEGER',
            double: 'REAL',
            decimal: decode === 'decimal' ? 'TEXT' : 'NUMERIC',
            long: 'TEXT',
            time: 'TEXT',
            date: 'TEXT',
            datetime: 'INTEGER',
            json: 'TEXT',
            integer: 'INTEGER',
            text: 'TEXT',
        };
        return types[type];
    }
    async ensureSchema(schemas) {
        if (!this.soundexRegistered) {
            this.database.function('soundex', { deterministic: true }, soundex);
            this.soundexRegistered = true;
        }
        for (const schema of Object.values(schemas)) {
            const table = this.identifier(schema.table);
            await this.query(`CREATE TABLE IF NOT EXISTS ${table} (` +
                '"id" INTEGER PRIMARY KEY, "version" INTEGER NOT NULL)');
            const columns = await this.query(`PRAGMA table_info(${table})`);
            const existing = new Set(columns.rows.map(row => String(row.name)));
            for (const [field, column] of Object.entries(schema.columns)) {
                if ((column.logicalType === 'decimal' && column.decode === 'decimal') || column.logicalType === 'long') {
                    const installed = columns.rows.find(row => String(row.name) === column.columnName);
                    if (installed && String(installed.type).toUpperCase() !== 'TEXT') {
                        throw new Error(`EXACT_${column.logicalType.toUpperCase()}_SCHEMA_MISMATCH: ${schema.table}.${column.columnName} requires TEXT; migrate the existing column explicitly`);
                    }
                }
                if (field === 'id' || field === 'version' ||
                    existing.has(column.columnName))
                    continue;
                await this.query(`ALTER TABLE ${table} ADD COLUMN ` +
                    `${this.identifier(column.columnName)} ${this.sqlType(column.logicalType, column.decode)}` +
                    `${column.nullable === false ? ' NOT NULL' : ''}`);
            }
        }
        for (const index of (0, core_1.canonicalRelationIndexes)(schemas)) {
            await this.query(`CREATE INDEX IF NOT EXISTS ${this.identifier(index.name)} ON ` +
                `${this.identifier(index.table)} (` +
                `${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`);
        }
        await this.query('CREATE TABLE IF NOT EXISTS teaql_id_space (' +
            'type_name TEXT PRIMARY KEY, current_level INTEGER NOT NULL)');
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
        for (let attempt = 1; attempt <= 100; attempt += 1) {
            const current = await session.query('SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?', [entity]);
            if (!current.rowCount) {
                try {
                    const inserted = await session.query('INSERT INTO teaql_id_space(type_name, current_level) VALUES (?, 1)', [entity]);
                    if (inserted.rowCount === 1)
                        return '1';
                }
                catch (error) {
                    const winner = await session.query('SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?', [entity]);
                    if (!winner.rowCount)
                        throw error;
                }
                continue;
            }
            const previous = Number(current.rows[0].id);
            const next = previous + 1;
            const updated = await session.query('UPDATE teaql_id_space SET current_level = ? WHERE type_name = ? AND current_level = ?', [next, entity, previous]);
            if (updated.rowCount === 1)
                return String(next);
            if (updated.rowCount !== 0) {
                throw new Error(`ID space update for ${entity} changed ${updated.rowCount} rows`);
            }
        }
        throw new Error(`Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`);
    }
    ensureIdFloor(session, entity, floor) {
        return (0, core_1.ensureOptimisticIdFloor)(session, index => this.placeholder(index), entity, floor);
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
        this.attachStandardTelemetryStartup((0, standard_node_1.startStandardNodeTelemetry)());
    }
}
exports.SQLiteTeaQLClient = SQLiteTeaQLClient;
//# sourceMappingURL=sqlite.js.map