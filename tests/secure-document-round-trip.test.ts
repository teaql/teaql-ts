import { createHash } from 'node:crypto';
import { SecureDocumentReferenceModule, BoundDocumentSnapshot, BlobSelectionClaim } from
  '../src/secure-document-reference/document-round-trip';
import { StaticReferenceKeyProvider, TrustedReferencePrincipal } from
  '../src/secure-document-reference/round-trip-reference';
import { BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import { ViewPreparationService } from '../src/core/view-preparation';
import { requireRuntimeCapabilities } from '../src/core/runtime-capability';

const alice: TrustedReferencePrincipal = {
  authenticationRealm: 'oidc', subject: 'alice', domainRootType: 'Merchant', domainRootId: 7,
};
const scope = { documentId: 'doc-1', purpose: 'edit-order', aggregateType: 'Order',
  aggregateId: 10, aggregateRevision: 4 };
const document: BoundDocumentSnapshot = {
  snapshot: {
    modelFingerprint: 'model-v1', businessId: 'ORD-X1', scope,
    aggregate: { entityType: 'Order', id: 10, version: 4 },
    entities: [{ rowKey: 'item:0', identity: { entityType: 'OrderItem', id: 20, version: 2 },
      loadedFields: ['attachment', 'product_code', 'quantity'],
      writableFields: ['attachment', 'quantity'], allowedMutations: ['UPDATE'] }],
    relations: [{ name: 'items', rowKeys: ['item:0'], completeness: 'COMPLETE', writable: true,
      allowedMutations: ['CREATE_CHILD', 'REMOVE_CHILD'] }],
  },
  bindings: [{ rowKey: 'item:0', canonicalField: 'attachment', entityType: 'OrderItem',
    stableKey: 'blob_A', bindingVersion: 18446744073709551615n, nullable: true, writable: true }],
};
const claim: BlobSelectionClaim = { target: { scope, targetEntity: 'OrderItem',
  canonicalField: 'attachment', kind: 'EXISTING_ROW', targetKey: 'item:0', commandId: 'command-1' },
stableKey: 'blob_B' };
const keys = new StaticReferenceKeyProvider('k1', [{ keyId: 'k1', masterKey: Buffer.alloc(32, 0x42) }]);
const at = 1800000000 * 1000;
function module(now = at, allow = true, environment = 'test') {
  return new SecureDocumentReferenceModule('order-service', environment, keys,
    (_principal, _scope, _identity) => { if (!allow) throw new Error('revoked'); },
    () => new Date(now), () => Buffer.alloc(12, 0x33));
}
function sha(token: string): string { return createHash('sha256').update(token).digest('hex'); }

describe('tqd1/tqd2/tqs1 document protocol', () => {
  test('matches the shared Java/Rust tqd2 and tqs1 fixed-byte hashes', () => {
    const runtime = module();
    const token = runtime.issueBoundDocumentSnapshot(alice, document, 300);
    expect(sha(token)).toBe('e7c81ca089b0a3e0585faefcc275aeb44b456d666d9a4a17949c92b1891089d7');
    const accepted = runtime.consumeBoundDocumentSnapshot(alice, token, 'Order', 'edit-order');
    expect(accepted.document.bindings[0].bindingVersion).toBe(18446744073709551615n);
    const selection = runtime.issueBlobSelection(alice, token, claim, 120);
    expect(sha(selection)).toBe('31303e3e251dd0e8963bf2a4d8897d1eccde63a485aaf287f88f29d40757ba96');
    expect(runtime.consumeBlobSelection(alice, token, selection, claim.target).document.stableKey)
      .toBe('blob_B');
  });

  test('keeps tqd1 distinct and reauthorizes on consume', () => {
    const token = module().issueDocumentSnapshot(alice, document.snapshot, 300);
    expect(token.startsWith('tqd1.k1.')).toBe(true);
    expect(module().consumeDocumentSnapshot(alice, token, 'Order', 'edit-order').document.businessId)
      .toBe('ORD-X1');
    expect(() => module().consumeBoundDocumentSnapshot(alice, token, 'Order', 'edit-order'))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => module(at, false).consumeDocumentSnapshot(alice, token, 'Order', 'edit-order'))
      .toThrow('ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED');
    const legacy = { ...document.snapshot, entities: [{ ...document.snapshot.entities[0],
      loadedFields: ['product_code', 'quantity'], writableFields: ['quantity'] }] };
    const legacyToken = module().issueDocumentSnapshot(alice, legacy, 600);
    expect(sha(legacyToken)).toBe('69fee1ec01cd4a5b69dd3f795aeaffb3a3546e50d48e25cfc9b8f169a527b267');
    expect(module().consumeDocumentSnapshot(alice, legacyToken, 'Order', 'edit-order').document)
      .toMatchObject({ businessId: 'ORD-X1' });
  });

  test('rejects actor, context, field, expiry, tampering and raw Key selection', () => {
    const token = module().issueBoundDocumentSnapshot(alice, document, 300);
    const selection = module().issueBlobSelection(alice, token, claim, 120);
    expect(() => module().consumeBoundDocumentSnapshot({ ...alice, subject: 'bob' }, token,
      'Order', 'edit-order')).toThrow('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
    expect(() => module(at, true, 'other').consumeBoundDocumentSnapshot(alice, token,
      'Order', 'edit-order')).toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => module().consumeBlobSelection(alice, token, selection,
      { ...claim.target, canonicalField: 'quantity' })).toThrow('DOCUMENT_PROJECTION_VIOLATION');
    expect(() => module(at + 120000).consumeBlobSelection(alice, token, selection, claim.target))
      .toThrow('ROUND_TRIP_REFERENCE_EXPIRED');
    expect(() => module().consumeBlobSelection(alice, token, selection + 'A', claim.target))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => module().consumeBlobSelection(alice, token, 'blob_B', claim.target))
      .toThrow('ROUND_TRIP_REFERENCE_INVALID');
    expect(() => module().issueBlobSelection(alice, token, { ...claim, stableKey: 'https://x.test/a' }, 120))
      .toThrow();
  });

  test('passive install prepares a governed view and rejects mismatched binding evidence', async () => {
    const graph = { presentation: { attachment: new BlobRef('blob_A') }, blobSlots: [{
      path: ['attachment'], entity: 'OrderItem', entityId: '20', field: 'attachment',
      scope: 'tenant-a', bindingVersion: 4, reference: new BlobRef('blob_A'),
    }] };
    const bound: BoundDocumentSnapshot = { ...document, bindings: [{ ...document.bindings[0],
      bindingVersion: 4 }] };
    const live = new SecureDocumentReferenceModule('order-service', 'test', keys,
      () => {}, () => new Date(), () => Buffer.alloc(12, 0x33));
    const liveContext = new UserContext()
      .insertResource('responseGraphAuthorizer', { authorize: async () => graph })
      .insertResource('blobResponseContributor', { projectBatch: async () => [{
        url: 'https://files.example.invalid/private/asset', expiresAt: new Date(Date.now() + 30_000),
      }] });
    live.install(liveContext, { principal: () => alice,
      snapshot: async () => ({ document: bound, lifetimeSeconds: 300 }) });
    expect(() => requireRuntimeCapabilities(liveContext, ['secure_document.v1'])).not.toThrow();
    expect(() => live.install(liveContext, { principal: () => alice,
      snapshot: async () => ({ document: bound, lifetimeSeconds: 300 }) })).toThrow('DOCUMENT_CONFIGURATION');
    const view = await new ViewPreparationService().prepare(liveContext, null,
      { mode: 'governed', businessOutcome: 'committed' });
    expect(view.presentation).toEqual({ attachment: 'https://files.example.invalid/private/asset' });
    expect((view.document as { documentToken: string }).documentToken.startsWith('tqd2.k1.')).toBe(true);
    expect(view.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + 30_000);
    const wrongContext = new UserContext()
      .insertResource('responseGraphAuthorizer', { authorize: async () => graph });
    live.install(wrongContext, { principal: () => alice,
      snapshot: async () => ({ document: { ...bound, bindings: [{ ...bound.bindings[0],
        stableKey: 'blob_other' }] }, lifetimeSeconds: 300 }) });
    await expect(new ViewPreparationService().prepare(wrongContext, null,
      { mode: 'governed', businessOutcome: 'committed' })).rejects.toMatchObject({
      code: 'DOCUMENT_PROJECTION_VIOLATION', businessState: 'committed', retry: 'read',
    });
  });
});


