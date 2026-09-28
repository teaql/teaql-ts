import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';
import { EntitySchema, TextDiagnosticSQLLogSink } from '../src/sql/core';
import { MySQLDriver, MySQLTeaQLClient } from '../src/sql/mysql';
import { PostgreSQLDriver, PostgreSQLTeaQLClient } from '../src/sql/postgres';

const cases = [
  ['PostgreSQL', 'TEAQL_TEST_POSTGRES_URL',
    (url: string, schemas: Record<string, EntitySchema>) => new PostgreSQLTeaQLClient(url, schemas),
    (url: string) => new PostgreSQLDriver(url)],
  ['MySQL', 'TEAQL_TEST_MYSQL_URL',
    (url: string, schemas: Record<string, EntitySchema>) => new MySQLTeaQLClient(url, schemas),
    (url: string) => new MySQLDriver(url)],
] as const;

describe.each(cases)('%s live SQL masking', (name, envName, createClient, createDriver) => {
  const url = process.env[envName]?.trim();
  const required = process.env.TEAQL_REQUIRE_LIVE_DB?.toLowerCase() === 'true';
  const testIfConfigured = url || required ? test : test.skip;

  testIfConfigured('preserves execution values while rendering field-aware Q and mutation logs', async () => {
    if (!url) throw new Error(`${envName} is required for live provider tests`);
    const table = `teaql_mask_${name.toLowerCase()}_${process.pid}_${Date.now()}`;
    const schemas: Record<string, EntitySchema> = { Customer: {
      table,
      auditMaskFields: ['display_name', 'password_hash'],
      columns: {
        id: { columnName: 'id', modelName: 'id', logicalType: 'integer', decode: 'string' },
        version: { columnName: 'version', modelName: 'version', logicalType: 'integer', decode: 'number' },
        displayName: { columnName: 'display_name', modelName: 'display_name', logicalType: 'text', decode: 'native' },
        publicAddress: { columnName: 'public_address', modelName: 'public_address', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
        passwordHash: { columnName: 'password_hash', modelName: 'password_hash', logicalType: 'text', decode: 'native' },
      },
    } };
    const lines: string[] = [];
    const client = createClient(url!, schemas)
      .setDiagnosticSQLLogSink(new TextDiagnosticSQLLogSink(line => lines.push(line)));
    const context = new UserContext().insertResource('dataService', client);
    const cleanupDriver = createDriver(url!);
    try {
      await context.ensureSchema();
      await client.executeMutation({
        entity: 'Customer', action: 'Create', id: '1',
        payload: { display_name: 'Riverside', public_address: '1 Runtime Road', password_hash: 'PASSWORD-CANARY' },
        comment: 'what: create a masked customer',
      });
      const rows = await client.executeQuery(new SelectQuery('Customer')
        .filter({ displayName: { $eq: 'Riverside' }, publicAddress: { $eq: '1 Runtime Road' } })
        .limit(1)
        .comment('what: read a masked customer')
        .purpose('why: verify live-provider SQL masking'));
      expect(rows).toHaveLength(1);
      expect(rows[0].displayName).toBe('Riverside');
      expect(rows[0].publicAddress).toBe('1 Runtime Road');
      const logged = lines.join('\n');
      expect(logged).toContain('Ri*****de');
      expect(logged).toContain('1 Runtime Road');
      expect(logged).toContain('what: read a masked customer');
      expect(logged).toContain('why: verify live-provider SQL masking');
      expect(logged).toContain('SELECT');
      expect(logged).not.toContain('Riverside');
      expect(logged).not.toContain('PASSWORD-CANARY');
    } finally {
      await client.close();
      await cleanupDriver.query(`DROP TABLE IF EXISTS ${cleanupDriver.identifier(table)}`);
      await cleanupDriver.close();
    }
  });
});
