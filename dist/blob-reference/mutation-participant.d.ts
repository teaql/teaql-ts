import type { BlobMutationParticipant } from '../sql/core';
import type { BlobBindingAuthorization } from './sql-catalog';
import { SqlBlobCatalog } from './sql-catalog';
/** Native SQLite participant; called by executeMutation before its graph commits. */
export declare class SqliteBlobMutationParticipant implements BlobMutationParticipant {
    private readonly catalog;
    private readonly authorization;
    constructor(catalog: SqlBlobCatalog, authorization: BlobBindingAuthorization);
    /** Assembly identity check; wrappers may share the same physical driver. */
    usesCatalog(catalog: SqlBlobCatalog): boolean;
    apply(context: Parameters<BlobMutationParticipant['apply']>[0], owner: Parameters<BlobMutationParticipant['apply']>[1], graph: Parameters<BlobMutationParticipant['apply']>[2], session: Parameters<BlobMutationParticipant['apply']>[3], application: Parameters<BlobMutationParticipant['apply']>[4]): Promise<void>;
}
//# sourceMappingURL=mutation-participant.d.ts.map