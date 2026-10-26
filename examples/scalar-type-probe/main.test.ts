// Application-owned acceptance. API spellings follow the existing
// TypescriptGeneratedCompileTest canonical scalar consumer, not generated-source discovery.
import {Q} from 'scalar-lib/generated/Q';
import {E, TeaQLNotLoadedError} from 'scalar-lib/generated/E';
import {ScalarTypeProbe} from 'scalar-lib/generated/models/ScalarTypeProbe';
import {SQLiteTeaQLClient} from 'scalar-lib/teaql-node-sqlite';
import {GENERATED_WIRE_MODEL_METADATA} from 'scalar-lib/runtime-module';
import {
  UserContext, decimal, long, localTime, createWireEntityMetadata,
  encodeWireOutput, normalizeWireInput, WireInputError,
} from 'teaql-ts';
import Database from 'better-sqlite3';

function values(entity: ScalarTypeProbe) {
  const e = E.scalarTypeProbe(entity);
  return {
    requiredString: e.requiredString().eval(), optionalString: e.optionalString().eval(),
    largeText: e.largeText().eval(), requiredBoolean: e.requiredBoolean().eval(),
    optionalBoolean: e.optionalBoolean().eval(), requiredInteger: e.requiredInteger().eval(),
    optionalInteger: e.optionalInteger().eval(), requiredLong: e.requiredLong().eval(),
    optionalLong: e.optionalLong().eval(), requiredDecimal: e.requiredDecimal().eval(),
    optionalDecimal: e.optionalDecimal().eval(), requiredFloat: e.requiredFloat().eval(),
    optionalFloat: e.optionalFloat().eval(), requiredDouble: e.requiredDouble().eval(),
    optionalDouble: e.optionalDouble().eval(), requiredDate: e.requiredDate().eval(),
    optionalDate: e.optionalDate().eval(), requiredTime: e.requiredTime().eval(),
    optionalTime: e.optionalTime().eval(), requiredDatetime: e.requiredDatetime().eval(),
    optionalDatetime: e.optionalDatetime().eval(),
  };
}

async function prepared(context: UserContext, name: string) {
  const root = await Q.typePlatforms().withIdIs('1').limit(1)
    .comment('reuse the generated scalar root').purpose('prepare typed scalar acceptance').executeForOne(context);
  if (!root) throw new Error('scalar root missing');
  const entity = Q.scalarTypeProbes().comment('prepare portable scalar values')
    .purpose('verify the selected runtime through generated scalar APIs').newEntity(context);
  entity.updateTypePlatform(root);
  entity.updateRequiredString(name).updateOptionalString('');
  entity.updateLargeText('Unicode 雪 and a long text field');
  entity.updateRequiredBoolean(true).updateOptionalBoolean(false);
  entity.updateRequiredInteger(2147483647).updateOptionalInteger(-2147483648);
  entity.updateRequiredLong(long('9007199254740993'));
  entity.updateOptionalLong(long('-9223372036854775808'));
  entity.updateRequiredDecimal(decimal('123456789012.3456789'));
  entity.updateOptionalDecimal(decimal('3.50'));
  entity.updateRequiredFloat(1.5).updateOptionalFloat(-3.5);
  entity.updateRequiredDouble(2.25).updateOptionalDouble(-0.125);
  entity.updateRequiredDate('2024-02-29').updateOptionalDate('2025-01-01');
  entity.updateRequiredTime(localTime('00:00:00'));
  entity.updateOptionalTime(localTime('23:59:59.123456'));
  entity.updateRequiredDatetime('2024-02-29T12:34:56.789Z');
  entity.updateOptionalDatetime('2025-01-01T00:00:00.000Z');
  return entity;
}

async function load(context: UserContext, id: string) {
  const row = await Q.scalarTypeProbes().withIdIs(id).limit(1)
    .comment('reload the exact scalar row').purpose('verify Q E and JSON agree').executeForOne(context);
  if (!row) throw new Error('saved scalar row missing');
  return row;
}

