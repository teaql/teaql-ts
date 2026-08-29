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
        this.databaseKind = 'sqlite';
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
        if (value === null || value === undefined)
            return value;
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
        for (const index of (0, core_1.canonicalRelationIndexes)(schemas)) {
            await this.query(`CREATE INDEX IF NOT EXISTS ${this.identifier(index.name)} ON ` +
                `${this.identifier(index.table)} (` +
                `${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`);
        }
        await this.query('CREATE TABLE IF NOT EXISTS teaql_id_space (' +
            'type_name TEXT PRIMARY KEY, current_level INTEGER NOT NULL)');
    }
    async transaction(work) {
        let value;
        await this.database.withExclusiveTransactionAsync(async (transaction) => {
            value = await work(new ExpoSQLiteSession(transaction));
        });
        return value;
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