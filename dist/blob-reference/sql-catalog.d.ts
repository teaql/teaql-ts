import type { SqlSession, TeaQLDataService, TeaQLSqlDriver } from '../sql/core';
import type { GraphMutationSession } from '../core/request-intent';
import type { UserContext } from '../core/context';
import { BlobRef } from '../core/blob-ref';
import type { AuthorizedBlobSlot } from '../core/view-preparation';
import { BlobRetentionPolicy } from './retention';
export type BlobReadRecord = Readonly<{
    objectKey: string;
    contentVersion: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
}>;
export type BlobDeletionRecord = Readonly<{
    key: string;
    objectKey: string;
    contentVersion: string;
    writtenETag: string | null;
}>;
export type ExpiredUploadDeletionRecord = BlobDeletionRecord;
export type BlobFileGenerationCandidate = Readonly<{
    key: string;
    objectKey: string;
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
    /** Current trusted target-field policy on this exact physical graph SQL lease. */
    currentPolicyOnLease?(context: UserContext, lease: SqlSession, target: BlobBindingTarget): Promise<BlobRetentionPolicy> | BlobRetentionPolicy;
}
/** Physical catalog for the optional module. Migration is an explicit host action. */
export declare class SqlBlobCatalog {
    readonly driver: TeaQLSqlDriver;
    private readonly now;
    constructor(driver: TeaQLSqlDriver, now?: () => number);
    /** The historical TS lease column was NOT NULL. Additive backfill alone leaves
     * Python/.NET/Swift inserts (which write only expires_ms) impossible. The host
     * runs this migration before enabling mixed-version writers. */
    private relaxLegacyUploadAlias;
    ensureSchema(): Promise<void>;
    /** Scoped, bounded scan. Only trusted server-stream policy rows can enter
     * completed/previously-bound retention collection; claim rechecks them. */
    deletionCandidates(scope: string, after: string, now: number, limit: number): Promise<string[]>;
    /** Includes deleted rows: their immutable File generations can outlive the
     * current manifest and must remain discoverable for a later sweep retry. */
    fileGenerationSweepCandidates(scope: string, after: string, limit: number): Promise<BlobFileGenerationCandidate[]>;
    /** Compatibility entry point for callers that only collect incomplete uploads. */
    expiredUploadDeletionCandidates(scope: string, after: string, now: number, limit: number): Promise<string[]>;
    /** BEGIN IMMEDIATE serializes this claim with upload and graph binding. */
    claimDeletion(scope: string, key: string, now: number, incompleteOnly?: boolean): Promise<BlobDeletionRecord | undefined>;
    claimExpiredUploadDeletion(scope: string, key: string, now: number): Promise<ExpiredUploadDeletionRecord | undefined>;
    captureDeletionVersion(scope: string, record: BlobDeletionRecord, version: string, now: number): Promise<void>;
    captureExpiredDeletionVersion(scope: string, record: ExpiredUploadDeletionRecord, version: string, now: number): Promise<void>;
    finishDeletion(scope: string, record: BlobDeletionRecord, version: string, now: number): Promise<void>;
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