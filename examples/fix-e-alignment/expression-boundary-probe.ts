import { createHash } from 'node:crypto';
import { decimal, ExpressionPath, FixedBusinessClock, TeaQLNotLoadedError, UserContext } from '../../src';
import { E } from 'generated/generated/E';
import { Q } from 'generated/generated/Q';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';

// Application-owned test. Generated Q/E/entity files remain untouched.
export async function verifyExpressionBoundaries(filename: string): Promise<void> {
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const driver = (client as any).driver;
  const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction');
  const policy = jest.spyOn(context, 'enterMutationPolicy');
  const cases: Array<Record<string, unknown>> = [];
  const record = (name: string, facts: Record<string, unknown>) => {
    const value = {case: name, ...facts}; cases.push(value);
    process.stdout.write('CORE_TS_E_CASE=' + JSON.stringify(value) + '\n');
  };
  const missing = (read: () => unknown, pointer: string, attempted: string, expression: string) => {
    try { read(); } catch (error) {
      if (!(error instanceof TeaQLNotLoadedError)) throw error;
      const wire = error.toWire();
      expect(wire.code).toBe('NOT_LOADED'); expect(wire.instancePath).toBe(pointer);
      expect(wire.attemptedInstancePath).toBe(attempted);
      expect(wire.expressionWithBrokenPoint).toBe(expression);
      expect(expression.match(/<broken>/g)).toHaveLength(1);
      expect(wire.originalExpression).toBe(expression.replace('<broken>', ''));
      expect(wire.suggestedFix).toEqual({action: 'preload', location: wire.location});
      expect(error.message).toContain('expression=' + expression);
      expect(error.message).not.toContain('PRIVATE_TS_ROOT');
      expect(JSON.stringify(wire)).not.toContain('PRIVATE_TS_FALLBACK');
      return {wire, human: error.message};
    }
    throw new Error('NotLoaded must not become loaded null, absence or fallback');
  };
  try {
    await context.ensureSchema();
    const parent = (await Q.purchaseOrders().comment('Create the generated E boundary parent')
      .purpose('Verify expression diagnostics against persisted rows').newEntity(context));
    parent.updateContactPhone('PRIVATE_TS_ROOT_123');
    for (let i = 0; i < 3; i++) {
      const child = (await Q.orderItems().comment('Create an indexed E boundary child')
        .purpose('Exercise real loaded-list positions').newEntity(context));
      child.updateProductName('Expression item ' + i).updateUnitPrice(decimal('10.00'));
      parent.orderItemList().push(child);
    }
    await parent.auditAs('Persist the generated E boundary graph').save(context);
    const empty = (await Q.purchaseOrders().comment('Create the loaded-empty E boundary parent')
      .purpose('Distinguish loaded empty from NotLoaded').newEntity(context));
    empty.updateContactPhone('PRIVATE_TS_ROOT_EMPTY');
    await empty.auditAs('Persist the parent without children').save(context);
    const calibration = {queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
      policies: policy.mock.calls.length, audits: client.auditTrace.length};
    for (const value of Object.values(calibration)) expect(value).toBeGreaterThan(0);

    const late = (await Q.purchaseOrdersWithMinimalFields().withIdIs(parent.id!)
      .selectTenantWith(Q.tenantsWithMinimalFields().limit(1).comment('Load the target identity, not its name'))
      .limit(1).comment('Load a real relation with a missing late scalar')
      .purpose('Keep the first missing leaf distinct from its loaded relation').executeForList(context))[0];
    const indexed = (await Q.purchaseOrders().withIdIs(parent.id!)
      .selectOrderItemListWith(Q.orderItemsWithMinimalFields().selectUnitPrice().orderByIdAscending().limit(3)
        .comment('Load child identities and prices without product names'))
      .limit(1).comment('Load the indexed sparse child graph')
      .purpose('Verify numeric E locations against actual rows').executeForList(context))[0];
    const emptyLoaded = (await Q.purchaseOrders().withIdIs(empty.id!)
      .selectOrderItemListWith(Q.orderItems().limit(3).comment('Load the genuinely empty list'))
      .limit(1).comment('Load a parent with no child records')
      .purpose('Preserve native loaded-empty behavior').executeForList(context))[0];
    const fkOnly = (await Q.purchaseOrders().withIdIs(parent.id!).limit(1)
      .comment('Load the FK without target details').purpose('Never fabricate a target from its ID')
      .executeForList(context))[0];
    expect(late).toBeDefined(); expect(indexed).toBeDefined(); expect(emptyLoaded).toBeDefined(); expect(fkOnly).toBeDefined();
    expect(String(E.purchaseOrder(late).tenant().id().eval())).toBe('1');
    expect(E.purchaseOrder(indexed).orderItemList().size().eval()).toBe(3);
    const childIds = [0, 1, 2].map(i => E.purchaseOrder(indexed).orderItemList().get(i).id().eval());
    expect(new Set(childIds).size).toBe(3);
    const rows = [late, indexed, emptyLoaded, fkOnly];
    const snapshot = () => createHash('sha256').update(JSON.stringify({values: rows,
      loaded: rows.map(row => ['id', 'version', 'tenant', 'contactPhone', 'internalNote', 'orderItemList'].map(key => row.isLoaded(key))),
      ledgers: rows.map(row => (row as any)._root.change({entity: 'PurchaseOrder', id: (row as any)._ledgerId}) ?? null),
    })).digest('hex');
    const before = snapshot(), audits = client.auditTrace.length;
    query.mockClear(); transaction.mockClear(); policy.mockClear();

    record('late-leaf', missing(() => E.purchaseOrder(late).tenant().name().eval(), '/tenant/name', '/tenant/name',
      'E.purchaseOrder(<root>).tenant().name()<broken>.eval()'));
    record('indexed-leaf', missing(() => E.purchaseOrder(indexed).orderItemList().get(2).productName().eval(),
      '/orderItemList/2/productName', '/orderItemList/2/productName',
      'E.purchaseOrder(<root>).orderItemList().get(2).productName()<broken>.eval()'));
    const nullValue = E.purchaseOrder(fkOnly).internalNote();
    expect(nullValue.eval()).toBeNull(); expect(nullValue.isPresent()).toBe(true);
    expect(nullValue.orElse('PRIVATE_TS_FALLBACK')).toBe('PRIVATE_TS_FALLBACK');
    record('loaded-null', {value: nullValue.eval(), present: nullValue.isPresent(), fallbackUsed: true});
    const emptyValue = E.purchaseOrder(emptyLoaded).orderItemList().first().productName();
    expect(E.purchaseOrder(emptyLoaded).orderItemList().size().eval()).toBe(0);
    expect(emptyValue.eval()).toBeUndefined(); expect(emptyValue.isPresent()).toBe(false);
    expect(emptyValue.orElse('PRIVATE_TS_FALLBACK')).toBe('PRIVATE_TS_FALLBACK');
    record('loaded-empty', {size: 0, valueKind: typeof emptyValue.eval(), present: emptyValue.isPresent(), fallbackUsed: true});
    const beyond = E.purchaseOrder(indexed).orderItemList().get(3).productName();
    expect(beyond.eval()).toBeUndefined(); expect(beyond.isPresent()).toBe(false);
    expect(beyond.orElse('PRIVATE_TS_FALLBACK')).toBe('PRIVATE_TS_FALLBACK');
    expect(E.purchaseOrder(indexed).orderItemList().get(-1).productName().eval()).toBeUndefined();
    record('out-of-range', {index: 3, negativeIndex: -1, valueKind: typeof beyond.eval(), present: beyond.isPresent(), fallbackUsed: true});
    const leaf = E.purchaseOrder(fkOnly).tenant().name();
    const terminals = [
      missing(() => leaf.eval(), '/tenant', '/tenant/name', 'E.purchaseOrder(<root>).tenant()<broken>.name().eval()'),
      missing(() => leaf.isPresent(), '/tenant', '/tenant/name', 'E.purchaseOrder(<root>).tenant()<broken>.name().isPresent()'),
      missing(() => leaf.orElse('PRIVATE_TS_FALLBACK'), '/tenant', '/tenant/name', 'E.purchaseOrder(<root>).tenant()<broken>.name().orElse(<fallback>)'),
    ];
    record('terminal-not-loaded', {terminals});
    const branch = E.purchaseOrder(fkOnly).tenant(), left = branch.name(), right = branch.purchaseOrderList().first().contactPhone();
    const leftExpression = 'E.purchaseOrder(<root>).tenant()<broken>.name().eval()';
    const leftBefore = missing(() => left.eval(), '/tenant', '/tenant/name', leftExpression);
    const rightFailure = missing(() => right.eval(), '/tenant', '/tenant/purchaseOrderList/0/contactPhone',
      'E.purchaseOrder(<root>).tenant()<broken>.purchaseOrderList().first().contactPhone().eval()');
    const leftAfter = missing(() => left.eval(), '/tenant', '/tenant/name', leftExpression);
    expect(leftAfter).toEqual(leftBefore);
    record('sibling-paths', {leftBefore, right: rightFailure, leftAfter});
    expect(String(E.purchaseOrder(fkOnly).tenantId().eval())).toBe('1');
    record('fk-only-not-loaded', {fk: 1, failure: missing(() => E.purchaseOrder(fkOnly).tenant().eval(), '/tenant', '/tenant',
      'E.purchaseOrder(<root>).tenant()<broken>.eval()')});
    const after = snapshot(); expect(after).toBe(before);
    const effects = {queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
      policies: policy.mock.calls.length, audits: client.auditTrace.length - audits};
    expect(effects).toEqual({queries: 0, transactions: 0, policies: 0, audits: 0});
    record('no-side-effects', {before, after, effects, calibration});

    // Native-only location component: the fixture has no punctuation-named model field.
    const profiles = (['camelCase', 'snake_case', 'PascalCase'] as const).map(profile => {
      const path = ExpressionPath.root('E.native(<root>)', profile).member('a~/b.c', 'safeMethod').markMissing();
      const error = new TeaQLNotLoadedError(path, 'a~/b.c').terminal('eval()');
      expect(error.toWire().instancePath).toBe(profile === 'PascalCase' ? '/A~0~1b.c' : '/a~0~1b.c');
      expect(error.toWire().location).toEqual([{kind: 'property', name: 'a~/b.c'}]);
      return {profile, wire: error.toWire()};
    });
    record('native-punctuation', {nativeOnly: true, profiles});
    process.stdout.write('CORE_TS_E_BOUNDARY_RESULT=' + JSON.stringify({language: 'typescript', passed: true,
      parentId: parent.id, emptyParentId: empty.id, childIds, cases: cases.map(value => value.case),
      generatedCases: 9, nativeLocationCases: 1, terminalObservations: terminals.length,
      fullPunctuationGeneratedPathAccepted: false, physicalVersionsUnchanged: true, effects}) + '\n');
  } finally {
    query.mockRestore(); transaction.mockRestore(); policy.mockRestore(); await client.close();
  }
}
