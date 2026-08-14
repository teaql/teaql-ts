"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpoSQLiteTeaQLClient = exports.ExpoSQLiteDriver = void 0;
const core_1 = require("./core");
class ExpoSQLiteSession {
    constructor(database) {
        this.database = database;
    }
    async query(sql, values = []) {
        const statement = await this.database.prepareAsync(sql);
        try {
            const result = await statement.executeAsync(values);
            const rows = await result.getAllAsync();
            return { rows, rowCount: rows.length || Number(result.changes || 0) };
        }
        finally {
            await statement.finalizeAsync();
        }
    }
}
/**
 * TeaQL SQL driver for an opened `expo-sqlite` database.
 *
 * The structural database type keeps `teaql-ts` importable in Node and browser
 * profiles. A React Native application opens the database with
 * `expo-sqlite.openDatabaseAsync()` and injects it here through UserContext.
 */
class ExpoSQLiteDriver {
    constructor(database) {
        this.database = database;
        if (!database)
            throw new Error('opened Expo SQLite database is required');
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
        if (value instanceof Date)
            return value.toISOString();
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
            datetime: 'TEXT',
            json: 'TEXT',
            integer: 'INTEGER',
            text: 'TEXT',
        };
        return types[type];
    }
    initialize() {
        if (!this.initialized) {
            this.initialized = this.database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
        }
        return this.initialized;
    }
    async ensureSchema(schemas) {
        await this.initialize();
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
        let value;
        await this.database.withExclusiveTransactionAsync(async (transaction) => {
            value = await work(new ExpoSQLiteSession(transaction));
        });
        return value;
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
        return new ExpoSQLiteSession(this.database).query(sql, values);
    }
    async *stream(sql, values = []) {
        const statement = await this.database.prepareAsync(sql);
        try {
            const result = await statement.executeAsync(values);
            for await (const row of result)
                yield row;
        }
        finally {
            await statement.finalizeAsync();
        }
    }
    async close() {
        await this.database.closeAsync();
    }
}
exports.ExpoSQLiteDriver = ExpoSQLiteDriver;
class ExpoSQLiteTeaQLClient extends core_1.AbstractSQLTeaQLClient {
    constructor(database, schemas) {
        super(new ExpoSQLiteDriver(database), schemas);
    }
}
exports.ExpoSQLiteTeaQLClient = ExpoSQLiteTeaQLClient;
//# sourceMappingURL=expo-sqlite.js.map