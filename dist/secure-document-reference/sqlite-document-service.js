"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteSecureDocumentService = void 0;
const node_util_1 = require("node:util");
const request_intent_1 = require("../core/request-intent");
const sqlite_command_journal_1 = require("./sqlite-command-journal");
function validText(value) {
    return typeof value === 'string' && value.length > 0 && value === value.trim() &&
        Buffer.byteLength(value, 'utf8') <= 16384 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
}
function integer(value) {
    if (typeof value !== 'bigint' && (!Number.isSafeInteger(value) || value < 0))
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 0)
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
    return result;
}
function samePrincipal(left, right) {
    try {
        return left.authenticationRealm === right.authenticationRealm &&
            left.subject === right.subject && left.domainRootType === right.domainRootType &&
            BigInt(left.domainRootId) === BigInt(right.domainRootId);
    }
    catch {
        return false;
    }
}
function stable(value, seen = new Set(), depth = 0, budget = { left: 100000 }) {
    if (--budget.left < 0 || depth > 64)
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'bigint' || typeof value === 'number') {
        if (typeof value === 'number' && !Number.isSafeInteger(value))
            throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        return `#${value.toString()}`;
    }
    if (typeof value !== 'object' || seen.has(value))
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
    seen.add(value);
    try {
        if (Array.isArray(value))
            return `[${value.map(item => stable(item, seen, depth + 1, budget)).join(',')}]`;
        if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
            throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        const record = value;
        return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stable(record[key], seen, depth + 1, budget)}`).join(',')}}`;
    }
    finally {
        seen.delete(value);
    }
}
function canonicalDocument(document) {
    const compare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
    const mutationOrder = { UPDATE: 1, CREATE_CHILD: 2, REMOVE_CHILD: 3 };
    const mutations = (values) => [...values].sort((a, b) => mutationOrder[a] - mutationOrder[b]);
    return { ...document,
        snapshot: { ...document.snapshot,
            entities: document.snapshot.entities.map(entity => ({ ...entity,
                loadedFields: [...entity.loadedFields].sort(compare),
                writableFields: [...entity.writableFields].sort(compare),
                allowedMutations: mutations(entity.allowedMutations) })),
            relations: document.snapshot.relations.map(relation => ({ ...relation,
                allowedMutations: mutations(relation.allowedMutations) })) },
        bindings: [...document.bindings].sort((a, b) => compare(a.rowKey, b.rowKey) || compare(a.canonicalField, b.canonicalField)) };
}
function assertDocument(current, businessId, aggregateType, purpose) {
    if (!current || !current.document || !current.document.snapshot ||
        !current.body || typeof current.body !== 'object' || Array.isArray(current.body) ||
        !Number.isSafeInteger(current.lifetimeSeconds) || current.lifetimeSeconds < 1 ||
        current.document.snapshot.businessId !== businessId ||
        current.document.snapshot.scope.aggregateType !== aggregateType ||
        current.document.snapshot.scope.purpose !== purpose)
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
}
function verifiedSelections(runtime, principal, issued, submitted) {
    const result = [];
    const seen = new Set();
    for (const selection of submitted.blobSelections ?? []) {
        const target = { scope: issued.snapshot.scope,
            targetEntity: selection.targetEntity, canonicalField: selection.canonicalField,
            kind: selection.kind, targetKey: selection.targetKey, commandId: submitted.commandId };
        const pair = `${target.targetKey}\0${target.canonicalField}`;
        if (seen.has(pair))
            throw new Error('DOCUMENT_COMMAND_INVALID');
        seen.add(pair);
        const claim = runtime.consumeBlobSelection(principal, submitted.documentToken, selection.token, target).document;
        result.push(Object.freeze({ target, stableKey: claim.stableKey }));
    }
    return Object.freeze(result);
}
function mappedExisting(issued, selection) {
    const target = selection.target;
    const row = issued.snapshot.entities.find(entity => entity.rowKey === target.targetKey);
    const binding = issued.bindings.find(candidate => candidate.rowKey === target.targetKey &&
        candidate.canonicalField === target.canonicalField);
    if (!row || !binding || row.identity.entityType !== target.targetEntity ||
        !binding.writable || integer(binding.bindingVersion) >= Number.MAX_SAFE_INTEGER)
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
    return Object.freeze({ ...selection, rowKey: target.targetKey,
        entityId: BigInt(row.identity.id).toString(),
        expectedVersion: integer(binding.bindingVersion),
        nextVersion: integer(binding.bindingVersion) + 1 });
}
function mappedNew(selection, resolved, issued) {
    if (!resolved || !validText(resolved.rowKey) || !/^[1-9][0-9]*$/.test(resolved.entityId) ||
        BigInt(resolved.entityId) > 18446744073709551615n ||
        issued.snapshot.entities.some(row => row.rowKey === resolved.rowKey))
        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
    return Object.freeze({ ...selection, rowKey: resolved.rowKey,
        entityId: resolved.entityId, expectedVersion: 0, nextVersion: 1 });
}
function contextual(businessId, documentToken, body) {
    const document = { businessId, documentToken, body };
    Object.defineProperty(document, 'toString', { value: () => 'ContextualDocument[redacted]' });
    Object.defineProperty(document, node_util_1.inspect.custom, { value: () => 'ContextualDocument[redacted]' });
    return Object.freeze(document);
}
function accepted(document, previousRevision, newRevision, replayed) {
    const result = { document, previousRevision, newRevision, replayed };
    Object.defineProperty(result, 'toString', { value: () => 'AcceptedDocument[redacted]' });
    Object.defineProperty(result, node_util_1.inspect.custom, { value: () => 'AcceptedDocument[redacted]' });
    return Object.freeze(result);
}
/** Framework-neutral document orchestration for an application-owned SQLite model. */
class SqliteSecureDocumentService {
    constructor(context, owner, driver, runtime, journal, host) {
        this.context = context;
        this.owner = owner;
        this.driver = driver;
        this.runtime = runtime;
        this.journal = journal;
        this.host = host;
        if (driver.databaseKind !== 'sqlite' || !context || !owner || !runtime || !journal || !host)
            throw new Error('DOCUMENT_CONFIGURATION');
    }
    principal(context) {
        if (context !== this.context)
            throw new Error('DOCUMENT_CONFIGURATION');
        try {
            return this.host.principal(context);
        }
        catch {
            throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
        }
    }
    async open(context, request) {
        if (!request || !validText(request.aggregateType) || !validText(request.businessId) ||
            !validText(request.purpose) || !Number.isSafeInteger(request.lifetimeSeconds) ||
            request.lifetimeSeconds < 1)
            throw new Error('DOCUMENT_COMMAND_INVALID');
        const principal = this.principal(context);
        const result = await this.driver.transaction(async (session) => {
            const current = await this.host.load(context, request.businessId, session);
            assertDocument(current, request.businessId, request.aggregateType, request.purpose);
            if (!samePrincipal(this.principal(context), principal))
                throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
            await this.host.authorize(context, principal, current.document.snapshot.scope, session);
            if (!samePrincipal(this.principal(context), principal))
                throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
            const lifetime = Math.min(request.lifetimeSeconds, current.lifetimeSeconds);
            const token = this.runtime.issueBoundDocumentSnapshot(principal, current.document, lifetime);
            return contextual(request.businessId, token, (0, sqlite_command_journal_1.freezeDocumentBody)(current.body));
        });
        if (this.host.present)
            await this.host.present(context, result);
        return result;
    }
    async accept(context, request) {
        if (!request || !validText(request.aggregateType) || !validText(request.purpose) ||
            !request.submitted || !validText(request.submitted.businessId) ||
            !validText(request.submitted.commandId))
            throw new Error('DOCUMENT_COMMAND_INVALID');
        const principal = this.principal(context);
        const verified = this.runtime.consumeBoundDocumentSnapshot(principal, request.submitted.documentToken, request.aggregateType, request.purpose);
        const issued = verified.document;
        if (issued.snapshot.businessId !== request.submitted.businessId)
            throw new Error('DOCUMENT_PROJECTION_VIOLATION');
        const scope = issued.snapshot.scope;
        const result = await this.owner.executeGraphSave(new request_intent_1.MutationIntent('accept protected document command'), graph => this.journal.apply(context, this.owner, graph, scope, request.submitted, async (current, expected, session) => {
            const actor = this.principal(current);
            if (!samePrincipal(actor, principal))
                throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
            await this.host.authorize(current, actor, expected, session);
            return actor;
        }, async (session, submitted) => {
            const before = await this.host.load(context, submitted.businessId, session);
            assertDocument(before, submitted.businessId, request.aggregateType, request.purpose);
            if (stable(canonicalDocument(before.document)) !==
                stable(canonicalDocument(issued)))
                throw new Error('DOCUMENT_REVISION_CONFLICT');
            const selections = verifiedSelections(this.runtime, principal, issued, submitted);
            if (selections.length && !this.host.bindBlobSelection)
                throw new Error('DOCUMENT_CAPABILITY_MISSING');
            if (selections.some(selection => selection.target.kind === 'NEW_CLIENT_KEY') &&
                !this.host.resolveNewBlobSelection)
                throw new Error('DOCUMENT_CAPABILITY_MISSING');
            await this.host.apply(context, issued, submitted, session, selections);
            const mapped = [];
            const mappedTargets = new Set();
            for (const selection of selections) {
                const binding = selection.target.kind === 'EXISTING_ROW'
                    ? mappedExisting(issued, selection)
                    : mappedNew(selection, await this.host.resolveNewBlobSelection(context, issued, submitted, selection, session), issued);
                const pair = `${binding.rowKey}\0${binding.target.canonicalField}`;
                if (mappedTargets.has(pair))
                    throw new Error('DOCUMENT_COMMAND_INVALID');
                mappedTargets.add(pair);
                mapped.push(binding);
            }
            for (const selection of mapped)
                await this.host.bindBlobSelection(context, this.owner, graph, selection, session);
            const after = await this.host.load(context, submitted.businessId, session);
            assertDocument(after, submitted.businessId, request.aggregateType, request.purpose);
            const nextScope = after.document.snapshot.scope;
            if (nextScope.documentId !== scope.documentId ||
                nextScope.aggregateType !== scope.aggregateType ||
                nextScope.purpose !== scope.purpose ||
                BigInt(nextScope.aggregateId) !== BigInt(scope.aggregateId))
                throw new Error('DOCUMENT_PROJECTION_VIOLATION');
            for (const selection of mapped) {
                const binding = after.document.bindings.find(candidate => candidate.rowKey === selection.rowKey &&
                    candidate.canonicalField === selection.target.canonicalField);
                if (!binding || binding.entityType !== selection.target.targetEntity ||
                    binding.stableKey !== selection.stableKey ||
                    integer(binding.bindingVersion) !== selection.nextVersion)
                    throw new Error('DOCUMENT_PROJECTION_VIOLATION');
                if (selection.target.kind === 'NEW_CLIENT_KEY') {
                    const row = after.document.snapshot.entities.find(candidate => candidate.rowKey === selection.rowKey);
                    if (!row || row.identity.entityType !== selection.target.targetEntity ||
                        BigInt(row.identity.id).toString() !== selection.entityId ||
                        !row.writableFields.includes(selection.target.canonicalField) ||
                        !after.document.snapshot.relations.some(relation => relation.rowKeys.includes(selection.rowKey) &&
                            relation.completeness === 'COMPLETE' && relation.writable &&
                            relation.allowedMutations.includes('CREATE_CHILD') &&
                            issued.snapshot.relations.some(previous => previous.name === relation.name &&
                                previous.completeness === 'COMPLETE' && previous.writable &&
                                previous.allowedMutations.includes('CREATE_CHILD') &&
                                !previous.rowKeys.includes(selection.rowKey))))
                        throw new Error('DOCUMENT_PROJECTION_VIOLATION');
                }
            }
            await this.host.authorize(context, principal, after.document.snapshot.scope, session);
            const previousRevision = integer(scope.aggregateRevision);
            const newRevision = integer(after.document.snapshot.scope.aggregateRevision);
            if (newRevision < previousRevision)
                throw new Error('DOCUMENT_REVISION_CONFLICT');
            const token = this.runtime.issueBoundDocumentSnapshot(principal, after.document, after.lifetimeSeconds);
            const document = contextual(submitted.businessId, token, (0, sqlite_command_journal_1.freezeDocumentBody)(after.body));
            return { previousRevision, newRevision, response: JSON.stringify(document) };
        }));
        let document;
        try {
            const saved = JSON.parse(result.receipt.response);
            if (!saved || saved.businessId !== request.submitted.businessId ||
                typeof saved.documentToken !== 'string' || !saved.body ||
                typeof saved.body !== 'object' || Array.isArray(saved.body))
                throw new Error('DOCUMENT_CATALOG_FAILED');
            if (!samePrincipal(this.principal(context), principal))
                throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
            this.runtime.consumeBoundDocumentSnapshot(principal, saved.documentToken, request.aggregateType, request.purpose);
            document = contextual(saved.businessId, saved.documentToken, (0, sqlite_command_journal_1.freezeDocumentBody)(saved.body));
            if (this.host.present)
                await this.host.present(context, document);
        }
        catch (error) {
            throw new request_intent_1.GraphCommittedError(error);
        }
        return accepted(document, result.receipt.previousRevision, result.receipt.newRevision, result.replayed);
    }
}
exports.SqliteSecureDocumentService = SqliteSecureDocumentService;
//# sourceMappingURL=sqlite-document-service.js.map