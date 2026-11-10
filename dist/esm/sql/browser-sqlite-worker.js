import {
  addDecimals,
  compareDecimals,
  decimal,
  decimalOrderKey
} from "../chunks/chunk-2M5YIPLE.js";
import "../chunks/chunk-UNAWFD3C.js";

// src/sql/browser-sqlite-worker.ts
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

// src/sql/sqlite-wasm-scalars.ts
function installWasmDecimalFunctions(db, capi) {
  const exact = (value) => {
    if (typeof value !== "string") throw new TypeError("Inexact SQLite Decimal value");
    return decimal(value);
  };
  db.createFunction({
    name: "teaql_decimal_cmp",
    arity: 2,
    deterministic: true,
    xFunc: (_context, left, right) => left === null || right === null ? null : compareDecimals(exact(left), exact(right))
  });
  db.createFunction({
    name: "teaql_decimal_order_key",
    arity: 1,
    deterministic: true,
    xFunc: (_context, value) => value === null ? null : decimalOrderKey(exact(value))
  });
  const groups = [];
  for (const operation of ["sum", "min", "max"]) {
    const values = /* @__PURE__ */ new Map();
    groups.push(values);
    db.createFunction({
      name: `teaql_decimal_${operation}`,
      arity: 1,
      deterministic: true,
      xStep(context, next) {
        if (next === null) return;
        const value = exact(next), key = capi.sqlite3_js_aggregate_context(context, 1);
        if (!key) throw new Error("SQLite aggregate context allocation failed");
        const previous = values.get(key);
        values.set(key, previous === void 0 ? value : operation === "sum" ? addDecimals(previous, value) : compareDecimals(value, previous) === (operation === "min" ? -1 : 1) ? value : previous);
      },
      xFinal(context) {
        const key = capi.sqlite3_js_aggregate_context(context, 0);
        const result = values.get(key) ?? null;
        values.delete(key);
        return result;
      }
    });
  }
  return () => {
    for (const values of groups) values.clear();
  };
}

// src/sql/browser-sqlite-worker.ts
function startBrowserSQLiteWorker(options = {}) {
  const scope = options.scope ?? globalThis;
  let sqlitePromise;
  let database;
  let clearAggregateState;
  let openOptions;
  let tail = Promise.resolve();
  const sqlite = () => {
    if (!sqlitePromise) {
      const initialize = sqlite3InitModule;
      sqlitePromise = initialize(options.wasmUrl ? { locateFile: (file) => file.endsWith(".wasm") ? options.wasmUrl : file } : void 0);
    }
    return sqlitePromise;
  };
  const open = async (options2 = {}) => {
    closeDatabase();
    const storage = options2.storage ?? "memory";
    const databaseName = options2.databaseName ?? "teaql-browser.sqlite3";
    const module = await sqlite();
    if (storage === "opfs") {
      if (!module.oo1.OpfsDb) {
        const error = new Error(
          "OPFS SQLite is unavailable. Serve COOP/COEP headers and use a compatible browser."
        );
        error.name = "BrowserSQLiteStorageUnavailableError";
        throw error;
      }
      database = new module.oo1.OpfsDb(`/${databaseName}`, "c");
    } else {
      database = new module.oo1.DB(":memory:", "c");
    }
    openOptions = { storage, databaseName };
    try {
      clearAggregateState = installWasmDecimalFunctions(database, module.capi);
    } catch (error) {
      closeDatabase();
      throw error;
    }
    database.exec("PRAGMA foreign_keys = ON");
  };
  const closeDatabase = () => {
    try {
      database?.close();
    } finally {
      database = void 0;
      clearAggregateState?.();
      clearAggregateState = void 0;
    }
  };
  const requireDatabase = () => {
    if (!database) throw new Error("Browser SQLite database is not open");
    return database;
  };
  const query = (sql, values = []) => {
    if (typeof sql !== "string" || !sql.trim()) throw new TypeError("SQL is required");
    if (!Array.isArray(values)) throw new TypeError("SQL bind values must be an array");
    const db = requireDatabase();
    let rows;
    try {
      rows = db.exec({
        sql,
        bind: values,
        rowMode: "object",
        returnValue: "resultRows"
      });
    } finally {
      clearAggregateState?.();
    }
    const mutation = /^\s*(?:insert|update|delete|replace)\b/i.test(sql);
    return { rows, rowCount: rows.length || (mutation ? Number(db.changes()) : 0) };
  };
  const reset = async () => {
    const db = requireDatabase();
    db.exec("PRAGMA foreign_keys = OFF");
    const rows = db.exec({
      sql: "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      rowMode: "object",
      returnValue: "resultRows"
    });
    for (const row of rows) {
      const name = String(row.name).replace(/"/g, '""');
      db.exec(`DROP TABLE IF EXISTS "${name}"`);
    }
    db.exec("PRAGMA foreign_keys = ON");
    if (!openOptions) throw new Error("Browser SQLite database is not open");
  };
  scope.addEventListener("message", (event) => {
    const request = event.data;
    if (!request || request.type !== "teaql-browser-sqlite-request") return;
    tail = tail.then(async () => {
      try {
        let result;
        if (request.operation === "open") result = await open(request.payload);
        else if (request.operation === "query") {
          result = query(String(request.payload?.sql ?? ""), request.payload?.values ?? []);
        } else if (request.operation === "reset") result = await reset();
        else if (request.operation === "close") closeDatabase();
        else throw new Error(`Unsupported Browser SQLite operation: ${String(request.operation)}`);
        scope.postMessage({
          type: "teaql-browser-sqlite-response",
          requestId: request.requestId,
          result
        });
      } catch (value) {
        const error = value instanceof Error ? value : new Error(String(value));
        scope.postMessage({
          type: "teaql-browser-sqlite-response",
          requestId: request.requestId,
          error: {
            name: error.name,
            message: error.message,
            code: error.code
          }
        });
      }
    });
  });
}
export {
  startBrowserSQLiteWorker
};
//# sourceMappingURL=browser-sqlite-worker.js.map
