import { LoadedScalarSnapshot } from '../src/core/loaded-scalar-snapshot';
import { MutationRequest } from '../src/core/request-intent';

it('retains independent loaded provenance outside entity serialization after property edits', () => {
  const first = { name: 'FIRST-PRIVATE', details: { count: 1 } };
  const second = { name: 'SECOND-PRIVATE', details: { count: 2 } };
  LoadedScalarSnapshot.captureFor(first, first);
  LoadedScalarSnapshot.captureFor(second, second);
  first.name = 'edited'; first.details.count = 9;
  expect(LoadedScalarSnapshot.forEntity(first)?.values()).toEqual({ name: 'FIRST-PRIVATE', details: { count: 1 } });
  expect(LoadedScalarSnapshot.forEntity(second)?.values()).toEqual(second);
  expect(LoadedScalarSnapshot.forEntity({})).toBeUndefined();
  expect(Object.keys(first)).toEqual(['name', 'details']);
  expect(JSON.stringify(first)).not.toContain('FIRST-PRIVATE');
});

it('restores the original immutable snapshot on rollback and releases absent provenance', () => {
  const entity = {};
  const loaded = LoadedScalarSnapshot.captureFor(entity, { secret: 'original' });
  LoadedScalarSnapshot.captureFor(entity, { secret: 'committed candidate' });
  expect(LoadedScalarSnapshot.forEntity(entity)?.values().secret).toBe('committed candidate');
  LoadedScalarSnapshot.restoreFor(entity, loaded);
  expect(LoadedScalarSnapshot.forEntity(entity)?.values().secret).toBe('original');
  LoadedScalarSnapshot.restoreFor(entity, undefined);
  expect(LoadedScalarSnapshot.forEntity(entity)).toBeUndefined();
});

it('owns scalar JSON/date values without changing request payload or serializing provenance', () => {
  const original = { name: 'PRIVATE-OLD-VALUE', details: { values: ['original'] }, when: new Date('2026-01-01') };
  const snapshot = new LoadedScalarSnapshot(original);
  original.name = 'changed'; original.details.values[0] = 'changed'; original.when.setUTCFullYear(2030);
  const mutation = { entity: 'Payment', action: 'Update', payload: { name: 'next' }, comment: 'update fixture' };
  const request = new MutationRequest(mutation).withLoadedSnapshot(snapshot);
  const values = request.loadedValues() as typeof original;
  expect(values.name).toBe('PRIVATE-OLD-VALUE');
  expect(values.details.values).toEqual(['original']);
  expect(values.when.getUTCFullYear()).toBe(2026);
  values.details.values[0] = 'second change'; values.when.setUTCFullYear(2040);
  expect((request.loadedValues() as typeof original).details.values).toEqual(['original']);
  expect((request.loadedValues() as typeof original).when.getUTCFullYear()).toBe(2026);
  expect(request.mutation.payload).toEqual({ name: 'next' });
  expect(JSON.stringify([snapshot, request])).not.toContain('PRIVATE-OLD-VALUE');
  expect(new MutationRequest({ ...mutation, loadedValues: { name: 'forged' } }).loadedValues()).toEqual({});
});

it('does not redact public old scalars from audit prose, but keeps masked and unknown values private', () => {
  const request = new MutationRequest({ entity: 'Payment', id: '99', action: 'Update',
    payload: {}, comment: 'page 1 PUBLIC OLDPRIVATE UNKNOWN' })
    .withLoadedSnapshot(new LoadedScalarSnapshot({ version: 1, name: 'PUBLIC', secret: 'OLDPRIVATE' }));
  const audit = request.auditProjection({ entity: 'Payment', id: '99' }, {}, {
    parameterizedSQL: '', sqlOrigin: 'generated', parameters: [1, 'PUBLIC', 'OLDPRIVATE', 'UNKNOWN'],
    parameterLogPolicies: ['plain', 'plain', 'masked', 'unknown'],
  });
  expect(audit.reason).toBe('page 1 PUBLIC [REDACTED] [REDACTED]');
});
