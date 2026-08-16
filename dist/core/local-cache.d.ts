/** Process-local cache with optional TTL in seconds. */
export declare class LocalCache {
    private readonly entries;
    put(key: string, value: unknown, timeToLiveInSeconds?: number): void;
    get<T>(key: string): T | undefined;
    remove(key: string): void;
    clear(): void;
}
export declare const localCache: LocalCache;
//# sourceMappingURL=local-cache.d.ts.map