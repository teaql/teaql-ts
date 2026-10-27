/** Pure Blob lifecycle deadlines. Catalog transitions must lock and recheck. */
export type BlobLifecycleStatus =
  'initiated' | 'uploaded_unbound' | 'available' | 'deleting' | 'deleted';

const MAX_EPOCH_MS = 8_640_000_000_000_000;

function instant(value: number | undefined): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0 || value > MAX_EPOCH_MS)
    throw new Error('BLOB_REFERENCE_INVALID');
  return value;
}

function retention(seconds: number): number {
  if (!Number.isSafeInteger(seconds) || seconds < 0 ||
      seconds > Math.floor(MAX_EPOCH_MS / 1000)) throw new Error('BLOB_POLICY_INVALID');
  return seconds;
}

/** Immutable server-selected policy facts. Direct uploads need a separate
 * quiescence proof before any lifecycle collection. */
export class BlobRetentionPolicy {
  readonly profile: string;
  readonly uploadMode: 'server_stream' | 'direct';
  readonly unboundRetentionSeconds: number;
  readonly unreferencedRetentionSeconds: number;

  constructor(profile: string, uploadMode: 'server_stream' | 'direct',
              unboundRetentionSeconds: number, unreferencedRetentionSeconds: number) {
    if (typeof profile !== 'string' || !profile.trim() || profile !== profile.trim() ||
        Buffer.byteLength(profile) > 256 || /[\x00-\x1f\x7f-\x9f]/.test(profile) ||
        !['server_stream', 'direct'].includes(uploadMode)) throw new Error('BLOB_POLICY_INVALID');
    this.profile = profile;
    this.uploadMode = uploadMode;
    this.unboundRetentionSeconds = retention(unboundRetentionSeconds);
    this.unreferencedRetentionSeconds = retention(unreferencedRetentionSeconds);
    Object.freeze(this);
  }
}

function deadline(base: number | undefined, seconds: number): number {
  const result = instant(base) + retention(seconds) * 1000;
  if (!Number.isSafeInteger(result) || result > MAX_EPOCH_MS) throw new Error('BLOB_POLICY_INVALID');
  return result;
}

export class BlobRetention {
  static effectiveRetention(acceptedSeconds: Iterable<number>, proposedSeconds: number): number {
    let result = retention(proposedSeconds);
    for (const accepted of acceptedSeconds) result = Math.max(result, retention(accepted));
    return result;
  }

  static unreferencedEligibleAt(lastUnboundMs: number,
                                retentionSeconds: number, floorUntilMs?: number): number {
    const eligible = deadline(lastUnboundMs, retentionSeconds);
    return floorUntilMs === undefined ? eligible : Math.max(eligible, instant(floorUntilMs));
  }

  static requireBindable(status: BlobLifecycleStatus, nowMs: number,
                         completedAtMs?: number, unboundRetentionSeconds = 0,
                         unreferencedEligibleAtMs?: number): void {
    instant(nowMs);
    if (status === 'initiated') throw new Error('BLOB_UPLOAD_INCOMPLETE');
    if (status === 'deleting' || status === 'deleted') throw new Error('BLOB_REFERENCE_EXPIRED');
    if (status === 'uploaded_unbound' &&
        nowMs >= deadline(completedAtMs, unboundRetentionSeconds))
      throw new Error('BLOB_REFERENCE_EXPIRED');
    if (status === 'available' && unreferencedEligibleAtMs !== undefined &&
        nowMs >= instant(unreferencedEligibleAtMs)) throw new Error('BLOB_REFERENCE_EXPIRED');
    if (status !== 'uploaded_unbound' && status !== 'available')
      throw new Error('BLOB_REFERENCE_INVALID');
  }

  static collectable(status: BlobLifecycleStatus, bindingCount: number, nowMs: number,
                     uploadExpiresAtMs?: number, completedAtMs?: number,
                     unboundRetentionSeconds = 0, unreferencedEligibleAtMs?: number): boolean {
    instant(nowMs);
    if (!Number.isSafeInteger(bindingCount) || bindingCount < 0)
      throw new Error('BLOB_REFERENCE_INVALID');
    if (bindingCount > 0 || status === 'deleted') return false;
    switch (status) {
      case 'initiated': return nowMs >= instant(uploadExpiresAtMs);
      case 'uploaded_unbound': return nowMs >= deadline(completedAtMs, unboundRetentionSeconds);
      case 'available': return unreferencedEligibleAtMs !== undefined &&
        nowMs >= instant(unreferencedEligibleAtMs);
      case 'deleting': return true;
      default: throw new Error('BLOB_REFERENCE_INVALID');
    }
  }
}
