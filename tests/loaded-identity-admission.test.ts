import {LoadedEntityIdentityError, LoadedScalarSnapshot} from '../src/core/loaded-scalar-snapshot';
import {EntityRoot} from '../src/core/entity-root';
const key = {entity: 'Order', id: 'PRIVATE-ID'};
const loaded = () => new LoadedScalarSnapshot({id: key.id, name: 'original'}, key, 1);
test.each([
  ['changed native ID', key, 'OTHER-PRIVATE-ID', 1, '/id'],
  ['changed ledger ID', {...key, id: 'OTHER'}, key.id, 1, '/id'],
  ['changed entity type', {...key, entity: 'Item'}, key.id, 1, '/id'],
  ['different ID representation', key, 1, 1, '/id'],
  ['changed version', key, key.id, 2, '/version'],
  ['zero version', key, key.id, 0, '/version'],
  ['missing version', key, key.id, undefined, '/version'],
  ['null version', key, key.id, null, '/version'],
  ['rounded number', key, key.id, 9007199254740992, '/version'],
] as const)('rejects %s on an unchanged loaded node', (_name, nativeKey, id, version, location) => {
  try {loaded().validateNativeIdentity(nativeKey, id, version); throw new Error('identity must reject');}
  catch (error) {
    expect(error).toBeInstanceOf(LoadedEntityIdentityError);
    const conflict = error as LoadedEntityIdentityError;
    expect(conflict.code).toBe('ENTITY_VERSION_CONFLICT');
    expect(conflict.violations[0].location.instancePath()).toBe(location);
    expect(conflict.message).not.toContain('PRIVATE');
  }
});
test('unchanged old views are valid but dirty old views cannot borrow a newer ledger version', () => {
  const snapshot = loaded(), root = new EntityRoot(); root.setOriginalVersion(key, 1);
  root.acceptCommittedVersion(key, 2);
  expect(() => snapshot.validateNativeIdentity(key, key.id, 1)).not.toThrow();
  expect(() => snapshot.validateMutationVersion(root, key)).not.toThrow();
  root.set(key, 'name', 'requested'); const pending = root.snapshot();
  expect(() => snapshot.validateMutationVersion(root, key)).toThrow(LoadedEntityIdentityError);
  expect(root.snapshot()).toEqual(pending);
});
test('current dirty views retain their original version and pending intent', () => {
  const root = new EntityRoot(); root.setOriginalVersion(key, 1); root.set(key, 'name', 'next');
  expect(() => loaded().validateMutationVersion(root, key)).not.toThrow();
  expect(root.change(key)).toEqual({name: 'next'});
});
test('explicit ID-only references bind their ID without inventing a loaded version', () => {
  const snapshot = new LoadedScalarSnapshot({id: key.id}, key);
  expect(() => snapshot.validateNativeIdentity(key, key.id, undefined)).not.toThrow();
  expect(() => snapshot.validateNativeIdentity(key, 'changed', undefined)).toThrow(LoadedEntityIdentityError);
});
test('fresh unbound entities may receive a real ID before their first commit', () => {
  const snapshot = new LoadedScalarSnapshot({id: undefined}, {entity: 'Order', id: -1});
  expect(() => snapshot.validateNativeIdentity({entity: 'Order', id: '1001'}, '1001', undefined)).not.toThrow();
});
test('wide original versions compare exactly without shrinking the signed64 domain', () => {
  const version = '9223372036854775807', snapshot = new LoadedScalarSnapshot({}, key, version);
  expect(() => snapshot.validateNativeIdentity(key, key.id, version)).not.toThrow();
  expect(() => snapshot.validateNativeIdentity(key, key.id, '9223372036854775806')).toThrow(LoadedEntityIdentityError);
});
