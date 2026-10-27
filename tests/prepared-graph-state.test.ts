import {EntityRoot} from '../src/core/entity-root';
import {PreparedMutationError, PreparedGraphState} from '../src/core/prepared-mutation';
import {GraphMutationSession, MutationIntent} from '../src/core/request-intent';
import {LoadedScalarSnapshot} from '../src/core/loaded-scalar-snapshot';

function fixture() {
  const graph = new GraphMutationSession(new MutationIntent('save the reviewed graph'));
  const state = new PreparedGraphState(), root = new EntityRoot(), key = {entity: 'Order', id: '1'};
  const object: any = {id: '1', version: 1, name: 'requested', comment: 'save the reviewed graph'};
  root.setOriginalVersion(key, 1); root.set(key, 'name', 'requested');
  state.register(object, root, key, {}, () => ({...object})); state.captureInput();
  const request = () => graph.request({entity: 'Order', action: 'Update', id: object.id,
    version: root.originalVersion(key), payload: root.change(key), ledgerRoot: root, ledgerKey: key});
  const prepared = request();
  root.set(key, 'name', 'fixed');
  state.remember(prepared, {...prepared.mutation, comment: prepared.comment, payload: root.change(key)}, {});
  return {graph, state, root, key, object, request};
}
test('reviewed values are detached from callers and replay does not rerun Fix', () => {
  const f = fixture(); f.state.seal(); const request = f.request();
  const replay = f.state.replay(request);
  expect(replay.payload).toEqual({name: 'fixed'});
  replay.payload.name = 'not the private prepared snapshot';
  expect(f.state.replay(request).payload).toEqual({name: 'fixed'});
});
test.each(['ledger', 'native', 'version', 'comment', 'trace'] as const)('late %s edits fail without losing intent', kind => {
  const f = fixture(); f.state.seal();
  if (kind === 'ledger') f.root.set(f.key, 'name', 'unreviewed');
  if (kind === 'native') f.object.id = '2';
  if (kind === 'version') f.object.version = 99;
  if (kind === 'comment') f.object.comment = 'unreviewed';
  if (kind === 'trace') f.root.setTraceChain(f.key, [{kind: 'comment', name: 'changed', detail: 'unreviewed'}]);
  expect(() => f.state.replay(f.request())).toThrow(PreparedMutationError);
  expect(f.root.hasPending(f.key)).toBe(true);
});
test('a later Fix cannot rewrite an earlier post-Fix ledger', () => {
  const f = fixture(); f.root.set(f.key, 'name', 'late');
  expect(() => f.state.seal()).toThrow(PreparedMutationError);
});
test.each(['payload', 'target', 'version'] as const)('execution %s must equal the prepared operation', kind => {
  const f = fixture(); f.state.seal(); const request = f.request();
  if (kind === 'payload') (request.mutation as any).payload = {name: 'provider injection'};
  if (kind === 'target') (request.mutation as any).id = '2';
  if (kind === 'version') (request.mutation as any).version = 2;
  expect(() => f.state.replay(request)).toThrow(PreparedMutationError);
});
test('policy binding and schema metadata cannot change after preparation', () => {
  const f = fixture(); let context = {}, schema = {field: 'name'};
  f.state.bind(() => context); f.state.bindMetadata(() => ({schema})); f.state.seal();
  schema.field = 'different'; expect(() => f.state.validate()).toThrow(PreparedMutationError);
  schema.field = 'name'; context = {}; expect(() => f.state.validate()).toThrow(PreparedMutationError);
});
test('a detached unregistered object cannot forge a new parent reference', () => {
  const state = new PreparedGraphState(), graph = new GraphMutationSession(new MutationIntent('create child'));
  const request = graph.request({entity: 'Child', action: 'Create', payload: {parent: {}}});
  expect(() => state.remember(request, {...request.mutation, comment: request.comment}, {parent: 'Order'})).toThrow(PreparedMutationError);
});
test('only the reviewed typed temporary parent may resolve to its assigned identity', () => {
  const state = new PreparedGraphState(), graph = new GraphMutationSession(new MutationIntent('create parent and child'));
  const root = new EntityRoot(), parent: any = {id: undefined}, child: any = {parent};
  const pk = {entity: 'Order', id: 'tmp'}, ck = {entity: 'Child', id: 'tmp'};
  root.markAsNew(pk); root.markAsNew(ck); root.set(ck, 'parent', parent);
  state.register(parent, root, pk, {}, () => ({...parent}));
  state.register(child, root, ck, {parent: 'Order'}, () => ({...child})); state.captureInput();
  const pr = graph.request({entity: 'Order', action: 'Create', payload: {}, ledgerRoot: root, ledgerKey: pk});
  const cr = graph.request({entity: 'Child', action: 'Create', payload: {parent}, ledgerRoot: root, ledgerKey: ck});
  state.remember(pr, {...pr.mutation, comment: pr.comment}, {});
  const policyChild = state.remember(cr, {...cr.mutation, comment: cr.comment}, {parent: 'Order'});
  expect(policyChild.payload.parent).toBe('tmp'); state.seal();
  expect(() => state.replay(cr)).toThrow(PreparedMutationError);
  state.replay(pr); state.providerResult(pr, {id: '100', version: 1});
  parent.id = '100'; const assigned = {entity: 'Order', id: '100'}; root.rekey(pk, assigned);
  state.applied(root, pk, assigned);
  expect(state.replay(cr).payload.parent).toBe('100');
  const forged = graph.request({...cr.mutation, payload: {parent: '101'}});
  expect(() => state.replay(forged)).toThrow(PreparedMutationError);
});
test('provider completion cannot silently accept an omitted or repeated operation', () => {
  const f = fixture(); f.state.seal(); expect(() => f.state.complete()).toThrow(PreparedMutationError);
  const r = f.request(); f.state.replay(r); f.state.providerResult(r, {id: '1', version: 2});
  expect(() => f.state.replay(r)).toThrow(PreparedMutationError);
});
test('post-commit drift rejects cleanup and retains the accepted concurrent intent', () => {
  const f = fixture(); f.state.seal(); const r = f.request(); f.state.replay(r);
  f.state.providerResult(r, {id: '1', version: 2}); f.object.version = 2;
  f.state.applied(f.root, f.key, f.key); f.state.complete();
  f.root.set(f.key, 'name', 'accepted after commit');
  expect(() => f.state.validate()).toThrow(PreparedMutationError);
  expect(f.root.change(f.key).name).toBe('accepted after commit');
});
test('loaded snapshot comparison retains null, absent, signed zero, nested and binary distinctions', () => {
  const snapshot = new LoadedScalarSnapshot({nil: null, n: -0, json: {a: [1]}, bytes: new Uint8Array([1])});
  expect(snapshot.changedField(snapshot.values())).toBeUndefined();
  expect(snapshot.changedField({...snapshot.values(), n: 0})).toBe('n');
  expect(snapshot.changedField({...snapshot.values(), nil: undefined})).toBe('nil');
  expect(snapshot.changedField({...snapshot.values(), json: {a: [2]}})).toBe('json');
});
