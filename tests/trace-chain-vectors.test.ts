import { canonicalSQLTracePath, cloneTraceNodes, TraceKind, TraceNode } from '../src/core/trace-chain';
import vectors from './fixtures/sql-trace-path-v1.json';
import { QueryRequest } from '../src/core/request-intent';
import { SelectQuery } from '../src/core/ast';

const kind = (name: string): TraceKind => (name[0].toLowerCase() + name.slice(1)) as TraceKind;
const sourceNode = (node: { kind: string; name: string; entityId: number | null; detail: string }): TraceNode => ({
  kind: kind(node.kind), name: node.name, entityId: node.entityId, detail: node.detail,
});
const logical = (node: TraceNode) => ({ kind: node.kind[0].toUpperCase() + node.kind.slice(1),
  name: node.name, entityId: node.entityId ?? null, detail: node.detail ?? '' });

it.each(vectors.cases)('passes frozen Rust SQL path vector $id and idempotence', vector => {
  const input = vector.source.map(sourceNode);
  const before = JSON.stringify(input);
  const result = canonicalSQLTracePath(input, vector.backend, vector.operation as any);
  expect(result.tracePath.map(logical)).toEqual(vector.expectedPath);
  expect({ comment: result.comment ?? null, purpose: result.purpose ?? null,
    auditReason: result.auditReason ?? null }).toEqual(vector.expectedIntent);
  expect(canonicalSQLTracePath(result.tracePath, 'must-not-replace-provider', vector.operation as any).tracePath)
    .toEqual(result.tracePath);
  expect(JSON.stringify(input)).toBe(before);
});

it('owns immutable source nodes and preserves full unsigned-64 identity without numeric conversion', () => {
  const original: TraceNode[] = [{ kind: 'operation', name: 'Order', detail: 'mutation' },
    { kind: 'entity', name: 'Payment', entityId: '18446744073709551615', detail: '' },
    { kind: 'provider', name: 'sqlite', detail: '' }, { kind: 'sql', name: 'update', detail: '' }];
  const saved = canonicalSQLTracePath(original, 'sqlite', 'update').tracePath;
  (original[1] as any).entityId = 'wrong';
  expect(saved[1].entityId).toBe('18446744073709551615');
  expect(Object.isFrozen(saved)).toBe(true);
  expect(saved.every(Object.isFrozen)).toBe(true);
  const exact = cloneTraceNodes([{ kind: 'entity', name: 'Payment', entityId: 18446744073709551615n }]);
  expect(exact[0].entityId).toBe(18446744073709551615n);
});

it('keeps independent immutable request sources across shared builders and derived snapshots', () => {
  const first = new QueryRequest(new SelectQuery('School').comment('first').purpose('first purpose'));
  const second = new QueryRequest(new SelectQuery('School').comment('second').purpose('second purpose'));
  const builder = new SelectQuery('Platform');
  const one = first.derive(builder, 'platform');
  const two = second.derive(builder, 'alternatePlatform');
  builder.entity = 'Changed';
  expect(one.query.entity).toBe('Platform');
  expect(one.traceSource.map(node => node.detail)).toEqual(['first', 'first purpose', 'School.platform']);
  expect(two.traceSource.map(node => node.detail)).toEqual(['second', 'second purpose', 'School.alternatePlatform']);
  expect(first.traceSource).toHaveLength(2);
  expect(new QueryRequest(one.query).traceSource).toEqual(one.traceSource);
  expect(one.withQuery(one.query.clone()).traceSource).toEqual(one.traceSource);
  expect(one.traceSource.every(Object.isFrozen)).toBe(true);
  expect(JSON.stringify(one.query)).not.toContain('traceSource');
  expect(JSON.stringify(one.query)).not.toContain('School.platform');
});
