import { debugSQL } from '../src/sql/core';

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
});
