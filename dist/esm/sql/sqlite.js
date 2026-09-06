import {
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  canonicalRelationIndexes,
  ensureOptimisticIdFloor,
  standardAggregateFunction
} from "../chunks/chunk-IFTNQQPX.js";
import "../chunks/chunk-65WCFPGD.js";
import "../chunks/chunk-WZ3T4PU6.js";

// src/sql/sqlite.ts
import Database from "better-sqlite3";
function soundex(value) {
  const letters = String(value ?? "").toUpperCase().match(/[A-Z]/g) ?? [];
  if (!letters.length) return "?000";
  const groups = {};
  for (const [chars, code] of [["BFPV", "1"], ["CGJKQSXZ", "2"], ["DT", "3"], ["L", "4"], ["MN", "5"], ["R", "6"]]) {
    for (const char of chars) groups[char] = code;
  }
  const first = letters[0];
  let result = first;
  let previous = groups[first] ?? "0";
  for (const letter of letters.slice(1)) {
    const current = groups[letter] ?? "0";
    if (current !== "0" && current !== previous) result += current;
    if (result.length === 4) break;
    previous = current;
  }
  return result.padEnd(4, "0");
}
var SQLiteDriver = class {
  constructor(filename) {
    this.databaseKind = "sqlite";
    this.topNRelationPlanPolicy = "alwaysProbe";
    this.soundexRegistered = false;
    if (!filename) throw new Error("filename is required");
    this.database = new Database(filename);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
  }
  identifier(value) {
    return `"${assertSafeIdentifier(value)}"`;
  }
  placeholder(_index) {
    return "?";
  }
  encode(value, column) {
    if (value === null || value === void 0) return value;
    if (column?.logicalType === "json" && typeof value !== "string") {
      return JSON.stringify(value);
    }
    if (column?.logicalType === "boolean") return value ? 1 : 0;
    if (column?.logicalType === "date") {
      return value instanceof Date ? value.toISOString().slice(0, 10) : value;
    }
    if (column?.logicalType === "datetime") {
      if (value instanceof Date) return value.getTime();
      if (typeof value === "string") {
        const millis = Date.parse(value);
        if (!Number.isNaN(millis)) return millis;
      }
    }
    return value;
  }
  contains(columnSql, placeholder) {
    return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
  }
  aggregateFunction(name) {
    return standardAggregateFunction(name);
  }
  sqlType(type) {
    const types = {
      boolean: "INTEGER",
      double: "REAL",
      decimal: "NUMERIC",
      date: "TEXT",
      datetime: "INTEGER",
      json: "TEXT",
      integer: "INTEGER",
      text: "TEXT"
    };
    return types[type];
  }
  async ensureSchema(schemas) {
    if (!this.soundexRegistered) {
      this.database.function("soundex", { deterministic: true }, soundex);
      this.soundexRegistered = true;
    }
    for (const schema of Object.values(schemas)) {
      const table = this.identifier(schema.table);
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${table} ("id" INTEGER PRIMARY KEY, "version" INTEGER NOT NULL)`
      );
      const columns = await this.query(`PRAGMA table_info(${table})`);
      const existing = new Set(columns.rows.map((row) => String(row.name)));
      for (const [field, column] of Object.entries(schema.columns)) {
        if (field === "id" || field === "version" || existing.has(column.columnName)) continue;
        await this.query(
          `ALTER TABLE ${table} ADD COLUMN ${this.identifier(column.columnName)} ${this.sqlType(column.logicalType)}${column.nullable === false ? " NOT NULL" : ""}`
        );
      }
    }
    for (const index of canonicalRelationIndexes(schemas)) {
      await this.query(
        `CREATE INDEX IF NOT EXISTS ${this.identifier(index.name)} ON ${this.identifier(index.table)} (${this.identifier(index.foreignColumn)}, ${this.identifier(index.idColumn)} DESC)`
      );
    }
    await this.query(
      "CREATE TABLE IF NOT EXISTS teaql_id_space (type_name TEXT PRIMARY KEY, current_level INTEGER NOT NULL)"
    );
  }
  async transaction(work) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = await work(this);
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  async nextId(session, entity) {
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const current = await session.query(
        "SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?",
        [entity]
      );
      if (!current.rowCount) {
        try {
          const inserted = await session.query(
            "INSERT INTO teaql_id_space(type_name, current_level) VALUES (?, 1)",
            [entity]
          );
          if (inserted.rowCount === 1) return "1";
        } catch (error) {
          const winner = await session.query(
            "SELECT current_level AS id FROM teaql_id_space WHERE type_name = ?",
            [entity]
          );
          if (!winner.rowCount) throw error;
        }
        continue;
      }
      const previous = Number(current.rows[0].id);
      const next = previous + 1;
      const updated = await session.query(
        "UPDATE teaql_id_space SET current_level = ? WHERE type_name = ? AND current_level = ?",
        [next, entity, previous]
      );
      if (updated.rowCount === 1) return String(next);
      if (updated.rowCount !== 0) {
        throw new Error(`ID space update for ${entity} changed ${updated.rowCount} rows`);
      }
    }
    throw new Error(
      `Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`
    );
  }
  ensureIdFloor(session, entity, floor) {
    return ensureOptimisticIdFloor(session, (index) => this.placeholder(index), entity, floor);
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
    if (!statement.reader) throw new Error("stream() requires a SELECT statement");
    for (const row of statement.iterate(...values)) yield row;
  }
  async close() {
    this.database.close();
  }
};
var SQLiteTeaQLClient = class extends AbstractSQLTeaQLClient {
  constructor(filename, schemas) {
    super(new SQLiteDriver(filename), schemas);
  }
};
export {
  SQLiteDriver,
  SQLiteTeaQLClient
};
//# sourceMappingURL=sqlite.js.map
