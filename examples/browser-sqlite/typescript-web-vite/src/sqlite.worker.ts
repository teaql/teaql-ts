import { startBrowserSQLiteWorker } from 'teaql-ts/sql/browser-sqlite-worker';
import sqliteWasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';

startBrowserSQLiteWorker({ wasmUrl: sqliteWasmUrl });
