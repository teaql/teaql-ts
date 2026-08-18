import { debugSQL } from '../src/sql/core';
import { Values } from '../src/core/value';
import { SQLiteDriver } from '../src/sql/sqlite';

describe('debugSQL', () => {
  test('renders positional SQL that can be copied into SQLite or MySQL', () => {
    expect(debugSQL(
      "SELECT * FROM school WHERE name = ? AND active = ? AND phone IS ? AND note = '?'",
      ["O'Brien School", true, null],
    )).toBe(
      "SELECT * FROM school WHERE name = 'O''Brien School' AND active = TRUE AND phone IS NULL AND note = '?'",
    );
  });

  test('renders numbered placeholders repeatedly and ignores SQL string literals', () => {
    expect(debugSQL("SELECT $2, $1, $1, '$2'", ["O'Brien", 7]))
      .toBe("SELECT 7, 'O''Brien', 'O''Brien', '$2'");
    expect(debugSQL('SELECT @p2, @p1', ['first', 'second']))
      .toBe("SELECT 'second', 'first'");
  });

  test('preserves comments and renders SQLite temporal storage literals', () => {
    expect(debugSQL(
      "-- line ? $1\nSELECT '?', \"identifier?\", ?, ? /* block ? */",
      [Values.Date('2024-02-29'), Values.Timestamp(1787110200123)],
    )).toBe(
      "-- line ? $1\nSELECT '?', \"identifier?\", '2024-02-29', 1787110200123 /* block ? */",
    );
  });

  test('temporal debug SQL matches prepared SQLite storage', async () => {
    const driver = new SQLiteDriver(':memory:');
    try {
      await driver.query('CREATE TABLE temporal_fixture(id INTEGER, d TEXT, t INTEGER)');
      await driver.query(
        'INSERT INTO temporal_fixture VALUES (?, ?, ?) /* ignored ? */',
        [1, '2024-02-29', -123],
      );
      const literal = debugSQL(
        '/* teaql source=temporal ? */ INSERT INTO temporal_fixture VALUES (?, ?, ?)',
        [Values.I64(2), Values.Date('2024-02-29'), Values.Timestamp(-123)],
      );
      await driver.query(literal);
      const result = await driver.query(
        'SELECT d, t, typeof(d) AS dt, typeof(t) AS tt FROM temporal_fixture ORDER BY id',
      );
      expect(result.rows).toEqual([
        { d: '2024-02-29', t: -123, dt: 'text', tt: 'integer' },
        { d: '2024-02-29', t: -123, dt: 'text', tt: 'integer' },
      ]);
    } finally {
      await driver.close();
    }
  });

  test('renders PostgreSQL and MySQL typed temporal literals', () => {
    const values = [Values.Date('2024-02-29'), Values.Timestamp(-315521754322)];
    expect(debugSQL(
      '-- ignored $1\nSELECT $1, $2 /* ignored $2 */', values, 'postgresql',
    )).toBe(
      "-- ignored $1\nSELECT DATE '2024-02-29', TIMESTAMPTZ '1960-01-02T03:04:05.678Z' /* ignored $2 */",
    );
    expect(debugSQL('SELECT ?, ? /* ignored ? */', values, 'mysql')).toBe(
      "SELECT CAST('2024-02-29' AS DATE), CAST('1960-01-02 03:04:05.678' AS DATETIME(3)) /* ignored ? */",
    );
  });
});
