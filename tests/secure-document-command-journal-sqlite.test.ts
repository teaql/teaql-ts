import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UserContext } from '../src/core/context';
import { MutationIntent } from '../src/core/request-intent';
import { SqliteDocumentCommandJournal, SubmittedDocumentCommand } from
  '../src/secure-document-reference/sqlite-command-journal';
import { TrustedReferencePrincipal } from '../src/secure-document-reference/round-trip-reference';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

test('SQLite document command receipt shares business commit and replays only under current authority', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'teaql-document-command-'));
  const filename = join(directory, 'document.sqlite');
  const driver = new SQLiteDriver(filename);
  const client = new SQLiteTeaQLClient(filename, {});
  const journal = new SqliteDocumentCommandJournal(driver);
  const context = new UserContext();
  client.setUserContext(context);
  const principal: TrustedReferencePrincipal = {
    authenticationRealm: 'oidc', subject: 'alice', domainRootType: 'Merchant', domainRootId: 7,
  };
  const scope = { documentId: 'order-edit-10', purpose: 'edit-order', aggregateType: 'Order',
    aggregateId: 10, aggregateRevision: 1 };
  const command: SubmittedDocumentCommand = { businessId: 'ORD-10',
    documentToken: 'tqd2.fixture', commandId: 'command-1', body: { quantity: 3, note: 'ok' } };
  let allowed = true;
  let mutations = 0;
  const authority = async () => {
    if (!allowed) throw new Error('revoked');
    return principal;
  };
  const apply = (submitted: SubmittedDocumentCommand) =>
    client.executeGraphSave(new MutationIntent('accept authorized order document'), graph =>
      journal.apply(context, client, graph, scope, submitted, authority, async (session, frozen) => {
        expect(Object.isFrozen(frozen)).toBe(true);
        expect(Object.isFrozen(frozen.body)).toBe(true);
        expect(frozen.body).toEqual({ quantity: 3, note: 'ok' });
        mutations++;
        const updated = await session.query(
          'UPDATE document_order SET quantity = ?, version = version + 1 WHERE id = ? AND version = ?',
          [3, 10, 1]);
        if (updated.rowCount !== 1) throw new Error('stale document');
        return { previousRevision: 1, newRevision: 2, response: 'tqd2.accepted' };
      }));
  try {
    await journal.installSchema();
    await journal.validateSchema();
    await driver.query('CREATE TABLE document_order (id INTEGER PRIMARY KEY, version INTEGER, quantity INTEGER)');
    await driver.query('INSERT INTO document_order(id,version,quantity) VALUES (10,1,1)');

    const committed = await apply(command);
    expect(committed).toEqual({ receipt: { previousRevision: 1, newRevision: 2,
      response: 'tqd2.accepted' }, replayed: false });
    expect((await driver.query('SELECT version,quantity FROM document_order WHERE id = 10')).rows[0])
      .toMatchObject({ version: 2, quantity: 3 });
    expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt')).rows[0].n)
      .toBe(1);

    // The caller can lose the acknowledgement after COMMIT. The same command finds the receipt.
    const repeated = await apply({ ...command, body: { note: 'ok', quantity: 3 } });
    expect(repeated).toEqual({ receipt: committed.receipt, replayed: true });
    expect(mutations).toBe(1);
    expect((await driver.query('SELECT version FROM document_order WHERE id = 10')).rows[0].version)
      .toBe(2);
    const restarted = new SQLiteTeaQLClient(filename, {});
    const nextContext = new UserContext();
    restarted.setUserContext(nextContext);
    try {
      const durable = await restarted.executeGraphSave(
        new MutationIntent('replay accepted document after client restart'), graph =>
          journal.apply(nextContext, restarted, graph, scope, command, authority,
            async () => { throw new Error('durable replay must not mutate'); }));
      expect(durable).toEqual({ receipt: committed.receipt, replayed: true });
    } finally { await restarted.close(); }
    await expect(apply({ ...command, body: { quantity: 4, note: 'ok' } }))
      .rejects.toThrow('DOCUMENT_REPLAY_CONFLICT');
    expect(mutations).toBe(1);

    allowed = false;
    await expect(apply(command)).rejects.toThrow('DOCUMENT_AUTHORIZATION_REQUIRED');
    allowed = true;
    await expect(client.executeGraphSave(new MutationIntent('reject wrong current context'), graph =>
      journal.apply(new UserContext(), client, graph, scope, command, authority, async () => {
        throw new Error('must not mutate');
      }))).rejects.toThrow('DOCUMENT_AUTHORIZATION_REQUIRED');

    const second = { ...command, commandId: 'command-2' };
    await expect(client.executeGraphSave(new MutationIntent('abort rejected document command'),
      async graph => {
        await expect(journal.apply(context, client, graph, scope, second, authority,
          async session => {
            await session.query('UPDATE document_order SET quantity = 9 WHERE id = 10');
            throw new Error('invalid projection');
          })).rejects.toThrow('invalid projection');
      })).rejects.toThrow('GRAPH_TRANSACTION_ROLLBACK_ONLY');
    expect((await driver.query('SELECT quantity FROM document_order WHERE id = 10')).rows[0].quantity)
      .toBe(3);
    expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt')).rows[0].n)
      .toBe(1);

    const changing: SubmittedDocumentCommand = { ...command, commandId: 'command-3',
      body: { quantity: 5 } };
    await expect(client.executeGraphSave(new MutationIntent('reject changing document command'),
      graph => journal.apply(context, client, graph, scope, changing, authority, async session => {
        await session.query('UPDATE document_order SET quantity = 5 WHERE id = 10');
        (changing.body as { quantity: number }).quantity = 6;
        return { previousRevision: 2, newRevision: 3, response: 'tqd2.changed' };
      }))).rejects.toThrow('DOCUMENT_COMMAND_INVALID');
    expect((await driver.query('SELECT quantity FROM document_order WHERE id = 10')).rows[0].quantity)
      .toBe(3);
    expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt')).rows[0].n)
      .toBe(1);
  } finally {
    await client.close();
    await driver.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('SQLite document command readiness rejects a receipt table without its exact replay key', async () => {
  const driver = new SQLiteDriver(':memory:');
  const journal = new SqliteDocumentCommandJournal(driver);
  try {
    await driver.query(`CREATE TABLE teaql_document_command_receipt (
      scope_hash TEXT NOT NULL, actor_hash TEXT NOT NULL, command_id TEXT NOT NULL,
      request_hash TEXT NOT NULL, previous_revision BIGINT NOT NULL,
      new_revision BIGINT NOT NULL, response TEXT NOT NULL
    )`);
    await expect(journal.validateSchema()).rejects.toThrow('DOCUMENT_SCHEMA_MISSING');
    await journal.installSchema();
    await expect(journal.validateSchema()).rejects.toThrow('DOCUMENT_SCHEMA_MISSING');
  } finally { await driver.close(); }
});
