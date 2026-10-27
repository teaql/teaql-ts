import { GraphMutationSession, MutationIntent } from '../src/core/request-intent';
import type { SqlSession } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

test('optional module SQL uses the caller graph physical transaction and rejects stale handles', async () => {
  const client = new SQLiteTeaQLClient(':memory:', {});
  let captured: SqlSession | undefined;
  try {
    const outside = new GraphMutationSession(new MutationIntent('outside save'));
    await expect(client.withGraphSqlSession(outside, async () => undefined))
      .rejects.toThrow('BLOB_TRANSACTION_REQUIRED');

    await client.executeGraphSave(new MutationIntent('create catalog'), graph =>
      client.withGraphSqlSession(graph, async session => {
        captured = session;
        await session.query('CREATE TABLE module_catalog (key TEXT PRIMARY KEY)');
      }));
    await expect(captured!.query('SELECT 1')).rejects.toThrow('BLOB_TRANSACTION_REQUIRED');

    await expect(client.executeGraphSave(new MutationIntent('rollback catalog write'), async graph => {
      await client.withGraphSqlSession(graph, async session => {
        await session.query('INSERT INTO module_catalog(key) VALUES (?)', ['blob_a']);
        await expect(client.withGraphSqlSession(outside, async () => undefined))
          .rejects.toThrow('BLOB_TRANSACTION_REQUIRED');
      });
      throw new Error('abort graph');
    })).rejects.toThrow('abort graph');

    const count = async () => client.executeGraphSave(new MutationIntent('check catalog'), graph =>
      client.withGraphSqlSession(graph, async session =>
        Number((await session.query('SELECT COUNT(*) AS n FROM module_catalog')).rows[0].n)));
    expect(await count()).toBe(0);
    await client.executeGraphSave(new MutationIntent('commit catalog write'), graph =>
      client.withGraphSqlSession(graph, async session => {
        await session.query('INSERT INTO module_catalog(key) VALUES (?)', ['blob_a']);
      }));
    expect(await count()).toBe(1);
  } finally { await client.close(); }
});
