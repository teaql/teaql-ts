import {
  ContextBoundReferenceRuntime, ReferenceDocumentScope, ReferenceIdentity,
  StaticReferenceKeyProvider, TrustedReferencePrincipal,
} from '../src/secure-document-reference/round-trip-reference';

const alice: TrustedReferencePrincipal = {
  authenticationRealm: 'oidc', subject: 'alice', domainRootType: 'Platform', domainRootId: 7,
};
const scope: ReferenceDocumentScope = {
  documentId: 'doc-100', purpose: 'edit-order', aggregateType: 'Order',
  aggregateId: 100, aggregateRevision: 9,
};
const identity: ReferenceIdentity = { entityType: 'OrderItem', id: 42, version: 3 };
const instant = Date.parse('2026-09-27T00:00:00Z');
const keys = new StaticReferenceKeyProvider('k2', [
  { keyId: 'k1', masterKey: Buffer.alloc(32, 0x11) },
  { keyId: 'k2', masterKey: Buffer.alloc(32, 0x22) },
]);
const vector = 'tqr1.k2.MzMzMzMzMzMzMzMzmhCET15vBdSc1BbFJcrvMMnRP1wAyjunShYlFPnDZL7Gk5V1LuptWyrbiQ8LQSDHFUmN3o6vb-MEgXZuh3N-YkeO55CYLeVgiyBBYslzuSu-fvWC2KMZcnZ5D8BRmWpGYA2Ok5sWe1Fg1aIyadTjVoKB-H2vPW_0okj-';

function runtime(now = instant, authorization = true, environment = 'test-a') {
  return new ContextBoundReferenceRuntime('order-service', environment, keys,
    (principal, _scope, entity) => {
      if (!authorization || principal.subject !== 'alice' ||
          entity.entityType !== 'OrderItem' || BigInt(entity.id) !== 42n) {
        throw new Error('denied');
      }
    }, () => new Date(now), () => Buffer.alloc(12, 0x33));
}

describe('tqr1 governed reference', () => {
  test('matches Rust fixed wire vector and rechecks current authorization', () => {
    expect(runtime().issue(alice, scope, identity, 600)).toBe(vector);
    expect(runtime().consume(alice, scope, vector, 'OrderItem')).toEqual({
      identity: { entityType: 'OrderItem', id: 42n, version: 3n }, keyId: 'k2',
      issuedAt: new Date(instant), expiresAt: new Date(instant + 600_000),
    });
    expect(() => runtime(instant, false).consume(alice, scope, vector, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED');
  });

  test('rejects wrong actor, scope, purpose, environment and entity type', () => {
    expect(() => runtime().consume({ ...alice, subject: 'bob' }, scope, vector, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
    expect(() => runtime().consume(alice, { ...scope, documentId: 'other' }, vector, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
    expect(() => runtime().consume(alice, { ...scope, purpose: 'view-order' }, vector, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime(instant, true, 'other').consume(alice, scope, vector, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime().consume(alice, scope, vector, 'Order'))
      .toThrow('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
  });

  test('rejects expiry, forged bytes, raw IDs, noncanonical encoding and unsafe numbers', () => {
    expect(() => runtime(instant + 600_000).consume(alice, scope, vector, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_EXPIRED');
    const forged = vector.slice(0, -1) + (vector.endsWith('a') ? 'b' : 'a');
    expect(() => runtime().consume(alice, scope, forged, 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime().consume(alice, scope, '42', 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime().consume(alice, scope, vector + '=', 'OrderItem'))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime().issue(alice, scope, { ...identity, id: Number.MAX_SAFE_INTEGER + 1 }, 60))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime().issue(alice, scope, identity, 0))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => runtime().issue(alice, scope, { ...identity, entityType: '\ud800' }, 60))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
  });
});
