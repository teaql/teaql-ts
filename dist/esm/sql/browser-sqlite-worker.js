// src/sql/browser-sqlite-worker.ts
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
function startBrowserSQLiteWorker(options = {}) {
  const scope = options.scope ?? globalThis;
  let sqlitePromise;
  let database;
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
    database?.close();
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
      database = new module.oo1.DB(":memory:", "ct");
    }
    openOptions = { storage, databaseName };
    database.exec("PRAGMA foreign_keys = ON");
  };
  const requireDatabase = () => {
    if (!database) throw new Error("Browser SQLite database is not open");
    return database;
  };
  const query = (sql, values = []) => {
    if (typeof sql !== "string" || !sql.trim()) throw new TypeError("SQL is required");
    if (!Array.isArray(values)) throw new TypeError("SQL bind values must be an array");
    const db = requireDatabase();
    const rows = db.exec({
      sql,
      bind: values,
      rowMode: "object",
      returnValue: "resultRows"
    });
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
        else if (request.operation === "close") {
          database?.close();
          database = void 0;
        } else throw new Error(`Unsupported Browser SQLite operation: ${String(request.operation)}`);
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
