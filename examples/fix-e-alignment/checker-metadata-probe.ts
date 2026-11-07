import { CheckException, decimal, FixedBusinessClock, UserContext } from '../../src';
import { checkResultToWire, CheckResult } from '../../src/core/i18n';
import { JsonFieldNamingProfile } from '../../src/core/object-location';
import { Q } from 'generated/generated/Q';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import { TeaQLClient } from 'generated/teaql-ts';
import { GENERATED_RUNTIME_MODULE } from 'generated/runtime-module';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

/** Actual generated audited saves, not manually constructed validation errors. */
export async function verifyCheckerMetadata(filename: string): Promise<void> {
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const observations: Array<{scenario: string; violations: CheckResult[]; entityType: string}> = [];
  const profiles: JsonFieldNamingProfile[] = ['camelCase', 'snake_case', 'PascalCase'];
  try {
    await context.ensureSchema();
    const driver = (client as any).driver;
    const query = jest.spyOn(driver, 'query');
    const transaction = jest.spyOn(driver, 'transaction');
    const owner = async () => (await Q.purchaseOrders().comment('Prepare a Checker metadata regression')
      .purpose('Require declaring entity types on actual generated-save errors').newEntity(context));
    const good = (await owner()).updateContactPhone('5550800');
    expect(transaction.mock.calls.length).toBe(1); // Creation reserves, but does not save.
    query.mockClear(); transaction.mockClear();
    await good.auditAs('Calibrate successful Checker admission and SQLite instrumentation').save(context);
    expect(query.mock.calls.length).toBeGreaterThan(0);
    expect(transaction.mock.calls.length).toBe(1);
    const table = (client as any).schemas.PurchaseOrder.table;
    const oracle = () => {
      const db = new Database(filename, {readonly: true, fileMustExist: true});
      try { return {count: db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get(),
        row: db.prepare(`SELECT contact_phone, version FROM "${table}" WHERE id = ?`).get(good.id)}; }
      finally { db.close(); }
    };
    const before = oracle();
    const invalid = async (scenario: string, save: () => Promise<unknown>, entityType = 'PurchaseOrder',
        expectedPath?: string, expectedRule?: string) => {
      query.mockClear(); transaction.mockClear(); const audits = client.auditTrace.length;
      let failure: CheckException | undefined;
      try { await save(); }
      catch (error) { if (!(error instanceof CheckException)) throw error; failure = error; }
      expect(failure).toBeInstanceOf(CheckException);
      const violations = [...failure!.violations];
      expect(violations.length).toBeGreaterThan(0);
      const effects = {queries: query.mock.calls.length, transactions: transaction.mock.calls.length,
        audits: client.auditTrace.length - audits};
      process.stdout.write('CORE_CHECKER_METADATA_CASE=' + JSON.stringify({scenario, effects,
        wire: profiles.map(profile => ({profile, results: violations.map(result => checkResultToWire(result, profile))}))}) + '\n');
      expect(effects).toEqual({queries: 0, transactions: 0, audits: 0});
      expect(oracle()).toEqual(before);
      expect(context.getResource('fixTime')).toBeUndefined();
      if (expectedPath) expect(violations.some(result => result.location.modelPath() === expectedPath)).toBe(true);
      if (expectedRule) expect(violations.some(result => result.ruleId === expectedRule)).toBe(true);
      observations.push({scenario, violations, entityType});
    };
    await invalid('create-required', async () => (await owner()).auditAs('Reject an omitted required contact phone').save(context));
    await invalid('create-max-length', async () => (await owner()).updateContactPhone('x'.repeat(33))
      .auditAs('Reject a contact phone exceeding the modeled length').save(context));
    const complete = (await Q.purchaseOrders().withIdIs(good.id!).limit(1)
      .comment('Load the complete owner before the invalid update').purpose('Verify explicit null is not omission')
      .executeForList(context))[0];
    // TypeScript correctly rejects null statically. Simulate an untyped JS
    // caller as well, without weakening the generated method's signature.
    Reflect.apply(complete.updateContactPhone, complete, [null]);
    await invalid('update-required-null', () => complete.auditAs('Reject null for a required contact phone').save(context));
    const partial = (await Q.purchaseOrdersWithMinimalFields().withIdIs(good.id!).limit(1)
      .comment('Load an identity-only owner for admission testing').purpose('Require complete modified objects')
      .executeForList(context))[0];
    partial.updateContactPhone('5550801');
    await invalid('modified-partial-owner', () => partial.auditAs('Reject changing a partially loaded owner').save(context));
    const badChild = async (scenario: string, name: string | undefined, price: string, rule: string, field: string) => {
      const parent = (await owner()).updateContactPhone('5550802');
      const child = (await Q.orderItems().comment('Prepare an invalid child for indexed Checker diagnostics')
        .purpose('Keep the declaring child type when prefixing an error').newEntity(context));
      if (name !== undefined) child.updateProductName(name);
      child.updateUnitPrice(decimal(price));
      parent.orderItemList().push(child);
      await invalid(scenario, () => parent.auditAs('Reject the complete graph before its first SQLite write').save(context),
        'OrderItem', 'order_item_list[0].' + field, rule);
    };
    await badChild('nested-required', undefined, '10.00', 'required', 'product_name');
    await badChild('nested-max-length', 'x'.repeat(81), '10.00', 'max_length', 'product_name');
    context.setLocaleCode('zh-CN');
    await badChild('nested-min', 'Synthetic Widget', '0', 'min', 'unit_price');
    await badChild('nested-max', 'Synthetic Widget', '1000001', 'max', 'unit_price');
    expect(observations).toHaveLength(8);
    for (const observation of observations) {
      for (const violation of observation.violations) {
        expect(violation.entityType).toBe(observation.entityType);
        expect(violation.message).toBeTruthy();
        if (violation.ruleId !== 'invalid_type') {
          expect(violation.message).toContain(violation.location.nativePath());
        }
        for (const profile of profiles) {
          const wire = checkResultToWire(violation, profile);
          expect(wire.entityType).toBe(observation.entityType);
          expect(wire.location).toEqual(violation.location.segments);
        }
      }
    }
    process.stdout.write('CORE_CHECKER_METADATA=' + JSON.stringify({language: 'typescript', passed: true,
      scenarios: observations.length, wireProjections: observations.reduce((n, v) => n + v.violations.length * 3, 0),
      positiveProviderCalibration: true, rejectedQueries: 0, rejectedTransactions: 0, rejectedAudits: 0}) + '\n');
    query.mockRestore(); transaction.mockRestore();
  } finally { await client.close(); }
}

