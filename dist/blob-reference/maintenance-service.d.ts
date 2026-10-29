import { BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { SqlBlobCatalog } from './sql-catalog';
export interface BlobMaintenanceAuthorization {
    scope(context: UserContext): string;
    canMaintain(context: UserContext, scope: string): Promise<boolean> | boolean;
}
export declare class BlobMaintenanceCursor {
    private readonly scopeValue;
    private readonly afterValue;
    private constructor();
    static next(scope: string, after: string): BlobMaintenanceCursor;
    matches(scope: string): boolean;
    position(): string;
    toString(): string;
}
export type BlobMaintenanceOutcome = Readonly<{
    reference: BlobRef;
    status: 'deleted' | 'already_missing' | 'not_eligible' | 'version_conflict' | 'failed';
    error?: 'BLOB_IDEMPOTENCY_CONFLICT' | 'BLOB_CATALOG_FAILED' | 'BLOB_STORE_FAILED';
}>;
export type BlobMaintenanceBatch = Readonly<{
    outcomes: readonly BlobMaintenanceOutcome[];
    next?: BlobMaintenanceCursor;
}>;
/** Explicit host-scheduled, version-fenced server-stream lifecycle collection. */
export declare class SqliteBlobMaintenanceService {
    private readonly catalog;
    private readonly authorization;
    private readonly batchSize;
    private readonly now;
    constructor(catalog: SqlBlobCatalog, authorization: BlobMaintenanceAuthorization, batchSize?: number, now?: () => number);
    /** Assembly identity check; wrappers may share the same physical driver. */
    usesCatalog(catalog: SqlBlobCatalog): boolean;
    private authorize;
    private requireStandalone;
    private time;
    private collect;
    runBatch(context: UserContext, cursor?: BlobMaintenanceCursor): Promise<BlobMaintenanceBatch>;
}
//# sourceMappingURL=maintenance-service.d.ts.map