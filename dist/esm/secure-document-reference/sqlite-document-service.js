import {
  freezeDocumentBody
} from "../chunks/chunk-24H3NTBT.js";
import {
  GraphCommittedError,
  MutationIntent
} from "../chunks/chunk-LDU2JPAZ.js";
import "../chunks/chunk-AQT573VW.js";

// src/secure-document-reference/sqlite-document-service.ts
import { inspect } from "node:util";
function validText(value) {
  return typeof value === "string" && value.length > 0 && value === value.trim() && Buffer.byteLength(value, "utf8") <= 16384 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
}
function integer(value) {
  if (typeof value !== "bigint" && (!Number.isSafeInteger(value) || value < 0))
    throw new Error("DOCUMENT_PROJECTION_VIOLATION");
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("DOCUMENT_PROJECTION_VIOLATION");
  return result;
}
function samePrincipal(left, right) {
  try {
    return left.authenticationRealm === right.authenticationRealm && left.subject === right.subject && left.domainRootType === right.domainRootType && BigInt(left.domainRootId) === BigInt(right.domainRootId);
  } catch {
    return false;
  }
}
function stable(value, seen = /* @__PURE__ */ new Set(), depth = 0, budget = { left: 1e5 }) {
  if (--budget.left < 0 || depth > 64) throw new Error("DOCUMENT_PROJECTION_VIOLATION");
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "bigint" || typeof value === "number") {
    if (typeof value === "number" && !Number.isSafeInteger(value))
      throw new Error("DOCUMENT_PROJECTION_VIOLATION");
    return `#${value.toString()}`;
  }
  if (typeof value !== "object" || seen.has(value)) throw new Error("DOCUMENT_PROJECTION_VIOLATION");
  seen.add(value);
  try {
    if (Array.isArray(value))
      return `[${value.map((item) => stable(item, seen, depth + 1, budget)).join(",")}]`;
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
      throw new Error("DOCUMENT_PROJECTION_VIOLATION");
    const record = value;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key], seen, depth + 1, budget)}`).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}
function assertDocument(current, businessId, aggregateType, purpose) {
  if (!current || !current.document || !current.document.snapshot || !current.body || typeof current.body !== "object" || Array.isArray(current.body) || !Number.isSafeInteger(current.lifetimeSeconds) || current.lifetimeSeconds < 1 || current.document.snapshot.businessId !== businessId || current.document.snapshot.scope.aggregateType !== aggregateType || current.document.snapshot.scope.purpose !== purpose)
    throw new Error("DOCUMENT_PROJECTION_VIOLATION");
}
function contextual(businessId, documentToken, body) {
  const document = { businessId, documentToken, body };
  Object.defineProperty(document, "toString", { value: () => "ContextualDocument[redacted]" });
  Object.defineProperty(document, inspect.custom, { value: () => "ContextualDocument[redacted]" });
  return Object.freeze(document);
}
function accepted(document, previousRevision, newRevision, replayed) {
  const result = { document, previousRevision, newRevision, replayed };
  Object.defineProperty(result, "toString", { value: () => "AcceptedDocument[redacted]" });
  Object.defineProperty(result, inspect.custom, { value: () => "AcceptedDocument[redacted]" });
  return Object.freeze(result);
}
var SqliteSecureDocumentService = class {
  constructor(context, owner, driver, runtime, journal, host) {
    this.context = context;
    this.owner = owner;
    this.driver = driver;
    this.runtime = runtime;
    this.journal = journal;
    this.host = host;
    if (driver.databaseKind !== "sqlite" || !context || !owner || !runtime || !journal || !host)
      throw new Error("DOCUMENT_CONFIGURATION");
  }
  principal(context) {
    if (context !== this.context) throw new Error("DOCUMENT_CONFIGURATION");
    try {
      return this.host.principal(context);
    } catch {
      throw new Error("DOCUMENT_AUTHORIZATION_REQUIRED");
    }
  }
  async open(context, request) {
    if (!request || !validText(request.aggregateType) || !validText(request.businessId) || !validText(request.purpose) || !Number.isSafeInteger(request.lifetimeSeconds) || request.lifetimeSeconds < 1) throw new Error("DOCUMENT_COMMAND_INVALID");
    const principal = this.principal(context);
    const result = await this.driver.transaction(async (session) => {
      const current = await this.host.load(context, request.businessId, session);
      assertDocument(current, request.businessId, request.aggregateType, request.purpose);
      if (!samePrincipal(this.principal(context), principal))
        throw new Error("DOCUMENT_AUTHORIZATION_REQUIRED");
      await this.host.authorize(context, principal, current.document.snapshot.scope, session);
      if (!samePrincipal(this.principal(context), principal))
        throw new Error("DOCUMENT_AUTHORIZATION_REQUIRED");
      const lifetime = Math.min(request.lifetimeSeconds, current.lifetimeSeconds);
      const token = this.runtime.issueBoundDocumentSnapshot(principal, current.document, lifetime);
      return contextual(request.businessId, token, freezeDocumentBody(current.body));
    });
    if (this.host.present) await this.host.present(context, result);
    return result;
  }
  async accept(context, request) {
    if (!request || !validText(request.aggregateType) || !validText(request.purpose) || !request.submitted || !validText(request.submitted.businessId) || !validText(request.submitted.commandId)) throw new Error("DOCUMENT_COMMAND_INVALID");
    const principal = this.principal(context);
    const verified = this.runtime.consumeBoundDocumentSnapshot(
      principal,
      request.submitted.documentToken,
      request.aggregateType,
      request.purpose
    );
    const issued = verified.document;
    if (issued.snapshot.businessId !== request.submitted.businessId)
      throw new Error("DOCUMENT_PROJECTION_VIOLATION");
    const scope = issued.snapshot.scope;
    const result = await this.owner.executeGraphSave(
      new MutationIntent("accept protected document command"),
      (graph) => this.journal.apply(
        context,
        this.owner,
        graph,
        scope,
        request.submitted,
        async (current, expected, session) => {
          const actor = this.principal(current);
          if (!samePrincipal(actor, principal)) throw new Error("DOCUMENT_AUTHORIZATION_REQUIRED");
          await this.host.authorize(current, actor, expected, session);
          return actor;
        },
        async (session, submitted) => {
          const before = await this.host.load(context, submitted.businessId, session);
          assertDocument(before, submitted.businessId, request.aggregateType, request.purpose);
          if (stable(before.document) !== stable(issued))
            throw new Error("DOCUMENT_REVISION_CONFLICT");
          await this.host.apply(context, issued, submitted, session);
          const after = await this.host.load(context, submitted.businessId, session);
          assertDocument(after, submitted.businessId, request.aggregateType, request.purpose);
          const nextScope = after.document.snapshot.scope;
          if (nextScope.documentId !== scope.documentId || nextScope.aggregateType !== scope.aggregateType || nextScope.purpose !== scope.purpose || BigInt(nextScope.aggregateId) !== BigInt(scope.aggregateId))
            throw new Error("DOCUMENT_PROJECTION_VIOLATION");
          await this.host.authorize(context, principal, after.document.snapshot.scope, session);
          const previousRevision = integer(scope.aggregateRevision);
          const newRevision = integer(after.document.snapshot.scope.aggregateRevision);
          if (newRevision < previousRevision) throw new Error("DOCUMENT_REVISION_CONFLICT");
          const token = this.runtime.issueBoundDocumentSnapshot(
            principal,
            after.document,
            after.lifetimeSeconds
          );
          const document2 = contextual(
            submitted.businessId,
            token,
            freezeDocumentBody(after.body)
          );
          return { previousRevision, newRevision, response: JSON.stringify(document2) };
        }
      )
    );
    let document;
    try {
      const saved = JSON.parse(result.receipt.response);
      if (!saved || saved.businessId !== request.submitted.businessId || typeof saved.documentToken !== "string" || !saved.body || typeof saved.body !== "object" || Array.isArray(saved.body))
        throw new Error("DOCUMENT_CATALOG_FAILED");
      if (!samePrincipal(this.principal(context), principal))
        throw new Error("DOCUMENT_AUTHORIZATION_REQUIRED");
      this.runtime.consumeBoundDocumentSnapshot(
        principal,
        saved.documentToken,
        request.aggregateType,
        request.purpose
      );
      document = contextual(
        saved.businessId,
        saved.documentToken,
        freezeDocumentBody(saved.body)
      );
      if (this.host.present) await this.host.present(context, document);
    } catch (error) {
      throw new GraphCommittedError(error);
    }
    return accepted(
      document,
      result.receipt.previousRevision,
      result.receipt.newRevision,
      result.replayed
    );
  }
};
export {
  SqliteSecureDocumentService
};
//# sourceMappingURL=sqlite-document-service.js.map
