import {EntityVersionInput, entityVersion, nextEntityVersion, MutationVersionError, VersionOperation} from '../src/core/mutation-version';
import {long} from '../src/core/long';
import {EntityRoot} from '../src/core/entity-root';
import {LoadedScalarSnapshot} from '../src/core/loaded-scalar-snapshot';

const MAX = 9223372036854775807n, MIN = -9223372036854775808n;
test.each([0, 1, -2, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER])('ordinary exact version %s retains its number shape', value => {
  for (const input of [value, String(value), BigInt(value)]) expect(entityVersion(input)).toBe(value);
});
test.each([MIN, MIN + 1n, MIN + 2n, -9007199254740992n, 9007199254740992n, 9007199254740993n, MAX - 1n, MAX])(
  'wide version %s survives normalization and native JSON exactly', value => {
    for (const input of [value, value.toString(), long(value)]) {
      const normalized = entityVersion(input); expect(normalized).toBe(long(value));
      expect(JSON.parse(JSON.stringify({version: normalized})).version).toBe(value.toString());
    }
  });
const invalid: unknown[] = [undefined, null, true, false, '', '01', '-0', '+1', ' 1', '1 ', '1.0', '1e2',
  NaN, Infinity, -Infinity, 1.5, Number(MAX), MAX + 1n, MIN - 1n, [], {}, {toString() {throw new Error('must not coerce objects');}}];
test.each(invalid.map((value, index) => [index, value]))('rejects inexact or noncanonical input case %s without coercion', (_index, input) => {
  expect(() => entityVersion(input)).toThrow(MutationVersionError);
});
const legal: Array<[VersionOperation, EntityVersionInput | undefined, EntityVersionInput]> = [
  ['Create', undefined, 1], ['Create', MAX, 1], ['Update', 1, 2], ['Update', MAX - 1n, MAX],
  ['Update', '9007199254740991', '9007199254740992'], ['Delete', 1, -2], ['Delete', MAX, MIN],
  ['Recover', -1, 2], ['Recover', -2, 3], ['Recover', MIN + 2n, MAX],
];
test.each(legal)('%s at %s computes exactly %s', (operation, original, expected) => {
  expect(nextEntityVersion(operation, original)).toBe(entityVersion(expected));
});
const illegal: Array<[VersionOperation, EntityVersionInput, string]> = [
  ...(['Update', 'Delete'] as const).flatMap(op => [MIN, -2n, -1n, 0n].map(value => [op, value, 'invalid_type'] as [VersionOperation, EntityVersionInput, string])),
  ['Update', MAX, 'version_exhausted'], ['Recover', MIN, 'version_exhausted'], ['Recover', MIN + 1n, 'version_exhausted'],
  ['Recover', 0, 'invalid_type'], ['Recover', 1, 'invalid_type'], ['Recover', MAX, 'invalid_type'],
];
test.each(illegal)('%s at %s rejects with %s at the canonical version path', (operation, original, code) => {
  try {nextEntityVersion(operation, original); throw new Error('version was accepted');}
  catch (error) {
    expect(error).toBeInstanceOf(MutationVersionError);
    const failure = error as MutationVersionError; expect(failure.code).toBe(code);
    expect(failure.violations[0].ruleId).toBe(code); expect(failure.violations[0].location.instancePath()).toBe('/version');
    expect(failure.message).not.toContain(String(original));
  }
});
test('typed ledger versions normalize exact representations but never mix values or entity types', () => {
  const root = new EntityRoot(), order = {entity: 'Order', id: '1'}, payment = {entity: 'Payment', id: '1'};
  root.setOriginalVersion(order, MAX); root.setOriginalVersion(order, long(MAX)); root.setOriginalVersion(payment, MAX - 1n);
  expect(root.originalVersion(order)).toBe(long(MAX)); expect(root.originalVersion(payment)).toBe(long(MAX - 1n));
  expect(() => root.setOriginalVersion(order, MAX - 1n)).toThrow('ENTITY_VERSION_CONFLICT');
  expect(() => root.setOriginalVersion(order, Number(MAX))).toThrow(MutationVersionError);
  expect(root.originalVersion(order)).toBe(long(MAX));
});
test('wide-version conflict rejects a complete merge before importing any unrelated pending fields', () => {
  const target = new EntityRoot(), source = new EntityRoot(), key = {entity: 'Order', id: '1'}, other = {entity: 'Payment', id: '1'};
  target.setOriginalVersion(key, MAX); source.setOriginalVersion(key, MAX - 1n); source.set(other, 'name', 'must not import');
  expect(() => target.mergeFrom(source)).toThrow('ENTITY_VERSION_CONFLICT'); expect(target.change(other)).toEqual({});
});
test('wide loaded provenance remains available for known-baseline restoration', () => {
  const root = new EntityRoot(), key = {entity: 'Order', id: '1'}; root.setOriginalVersion(key, MAX);
  const snapshot = new LoadedScalarSnapshot({name: 'original'}, key, long(MAX));
  root.set(key, 'name', 'original'); snapshot.discardRestoredFields(root, key); expect(root.hasPending(key)).toBe(false);
  expect(() => new LoadedScalarSnapshot({name: 'original'}, key, Number(MAX))).toThrow(MutationVersionError);
});
