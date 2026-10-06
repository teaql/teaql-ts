import fixture from './fixtures/graph-mutation-lineage-v1.json';
import { EntityRoot } from '../src/core/entity-root';
import { GraphMutationSession, MutationIntent } from '../src/core/request-intent';
import { MutationTraceScope, TraceNode } from '../src/core/trace-chain';

it.each(fixture.cases)('recovers the shared $id graph fixture without claiming provider proof', input => {
  const graph = new GraphMutationSession(new MutationIntent(input.requestComment));
  const scopes = new Map<string, MutationTraceScope>();
  const ledger = new EntityRoot();
  for (const node of input.nodes) {
    const assigned = (node as any).assignedEntityId ?? node.entityId;
    const key = { entity: node.entityType, id: assigned };
    if ('ledgerLineage' in node) ledger.setTraceChain(key, (node.ledgerLineage as any[]).map(item =>
      ({ ...item, kind: 'auditReason' as const })));
    const request = graph.request({ entity: node.entityType, ledgerRoot: ledger, ledgerKey: key },
      node.parent ? scopes.get(node.parent) : undefined, node.localComment ?? undefined);
    scopes.set(node.nodeId, request.scopeFor(key));
    const expected = input.expected.find(item => item.nodeId === node.nodeId)!;
    expect(request.traceFor(key)).toEqual(expected.lineage.map(item => ({ ...item, kind: 'auditReason' })));
  }
});

it('shares immutable ancestors and preserves unsigned-64 identity through deep recovery', () => {
  const graph = new GraphMutationSession(new MutationIntent('submit order'));
  const root = graph.request({ entity: 'Order' }).scopeFor({ entity: 'Order', id: 18446744073709551615n });
  const inherited = graph.request({ entity: 'OrderItem' }, root, ' \t\u0085');
  expect(inherited.scopeFor({ entity: 'OrderItem', id: '1' })).toBe(root);
  let scope = root;
  for (let index = 0; index < 2000; index++) scope = new MutationTraceScope(scope,
    { kind: 'auditReason', name: 'Child', entityId: index, detail: 'local reason' });
  const nodes = scope.recover();
  expect(nodes).toHaveLength(2001);
  expect(nodes[0].entityId).toBe(18446744073709551615n);
  expect(Object.isFrozen(nodes)).toBe(true);
  expect(Object.isFrozen(nodes[0])).toBe(true);
});

it('snapshots trace-only entries through merge, typed rekey and clear', () => {
  const source = new EntityRoot();
  const original: TraceNode[] = [{ kind: 'auditReason', name: 'Order', entityId: '1', detail: 'submit order' }];
  source.setTraceChain({ entity: 'Order', id: -1 }, original);
  original[0] = { ...original[0], detail: 'caller changed reason' };
  const target = new EntityRoot(); target.mergeFrom(source);
  target.rekey({ entity: 'Order', id: -1 }, { entity: 'Order', id: '1' });
  expect(target.traceChain({ entity: 'Payment', id: '1' })).toBeUndefined();
  expect(target.traceChain({ entity: 'Order', id: 1 })).toBeUndefined();
  expect(target.traceChain({ entity: 'Order', id: '1' })?.[0].detail).toBe('submit order');
  target.clearEntity({ entity: 'Order', id: '1' });
  expect(target.traceChain({ entity: 'Order', id: '1' })).toBeUndefined();
});

it('rejects a parent token from an independent graph without altering either root intent', () => {
  const first = new GraphMutationSession(new MutationIntent('first operation'));
  const second = new GraphMutationSession(new MutationIntent('second operation'));
  const scope = first.request({ entity: 'Order' }).scopeFor({ entity: 'Order', id: '1' });
  expect(() => second.request({ entity: 'Payment' }, scope)).toThrow('GRAPH_TRACE_SCOPE_MISMATCH');
  expect(second.request({ entity: 'Order' }).traceFor({ entity: 'Order', id: '1' })[0].detail).toBe('second operation');
  expect(scope.recover()[0].detail).toBe('first operation');
});
