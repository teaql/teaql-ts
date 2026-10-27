import { BlobRef } from './blob-ref';
import type { UserContext } from './context';
export type ViewOptions = Readonly<{
    mode: 'ordinary' | 'governed';
    businessOutcome: 'read_only' | 'committed';
    /** Trusted host ceiling; the store may issue a shorter lifetime. */
    expiresAt?: Date;
}>;
export type AuthorizedBlobSlot = Readonly<{
    path: readonly (string | number)[];
    entity: string;
    entityId: string;
    field: string;
    scope: string;
    bindingVersion: number;
    reference: BlobRef;
}>;
/** Produced by trusted current authorization, never from request JSON. */
export type AuthorizedResponseGraph = Readonly<{
    presentation: unknown;
    blobSlots: readonly AuthorizedBlobSlot[];
}>;
export interface ResponseGraphAuthorizer {
    authorize(context: UserContext, result: unknown, options: ViewOptions): Promise<AuthorizedResponseGraph>;
}
export interface SecureDocumentContributor {
    prepare(context: UserContext, graph: AuthorizedResponseGraph, options: ViewOptions): Promise<Readonly<{
        graph: AuthorizedResponseGraph;
        envelope: unknown;
        expiresAt: Date;
    }>>;
}
export interface BlobResponseContributor {
    projectBatch(context: UserContext, graph: AuthorizedResponseGraph, expiresAt?: Date): Promise<readonly Readonly<{
        url: string;
        expiresAt: Date;
    }>[]>;
}
export type PreparedView = Readonly<{
    presentation: unknown;
    document?: unknown;
    expiresAt?: Date;
    cacheControl: 'private, no-store';
}>;
export declare class ViewPreparationError extends Error {
    readonly code: string;
    readonly businessState: 'read_only' | 'committed';
    constructor(code: string, businessState: 'read_only' | 'committed');
    get retry(): 'read' | 'prepare';
}
export declare class ViewPreparationService {
    prepare(context: UserContext, result: unknown, options: ViewOptions): Promise<PreparedView>;
}
//# sourceMappingURL=view-preparation.d.ts.map