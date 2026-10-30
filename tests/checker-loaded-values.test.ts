import {MutationRequest} from '../src/core/request-intent';
import {LoadedScalarSnapshot} from '../src/core/loaded-scalar-snapshot';

test('Checker provenance is detached, read-only, hidden and never merged into writes', () => {
  const snapshot = new LoadedScalarSnapshot({tenant: '1', name: 'PRIVATE_LOADED_NAME'});
  const request = new MutationRequest({entity: 'Probe', action: 'Update', payload: {name: 'requested'}, comment: 'bind Checker baseline'})
    .withLoadedSnapshot(snapshot);
  const working: any = {...request.mutation, payload: {...request.mutation.payload}};
  expect(request.bindCheckerLoadedValues(working)).toBe(working);
  expect(working.loadedValues).toEqual({tenant: '1', name: 'PRIVATE_LOADED_NAME'});
  expect(Object.isFrozen(working.loadedValues)).toBe(true);
  expect(Object.getOwnPropertyDescriptor(working, 'loadedValues')).toMatchObject({enumerable: false, writable: false, configurable: false});
  expect(Reflect.set(working.loadedValues, 'tenant', '2')).toBe(false);
  expect(working.payload).toEqual({name: 'requested'});
  expect(JSON.stringify(working)).not.toContain('loadedValues');
  expect(JSON.stringify(working)).not.toContain('PRIVATE_LOADED_NAME');
  expect(request.loadedValues()).toEqual(snapshot.values());
});

test('a caller-provided baseline cannot impersonate runtime hydration provenance', () => {
  const request = new MutationRequest({entity: 'Probe', action: 'Update', payload: {name: 'requested'},
    loadedValues: {tenant: 'forged'}, comment: 'reject forged Checker origin'});
  const working: any = {...request.mutation};
  request.bindCheckerLoadedValues(working);
  expect(working.loadedValues).toEqual({}); expect(Object.isFrozen(working.loadedValues)).toBe(true);
});

test('each Checker receives its own copy without rewriting the original snapshot', () => {
  const request = new MutationRequest({payload: {}, comment: 'isolate Checker views'})
    .withLoadedSnapshot(new LoadedScalarSnapshot({tenant: '1', extra: {name: 'original'}}));
  const first: any = request.bindCheckerLoadedValues({}), second: any = request.bindCheckerLoadedValues({});
  Reflect.set(first.loadedValues.extra, 'name', 'local-only');
  expect(second.loadedValues.extra.name).toBe('original'); expect(request.loadedValues().extra).toEqual({name: 'original'});
});
