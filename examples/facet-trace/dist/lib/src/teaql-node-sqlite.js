"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteTeaQLClient = exports.SQLiteDriver = void 0;
const sqlite_1 = require("teaql-ts/sql/sqlite");
const runtime_module_1 = require("./runtime-module");
var sqlite_2 = require("teaql-ts/sql/sqlite");
Object.defineProperty(exports, "SQLiteDriver", { enumerable: true, get: function () { return sqlite_2.SQLiteDriver; } });
class SQLiteTeaQLClient extends sqlite_1.SQLiteTeaQLClient {
    constructor(filename) {
        super(filename, {});
        this.install(runtime_module_1.GENERATED_RUNTIME_MODULE);
    }
}
exports.SQLiteTeaQLClient = SQLiteTeaQLClient;