/** The generated file-backed client has its own save boundary; exercise it too. */
export async function verifyFileCheckerMetadata(filename: string): Promise<void> {
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')))
    .withActiveRoot({entity: 'Tenant', id: '1'});
  const client = new TeaQLClient(filename).install(GENERATED_RUNTIME_MODULE).setUserContext(context);
  context.insertResource('dataService', client);
  const owner = async () => (await Q.purchaseOrders().comment('Prepare file-backed Checker admission')
    .purpose('Verify the generated client preserves declaring entity types').newEntity(context));
  const persist = jest.spyOn(client as any, 'persist');
  try {
    const good = (await owner()).updateContactPhone('5550803');
    await good.auditAs('Calibrate a successful file-backed save').save(context);
    expect(persist.mock.calls.length).toBeGreaterThan(0);
    const before = readFileSync(filename), audits = client.auditTrace.length;
    const invalid = async (scenario: string, save: () => Promise<unknown>, entityType: string) => {
      persist.mockClear();
      let failure: CheckException | undefined;
      try { await save(); }
      catch (error) { if (!(error instanceof CheckException)) throw error; failure = error; }
      expect(failure).toBeInstanceOf(CheckException);
      expect(persist.mock.calls).toHaveLength(0);
      expect(client.auditTrace).toHaveLength(audits);
      expect(readFileSync(filename)).toEqual(before);
      expect(context.getResource('fixTime')).toBeUndefined();
      for (const violation of failure!.violations) expect(violation.entityType).toBe(entityType);
      process.stdout.write('CORE_FILE_CHECKER_METADATA_CASE=' + JSON.stringify({scenario, entityType,
        results: failure!.violations.map(result => checkResultToWire(result)), persistCalls: 0, auditEvents: 0}) + '\n');
      for (const violation of failure!.violations) expect(violation.message).toContain(violation.location.nativePath());
    };
    await invalid('create-required', async () => (await owner()).auditAs('Reject a file-backed required-field omission').save(context), 'PurchaseOrder');
    await invalid('create-max-length', async () => (await owner()).updateContactPhone('x'.repeat(33))
      .auditAs('Reject a file-backed modeled length violation').save(context), 'PurchaseOrder');
    const parent = (await owner()).updateContactPhone('5550804');
    const child = (await Q.orderItems().comment('Prepare a file-backed invalid child')
      .purpose('Verify prefixed errors retain the child type').newEntity(context)).updateUnitPrice(decimal('10'));
    parent.orderItemList().push(child);
    await invalid('nested-required', () => parent.auditAs('Reject an invalid file-backed child graph').save(context), 'OrderItem');
    process.stdout.write('CORE_FILE_CHECKER_METADATA=' + JSON.stringify({language: 'typescript', passed: true,
      scenarios: 3, positivePersistenceCalibration: true, rejectedPersistCalls: 0, rejectedAuditEvents: 0}) + '\n');
  } finally { persist.mockRestore(); }
}