test('all portable scalar families survive generated mutation Q E and JSON', async () => {
  const filename = process.env.TEAQL_FULL_SCALAR_DB;
  if (!filename) throw new Error('explicit retained scalar database required');
  const client = new SQLiteTeaQLClient(filename);
  const context = new UserContext().insertResource('dataService', client);
  try {
    await context.ensureSchema();
    const entity = await prepared(context, 'All typed scalar families');
    await entity.auditAs('persist typed scalar boundary values').save(context);
    const row = await load(context, entity.id!);
    const expected = {
      requiredString: 'All typed scalar families', optionalString: '',
      largeText: 'Unicode 雪 and a long text field', requiredBoolean: true,
      optionalBoolean: false, requiredInteger: 2147483647, optionalInteger: -2147483648,
      requiredLong: '9007199254740993', optionalLong: '-9223372036854775808',
      requiredDecimal: '123456789012.3456789', optionalDecimal: '3.50',
      requiredFloat: 1.5, optionalFloat: -3.5, requiredDouble: 2.25,
      optionalDouble: -0.125, requiredDate: '2024-02-29', optionalDate: '2025-01-01',
      requiredTime: '00:00:00', optionalTime: '23:59:59.123456',
      requiredDatetime: '2024-02-29T12:34:56.789Z', optionalDatetime: '2025-01-01T00:00:00.000Z',
    };
    expect(values(row)).toEqual(expected);
    const json = JSON.parse(JSON.stringify(row));
    for (const [field, value] of Object.entries(expected)) expect(json[field]).toEqual(value);
    expect(json.id).toBe(row.id); expect(json.version).toBe(1);
    for (const field of ['_root', '_loadedFields', '_fullyLoaded', '_fixTime', 'entityMutationLedger']) expect(json).not.toHaveProperty(field);
    const restored = new ScalarTypeProbe(json);
    expect(values(restored)).toEqual(expected);
    expect(restored.id).toBe(row.id); expect(restored.version).toBe(1);

    const logical = Object.fromEntries(Object.entries(expected).map(([field, value]) =>
      [field.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()), value]));
    for (const profile of ['camelCase', 'snake_case', 'PascalCase'] as const) {
      const metadata = createWireEntityMetadata('ScalarTypeProbe', Object.keys(logical), profile);
      const wire = JSON.parse(JSON.stringify(encodeWireOutput(logical, metadata)));
      expect(normalizeWireInput(wire, metadata).values).toEqual(logical);
    }
    const metadata = GENERATED_WIRE_MODEL_METADATA.entities.ScalarTypeProbe;
    const fullWire = JSON.parse(JSON.stringify(encodeWireOutput(logical, metadata)));
    expect(normalizeWireInput(fullWire, metadata).values).toEqual(logical);
    const aliases = createWireEntityMetadata('ScalarTypeProbe', ['required_string'], 'camelCase', {required_string: ['legacyName']});
    expect(() => normalizeWireInput({requiredString: 'same', legacyName: 'same'}, aliases)).toThrow(WireInputError);

    row.updateRequiredLong(long('9223372036854775807'));
    row.updateRequiredDecimal(decimal('-0.0000001'));
    row.updateOptionalDecimal(decimal('0.1'));
    row.updateOptionalTime(null);
    row.updateOptionalString(null);
    await row.auditAs('update exact values and explicit nulls').save(context);
    const updated = await load(context, row.id!);
    expect(updated.version).toBe(2);
    expect(E.scalarTypeProbe(updated).requiredLong().eval()).toBe('9223372036854775807');
    expect(E.scalarTypeProbe(updated).requiredDecimal().eval()).toBe('-0.0000001');
    expect(E.scalarTypeProbe(updated).optionalDecimal().eval()).toBe('0.1');
    expect(E.scalarTypeProbe(updated).optionalTime().eval()).toBeNull();
    const nullable = JSON.parse(JSON.stringify(updated));
    expect(nullable).toHaveProperty('optionalTime', null);
    expect(nullable).toHaveProperty('optionalString', null);
    const restoredNull = new ScalarTypeProbe(nullable);
    expect(E.scalarTypeProbe(restoredNull).optionalTime().eval()).toBeNull();
    const sparse = await Q.scalarTypeProbesWithMinimalFields().withIdIs(row.id!).selectRequiredString().limit(1)
      .comment('load a scalar projection').purpose('preserve NotLoaded through JSON').executeForOne(context);
    if (!sparse) throw new Error('projected row missing');
    const sparseJson = JSON.parse(JSON.stringify(sparse));
    expect(sparseJson).not.toHaveProperty('optionalTime');
    const sparseRestored = new ScalarTypeProbe(sparseJson);
    expect(() => E.scalarTypeProbe(sparseRestored).optionalTime().eval()).toThrow(TeaQLNotLoadedError);
    expect(E.scalarTypeProbe(sparseRestored).requiredString().eval()).toBe(expected.requiredString);
    process.stdout.write('CORE_SCALAR_WIRE=' + JSON.stringify({language: 'typescript', passed: true,
      families: 12, exactLong: true, exactDecimal: true, allProfiles: true,
      loadedNull: true, projectionNotLoaded: true, entityJsonRoundTrip: true, version: 2}) + '\n');
  } finally {await client.close();}
});

