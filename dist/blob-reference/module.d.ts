import type { UserContext } from '../core/context';
import { SqlBlobCatalog } from './sql-catalog';
import { SqliteBlobUploadService } from './upload-service';
import { SqliteBlobMutationParticipant } from './mutation-participant';
import { SqlBlobResponseContributor } from './read-service';
import { SqliteBlobMaintenanceService } from './maintenance-service';
/** Explicit assembly of the optional SQLite Blob runtime. Schema migration is a separate host action. */
export declare class BlobReferenceModule {
    readonly catalog: SqlBlobCatalog;
    readonly upload: SqliteBlobUploadService;
    readonly mutation: SqliteBlobMutationParticipant;
    readonly response: SqlBlobResponseContributor;
    readonly maintenance?: SqliteBlobMaintenanceService | undefined;
    constructor(catalog: SqlBlobCatalog, upload: SqliteBlobUploadService, mutation: SqliteBlobMutationParticipant, response: SqlBlobResponseContributor, maintenance?: SqliteBlobMaintenanceService | undefined);
    install(context: UserContext): void;
    /** Called explicitly after the host runs its catalog migration. */
    ready(context: UserContext): Promise<void>;
}
//# sourceMappingURL=module.d.ts.map