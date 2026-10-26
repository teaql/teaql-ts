import { CheckException, decimal, FixedBusinessClock, TeaQLNotLoadedError, UserContext } from '../../src';
import { E } from 'generated/generated/E';
import { Q } from 'generated/generated/Q';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import { RuntimeOperation, RuntimeOperationCompletion } from '../../src/core/telemetry';
import { verifyLoading } from './loading-probe';
import { verifyOwnership } from './ownership-probe';
import Database from 'better-sqlite3';

test('unmodified generated Q/E and audited SQLite saves consume the local Business Clock', async () => {
  const first = new Date('2032-02-29T10:15:30.000Z');
  const second = new Date('2032-03-01T11:16:31.000Z');
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(first));
  const client = new SQLiteTeaQLClient(process.env.TEAQL_FIX_E_DB || ':memory:').setUserContext(context);
  const telemetry: Array<{operation: RuntimeOperation; completion?: RuntimeOperationCompletion}> = [];
  client.setRuntimeTelemetry({start: operation => ({
    success: completion => { telemetry.push({operation, completion}); },
    failure: () => undefined,
  })});
  context.insertResource('dataService', client);
  const diagnostics: ReturnType<TeaQLNotLoadedError['toWire']>[] = [];
  const humanMessages: string[] = [];
  const missing = (read: () => unknown, location: string, attempted: string, expression: string) => {
    try { read(); }
    catch (error) {
      if (!(error instanceof TeaQLNotLoadedError)) throw error;
      const wire = error.toWire();
      expect(wire.code).toBe('NOT_LOADED');
      expect(wire.instancePath).toBe(location);
      expect(wire.attemptedInstancePath).toBe(attempted);
      expect(wire.expressionWithBrokenPoint).toBe(expression);
      expect(wire.expressionWithBrokenPoint.match(/<broken>/g)).toHaveLength(1);
      expect(error.message).not.toContain('PRIVATE-FALLBACK');
      diagnostics.push(wire);
      humanMessages.push(error.message);
      return;
    }
    throw new Error('NotLoaded must not be treated as null or fallback');
  };
  try {
    await context.ensureSchema();
    const order = Q.purchaseOrders().comment('Prepare the synthetic clock fixture')
      .purpose('Verify generated Fix and expression diagnostics').newEntity(context);
    order.updateContactPhone('5550100');
    const saved = await order.auditAs('Create the synthetic Fix order').save(context);
    expect(new Date(E.purchaseOrder(saved).createTime().eval()!).getTime()).toBe(first.getTime());
    expect(new Date(E.purchaseOrder(saved).updateTime().eval()!).getTime()).toBe(first.getTime());
    expect(String(E.purchaseOrder(saved).tenantId().eval())).toBe('1');
    expect(E.purchaseOrder(saved).internalNote().orElse('fallback')).toBe('fallback');

    const partial = (await Q.purchaseOrders().withIdIs(saved.id!).limit(1)
      .comment('Load scalar fields without eager relations').purpose('Verify E requires explicit relation loading')
      .executeForList(context))[0];
    expect(String(E.purchaseOrder(partial).tenantId().eval())).toBe('1');
    missing(() => E.purchaseOrder(partial).tenant().name().eval(), '/tenant', '/tenant/name',
      'E.purchaseOrder(<root>).tenant()<broken>.name().eval()');
    missing(() => E.purchaseOrder(partial).tenant().purchaseOrderList().first().tenant().name().eval(),
      '/tenant', '/tenant/purchaseOrderList/0/tenant/name',
      'E.purchaseOrder(<root>).tenant()<broken>.purchaseOrderList().first().tenant().name().eval()');
    missing(() => E.purchaseOrder(partial).orderItemList().get(2).productName().eval(),
      '/orderItemList', '/orderItemList/2/productName',
      'E.purchaseOrder(<root>).orderItemList()<broken>.get(2).productName().eval()');
    missing(() => E.purchaseOrder(partial).tenant().name().orElse('PRIVATE-FALLBACK'),
      '/tenant', '/tenant/name',
      'E.purchaseOrder(<root>).tenant()<broken>.name().orElse(<fallback>)');

    context.withBusinessClock(new FixedBusinessClock(second));
    const loaded = (await Q.purchaseOrders().withIdIs(saved.id!).limit(1)
      .comment('Reload the complete order before changing it')
      .purpose('Verify update Fix preserves the original create time').executeForList(context))[0];
    loaded.updateContactPhone('5550101');
    await loaded.auditAs('Update the synthetic Fix order').save(context);
    const persisted = (await Q.purchaseOrders().withIdIs(saved.id!).limit(1)
      .comment('Reload the persisted update').purpose('Verify Business Clock values using E')
      .executeForList(context))[0];
    expect(new Date(E.purchaseOrder(persisted).createTime().eval()!).getTime()).toBe(first.getTime());
    expect(new Date(E.purchaseOrder(persisted).updateTime().eval()!).getTime()).toBe(second.getTime());
    expect(E.purchaseOrder(persisted).contactPhone().eval()).toBe('5550101');
    expect(context.getResource('fixTime')).toBeUndefined();
    const requests = telemetry.filter(event => event.operation.name === 'PurchaseOrder.request');
    expect(requests.length).toBeGreaterThanOrEqual(3);
    for (const request of requests) expect(request.completion?.attributes?.['teaql.result.cardinality']).toBe(1);
    const statements = telemetry.filter(event => /\.(select|readback)$/.test(event.operation.name));
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) expect(statement.operation.attributes?.['teaql.provider.execution']).toBe('statement');
    process.stdout.write('GENERATED_QUERY_METADATA_PASS language=typescript requestRows=1 providerExecution=statement\n');
    await verifyLoading(context, saved.id!);
    await verifyOwnership(context);
    process.stdout.write('FIX_E_EXAMPLE=' + JSON.stringify({ language: 'typescript', passed: true,
      normalGeneratedSave: true, createTimePreserved: true, updateTimeAdvanced: true,
      declaredContextRootInjected: true, diagnostics, humanMessages }) + '\n');
  } finally { await client.close(); }
});

