import type { TeaQLDataService, TeaQLSqlDriver } from '../sql/core';
import type { GraphMutationSession } from '../core/request-intent';
import type { UserContext } from '../core/context';
import { BlobRef } from '../core/blob-ref';
import type { AuthorizedBlobSlot } from '../core/view-preparation';
export type BlobReadRecord = Readonly<{
    objectKey: string;
    contentVersion: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
}>;
export type ExpiredUploadDeletionRecord = Readonly<{
    key: string;
    objectKey: string;
    contentVersion: string;
    writtenETag: string | null;
}>;
export type BlobBindingTarget = Readonly<{
    entity: string;
    entityId: string;
    field: string;
}>;
export type BlobBindingChange = Readonly<{
    target: BlobBindingTarget;
    next: BlobRef | null;
    expectedVersion: number;
    nextVersion: number;
    action?: 'Create' | 'Update' | 'Delete';
}>;
/** The trusted host supplies current scope and authorizes the canonical target. */
export interface BlobBindingAuthorization {
    scope(context: UserContext): string;
    authorize(context: UserContext, target: BlobBindingTarget, previous: BlobRef | null, next: BlobRef | null, action: 'Create' | 'Update' | 'Delete'): Promise<boolean>;
}
/** Physical catalog for the optional module. Migration is an explicit host action. */
export declare class SqlBlobCatalog {
    readonly driver: TeaQLSqlDriver;
    constructor(driver: TeaQLSqlDriver);
    ensureSchema(): Promise<void>;
    /** Scoped, bounded scan. The claim below rechecks every eligibility predicate. */
    expiredUploadDeletionCandidates(scope: string, after: string, now: number, limit: number): Promise<string[]>;
    /** BEGIN IMMEDIATE serializes this claim with upload write/complete and graph binding. */
    claimExpiredUploadDeletion(scope: string, key: string, now: number): Promise<ExpiredUploadDeletionRecord | undefined>;
    captureExpiredDeletionVersion(scope: string, record: ExpiredUploadDeletionRecord, version: string, now: number): Promise<void>;
    finishExpiredUploadDeletion(scope: string, record: ExpiredUploadDeletionRecord, version: string, now: number): Promise<void>;
    /** SQLite's BEGIN IMMEDIATE owner serializes the authoritative binding row.
     * The caller's graph owns commit; a failed module SQL call poisons that graph.
     * Other SQL backends need their own row-lock implementation before use.
     */
    bindInGraph(owner: TeaQLDataService, graph: GraphMutationSession, context: UserContext, change: BlobBindingChange, authorization: BlobBindingAuthorization): Promise<number>;
    validateSchema(): Promise<void>;
    currentRead(slot: AuthorizedBlobSlot): Promise<BlobReadRecord>;
}
//# sourceMappingURL=sql-catalog.d.ts.map