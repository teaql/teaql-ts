import { BlobRef } from '../src/core/blob-ref';
import { UserContext } from '../src/core/context';
import {
  AuthorizedResponseGraph, ViewPreparationError, ViewPreparationService,
} from '../src/core/view-preparation';

const reference = new BlobRef('blob_asset_1');
const graph = (): AuthorizedResponseGraph => ({
  presentation: { id: '1', document: reference },
  blobSlots: [{ path: ['document'], entity: 'Asset', entityId: '1', field: 'document',
    scope: 'tenant-a', bindingVersion: 4, reference }],
});

describe('ViewPreparationService', () => {
  test('orders current authorization, secure governance and complete-URL projection', async () => {
    const stages: string[] = [];
    const original = graph();
    const context = new UserContext()
      .insertResource('responseGraphAuthorizer', { authorize: async () => {
        stages.push('authorize'); return original;
      } })
      .insertResource('secureDocumentContributor', { prepare: async (_ctx: unknown,
        authorized: AuthorizedResponseGraph) => {
        stages.push('secure');
        return { graph: authorized, envelope: { token: 'test-envelope' },
          expiresAt: new Date(Date.now() + 60_000) };
      } })
      .insertResource('blobResponseContributor', { projectBatch: async (_ctx: unknown,
        authorized: AuthorizedResponseGraph, ceiling: Date) => {
        stages.push('blob');
        expect(authorized.blobSlots).toHaveLength(1);
        expect(ceiling).toBeInstanceOf(Date);
        return [{ url: 'https://files.example.invalid/private/asset',
          expiresAt: new Date(Date.now() + 30_000) }];
      } });
    const prepared = await new ViewPreparationService().prepare(context, original.presentation,
      { mode: 'governed', businessOutcome: 'committed' });
    expect(stages).toEqual(['authorize', 'secure', 'blob']);
    expect(prepared.presentation).toEqual({ id: '1',
      document: 'https://files.example.invalid/private/asset' });
    expect(prepared.document).toEqual({ token: 'test-envelope' });
    expect(prepared.cacheControl).toBe('private, no-store');
    expect((original.presentation as any).document).toBe(reference);
  });

  test('fails the whole post-commit render if signing is absent or returns an invalid URL', async () => {
    const context = new UserContext().insertResource('responseGraphAuthorizer', {
      authorize: async () => graph(),
    });
    const service = new ViewPreparationService();
    await expect(service.prepare(context, graph().presentation,
      { mode: 'ordinary', businessOutcome: 'committed' }))
      .rejects.toMatchObject({ code: 'BLOB_CAPABILITY_MISSING', businessState: 'committed', retry: 'read' });
    context.insertResource('blobResponseContributor', { projectBatch: async () => [{
      url: '/relative/key', expiresAt: new Date(Date.now() + 30_000),
    }] });
    await expect(service.prepare(context, graph().presentation,
      { mode: 'ordinary', businessOutcome: 'committed' }))
      .rejects.toMatchObject({ code: 'BLOB_SIGN_FAILED', businessState: 'committed' });
  });

  test('rejects a provider URL containing raw whitespace or control characters', async () => {
    const context = new UserContext().insertResource('responseGraphAuthorizer', {
      authorize: async () => graph(),
    });
    let suppliedUrl = '';
    context.insertResource('blobResponseContributor', { projectBatch: async () => [{
      url: suppliedUrl, expiresAt: new Date(Date.now() + 30_000),
    }] });
    const service = new ViewPreparationService();
    for (const invalid of [
      ' https://files.example.invalid/read',
      'https://files.example.invalid/read file',
      'https://files.example.invalid/read\n',
      'https://files.example.invalid/\tread',
      'https://files.example.invalid/read\u2028next',
      'https://files.example.invalid/read\u2029next',
    ]) {
      suppliedUrl = invalid;
      await expect(service.prepare(context, graph().presentation,
        { mode: 'ordinary', businessOutcome: 'committed' }))
        .rejects.toMatchObject({ code: 'BLOB_SIGN_FAILED', businessState: 'committed' });
    }
  });

  test('accepts independent URL lifetimes below the document ceiling and returns their minimum', async () => {
    const second = new BlobRef('blob_asset_2');
    const ceiling = new Date(Date.now() + 90_000);
    const firstExpiry = new Date(Date.now() + 20_000);
    const secondExpiry = new Date(Date.now() + 40_000);
    const context = new UserContext()
      .insertResource('responseGraphAuthorizer', { authorize: async () => ({
        presentation: { first: reference, second },
        blobSlots: [
          { path: ['first'], entity: 'Asset', entityId: '1', field: 'first',
            scope: 'tenant-a', bindingVersion: 4, reference },
          { path: ['second'], entity: 'Asset', entityId: '1', field: 'second',
            scope: 'tenant-a', bindingVersion: 5, reference: second },
        ],
      }) })
      .insertResource('blobResponseContributor', { projectBatch: async () => [
        { url: 'https://files.example.invalid/first', expiresAt: firstExpiry },
        { url: 'https://files.example.invalid/second', expiresAt: secondExpiry },
      ] });
    const prepared = await new ViewPreparationService().prepare(context, null,
      { mode: 'ordinary', businessOutcome: 'read_only', expiresAt: ceiling });
    expect(prepared.expiresAt).toEqual(firstExpiry);
    expect(prepared.presentation).toEqual({
      first: 'https://files.example.invalid/first',
      second: 'https://files.example.invalid/second',
    });
  });

  test('rejects unlisted BlobRef and malformed trusted graph before returning a raw Key', async () => {
    const context = new UserContext().insertResource('responseGraphAuthorizer', {
      authorize: async () => ({ presentation: { document: reference }, blobSlots: [] }),
    });
    const failure = await new ViewPreparationService().prepare(context, null,
      { mode: 'ordinary', businessOutcome: 'read_only' }).catch(error => error);
    expect(failure).toBeInstanceOf(ViewPreparationError);
    expect(failure).toMatchObject({ code: 'BLOB_CAPABILITY_MISSING', businessState: 'read_only' });
  });
});
