export type BrowserSQLiteStorage = 'memory' | 'opfs';

export type BrowserSQLiteOpenOptions = Readonly<{
  storage?: BrowserSQLiteStorage;
  databaseName?: string;
}>;

export type BrowserSQLiteRequest = Readonly<{
  type: 'teaql-browser-sqlite-request';
  requestId: number;
  operation: 'open' | 'query' | 'reset' | 'close';
  payload?: Record<string, unknown>;
}>;

export type BrowserSQLiteResponse = Readonly<{
  type: 'teaql-browser-sqlite-response';
  requestId: number;
  result?: unknown;
  error?: Readonly<{ name: string; message: string; code?: string }>;
}>;

export interface BrowserSQLiteWorkerLike {
  postMessage(message: BrowserSQLiteRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<BrowserSQLiteResponse>) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<BrowserSQLiteResponse>) => void): void;
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  terminate?(): void;
}
