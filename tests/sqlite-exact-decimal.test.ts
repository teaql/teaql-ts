import { decimal } from '../src/core/decimal';
import { UserContext } from '../src/core/context';
import { OrderBy, SelectQuery } from '../src/core/ast';
import { EntitySchema } from '../src/sql/core';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

const schemas: Record<string, EntitySchema> = {
  Probe: {
    table: 'probe_data',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      amount: { columnName: 'amount', logicalType: 'decimal', decode: 'decimal' },
    },
  },
};

describe('SQLite exact Decimal execution', () => {
  test('preserves exact values through save, Q, predicates, order and sum', async () => {
    const client = new SQLiteTeaQLClient(':memory:', schemas);
    try {
      await new UserContext().insertResource('dataService', client).ensureSchema();
      for (const [id, amount] of [
        ['1', '123456789012.3456789'], ['2', '3.50'], ['3', '3.5'], ['4', '-0.11'], ['5', '-0.1'],
      ]) {
        const result = await client.executeMutation({
          entity: 'Probe', action: 'Create', id,
          payload: { amount: decimal(amount) }, comment: 'seed exact decimal probe',
        });
        expect(result.persistedRecord?.amount).toBe(amount);
      }

      const query = (filter: Record<string, unknown>) => client.executeQuery<any>(
        new SelectQuery('Probe').filter(filter).limit(10)
          .comment('load exact decimal probe').purpose('verify decimal equality'),
      );
      expect((await query({ amount: { $eq: decimal('3.50') } })).map(row => row.id).sort())
        .toEqual(['2', '3']);
      expect((await query({ amount: { $between: [decimal('3.5'), decimal('123456789012.3456789')] } })).length)
        .toBe(3);
      const ordered = await client.executeQuery<any>(new SelectQuery('Probe')
        .order(OrderBy.asc('amount')).limit(10)
        .comment('order exact decimal probe').purpose('verify numeric order'));
      expect(ordered.map(row => row.amount)).toEqual([
        '-0.11', '-0.1', '3.50', '3.5', '123456789012.3456789',
      ]);
      const sums = await client.executeQuery<any>(new SelectQuery('Probe')
        .aggregate('Sum', 'amount', 'total').limit(1)
        .comment('sum exact decimal probe').purpose('verify exact aggregate'));
      expect(sums[0].total).toBe('123456789019.1356789');
      const grouped = await client.executeQuery<any>(new SelectQuery('Probe')
        .groupBy('amount').aggregate('Count', 'id', 'rowCount').limit(10)
        .comment('group exact decimal probe').purpose('verify equivalent scales group together'));
      expect(grouped.find(row => row.amount === '3.50' || row.amount === '3.5')?.rowCount).toBe(2);
      const minimum = await client.executeQuery<any>(new SelectQuery('Probe')
        .aggregate('Min', 'amount', 'minimum').limit(1)
        .comment('find minimum exact amount').purpose('verify exact minimum'));
      expect(minimum[0].minimum).toBe('-0.11');
      await expect(client.executeQuery(new SelectQuery('Probe')
        .aggregate('Avg', 'amount', 'average').limit(1)
        .comment('average exact amount').purpose('reject undefined decimal rounding')))
        .rejects.toThrow('EXACT_DECIMAL_UNSUPPORTED');
    } finally {
      await client.close();
    }
  });

  test('rejects an existing NUMERIC-affinity column instead of silently losing digits', async () => {
    const driver = new SQLiteDriver(':memory:');
    try {
      await driver.query('CREATE TABLE probe_data (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, amount NUMERIC)');
      await expect(driver.ensureSchema(schemas)).rejects.toThrow('EXACT_DECIMAL_SCHEMA_MISMATCH');
    } finally {
      await driver.close();
    }
  });
});
