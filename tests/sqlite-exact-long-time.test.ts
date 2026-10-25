import { UserContext } from '../src/core/context';
import { long } from '../src/core/long';
import { localTime } from '../src/core/local-time';
import { OrderBy, SelectQuery } from '../src/core/ast';
import { EntitySchema } from '../src/sql/core';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

const schemas: Record<string, EntitySchema> = {
  Probe: {
    table: 'long_time_probe',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      quantity: { columnName: 'quantity', logicalType: 'long', decode: 'long' },
      startsAt: { columnName: 'starts_at', logicalType: 'time', decode: 'time' },
    },
  },
};

describe('SQLite exact Long and LocalTime execution', () => {
  test('round-trips i64 bounds and microseconds through save, Q and JSON', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    try {
      await new UserContext().insertResource('dataService', client).ensureSchema();
      const values = [
        ['1', '-9223372036854775808', '00:00:00'],
        ['2', '2', '12:30:00.123456'],
        ['3', '9007199254740993', '23:59:59.999999'],
        ['4', '9223372036854775807', '01:02:03'],
      ];
      for (const [id, quantity, startsAt] of values) {
        const saved = await client.executeMutation({ entity: 'Probe', action: 'Create', id,
          payload: { quantity: long(quantity), startsAt: localTime(startsAt) },
          comment: 'create exact Long and LocalTime fixture' });
        expect(saved.persistedRecord?.quantity).toBe(quantity);
        expect(saved.persistedRecord?.startsAt).toBe(startsAt);
      }
      const loaded = await client.executeQuery<any>(new SelectQuery('Probe')
        .filter({ quantity: { $eq: long('9007199254740993') } })
        .comment('load exact Long').purpose('verify i64 equality'));
      expect(loaded).toHaveLength(1);
      expect(loaded[0].startsAt).toBe('23:59:59.999999');
      expect(JSON.parse(JSON.stringify(loaded[0])).quantity).toBe('9007199254740993');
      const ordered = await client.executeQuery<any>(new SelectQuery('Probe')
        .order(OrderBy.asc('quantity')).limit(10)
        .comment('order exact Long').purpose('verify numeric i64 order'));
      expect(ordered.map(row => row.quantity)).toEqual(values.map(row => row[1]));
      const range = await client.executeQuery<any>(new SelectQuery('Probe')
        .filter({ quantity: { $between: [long('2'), long('9007199254740993')] } })
        .comment('range exact Long').purpose('verify numeric i64 range'));
      expect(range.map(row => row.id).sort()).toEqual(['2', '3']);
      await expect(client.executeQuery(new SelectQuery('Probe')
        .aggregate('Sum', 'quantity', 'sum').comment('sum Long').purpose('reject undefined overflow')))
        .rejects.toThrow('EXACT_LONG_AGGREGATION_UNSUPPORTED');
    } finally { await client.close(); }
  });

  test('rejects a legacy NUMERIC-affinity Long column', async () => {
    const driver = new SQLiteDriver(':memory:');
    try {
      await driver.query('CREATE TABLE long_time_probe (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, quantity NUMERIC)');
      await expect(driver.ensureSchema(schemas)).rejects.toThrow('EXACT_LONG_SCHEMA_MISMATCH');
    } finally { await driver.close(); }
  });
});
