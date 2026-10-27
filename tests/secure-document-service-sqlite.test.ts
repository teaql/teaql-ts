import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspect } from 'node:util';
import { UserContext } from '../src/core/context';
import { BlobRef } from '../src/core/blob-ref';
import { GraphCommittedError } from '../src/core/request-intent';
import { SqlBlobCatalog } from '../src/blob-reference/sql-catalog';
import { SecureDocumentReferenceModule } from '../src/secure-document-reference/document-round-trip';
import { SqliteDocumentCommandJournal } from '../src/secure-document-reference/sqlite-command-journal';
import { SqliteSecureDocumentService, SqliteDocumentHost } from
  '../src/secure-document-reference/sqlite-document-service';
import { StaticReferenceKeyProvider, TrustedReferencePrincipal } from
  '../src/secure-document-reference/round-trip-reference';
import { SQLiteDriver, SQLiteTeaQLClient } from '../src/sql/sqlite';

test('SQLite secure document open, accept and replay use current permission and one business transaction',
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'teaql-secure-document-'));
    const filename = join(directory, 'document.sqlite');
    const driver = new SQLiteDriver(filename);
    const client = new SQLiteTeaQLClient(filename, {});
    const context = new UserContext();
    client.setUserContext(context);
    const principal: TrustedReferencePrincipal = {
      authenticationRealm: 'oidc', subject: 'alice', domainRootType: 'Merchant', domainRootId: 7,
    };
    const bob: TrustedReferencePrincipal = { ...principal, subject: 'bob' };
    const keys = new StaticReferenceKeyProvider('k1', [
      { keyId: 'k1', masterKey: Buffer.alloc(32, 0x42) },
    ]);
    const runtime = new SecureDocumentReferenceModule('order-service', 'test', keys,
      () => {});
    // A selection must expire strictly before its 60-second parent document.
    const selectionLifetimeSeconds = 30;
    const journal = new SqliteDocumentCommandJournal(driver);
    const catalog = new SqlBlobCatalog(driver);
    let failPresentation = false;
    let mutations = 0;
    let changeActor = false;
    let principalReads = 0;
    const host: SqliteDocumentHost = {
      principal: () => changeActor && ++principalReads > 1 ? bob : principal,
      authorize: async (_context, actor, scope, session) => {
        if (!['alice', 'bob'].includes(actor.subject) || scope.documentId !== 'edit-10' ||
            scope.aggregateType !== 'Order' || scope.aggregateId !== 10n) {
          throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
        }
        const permission = await session.query(
          'SELECT can_edit FROM document_permission WHERE subject = ? AND order_id = ?',
          [actor.subject, 10]);
        if (permission.rowCount !== 1 || Number(permission.rows[0].can_edit) !== 1)
          throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
      },
      load: async (_context, businessId, session) => {
        const rows = await session.query('SELECT id,business_id,number,version,quantity,blob_key FROM document_order WHERE business_id = ?',
          [businessId]);
        if (rows.rowCount !== 1) throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        const row = rows.rows[0];
        const version = Number(row.version);
        const bindings = await session.query(`SELECT key,version FROM teaql_blob_binding
          WHERE scope = ? AND entity = ? AND entity_id = ? AND field = ?`,
        ['merchant:7', 'Order', '10', 'attachment']);
        if (bindings.rowCount > 1 || (bindings.rows[0]?.key ?? null) !== row.blob_key)
          throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        const binding = bindings.rows[0];
        const lines = await session.query(`SELECT id,version,client_key,blob_key
          FROM document_order_line WHERE order_id = ? ORDER BY id`, [10]);
        const lineEntities = [];
        const lineBindings = [];
        for (const line of lines.rows) {
          const rowKey = `line:${line.id}`;
          const linked = await session.query(`SELECT key,version FROM teaql_blob_binding
            WHERE scope = ? AND entity = ? AND entity_id = ? AND field = ?`,
          ['merchant:7', 'OrderLine', String(line.id), 'attachment']);
          if (linked.rowCount > 1 || (linked.rows[0]?.key ?? null) !== line.blob_key)
            throw new Error('DOCUMENT_PROJECTION_VIOLATION');
          lineEntities.push({ rowKey,
            identity: { entityType: 'OrderLine', id: BigInt(line.id), version: Number(line.version) },
            loadedFields: ['attachment'], writableFields: ['attachment'],
            allowedMutations: ['UPDATE' as const] });
          lineBindings.push({ rowKey, canonicalField: 'attachment', entityType: 'OrderLine',
            stableKey: linked.rows[0]?.key ?? null,
            bindingVersion: Number(linked.rows[0]?.version ?? 0), nullable: true, writable: true });
        }
        return {
          document: { snapshot: {
            modelFingerprint: 'order-model-v1', businessId,
            scope: { documentId: 'edit-10', purpose: 'edit-order', aggregateType: 'Order',
              aggregateId: BigInt(row.id), aggregateRevision: version },
            aggregate: { entityType: 'Order', id: BigInt(row.id), version },
            entities: [{ rowKey: 'order:10',
              identity: { entityType: 'Order', id: BigInt(row.id), version },
              loadedFields: ['attachment', 'number', 'quantity'],
              writableFields: ['attachment', 'quantity'],
              allowedMutations: ['UPDATE' as const] }, ...lineEntities],
            relations: [{ name: 'lines', rowKeys: lineEntities.map(line => line.rowKey),
              completeness: 'COMPLETE' as const, writable: true,
              allowedMutations: ['CREATE_CHILD' as const] }],
          }, bindings: [{ rowKey: 'order:10', canonicalField: 'attachment',
            entityType: 'Order', stableKey: binding?.key ?? null,
            bindingVersion: Number(binding?.version ?? 0), nullable: true, writable: true },
          ...lineBindings] },
          body: { number: String(row.number), quantity: Number(row.quantity) },
          lifetimeSeconds: 120,
        };
      },
      apply: async (_context, issued, submitted, session, selections) => {
        const body = submitted.body as { number: unknown; quantity: unknown };
        if (Object.keys(body).sort().join(',') !== 'number,quantity' ||
            body.number !== 'ORD-10' || !Number.isSafeInteger(body.quantity) ||
            Number(body.quantity) < 1 || Number(body.quantity) > 100)
          throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        mutations++;
        const updated = await session.query(`UPDATE document_order
          SET quantity = ?, blob_key = COALESCE(?,blob_key), version = version + 1
          WHERE id = ? AND version = ? AND number = ?`,
        [body.quantity, selections.find(selection =>
          selection.target.kind === 'EXISTING_ROW')?.stableKey ?? null,
          10, Number(issued.snapshot.aggregate.version), body.number]);
        if (updated.rowCount !== 1) throw new Error('DOCUMENT_REVISION_CONFLICT');
        for (const selection of selections) {
          if (selection.target.kind !== 'NEW_CLIENT_KEY') continue;
          if (selection.target.targetEntity !== 'OrderLine' ||
              selection.target.canonicalField !== 'attachment' ||
              !/^client-line-[12]$/.test(selection.target.targetKey))
            throw new Error('DOCUMENT_PROJECTION_VIOLATION');
          const id = selection.target.targetKey === 'client-line-1' ? 21 : 22;
          const created = await session.query(`INSERT INTO document_order_line
            (id,order_id,client_key,version,blob_key) VALUES (?,?,?,?,NULL)`,
          [id, 10, selection.target.targetKey, 1]);
          if (created.rowCount !== 1) throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        }
      },
      resolveNewBlobSelection: async (_context, _issued, _submitted, selection, session) => {
        const rows = await session.query(`SELECT id FROM document_order_line
          WHERE order_id = ? AND client_key = ?`, [10, selection.target.targetKey]);
        if (rows.rowCount !== 1) throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        return { rowKey: `line:${rows.rows[0].id}`, entityId: String(rows.rows[0].id) };
      },
      bindBlobSelection: async (current, owner, graph, selection) => {
        const existing = selection.target.kind === 'EXISTING_ROW' &&
          selection.target.targetEntity === 'Order' && selection.rowKey === 'order:10' &&
          selection.entityId === '10';
        const child = selection.target.kind === 'NEW_CLIENT_KEY' &&
          selection.target.targetEntity === 'OrderLine' &&
          selection.rowKey === `line:${selection.entityId}` &&
          ['21', '22'].includes(selection.entityId);
        if ((!existing && !child) || selection.target.canonicalField !== 'attachment')
          throw new Error('BLOB_BIND_DENIED');
        if (child) {
          const updated = await owner.withGraphSqlSession(graph, session =>
            session.query(`UPDATE document_order_line SET blob_key = ? WHERE id = ?`,
              [selection.stableKey, Number(selection.entityId)]));
          if (updated.rowCount !== 1) throw new Error('BLOB_BIND_DENIED');
        }
        await catalog.bindInGraph(owner, graph, current, {
          target: { entity: selection.target.targetEntity, entityId: selection.entityId,
            field: selection.target.canonicalField },
          next: new BlobRef(selection.stableKey),
          expectedVersion: selection.expectedVersion,
          nextVersion: selection.nextVersion,
          action: child ? 'Create' : 'Update',
        }, { scope: () => 'merchant:7',
          authorize: async (_context, target, _previous, next) =>
            target.entity === selection.target.targetEntity &&
            target.entityId === selection.entityId &&
            target.field === 'attachment' && next instanceof BlobRef });
      },
      present: async () => { if (failPresentation) throw new Error('presentation unavailable'); },
    };
    const service = new SqliteSecureDocumentService(context, client, driver, runtime, journal, host);
    const openRequest = { aggregateType: 'Order', businessId: 'ORD-10',
      purpose: 'edit-order', lifetimeSeconds: 60 };
    try {
      await journal.installSchema();
      await journal.validateSchema();
      await catalog.ensureSchema();
      await catalog.validateSchema();
      await driver.query(`CREATE TABLE document_order (
        id INTEGER PRIMARY KEY, business_id TEXT UNIQUE NOT NULL,
        number TEXT NOT NULL, version INTEGER NOT NULL, quantity INTEGER NOT NULL,
        blob_key TEXT)`);
      await driver.query(`CREATE TABLE document_order_line (
        id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, client_key TEXT NOT NULL UNIQUE,
        version INTEGER NOT NULL, blob_key TEXT)`);
      await driver.query(`CREATE TABLE document_permission (
        subject TEXT NOT NULL, order_id INTEGER NOT NULL, can_edit INTEGER NOT NULL,
        PRIMARY KEY(subject,order_id))`);
      await driver.query("INSERT INTO document_order VALUES (10,'ORD-10','ORD-10',1,1,NULL)");
      await driver.query(`INSERT INTO teaql_blob_catalog VALUES
        ('blob_A','merchant:7','objects/a','v1','a.pdf','application/pdf',3,'uploaded_unbound')`);
      await driver.query("INSERT INTO document_permission VALUES ('alice',10,1)");
      await driver.query("INSERT INTO document_permission VALUES ('bob',10,1)");

      const opened = await service.open(context, openRequest);
      expect(opened.documentToken.startsWith('tqd2.k1.')).toBe(true);
      expect(String(opened)).toBe('ContextualDocument[redacted]');
      expect(inspect(opened)).not.toContain(opened.documentToken);
      expect(opened.body).toEqual({ number: 'ORD-10', quantity: 1 });
      const issued = runtime.consumeBoundDocumentSnapshot(principal, opened.documentToken,
        'Order', 'edit-order').document;
      const selectionTarget = { scope: issued.snapshot.scope, targetEntity: 'Order',
        canonicalField: 'attachment', kind: 'EXISTING_ROW' as const,
        targetKey: 'order:10', commandId: 'command-1' };
      const selectionToken = runtime.issueBlobSelection(principal, opened.documentToken,
        { target: selectionTarget, stableKey: 'blob_A' }, selectionLifetimeSeconds);
      const submitted = { businessId: 'ORD-10', documentToken: opened.documentToken,
        commandId: 'command-1', body: { number: 'ORD-10', quantity: 3 },
        blobSelections: [{ token: selectionToken, targetEntity: 'Order',
          canonicalField: 'attachment', kind: 'EXISTING_ROW' as const, targetKey: 'order:10' }] };
      const accepted = await service.accept(context,
        { aggregateType: 'Order', purpose: 'edit-order', submitted });
      expect(accepted).toMatchObject({ previousRevision: 1, newRevision: 2, replayed: false });
      expect(String(accepted)).toBe('AcceptedDocument[redacted]');
      expect(inspect(accepted)).not.toContain(accepted.document.documentToken);
      expect(accepted.document.body).toEqual({ number: 'ORD-10', quantity: 3 });
      expect((await driver.query('SELECT version,quantity FROM document_order')).rows[0])
        .toMatchObject({ version: 2, quantity: 3 });
      expect((await driver.query('SELECT key,version FROM teaql_blob_binding')).rows[0])
        .toMatchObject({ key: 'blob_A', version: 1 });
      expect((await driver.query('SELECT status FROM teaql_blob_catalog')).rows[0].status)
        .toBe('available');
      expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt')).rows[0].n)
        .toBe(1);

      const replay = await service.accept(context,
        { aggregateType: 'Order', purpose: 'edit-order', submitted });
      expect(replay.replayed).toBe(true);
      expect(replay.document.documentToken).toBe(accepted.document.documentToken);
      expect(mutations).toBe(1);
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { ...submitted, blobSelections: [] } }))
        .rejects.toThrow('DOCUMENT_REPLAY_CONFLICT');
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { ...submitted, body: { number: 'ORD-10', quantity: 4 } } }))
        .rejects.toThrow('DOCUMENT_REPLAY_CONFLICT');

      await driver.query("UPDATE document_permission SET can_edit = 0 WHERE subject = 'alice'");
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order', submitted }))
        .rejects.toThrow('DOCUMENT_AUTHORIZATION_REQUIRED');
      await driver.query("UPDATE document_permission SET can_edit = 1 WHERE subject = 'alice'");
      const stale = { ...submitted, commandId: 'command-stale' };
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: stale })).rejects.toThrow('DOCUMENT_REVISION_CONFLICT');

      const fresh = await service.open(context, openRequest);
      const freshScope = runtime.consumeBoundDocumentSnapshot(principal, fresh.documentToken,
        'Order', 'edit-order').document.snapshot.scope;
      const wrongCommandToken = runtime.issueBlobSelection(principal, fresh.documentToken,
        { target: { ...selectionTarget, scope: freshScope, commandId: 'different-command' },
          stableKey: 'blob_A' }, selectionLifetimeSeconds);
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { businessId: 'ORD-10', documentToken: fresh.documentToken,
          commandId: 'command-wrong-selection', body: { number: 'ORD-10', quantity: 6 },
          blobSelections: [{ token: wrongCommandToken, targetEntity: 'Order',
            canonicalField: 'attachment', kind: 'EXISTING_ROW', targetKey: 'order:10' }] } }))
        .rejects.toThrow('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
      expect((await driver.query('SELECT version,quantity FROM document_order')).rows[0])
        .toMatchObject({ version: 2, quantity: 3 });
      const duplicateToken = runtime.issueBlobSelection(principal, fresh.documentToken,
        { target: { ...selectionTarget, scope: freshScope, commandId: 'command-duplicate' },
          stableKey: 'blob_A' }, selectionLifetimeSeconds);
      const duplicate = { token: duplicateToken, targetEntity: 'Order',
        canonicalField: 'attachment', kind: 'EXISTING_ROW' as const, targetKey: 'order:10' };
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { businessId: 'ORD-10', documentToken: fresh.documentToken,
          commandId: 'command-duplicate', body: { number: 'ORD-10', quantity: 6 },
          blobSelections: [duplicate, duplicate] } }))
        .rejects.toThrow('DOCUMENT_COMMAND_INVALID');
      const badToken = runtime.issueBlobSelection(principal, fresh.documentToken,
        { target: { ...selectionTarget, scope: freshScope, commandId: 'command-bad-blob' },
          stableKey: 'blob_missing' }, selectionLifetimeSeconds);
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { businessId: 'ORD-10', documentToken: fresh.documentToken,
          commandId: 'command-bad-blob', body: { number: 'ORD-10', quantity: 8 },
          blobSelections: [{ token: badToken, targetEntity: 'Order',
            canonicalField: 'attachment', kind: 'EXISTING_ROW', targetKey: 'order:10' }] } }))
        .rejects.toThrow('BLOB_BIND_DENIED');
      expect((await driver.query('SELECT version,quantity,blob_key FROM document_order')).rows[0])
        .toMatchObject({ version: 2, quantity: 3, blob_key: 'blob_A' });
      expect((await driver.query('SELECT key,version FROM teaql_blob_binding')).rows[0])
        .toMatchObject({ key: 'blob_A', version: 1 });
      await driver.query(`INSERT INTO teaql_blob_catalog VALUES
        ('blob_B','merchant:7','objects/b','v1','b.pdf','application/pdf',3,'uploaded_unbound')`);
      const receiptToken = runtime.issueBlobSelection(principal, fresh.documentToken,
        { target: { ...selectionTarget, scope: freshScope, commandId: 'command-receipt-fail' },
          stableKey: 'blob_B' }, selectionLifetimeSeconds);
      await driver.query(`CREATE TRIGGER reject_selected_receipt
        BEFORE INSERT ON teaql_document_command_receipt
        WHEN NEW.command_id = 'command-receipt-fail'
        BEGIN SELECT RAISE(ABORT, 'receipt fixture failure'); END`);
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { businessId: 'ORD-10', documentToken: fresh.documentToken,
          commandId: 'command-receipt-fail', body: { number: 'ORD-10', quantity: 7 },
          blobSelections: [{ token: receiptToken, targetEntity: 'Order',
            canonicalField: 'attachment', kind: 'EXISTING_ROW', targetKey: 'order:10' }] } }))
        .rejects.toThrow('DOCUMENT_CATALOG_FAILED');
      await driver.query('DROP TRIGGER reject_selected_receipt');
      expect((await driver.query('SELECT version,quantity,blob_key FROM document_order')).rows[0])
        .toMatchObject({ version: 2, quantity: 3, blob_key: 'blob_A' });
      expect((await driver.query('SELECT key,version FROM teaql_blob_binding')).rows[0])
        .toMatchObject({ key: 'blob_A', version: 1 });
      expect((await driver.query("SELECT status FROM teaql_blob_catalog WHERE key = 'blob_B'"))
        .rows[0].status).toBe('uploaded_unbound');
      expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt'))
        .rows[0].n).toBe(1);
      changeActor = true;
      principalReads = 0;
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { businessId: 'ORD-10', documentToken: fresh.documentToken,
          commandId: 'command-wrong-actor', body: { number: 'ORD-10', quantity: 6 } } }))
        .rejects.toThrow('DOCUMENT_AUTHORIZATION_REQUIRED');
      changeActor = false;
      expect((await driver.query('SELECT version,quantity FROM document_order')).rows[0])
        .toMatchObject({ version: 2, quantity: 3 });
      const failed = { businessId: 'ORD-10', documentToken: fresh.documentToken,
        commandId: 'command-failed', body: { number: 'ORD-10', quantity: 9 } };
      await driver.query(`CREATE TRIGGER reject_nine BEFORE UPDATE ON document_order
        WHEN NEW.quantity = 9 BEGIN SELECT RAISE(ABORT, 'fixture failure'); END`);
      const failedResult = await service.accept(context, { aggregateType: 'Order',
        purpose: 'edit-order', submitted: failed }).then(async accepted => ({
        replayed: accepted.replayed,
        mutations,
        row: (await driver.query('SELECT version,quantity FROM document_order')).rows[0],
        trigger: (await driver.query("SELECT name FROM sqlite_master WHERE name = 'reject_nine'"))
          .rows.length,
      }), error => error);
      expect(failedResult).toHaveProperty('message', expect.any(String));
      expect((await driver.query('SELECT version,quantity FROM document_order')).rows[0])
        .toMatchObject({ version: 2, quantity: 3 });
      expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt')).rows[0].n)
        .toBe(1);

      failPresentation = true;
      const committedButUnrendered = { businessId: 'ORD-10', documentToken: fresh.documentToken,
        commandId: 'command-2', body: { number: 'ORD-10', quantity: 5 } };
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: committedButUnrendered })).rejects.toBeInstanceOf(GraphCommittedError);
      expect((await driver.query('SELECT version,quantity FROM document_order')).rows[0])
        .toMatchObject({ version: 3, quantity: 5 });
      failPresentation = false;
      const recovered = await service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: committedButUnrendered });
      expect(recovered.replayed).toBe(true);
      expect(recovered.newRevision).toBe(3);
      expect(mutations).toBe(5); // first, catalog/receipt rejection, business trigger, presentation failure

      await driver.query(`INSERT INTO teaql_blob_catalog VALUES
        ('blob_C','merchant:7','objects/c','v1','c.pdf','application/pdf',3,'uploaded_unbound'),
        ('blob_D','merchant:7','objects/d','v1','d.pdf','application/pdf',3,'uploaded_unbound')`);
      const childOpen = await service.open(context, openRequest);
      const childScope = runtime.consumeBoundDocumentSnapshot(principal, childOpen.documentToken,
        'Order', 'edit-order').document.snapshot.scope;
      const childToken = runtime.issueBlobSelection(principal, childOpen.documentToken,
        { target: { scope: childScope, targetEntity: 'OrderLine',
          canonicalField: 'attachment', kind: 'NEW_CLIENT_KEY',
          targetKey: 'client-line-1', commandId: 'command-new-child' },
          stableKey: 'blob_C' }, selectionLifetimeSeconds);
      const childSubmitted = { businessId: 'ORD-10', documentToken: childOpen.documentToken,
        commandId: 'command-new-child', body: { number: 'ORD-10', quantity: 6 },
        blobSelections: [{ token: childToken, targetEntity: 'OrderLine',
          canonicalField: 'attachment', kind: 'NEW_CLIENT_KEY' as const,
          targetKey: 'client-line-1' }] };
      const childAccepted = await service.accept(context,
        { aggregateType: 'Order', purpose: 'edit-order', submitted: childSubmitted });
      expect(childAccepted).toMatchObject({ previousRevision: 3, newRevision: 4,
        replayed: false });
      expect((await driver.query('SELECT version,quantity,blob_key FROM document_order')).rows[0])
        .toMatchObject({ version: 4, quantity: 6, blob_key: 'blob_A' });
      expect((await driver.query('SELECT id,version,blob_key FROM document_order_line')).rows[0])
        .toMatchObject({ id: 21, version: 1, blob_key: 'blob_C' });
      expect((await driver.query(`SELECT key,version FROM teaql_blob_binding
        WHERE entity = 'OrderLine' AND entity_id = '21' AND field = 'attachment'`)).rows[0])
        .toMatchObject({ key: 'blob_C', version: 1 });
      expect((await driver.query("SELECT status FROM teaql_blob_catalog WHERE key = 'blob_C'"))
        .rows[0].status).toBe('available');
      expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt'))
        .rows[0].n).toBe(3);
      const childReplay = await service.accept(context,
        { aggregateType: 'Order', purpose: 'edit-order', submitted: childSubmitted });
      expect(childReplay.replayed).toBe(true);
      expect(childReplay.document.documentToken).toBe(childAccepted.document.documentToken);

      const nextOpen = await service.open(context, openRequest);
      const nextScope = runtime.consumeBoundDocumentSnapshot(principal, nextOpen.documentToken,
        'Order', 'edit-order').document.snapshot.scope;
      const nextToken = runtime.issueBlobSelection(principal, nextOpen.documentToken,
        { target: { scope: nextScope, targetEntity: 'OrderLine',
          canonicalField: 'attachment', kind: 'NEW_CLIENT_KEY',
          targetKey: 'client-line-2', commandId: 'command-new-child-fail' },
          stableKey: 'blob_D' }, selectionLifetimeSeconds);
      await driver.query(`CREATE TRIGGER reject_new_child_receipt
        BEFORE INSERT ON teaql_document_command_receipt
        WHEN NEW.command_id = 'command-new-child-fail'
        BEGIN SELECT RAISE(ABORT, 'receipt fixture failure'); END`);
      await expect(service.accept(context, { aggregateType: 'Order', purpose: 'edit-order',
        submitted: { businessId: 'ORD-10', documentToken: nextOpen.documentToken,
          commandId: 'command-new-child-fail', body: { number: 'ORD-10', quantity: 7 },
          blobSelections: [{ token: nextToken, targetEntity: 'OrderLine',
            canonicalField: 'attachment', kind: 'NEW_CLIENT_KEY',
            targetKey: 'client-line-2' }] } }))
        .rejects.toThrow('DOCUMENT_CATALOG_FAILED');
      expect((await driver.query('SELECT version,quantity FROM document_order')).rows[0])
        .toMatchObject({ version: 4, quantity: 6 });
      expect((await driver.query('SELECT COUNT(*) AS n FROM document_order_line')).rows[0].n)
        .toBe(1);
      expect((await driver.query(`SELECT COUNT(*) AS n FROM teaql_blob_binding
        WHERE entity = 'OrderLine' AND entity_id = '22'`)).rows[0].n).toBe(0);
      expect((await driver.query("SELECT status FROM teaql_blob_catalog WHERE key = 'blob_D'"))
        .rows[0].status).toBe('uploaded_unbound');
      expect((await driver.query('SELECT COUNT(*) AS n FROM teaql_document_command_receipt'))
        .rows[0].n).toBe(3);
    } finally {
      await client.close();
      await driver.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
