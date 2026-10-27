import type { UserContext } from '../core/context';
import type { SqlSession, TeaQLDataService, TeaQLSqlDriver } from '../sql/core';
import { BoundDocumentSnapshot, SecureDocumentReferenceModule } from './document-round-trip';
import { ReferenceDocumentScope, TrustedReferencePrincipal } from './round-trip-reference';
import { SqliteDocumentCommandJournal, SubmittedDocumentCommand } from './sqlite-command-journal';
export type DocumentOpenRequest = Readonly<{
    aggregateType: string;
    businessId: string;
    purpose: string;
    lifetimeSeconds: number;
}>;
export type ContextualDocument = Readonly<{
    businessId: string;
    documentToken: string;
    body: Readonly<Record<string, unknown>>;
}>;
export type DocumentAcceptRequest = Readonly<{
    aggregateType: string;
    purpose: string;
    submitted: SubmittedDocumentCommand;
}>;
export type AcceptedDocument = Readonly<{
    document: ContextualDocument;
    previousRevision: number;
    newRevision: number;
    replayed: boolean;
}>;
export type CurrentDocument = Readonly<{
    document: BoundDocumentSnapshot;
    body: Readonly<Record<string, unknown>>;
    lifetimeSeconds: number;
}>;
/** The application owns the model-specific SQL projection and mutation plan. Every callback
 * receives the same physical SQLite transaction used for its read, mutation or receipt.
 */
export interface SqliteDocumentHost {
    principal(context: UserContext): TrustedReferencePrincipal;
    authorize(context: UserContext, principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope, session: SqlSession): Promise<void>;
    load(context: UserContext, businessId: string, session: SqlSession): Promise<CurrentDocument>;
    apply(context: UserContext, issued: BoundDocumentSnapshot, submitted: SubmittedDocumentCommand, session: SqlSession): Promise<void>;
    /** Optional final response rendering. Failure after accept commit reports a committed error. */
    present?(context: UserContext, document: ContextualDocument): Promise<void>;
}
/** Framework-neutral document orchestration for an application-owned SQLite model. */
export declare class SqliteSecureDocumentService {
    private readonly context;
    private readonly owner;
    private readonly driver;
    private readonly runtime;
    private readonly journal;
    private readonly host;
    constructor(context: UserContext, owner: TeaQLDataService, driver: TeaQLSqlDriver, runtime: SecureDocumentReferenceModule, journal: SqliteDocumentCommandJournal, host: SqliteDocumentHost);
    private principal;
    open(context: UserContext, request: DocumentOpenRequest): Promise<ContextualDocument>;
    accept(context: UserContext, request: DocumentAcceptRequest): Promise<AcceptedDocument>;
}
//# sourceMappingURL=sqlite-document-service.d.ts.map