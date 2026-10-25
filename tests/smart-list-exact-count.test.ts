import { SelectQuery } from '../src/core/ast';
import { AbstractSQLTeaQLClient } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';

class CountClient extends AbstractSQLTeaQLClient {
  constructor() { super(new SQLiteDriver(':memory:'), {}); }
}

describe('exact list-count boundary', () => {
  test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '3', null])('rejects inexact provider count %p', async value => {
    const client = new CountClient();
    jest.spyOn(client, 'executeQuery').mockResolvedValue([{ n: value }]);
    try {
      await expect(client.executeCount(new SelectQuery('Order').comment('count orders').purpose('validate list metadata'), 'n'))
        .rejects.toThrow('exact count alias n');
    } finally { await client.close(); }
  });

  test('zero is exact and multiple scalar rows cannot masquerade as one total', async () => {
    const client = new CountClient();
    const rows = jest.spyOn(client, 'executeQuery').mockResolvedValue([{ n: 0 }]);
    const query = new SelectQuery('Order').comment('count empty orders').purpose('preserve exact zero');
    try {
      expect(await client.executeCount(query, 'n')).toBe(0);
      rows.mockResolvedValue([{ n: 1 }, { n: 2 }]);
      await expect(client.executeCount(query, 'n')).rejects.toThrow('exact count alias n');
    } finally { await client.close(); }
  });
});
