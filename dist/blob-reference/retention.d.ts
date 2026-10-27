/** Pure Blob lifecycle deadlines. Catalog transitions must lock and recheck. */
export type BlobLifecycleStatus = 'initiated' | 'uploaded_unbound' | 'available' | 'deleting' | 'deleted';
export declare class BlobRetention {
    static effectiveRetention(acceptedSeconds: Iterable<number>, proposedSeconds: number): number;
    static unreferencedEligibleAt(lastUnboundMs: number, retentionSeconds: number, floorUntilMs?: number): number;
    static requireBindable(status: BlobLifecycleStatus, nowMs: number, completedAtMs?: number, unboundRetentionSeconds?: number, unreferencedEligibleAtMs?: number): void;
    static collectable(status: BlobLifecycleStatus, bindingCount: number, nowMs: number, uploadExpiresAtMs?: number, completedAtMs?: number, unboundRetentionSeconds?: number, unreferencedEligibleAtMs?: number): boolean;
}
//# sourceMappingURL=retention.d.ts.map