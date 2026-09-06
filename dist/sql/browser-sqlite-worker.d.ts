import { BrowserSQLiteRequest, BrowserSQLiteResponse } from './browser-sqlite-protocol';
type WorkerScope = {
    postMessage(message: BrowserSQLiteResponse): void;
    addEventListener(type: 'message', listener: (event: MessageEvent<BrowserSQLiteRequest>) => void): void;
};
export type BrowserSQLiteWorkerOptions = Readonly<{
    scope?: WorkerScope;
    /** Bundler-resolved URL for @sqlite.org/sqlite-wasm/sqlite3.wasm. */
    wasmUrl?: string;
}>;
/**
 * Installs the TeaQL SQLite/WASM RPC loop in the current dedicated worker.
 * Call this once from an application-owned worker entry point.
 */
export declare function startBrowserSQLiteWorker(options?: BrowserSQLiteWorkerOptions): void;
export {};
//# sourceMappingURL=browser-sqlite-worker.d.ts.map