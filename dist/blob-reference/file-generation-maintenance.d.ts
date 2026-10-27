import { BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { SqliteFencedFileObjectStorage } from '../object-storage/file';
import { BlobMaintenanceAuthorization, BlobMaintenanceCursor } from './maintenance-service';
import { SqlBlobCatalog } from './sql-catalog';
export type BlobFileGenerationSweepOutcome = Readonly<{
    reference: BlobRef;
    status: 'swept' | 'failed';
    removedGenerations?: number;
    error?: 'BLOB_STORE_FAILED';
}>;
export type BlobFileGenerationSweepBatch = Readonly<{
    outcomes: readonly BlobFileGenerationSweepOutcome[];
    next?: BlobMaintenanceCursor;
}>;
/** Explicit catalog-driven sweep of inaccessible File generations. The host
 * must first upgrade every writer sharing the private root to the fenced
 * protocol; this service never starts a worker or guesses that from age. */
export declare class SqliteBlobFileGenerationSweepService {
    private readonly catalog;
    private readonly authorization;
    private readonly allWritersUpgraded;
    private readonly batchSize;
    constructor(catalog: SqlBlobCatalog, authorization: BlobMaintenanceAuthorization, allWritersUpgraded: boolean, batchSize?: number);
    private authorize;
    runBatch(context: UserContext, provider: SqliteFencedFileObjectStorage, cursor?: BlobMaintenanceCursor): Promise<BlobFileGenerationSweepBatch>;
}
//# sourceMappingURL=file-generation-maintenance.d.ts.map