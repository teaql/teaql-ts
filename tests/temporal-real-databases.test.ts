import { Values } from '../src/core/value';
import { debugSQL } from '../src/sql/core';
import { MySQLDriver } from '../src/sql/mysql';
import { PostgreSQLDriver } from '../src/sql/postgres';

const cases = [
  ['PostgreSQL', 'TEAQL_TEST_POSTGRES_URL', (url: string) => new PostgreSQLDriver(url),
    'DATE', 'TIMESTAMPTZ(3)', '$1, $2, $3', 'postgresql'],
  ['MySQL', 'TEAQL_TEST_MYSQL_URL', (url: string) => new MySQLDriver(url),
    'DATE', 'DATETIME(3)', '?, ?, ?', 'mysql'],
] as const;

describe.each(cases)('%s temporal SQL', (_name, env, create, dateType, timestampType, placeholders, kind) => {
  const url = process.env[env];
  const testIfConfigured = url ? test : test.skip;
  testIfConfigured('prepared and diagnostic SQL store equivalent values', async () => {
    const driver = create(url!);
    try {
      await driver.query('DROP TABLE IF EXISTS teaql_temporal_runtime_fixture');
      await driver.query(`CREATE TABLE teaql_temporal_runtime_fixture(id INTEGER, d ${dateType}, t ${timestampType})`);
      const millis = -315521754322;
      await driver.query(
        `INSERT INTO teaql_temporal_runtime_fixture VALUES (${placeholders}) /* ignored ? $1 */`,
        [1, '2024-02-29', new Date(millis)],
      );
      const literal = debugSQL(
        `/* teaql source=temporal.verify ? $1 */ INSERT INTO teaql_temporal_runtime_fixture VALUES (${placeholders})`,
        [Values.I64(2), Values.Date('2024-02-29'), Values.Timestamp(millis)], kind,
      );
      await driver.query(literal);
      const rows = await driver.query('SELECT d, t FROM teaql_temporal_runtime_fixture ORDER BY id');
      expect(String(rows.rows[0].d)).toBe(String(rows.rows[1].d));
      expect(new Date(rows.rows[0].t).getTime()).toBe(new Date(rows.rows[1].t).getTime());
    } finally {
      await driver.query('DROP TABLE IF EXISTS teaql_temporal_runtime_fixture');
      await driver.close();
    }
  });
});
