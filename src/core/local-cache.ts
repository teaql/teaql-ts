type LocalCacheEntry = {
  value: unknown;
  expiresAt?: number;
};

/** Process-local cache with optional TTL in seconds. */
export class LocalCache {
  private readonly entries = new Map<string, LocalCacheEntry>();

  put(key: string, value: unknown, timeToLiveInSeconds?: number): void {
    const expiresAt = timeToLiveInSeconds !== undefined && timeToLiveInSeconds > 0
      ? Date.now() + timeToLiveInSeconds * 1000
      : undefined;
    this.entries.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  remove(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

export const localCache = new LocalCache();