test('a generated persisted field restored to its baseline has no provider, policy or audit effects', async () => {
  const filename = process.env.TEAQL_FIX_E_DB;
  if (!filename) throw new Error('retained SQLite database required for the independent oracle');
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-03-01T12:30:00Z')));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  try {
    await context.ensureSchema();
    const entity = Q.purchaseOrders().comment('Prepare the known baseline restoration fixture')
      .purpose('Verify a restored field does not become a business write').newEntity(context);
    entity.updateContactPhone('5550700');
    await entity.auditAs('Create the known baseline restoration fixture').save(context);
    const row = (await Q.purchaseOrders().withIdIs(entity.id!).limit(1)
      .comment('Load the persisted restoration baseline').purpose('Capture actual generated Q provenance')
      .executeForList(context))[0];
    const json = JSON.stringify(row), version = row.version;
    row.updateContactPhone('5550799').updateContactPhone('5550700');
    const driver = (client as any).driver;
    const transaction = jest.spyOn(driver, 'transaction');
    const query = jest.spyOn(driver, 'query');
    const policy = jest.spyOn(context, 'enterMutationPolicy');
    const audits = client.auditTrace.length;
    await row.auditAs('Save the restored baseline without writing').save(context);
    const schema = (client as any).schemas.PurchaseOrder;
    const oracle = new Database(filename, { readonly: true, fileMustExist: true });
    let stored: { contact_phone: string; version: number };
    try { stored = oracle.prepare(`SELECT contact_phone, version FROM "${schema.table}" WHERE id = ?`).get(row.id) as typeof stored; }
    finally { oracle.close(); }
    const result = {language: 'typescript', value: stored.contact_phone, versionBefore: version,
      versionAfter: stored.version, transactions: transaction.mock.calls.length, providerQueries: query.mock.calls.length,
      policyReviews: policy.mock.calls.length, auditEvents: client.auditTrace.length - audits,
      projectionUnchanged: JSON.stringify(row) === json};
    process.stdout.write('CORE_BASELINE_RESTORATION=' + JSON.stringify(result) + '\n');
    expect(result).toMatchObject({value: '5550700', versionAfter: version, transactions: 0,
      providerQueries: 0, policyReviews: 0, auditEvents: 0, projectionUnchanged: true});
    expect(E.purchaseOrder(row).contactPhone().eval()).toBe('5550700');

    const noIO = (scenario: string, auditStart: number) => {
      const effects = {scenario, transactions: transaction.mock.calls.length, providerQueries: query.mock.calls.length,
        policyReviews: policy.mock.calls.length, auditEvents: client.auditTrace.length - auditStart};
      process.stdout.write('CORE_BASELINE_RESTORATION_CASE=' + JSON.stringify(effects) + '\n');
      expect(effects).toMatchObject({transactions: 0, providerQueries: 0, policyReviews: 0, auditEvents: 0});
    };
    const reset = () => { transaction.mockClear(); query.mockClear(); policy.mockClear(); return client.auditTrace.length; };
    const rawKey = {entity: 'PurchaseOrder', id: (row as any)._ledgerId};
    (row as any)._root.set(rawKey, 'contact_phone', '5550799');
    (row as any)._root.set(rawKey, 'contact_phone', '5550700');
    const rawAudits = reset();
    await row.auditAs('Save an admitted raw canonical field restored to baseline').save(context);
    const rawResult = {transactions: transaction.mock.calls.length, providerQueries: query.mock.calls.length,
      policyReviews: policy.mock.calls.length, auditEvents: client.auditTrace.length - rawAudits,
      version: row.version, projectionUnchanged: JSON.stringify(row) === json};
    expect(rawResult).toEqual({transactions: 0, providerQueries: 0, policyReviews: 0, auditEvents: 0, version: 1, projectionUnchanged: true});
    process.stdout.write('CORE_BASELINE_RESTORATION_RAW=' + JSON.stringify(rawResult) + '\n');
    const nullBefore = JSON.stringify(row);
    expect(E.purchaseOrder(row).internalNote().eval()).toBeNull();
    row.updateInternalNote('intermediate note').updateInternalNote(null);
    let auditStart = reset();
    await row.auditAs('Save a restored loaded null').save(context);
    noIO('known-null', auditStart); expect(JSON.stringify(row)).toBe(nullBefore);

    const sparse = (await Q.purchaseOrdersWithMinimalFields().withIdIs(row.id!).selectContactPhone().limit(1)
      .comment('Load only the field needed for the restoration probe').purpose('Preserve the original sparse view')
      .executeForList(context))[0];
    const sparseBefore = JSON.stringify(sparse);
    sparse.updateContactPhone('5550799').updateContactPhone('5550700'); auditStart = reset();
    await sparse.auditAs('Save a restored known field in a sparse view').save(context);
    noIO('known-sparse-field', auditStart); expect(JSON.stringify(sparse)).toBe(sparseBefore);
    expect(() => E.purchaseOrder(sparse).internalNote().eval()).toThrow(TeaQLNotLoadedError);

    const unknown = (await Q.purchaseOrdersWithMinimalFields().withIdIs(row.id!).limit(1)
      .comment('Load identity without the original phone').purpose('Unknown provenance is not loaded null')
      .executeForList(context))[0];
    unknown.updateContactPhone('5550700'); auditStart = reset();
    await expect(unknown.auditAs('Reject an edit with an unknown original').save(context)).rejects.toThrow(CheckException);
    noIO('unknown-original-rejected', auditStart);

    const invalid = (await Q.purchaseOrders().withIdIs(row.id!).limit(1)
      .comment('Load the raw admission negative control').purpose('Invalid native keys cannot disappear as no-ops')
      .executeForList(context))[0];
    const invalidKey = {entity: 'PurchaseOrder', id: (invalid as any)._ledgerId};
    (invalid as any)._root.set(invalidKey, 'contact_phone', '5550700');
    (invalid as any)._root.set(invalidKey, 'contactPhone', '5550700'); auditStart = reset();
    await expect(invalid.auditAs('Reject a raw native-member field').save(context)).rejects.toThrow('canonical');
    noIO('invalid-key-before-discard', auditStart);
    expect((invalid as any)._root.change(invalidKey)).toHaveProperty('contact_phone', '5550700');

    context.withBusinessClock(new FixedBusinessClock(new Date('2032-04-01T09:15:00Z')));
    row.updateContactPhone('5550799').updateContactPhone('5550700').updateInternalNote('genuine remaining edit');
    auditStart = reset(); await row.auditAs('Persist the genuine edit after cancelling the phone change').save(context);
    expect(transaction).toHaveBeenCalledTimes(1); expect(policy).toHaveBeenCalledTimes(1);
    expect(client.auditTrace.length - auditStart).toBe(1);
    expect(row.version).toBe(2); expect(E.purchaseOrder(row).internalNote().eval()).toBe('genuine remaining edit');
    expect(new Date(E.purchaseOrder(row).updateTime().eval()!).toISOString()).toBe('2032-04-01T09:15:00.000Z');
    const remainingOracle = new Database(filename, {readonly: true, fileMustExist: true});
    try {
      expect(remainingOracle.prepare(`SELECT contact_phone, internal_note, version, update_time FROM "${schema.table}" WHERE id = ?`).get(row.id))
        .toEqual({contact_phone: '5550700', internal_note: 'genuine remaining edit', version: 2, update_time: 1964423700000});
    } finally { remainingOracle.close(); }

    // The complete plan, not only the parent's ledger, controls no-op handling.
    const child = Q.orderItems().comment('Prepare a genuine new child on a clean parent')
      .purpose('Verify clean parents still traverse pending child work').newEntity(context);
    child.updateProductName('Widget').updateUnitPrice(decimal('10'));
    entity.orderItemList().push(child);
    auditStart = reset(); await entity.auditAs('Save only the dirty child through its clean parent').save(context);
    expect(entity.version).toBe(1); expect(child.version).toBe(1); expect(transaction).toHaveBeenCalledTimes(1);
    expect(client.auditTrace.length - auditStart).toBe(1);
    const childOracle = new Database(filename, {readonly: true, fileMustExist: true});
    try {
      expect(childOracle.prepare('SELECT purchase_order, product_name, version FROM order_item_data WHERE id = ?').get(child.id))
        .toEqual({purchase_order: Number(entity.id), product_name: 'Widget', version: 1});
    } finally { childOracle.close(); }
    row.updateContactPhone('5550799').updateContactPhone('5550700').markForDeletion();
    auditStart = reset(); await row.auditAs('Keep pending deletion after a restored scalar edit').save(context);
    expect(row.version).toBe(-3); expect(transaction).toHaveBeenCalledTimes(1); expect(policy).toHaveBeenCalledTimes(1);
    expect(client.auditTrace.length - auditStart).toBe(1);
    const deletionOracle = new Database(filename, {readonly: true, fileMustExist: true});
    let deleted;
    try {deleted = deletionOracle.prepare(`SELECT contact_phone, version FROM "${schema.table}" WHERE id = ?`).get(row.id);}
    finally {deletionOracle.close();}
    expect(deleted).toEqual({contact_phone: '5550700', version: -3});
    process.stdout.write('CORE_BASELINE_RESTORATION_DELETE=' + JSON.stringify({version: row.version, transactions: transaction.mock.calls.length,
      policyReviews: policy.mock.calls.length, auditEvents: client.auditTrace.length - auditStart, physical: deleted}) + '\n');
    process.stdout.write('CORE_BASELINE_RESTORATION_COMPLETE=' + JSON.stringify({language: 'typescript', passed: true,
      knownValue: true, knownNull: true, sparseGeometry: true, unknownOriginal: true, rawAdmission: true,
      genuineEdit: true, cleanParentDirtyChild: true, independentReadOnlyOracle: true}) + '\n');
  } finally { jest.restoreAllMocks(); await client.close(); }
});
