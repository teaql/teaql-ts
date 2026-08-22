import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SQLiteDriver } from '../src/sql/sqlite';

describe('SQLite ID-space generator', () => {
  test('uses portable optimistic allocation across independent drivers', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'teaql-id-space-'));
    const database = join(directory, 'ids.db');
    const first = new SQLiteDriver(database);
    const second = new SQLiteDriver(database);
    try {
      await first.ensureSchema({});
      expect(await first.transaction(session => first.nextId(session, 'Order'))).toBe('1');
      expect(await second.transaction(session => second.nextId(session, 'Order'))).toBe('2');
      expect(await first.transaction(session => first.nextId(session, 'Customer'))).toBe('1');
      await first.transaction(session => first.ensureIdFloor(session, 'SeededType', '1001'));
      expect(await second.transaction(session => second.nextId(session, 'SeededType'))).toBe('1002');

      const values: string[] = [];
      for (let index = 0; index < 20; index += 1) {
        const driver = index % 2 === 0 ? first : second;
        values.push(await driver.transaction(session => driver.nextId(session, 'Order')));
      }
      expect(new Set(values).size).toBe(20);
      expect(values.map(Number).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 20 }, (_, index) => index + 3),
      );
    } finally {
      await first.close();
      await second.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('re-reads and retries after losing an optimistic update', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'teaql-id-space-retry-'));
    const driver = new SQLiteDriver(join(directory, 'ids.db'));
    let selected = 0;
    const session = {
      async query(sql: string) {
        if (sql.startsWith('SELECT')) {
          selected += 1;
          return { rows: [{ id: selected === 1 ? 7 : 8 }], rowCount: 1 };
        }
        if (sql.startsWith('UPDATE')) {
          return { rows: [], rowCount: selected === 1 ? 0 : 1 };
        }
        throw new Error(`unexpected SQL: ${sql}`);
      },
      async *stream() { /* unused */ },
    };
    try {
      expect(await driver.nextId(session, 'Order')).toBe('9');
    } finally {
      await driver.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
