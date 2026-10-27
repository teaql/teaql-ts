/** Pure Blob lifecycle deadlines. Catalog transitions must lock and recheck. */
export type BlobLifecycleStatus = 'initiated' | 'uploaded_unbound' | 'available' | 'deleting' | 'deleted';
/** Immutable server-selected policy facts. Direct uploads need a separate
 * quiescence proof before any lifecycle collection. */
export declare class BlobRetentionPolicy {
    readonly profile: string;
    readonly uploadMode: 'server_stream' | 'direct';
    readonly unboundRetentionSeconds: number;
    readonly unreferencedRetentionSeconds: number;
    readonly minimumRetentionSeconds: number;
    constructor(profile: string, uploadMode: 'server_stream' | 'direct', unboundRetentionSeconds: number, unreferencedRetentionSeconds: number, minimumRetentionSeconds?: number);
}
export declare class BlobRetention {
    static effectiveRetention(acceptedSeconds: Iterable<number>, proposedSeconds: number): number;
    static unreferencedEligibleAt(lastUnboundMs: number, retentionSeconds: number, floorUntilMs?: number): number;
    static requireBindable(status: BlobLifecycleStatus, nowMs: number, completedAtMs?: number, unboundRetentionSeconds?: number, unreferencedEligibleAtMs?: number): void;
    static collectable(status: BlobLifecycleStatus, bindingCount: number, nowMs: number, uploadExpiresAtMs?: number, completedAtMs?: number, unboundRetentionSeconds?: number, unreferencedEligibleAtMs?: number): boolean;
}
//# sourceMappingURL=retention.d.ts.map