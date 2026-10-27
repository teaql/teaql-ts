import type { UserContext } from '../core/context';
import type { AuthorizedBlobSlot, AuthorizedResponseGraph, BlobResponseContributor } from '../core/view-preparation';
import { SqlBlobCatalog } from './sql-catalog';
export interface BlobReadAuthorization {
    authorize(context: UserContext, slot: AuthorizedBlobSlot): Promise<boolean>;
}
/** Rechecks each current binding before requesting complete URLs from the store. */
export declare class SqlBlobResponseContributor implements BlobResponseContributor {
    private readonly catalog;
    private readonly authorization;
    private readonly maximumUrlSeconds;
    constructor(catalog: SqlBlobCatalog, authorization: BlobReadAuthorization, maximumUrlSeconds?: number);
    projectBatch(context: UserContext, graph: AuthorizedResponseGraph, expiresAt?: Date): Promise<readonly Readonly<{
        url: string;
        expiresAt: Date;
    }>[]>;
}
//# sourceMappingURL=read-service.d.ts.map