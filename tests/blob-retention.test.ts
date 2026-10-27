import cases from './fixtures/blob-policy-cases.json';
import { BlobRetention, BlobRetentionPolicy } from '../src/blob-reference/retention';

function vector(id: string) {
  const found = cases.cases.find(entry => entry.id === id);
  if (!found) throw new Error(`missing shared vector: ${id}`);
  return found as { input: Record<string, any>; expected?: Record<string, any>; error?: string };
}

test('shared policy vectors keep completion, binding and unreference deadlines distinct', () => {
  const upload = vector('upload-clock-independent');
  expect(BlobRetention.unreferencedEligibleAt(upload.input.completedAtSeconds * 1000,
    86400)).toBe(upload.expected!.unboundEligibleAtSeconds * 1000);

  const unbound = vector('unbound-deadline-rejects-bind-before-gc');
  const end = unbound.input.nowSeconds * 1000;
  expect(() => BlobRetention.requireBindable('uploaded_unbound', end,
    unbound.input.completedAtSeconds * 1000, unbound.input.unboundRetentionSeconds))
    .toThrow(unbound.error);
  expect(() => BlobRetention.requireBindable('uploaded_unbound', end - 1,
    unbound.input.completedAtSeconds * 1000, unbound.input.unboundRetentionSeconds)).not.toThrow();

  const active = vector('active-reference-never-collected');
  expect(BlobRetention.collectable('available', active.input.bindingCount,
    active.input.nowSeconds * 1000, undefined, undefined, 0, 0))
    .toBe(active.expected!.collectable);
  const deleting = vector('deleting-rejects-binding');
  expect(() => BlobRetention.requireBindable(deleting.input.status, 0))
    .toThrow(deleting.error);
});

test('shared maximum-retention and profile-update vectors never shorten a hold', () => {
  const maximum = vector('maximum-retention-across-fields');
  const seconds = BlobRetention.effectiveRetention(maximum.input.acceptedRetentionSeconds, 3600);
  expect(seconds).toBe(maximum.expected!.effectiveUnreferencedRetentionSeconds);
  expect(BlobRetention.unreferencedEligibleAt(maximum.input.lastUnboundAtSeconds * 1000,
    seconds, maximum.input.retentionFloorUntilSeconds * 1000))
    .toBe(maximum.expected!.unreferencedEligibleAtSeconds * 1000);

  const profile = vector('profile-update-does-not-shorten');
  expect(BlobRetention.effectiveRetention(
    [profile.input.acceptedUnreferencedRetentionSeconds], profile.input.currentProfileRetentionSeconds))
    .toBe(profile.expected!.effectiveUnreferencedRetentionSeconds);
});

test('collectability needs an explicit, safe deadline and ignores read URL expiry', () => {
  const read = vector('read-expiry-does-not-delete');
  expect(BlobRetention.collectable('available', read.input.bindingCount, 1000,
    undefined, undefined, 0, 0)).toBe(read.expected!.collectable);
  expect(BlobRetention.collectable('available', 0, 999, undefined, undefined, 0, 1000)).toBe(false);
  expect(BlobRetention.collectable('available', 0, 1000, undefined, undefined, 0, 1000)).toBe(true);
  expect(BlobRetention.collectable('initiated', 0, 1000, 1000)).toBe(true);
  expect(() => BlobRetention.collectable('uploaded_unbound', 0, 1000)).toThrow('BLOB_REFERENCE_INVALID');
  expect(() => BlobRetention.unreferencedEligibleAt(8_640_000_000_000_000, 1))
    .toThrow('BLOB_POLICY_INVALID');
});

test('trusted policy snapshots reject direct collection and invalid duration facts', () => {
  const policy = new BlobRetentionPolicy('default', 'server_stream', 86400, 604800);
  expect(policy.unboundRetentionSeconds).toBe(86400);
  expect(Object.isFrozen(policy)).toBe(true);
  expect(() => new BlobRetentionPolicy('default', 'direct', -1, 604800))
    .toThrow('BLOB_POLICY_INVALID');
  expect(() => new BlobRetentionPolicy(' default', 'server_stream', 1, 1))
    .toThrow('BLOB_POLICY_INVALID');
});
