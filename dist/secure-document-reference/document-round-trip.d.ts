import type { UserContext } from '../core/context';
import type { AuthorizedResponseGraph } from '../core/view-preparation';
import { ContextBoundReferenceRuntime, ReferenceDocumentScope, TrustedReferencePrincipal } from './round-trip-reference';
type Mutation = 'UPDATE' | 'CREATE_CHILD' | 'REMOVE_CHILD';
type Identity = Readonly<{
    entityType: string;
    id: bigint | number;
    version: bigint | number;
}>;
export type DocumentEntitySnapshot = Readonly<{
    rowKey: string;
    identity: Identity;
    loadedFields: readonly string[];
    writableFields: readonly string[];
    allowedMutations: readonly Mutation[];
}>;
export type DocumentRelationSnapshot = Readonly<{
    name: string;
    rowKeys: readonly string[];
    completeness: 'COMPLETE' | 'PARTIAL';
    writable: boolean;
    allowedMutations: readonly Mutation[];
}>;
export type DocumentSnapshot = Readonly<{
    modelFingerprint: string;
    businessId: string;
    scope: ReferenceDocumentScope;
    aggregate: Identity;
    entities: readonly DocumentEntitySnapshot[];
    relations: readonly DocumentRelationSnapshot[];
}>;
export type DocumentBlobBindingSnapshot = Readonly<{
    rowKey: string;
    canonicalField: string;
    entityType: string;
    stableKey: string | null;
    bindingVersion: bigint | number;
    nullable: boolean;
    writable: boolean;
}>;
export type BoundDocumentSnapshot = Readonly<{
    snapshot: DocumentSnapshot;
    bindings: readonly DocumentBlobBindingSnapshot[];
}>;
export type BlobSelectionTarget = Readonly<{
    scope: ReferenceDocumentScope;
    targetEntity: string;
    canonicalField: string;
    kind: 'EXISTING_ROW' | 'NEW_CLIENT_KEY';
    targetKey: string;
    commandId: string;
}>;
export type BlobSelectionClaim = Readonly<{
    target: BlobSelectionTarget;
    stableKey: string;
}>;
export type VerifiedDocument<T> = Readonly<{
    document: T;
    keyId: string;
    issuedAt: Date;
    expiresAt: Date;
}>;
export type SecureDocumentAssembly = Readonly<{
    principal(context: UserContext): TrustedReferencePrincipal;
    snapshot(context: UserContext, graph: AuthorizedResponseGraph): Promise<Readonly<{
        document: BoundDocumentSnapshot;
        lifetimeSeconds: number;
    }>>;
}>;
/** Optional protocol runtime. Installation and host document/SQL orchestration remain explicit. */
export declare class SecureDocumentReferenceModule extends ContextBoundReferenceRuntime {
    /** Passive per-context assembly; the trusted host supplies the complete authorized snapshot. */
    install(context: UserContext, assembly: SecureDocumentAssembly): void;
    private expiry;
    private authorizeSnapshot;
    private verify;
    issueDocumentSnapshot(principal: TrustedReferencePrincipal, snapshot: DocumentSnapshot, lifetimeSeconds: number): string;
    consumeDocumentSnapshot(principal: TrustedReferencePrincipal, token: string, expectedAggregateType: string, expectedPurpose: string): VerifiedDocument<DocumentSnapshot>;
    issueBoundDocumentSnapshot(principal: TrustedReferencePrincipal, document: BoundDocumentSnapshot, lifetimeSeconds: number): string;
    consumeBoundDocumentSnapshot(principal: TrustedReferencePrincipal, token: string, expectedAggregateType: string, expectedPurpose: string): VerifiedDocument<BoundDocumentSnapshot>;
    issueBlobSelection(principal: TrustedReferencePrincipal, documentToken: string, claim: BlobSelectionClaim, lifetimeSeconds: number): string;
    consumeBlobSelection(principal: TrustedReferencePrincipal, documentToken: string, token: string, expectedTarget: BlobSelectionTarget): VerifiedDocument<BlobSelectionClaim>;
}
export {};
//# sourceMappingURL=document-round-trip.d.ts.map