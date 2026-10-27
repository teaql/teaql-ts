import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteDriver } from '../src/sql/sqlite';

test('an asynchronous SQLite transaction owns its connection and yields other same-file callers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-sqlite-owner-'));
  const file = join(root, 'owner.sqlite');
  const first = new SQLiteDriver(file);
  const second = new SQLiteDriver(file);
  let release!: () => void;
  let entered!: () => void;
  const paused = new Promise<void>(done => { release = done; });
  const inside = new Promise<void>(done => { entered = done; });
  try {
    await first.query('CREATE TABLE owner_test (id INTEGER PRIMARY KEY)');
    const transaction = first.transaction(async sql => {
      await sql.query('INSERT INTO owner_test (id) VALUES (1)');
      entered();
      await paused;
      expect((await sql.query('SELECT COUNT(*) AS n FROM owner_test')).rows[0].n).toBe(1);
    });
    await inside;
    let sameDone = false, otherDone = false;
    const same = first.query('SELECT COUNT(*) AS n FROM owner_test').then(value => {
      sameDone = true; return value;
    });
    const other = second.query('SELECT COUNT(*) AS n FROM owner_test').then(value => {
      otherDone = true; return value;
    });
    await new Promise(done => setTimeout(done, 20));
    expect(sameDone).toBe(false);
    expect(otherDone).toBe(false);
    release();
    await transaction;
    expect((await same).rows[0].n).toBe(1);
    expect((await other).rows[0].n).toBe(1);
  } finally {
    release();
    await first.close();
    await second.close();
    await rm(root, { recursive: true, force: true });
  }
});
