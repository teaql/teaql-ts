import { BrowserSQLiteTeaQLClient, type BrowserSQLiteDriverOptions } from 'teaql-ts/sql/browser-sqlite';
import type { EntitySchema } from 'teaql-ts/sql/core';

export async function openBrowserDatabase(
  schemas: Record<string, EntitySchema>,
  options: BrowserSQLiteDriverOptions = {},
): Promise<BrowserSQLiteTeaQLClient> {
  const worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });
  try {
    return await BrowserSQLiteTeaQLClient.open(worker, schemas, options);
  } catch (error) {
    worker.terminate();
    throw error;
  }
}