describe('issued projection surface and governed URL ceiling', () => {
  test.each(['writable-unloaded', 'duplicate-row', 'orphan-relation', 'duplicate-relation-row',
    'readonly-relation-mutation', 'binding-unloaded', 'binding-readonly', 'binding-foreign-entity',
    'duplicate-binding'])('rejects inconsistent snapshot: %s', scenario => {
    const d = { ...structuredClone(document), snapshot: { ...structuredClone(document.snapshot) } };
    const row = { ...d.snapshot.entities[0] };
    const relation = { ...d.snapshot.relations[0] };
    const binding = { ...d.bindings[0] };
    switch (scenario) {
      case 'writable-unloaded': row.writableFields = ['attachment', 'hidden']; break;
      case 'duplicate-row': d.snapshot.entities = [row, row]; break;
      case 'orphan-relation': relation.rowKeys = ['absent']; break;
      case 'duplicate-relation-row': relation.rowKeys = ['item:0', 'item:0']; break;
      case 'readonly-relation-mutation': relation.writable = false; break;
      case 'binding-unloaded': row.loadedFields = ['quantity']; row.writableFields = ['quantity'];
        binding.writable = false; break;
      case 'binding-readonly': row.writableFields = ['quantity']; break;
      case 'binding-foreign-entity': binding.entityType = 'OtherItem'; break;
      case 'duplicate-binding': d.bindings = [binding, binding]; break;
    }
    if (scenario !== 'duplicate-row') d.snapshot.entities = [row];
    d.snapshot.relations = [relation];
    if (scenario !== 'duplicate-binding') d.bindings = [binding];
    expect(() => module().issueBoundDocumentSnapshot(alice, d, 60))
      .toThrow('DOCUMENT_PROJECTION_VIOLATION');
  });

  test.each(['readonly-existing', 'hidden-existing', 'partial-child', 'readonly-child', 'no-create-child'])
    ('preserves metadata and refuses selection outside %s surface', scenario => {
      const d = { ...structuredClone(document), snapshot: { ...structuredClone(document.snapshot) } };
      const target = { ...claim.target };
      if (scenario === 'readonly-existing') {
        d.snapshot.entities = [{ ...d.snapshot.entities[0], writableFields: ['quantity'] }];
        d.bindings = [{ ...d.bindings[0], writable: false }];
      } else if (scenario === 'hidden-existing') target.canonicalField = 'hidden_attachment';
      else {
        target.kind = 'NEW_CLIENT_KEY'; target.targetKey = 'client-hidden';
        d.snapshot.relations = [{ ...d.snapshot.relations[0],
          ...(scenario === 'partial-child' ? { completeness: 'PARTIAL' as const } :
            scenario === 'readonly-child' ? { writable: false, allowedMutations: [] } :
              { allowedMutations: ['REMOVE_CHILD' as const] }) }];
      }
      const r = module();
      const token = r.issueBoundDocumentSnapshot(alice, d, 60);
      const decoded = r.consumeBoundDocumentSnapshot(alice, token, 'Order', 'edit-order').document;
      expect(decoded.snapshot.entities[0].loadedFields).toEqual(d.snapshot.entities[0].loadedFields);
      expect(decoded.snapshot.entities[0].writableFields).toEqual(d.snapshot.entities[0].writableFields);
      expect(decoded.snapshot.entities[0].allowedMutations).toEqual(d.snapshot.entities[0].allowedMutations);
      expect(decoded.snapshot.relations).toEqual(d.snapshot.relations);
      expect(decoded.bindings).toEqual(d.bindings);
      expect(() => r.issueBlobSelection(alice, token, { ...claim, target }, 30))
        .toThrow('DOCUMENT_PROJECTION_VIOLATION');
    });

  test('projects only the authorized visible Blob and refuses a URL beyond the actual document deadline', async () => {
    const now = Date.now();
    const deadline = new Date(Math.floor(now / 1000) * 1000 + 60_000);
    const visible = new BlobRef('blob_A'); const hidden = new BlobRef('blob_hidden');
    const source = { attachment: visible, hidden_attachment: hidden };
    const graph = { presentation: { attachment: visible }, blobSlots: [{ path: ['attachment'],
      entity: 'OrderItem', entityId: '20', field: 'attachment', scope: 'tenant-a',
      bindingVersion: 4, reference: visible }] };
    const projectedKeys: string[] = [];
    let late = false;
    const context = new UserContext().insertResource('responseGraphAuthorizer', {
      authorize: async () => graph,
    }).insertResource('blobResponseContributor', {
      projectBatch: async (_context: UserContext, authorized: typeof graph, ceiling?: Date) => {
        expect(ceiling).toEqual(deadline);
        projectedKeys.push(...authorized.blobSlots.map(slot => slot.reference.key));
        return [{ url: 'https://files.example.invalid/asset',
          expiresAt: new Date(deadline.getTime() + (late ? 1 : -5_000)) }];
      },
    });
    const live = new SecureDocumentReferenceModule('order-service', 'test', keys,
      () => {}, () => new Date(now), () => Buffer.alloc(12, 0x33));
    live.install(context, { principal: () => alice, snapshot: async () => ({
      document: { ...document, bindings: [{ ...document.bindings[0], bindingVersion: 4 }] },
      lifetimeSeconds: 60,
    }) });
    const options = { mode: 'governed' as const, businessOutcome: 'committed' as const,
      expiresAt: new Date(now + 120_000) };
    const view = await new ViewPreparationService().prepare(context, source, options);
    expect(view.presentation).toEqual({ attachment: 'https://files.example.invalid/asset' });
    expect(view.expiresAt).toEqual(new Date(deadline.getTime() - 5_000));
    expect(projectedKeys).toEqual(['blob_A']); expect(source.hidden_attachment).toBe(hidden);
    late = true;
    await expect(new ViewPreparationService().prepare(context, source, options)).rejects.toMatchObject({
      code: 'BLOB_SIGN_FAILED', businessState: 'committed', retry: 'read',
    });
    expect(projectedKeys).toEqual(['blob_A', 'blob_A']);
  });
});
