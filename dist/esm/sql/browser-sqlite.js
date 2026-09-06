import {
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  canonicalRelationIndexes,
  ensureOptimisticIdFloor,
  standardAggregateFunction
} from "../chunks/chunk-IFTNQQPX.js";
import "../chunks/chunk-65WCFPGD.js";
import "../chunks/chunk-WZ3T4PU6.js";

// src/sql/browser-sqlite.ts
var BrowserSQLiteTransport = class {
  constructor(worker) {
    this.worker = worker;
    this.nextRequestId = 1;
    this.pending = /* @__PURE__ */ new Map();
    this.closed = false;
    this.onMessage = (event) => {
      const message = event.data;
      if (!message || message.type !== "teaql-browser-sqlite-response") return;
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      this.pending.delete(message.requestId);
      if (message.error) {
        const error = new Error(message.error.message);
        error.name = message.error.name;
        if (message.error.code) error.code = message.error.code;
        pending.reject(error);
      } else {
        pending.resolve(message.result);
      }
    };
    this.onError = (event) => {
      const error = new Error(event.message || "Browser SQLite worker failed");
      error.name = "BrowserSQLiteWorkerError";
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    };
    worker.addEventListener("message", this.onMessage);
    worker.addEventListener("error", this.onError);
  }
  request(operation, payload) {
    if (this.closed) return Promise.reject(new Error("Browser SQLite worker is closed"));
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve: (value) => resolve(value), reject });
      this.worker.postMessage({
        type: "teaql-browser-sqlite-request",
        requestId,
        operation,
        payload
      });
    });
  }
  async close(terminateWorker) {
    if (this.closed) return;
    try {
      await this.request("close");
    } finally {
      this.closed = true;
      this.worker.removeEventListener("message", this.onMessage);
      this.worker.removeEventListener("error", this.onError);
      if (terminateWorker) this.worker.terminate?.();
      const error = new Error("Browser SQLite worker is closed");
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    }
  }
};
var BrowserSQLiteSession = class {
  constructor(transport) {
    this.transport = transport;
  }
  query(sql, values = []) {
    return this.transport.request("query", { sql, values });
  }
};
var BrowserSQLiteDriver = class _BrowserSQLiteDriver {
  constructor(transport, options) {
    this.transport = transport;
    this.options = options;
    this.databaseKind = "sqlite";
    this.accessTail = Promise.resolve();
  }
  static async open(worker, options = {}) {
    const normalized = {
      storage: options.storage ?? "memory",
      databaseName: normalizeDatabaseName(options.databaseName ?? "teaql-browser.sqlite3"),
      terminateWorkerOnClose: options.terminateWorkerOnClose ?? true
    };
    const transport = new BrowserSQLiteTransport(worker);
    await transport.request("open", normalized);
    return new _BrowserSQLiteDriver(transport, normalized);
  }
  identifier(value) {
    return `"${assertSafeIdentifier(value)}"`;
  }
  placeholder(_index) {
    return "?";
  }
  contains(columnSql, placeholder) {
    return `CAST(${columnSql} AS TEXT) LIKE '%' || ${placeholder} || '%'`;
  }
  aggregateFunction(name) {
    return standardAggregateFunction(name);
  }
  encode(value, column) {
    if (value === null || value === void 0) return value;
    if (column?.logicalType === "json" && typeof value !== "string") return JSON.stringify(value);
    if (column?.logicalType === "boolean") return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    return value;
  }
  async exclusive(work) {
    const predecessor = this.accessTail;
    let release;
    this.accessTail = new Promise((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      return await work();
    } finally {
      release();
    }
  }
  query(sql, values = []) {
    return this.exclusive(() => this.transport.request("query", { sql, values }));
  }
  async *stream(sql, values = []) {
    const result = await this.query(sql, values);
    for (const row of result.rows) yield row;
  }
  transaction(work) {
    return this.exclusive(async () => {
      const session = new BrowserSQLiteSession(this.transport);
      await session.query("BEGIN IMMEDIATE");
      try {
        const result = await work(session);
        await session.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await session.query("ROLLBACK");
        } catch {
        }
        throw error;
      }
    });
  }
  async ensureSchema(schemas) {
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
          `ALTER TABLE ${table} ADD COLUMN ${this.identifier(column.columnName)} ${sqliteType(column.logicalType)}${column.nullable === false ? " NOT NULL" : ""}`
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
    throw new Error(`Unable to allocate ID for ${entity} after 100 optimistic-lock attempts`);
  }
  ensureIdFloor(session, entity, floor) {
    return ensureOptimisticIdFloor(session, (index) => this.placeholder(index), entity, floor);
  }
  reset() {
    return this.exclusive(() => this.transport.request("reset", this.options));
  }
  close() {
    return this.exclusive(() => this.transport.close(this.options.terminateWorkerOnClose));
  }
};
var BrowserSQLiteTeaQLClient = class _BrowserSQLiteTeaQLClient extends AbstractSQLTeaQLClient {
  constructor(browserDriver, schemas) {
    super(browserDriver, schemas);
    this.browserDriver = browserDriver;
  }
  static async open(worker, schemas, options = {}) {
    return new _BrowserSQLiteTeaQLClient(await BrowserSQLiteDriver.open(worker, options), schemas);
  }
  get storage() {
    return this.browserDriver.options.storage;
  }
  /** Drops browser-local data, then explicitly reconciles schema and generated bootstrap data. */
  async reset(context) {
    await this.browserDriver.reset();
    this.invalidateSchemaState();
    await context.ensureSchema();
  }
};
function sqliteType(type) {
  const types = {
    boolean: "INTEGER",
    double: "REAL",
    decimal: "NUMERIC",
    date: "TEXT",
    datetime: "TEXT",
    json: "TEXT",
    integer: "INTEGER",
    text: "TEXT"
  };
  return types[type];
}
function normalizeDatabaseName(value) {
  const normalized = value.trim();
  if (!normalized || normalized.includes("/") || normalized.includes("\\") || normalized === "." || normalized === "..") {
    throw new TypeError("Browser SQLite databaseName must be a simple file name");
  }
  return normalized;
}
export {
  BrowserSQLiteDriver,
  BrowserSQLiteTeaQLClient
};
//# sourceMappingURL=browser-sqlite.js.map
