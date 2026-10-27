import type { UserContext } from '../core/context';
import type { GraphMutationSession } from '../core/request-intent';
import type { SqlSession, TeaQLDataService, TeaQLSqlDriver } from '../sql/core';
import type { ReferenceDocumentScope, TrustedReferencePrincipal } from './round-trip-reference';
export type SubmittedDocumentCommand = Readonly<{
    businessId: string;
    documentToken: string;
    commandId: string;
    body: Readonly<Record<string, unknown>>;
}>;
/** The application-owned service validates the projection and writes its business mutation on this graph. */
export type DocumentCommandReceipt = Readonly<{
    previousRevision: number;
    newRevision: number;
    response: string;
}>;
/** Resolve and authorize the current context's trusted actor; never use submitted identity. */
export type DocumentCommandAuthority = (context: UserContext, scope: ReferenceDocumentScope, session: SqlSession) => Promise<TrustedReferencePrincipal>;
/** Closed JSON body for a document response; no getters, class instances or mutable nested nodes. */
export declare function freezeDocumentBody(body: unknown): Readonly<Record<string, unknown>>;
/** Explicit SQLite command receipt store. The application must consume the bound document token,
 * recheck the current model, binding and mutation plan, and present the accepted response after
 * commit. This store only makes the authorized command result durable with the business graph.
 */
export declare class SqliteDocumentCommandJournal {
    private readonly driver;
    constructor(driver: TeaQLSqlDriver);
    installSchema(): Promise<void>;
    validateSchema(): Promise<void>;
    /** Caller must invoke this inside its current business graph; failures poison that owner. */
    apply(context: UserContext, owner: TeaQLDataService, graph: GraphMutationSession, scope: ReferenceDocumentScope, command: SubmittedDocumentCommand, authority: DocumentCommandAuthority, mutate: (session: SqlSession, command: SubmittedDocumentCommand) => Promise<DocumentCommandReceipt>): Promise<Readonly<{
        receipt: DocumentCommandReceipt;
        replayed: boolean;
    }>>;
}
//# sourceMappingURL=sqlite-command-journal.d.ts.map