const nonFiniteCases = ['required_float', 'required_double'].flatMap(field =>
  [NaN, Infinity, -Infinity].map(value => [field, value] as const));
test.each(nonFiniteCases)('a non-finite %s cannot silently become JSON null (%s)', async (field, bad) => {
  const filename = process.env.TEAQL_FULL_SCALAR_DB;
  if (!filename) throw new Error('explicit scalar database required');
  const client = new SQLiteTeaQLClient(filename);
  const context = new UserContext().insertResource('dataService', client);
  try {
    await context.ensureSchema();
    const entity = await prepared(context, 'Invalid floating point ' + String(bad));
    const before = client.auditTrace.length;
    const transaction = jest.spyOn((client as any).driver, 'transaction');
    try {
      if (field === 'required_float') entity.updateRequiredFloat(bad);
      else entity.updateRequiredDouble(bad);
      await entity.auditAs('reject non-finite portable Float').save(context);
    } catch (error) {
      expect(String(error)).toMatch(/finite/i);
      expect(String(error)).toContain(field);
      expect(transaction).not.toHaveBeenCalled();
      expect(client.auditTrace.length).toBe(before);
      process.stdout.write('CORE_NONFINITE_REJECTED=' + JSON.stringify({language: 'typescript', field, value: String(bad), rejected: true, providerTransactions: 0}) + '\n');
      return;
    }
    const row = await load(context, entity.id!);
    const native = field === 'required_float' ? E.scalarTypeProbe(row).requiredFloat().eval() : E.scalarTypeProbe(row).requiredDouble().eval();
    const wire = JSON.parse(JSON.stringify(row));
    // An explicit portable representation would be permissible; silently
    // converting a stored NaN/Infinity into an ordinary null is not.
    expect(native).toBe(bad);
    expect(wire[field === 'required_float' ? 'requiredFloat' : 'requiredDouble']).not.toBeNull();
    throw new Error('non-finite Float was persisted without an explicit portable representation');
  } finally {await client.close();}
});

