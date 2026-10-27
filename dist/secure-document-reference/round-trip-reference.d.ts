/// <reference types="node" />
/// <reference types="node" />
export type TrustedReferencePrincipal = Readonly<{
    authenticationRealm: string;
    subject: string;
    domainRootType: string;
    domainRootId: bigint | number;
}>;
export type ReferenceDocumentScope = Readonly<{
    documentId: string;
    purpose: string;
    aggregateType: string;
    aggregateId: bigint | number;
    aggregateRevision: bigint | number;
}>;
export type ReferenceIdentity = Readonly<{
    entityType: string;
    id: bigint | number;
    version: bigint | number;
}>;
export type VerifiedEntityReference = Readonly<{
    identity: Readonly<{
        entityType: string;
        id: bigint;
        version: bigint;
    }>;
    keyId: string;
    issuedAt: Date;
    expiresAt: Date;
}>;
export declare class RoundTripReferenceError extends Error {
    readonly code: 'ROUND_TRIP_REFERENCE_INVALID' | 'ROUND_TRIP_REFERENCE_EXPIRED' | 'ROUND_TRIP_REFERENCE_SCOPE_MISMATCH' | 'ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED' | 'ROUND_TRIP_REFERENCE_CONFIGURATION_INVALID';
    constructor(code: 'ROUND_TRIP_REFERENCE_INVALID' | 'ROUND_TRIP_REFERENCE_EXPIRED' | 'ROUND_TRIP_REFERENCE_SCOPE_MISMATCH' | 'ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED' | 'ROUND_TRIP_REFERENCE_CONFIGURATION_INVALID');
}
export type ReferenceKey = Readonly<{
    keyId: string;
    masterKey: Uint8Array;
}>;
export interface ReferenceKeyProvider {
    currentKey(): ReferenceKey;
    keyById(keyId: string): ReferenceKey | undefined;
}
export declare class StaticReferenceKeyProvider implements ReferenceKeyProvider {
    private readonly currentKeyId;
    private readonly retained;
    constructor(currentKeyId: string, keys: readonly ReferenceKey[]);
    currentKey(): ReferenceKey;
    keyById(keyId: string): ReferenceKey | undefined;
}
export type ReferenceAuthorizationPolicy = (principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope, identity: ReferenceIdentity) => void;
export declare class ContextBoundReferenceRuntime {
    protected readonly service: string;
    protected readonly environment: string;
    protected readonly keys: ReferenceKeyProvider;
    protected readonly authorize: ReferenceAuthorizationPolicy;
    protected readonly now: () => Date;
    protected readonly nonce: () => Uint8Array;
    constructor(service: string, environment: string, keys: ReferenceKeyProvider, authorize: ReferenceAuthorizationPolicy, now?: () => Date, nonce?: () => Uint8Array);
    protected key(key: ReferenceKey): ReferenceKey;
    protected derive(key: ReferenceKey, label: string): Buffer;
    protected actor(key: ReferenceKey, principal: TrustedReferencePrincipal): Buffer;
    private aad;
    protected timestamp(): bigint;
    protected checkAuthorization(principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope, identity: ReferenceIdentity): void;
    protected seal(prefix: string, label: string, purpose: string, plaintext: Buffer, maximumLength: number, sealingKey?: ReferenceKey): string;
    protected open(prefix: string, label: string, purpose: string, token: string, maximumLength: number): {
        key: ReferenceKey;
        plaintext: Buffer;
    };
    issue(principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope, identity: ReferenceIdentity, lifetimeSeconds: number): string;
    consume(principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope, token: string, expectedEntityType: string): VerifiedEntityReference;
}
//# sourceMappingURL=round-trip-reference.d.ts.map