test('generated exact scalars restore to known baselines without discarding real scale or signed-zero intent', async () => {
  const filename = process.env.TEAQL_FULL_SCALAR_DB;
  if (!filename) throw new Error('retained scalar database required');
  const context = new UserContext(), client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  try {
    await context.ensureSchema();
    const entity = await prepared(context, 'Restoration exact scalars');
    entity.updateOptionalString(null).updateOptionalTime(null).updateRequiredDouble(0);
    await entity.auditAs('create the exact scalar restoration baseline').save(context);
    const row = await load(context, entity.id!);
    const original = values(row), json = JSON.stringify(row);
    const driver = (client as any).driver;
    const transaction = jest.spyOn(driver, 'transaction'), query = jest.spyOn(driver, 'query');
    const policy = jest.spyOn(context, 'enterMutationPolicy');
    const noops: unknown[] = [];
    const reset = () => {transaction.mockClear(); query.mockClear(); policy.mockClear(); return client.auditTrace.length;};
    const noIO = (scenario: string, audits: number, version: number, before: string) => {
      const result = {scenario, transactions: transaction.mock.calls.length, providerQueries: query.mock.calls.length,
        policyReviews: policy.mock.calls.length, auditEvents: client.auditTrace.length - audits,
        version: row.version, projectionUnchanged: JSON.stringify(row) === before};
      expect(result).toMatchObject({transactions: 0, providerQueries: 0, policyReviews: 0, auditEvents: 0, version, projectionUnchanged: true});
      noops.push(result);
    };
    row.updateRequiredInteger(5).updateRequiredInteger(2147483647);
    row.updateRequiredLong(long('7')).updateRequiredLong(long('9007199254740993'));
    row.updateRequiredDecimal(decimal('9.1')).updateRequiredDecimal(decimal('123456789012.3456789'));
    row.updateOptionalDecimal(decimal('9.1')).updateOptionalDecimal(decimal('3.50'));
    row.updateRequiredFloat(8.5).updateRequiredFloat(1.5);
    row.updateRequiredDouble(8.5).updateRequiredDouble(0);
    row.updateRequiredBoolean(false).updateRequiredBoolean(true);
    row.updateOptionalString('temporary').updateOptionalString(null);
    row.updateRequiredDate('2025-01-01').updateRequiredDate('2024-02-29');
    row.updateRequiredTime(localTime('01:02:03')).updateRequiredTime(localTime('00:00:00'));
    row.updateOptionalTime(localTime('01:02:03')).updateOptionalTime(null);
    row.updateRequiredDatetime('2025-01-01T00:00:00.000Z').updateRequiredDatetime('2024-02-29T12:34:56.789Z');
    let audits = reset(); await row.auditAs('save the restored exact typed scalar values').save(context);
    noIO('typed-scalars-and-nulls', audits, 1, json); expect(values(row)).toEqual(original);
    const key = {entity: 'ScalarTypeProbe', id: (row as any)._ledgerId};
    (row as any)._root.set(key, 'required_long', long('7'));
    (row as any)._root.set(key, 'required_long', long('9007199254740993'));
    (row as any)._root.set(key, 'optional_decimal', decimal('3.50'));
    audits = reset(); await row.auditAs('save admitted raw canonical scalar intents restored to baseline').save(context);
    noIO('raw-canonical-scalars', audits, 1, json);

    audits = reset(); row.updateOptionalDecimal(decimal('3.500'));
    await row.auditAs('preserve a genuine decimal scale edit').save(context);
    expect(row.version).toBe(2); expect(transaction).toHaveBeenCalledTimes(1); expect(query.mock.calls.length).toBeGreaterThan(0);
    expect(policy).toHaveBeenCalledTimes(1); expect(client.auditTrace.length - audits).toBe(1);
    expect(E.scalarTypeProbe(row).optionalDecimal().eval()).toBe('3.500');
    audits = reset(); row.updateRequiredDouble(-0);
    await row.auditAs('preserve signed floating zero mutation intent').save(context);
    expect(row.version).toBe(3); expect(transaction).toHaveBeenCalledTimes(1); expect(query.mock.calls.length).toBeGreaterThan(0);
    expect(policy).toHaveBeenCalledTimes(1); expect(client.auditTrace.length - audits).toBe(1);
    const committed = JSON.stringify(row);
    row.updateOptionalDecimal(decimal('4.00')).updateOptionalDecimal(decimal('3.500'));
    audits = reset(); await row.auditAs('restore against the refreshed committed snapshot').save(context);
    noIO('committed-snapshot-refreshed', audits, 3, committed);
    const oracle = new Database(filename, {readonly: true, fileMustExist: true});
    let physical;
    try {physical = oracle.prepare('SELECT required_long, required_decimal, optional_decimal, required_double, version FROM scalar_type_probe_data WHERE id = ?').get(row.id);}
    finally {oracle.close();}
    expect(physical).toEqual({required_long: '9007199254740993', required_decimal: '123456789012.3456789', optional_decimal: '3.500', required_double: 0, version: 3});
    process.stdout.write('CORE_SCALAR_RESTORATION=' + JSON.stringify({language: 'typescript', passed: true,
      id: row.id, noops, decimalScaleIntent: true, signedZeroIntent: true, sqliteSignedZeroBitsClaimed: false,
      committedSnapshotRefreshed: true, physical}) + '\n');
  } finally {jest.restoreAllMocks(); await client.close();}
});

