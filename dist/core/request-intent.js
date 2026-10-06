"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _QueryIntent_comment, _QueryIntent_purpose, _MutationIntent_comment, _QueryRequest_intent, _QueryRequest_query, _MutationRequest_intent, _MutationRequest_mutation, _GraphMutationSession_intent, _GraphMutationSession_bindings;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphCommittedError = exports.GraphMutationSession = exports.MutationRequest = exports.QueryRequest = exports.MutationIntent = exports.QueryIntent = exports.RequestIntentError = void 0;
const trace_chain_1 = require("./trace-chain");
const log_privacy_1 = require("./log-privacy");
const query_snapshot_1 = require("./query-snapshot");
const loaded_scalar_snapshot_1 = require("./loaded-scalar-snapshot");
const mutationSnapshots = new WeakMap();
// Only runtime-created snapshots carry provenance. No property supplied by a
// JSON/builder caller can forge it, and no mutable trace stack lives on Context.
const querySources = new WeakMap();
const graphRequests = new WeakMap();
const scopeOwners = new WeakMap();
/** Stable, value-free request-boundary diagnostics. */
class RequestIntentError extends Error {
    constructor(code, field, requestKind) {
        super(`${code}: ${requestKind} request requires a non-blank ${field}; supply it at the request entry point`);
        this.code = code;
        this.field = field;
        this.requestKind = requestKind;
        this.name = 'RequestIntentError';
    }
}
exports.RequestIntentError = RequestIntentError;
// Match Rust str::trim (Unicode White_Space), not JavaScript trim: NEL is
// whitespace, while BOM is not. Validate but never trim the supplied text.
function requireText(value, field, kind) {
    if (typeof value !== 'string' || /^\p{White_Space}*$/u.test(value)) {
        throw new RequestIntentError(field === 'comment' ? 'REQUEST_COMMENT_REQUIRED' : 'QUERY_PURPOSE_REQUIRED', field, kind);
    }
    return value;
}
class QueryIntent {
    constructor(comment, purpose) {
        _QueryIntent_comment.set(this, void 0);
        _QueryIntent_purpose.set(this, void 0);
        __classPrivateFieldSet(this, _QueryIntent_comment, requireText(comment, 'comment', 'query'), "f");
        __classPrivateFieldSet(this, _QueryIntent_purpose, requireText(purpose, 'purpose', 'query'), "f");
        Object.freeze(this);
    }
    get comment() { return __classPrivateFieldGet(this, _QueryIntent_comment, "f"); }
    get purpose() { return __classPrivateFieldGet(this, _QueryIntent_purpose, "f"); }
}
exports.QueryIntent = QueryIntent;
_QueryIntent_comment = new WeakMap(), _QueryIntent_purpose = new WeakMap();
class MutationIntent {
    constructor(comment) {
        _MutationIntent_comment.set(this, void 0);
        __classPrivateFieldSet(this, _MutationIntent_comment, requireText(comment, 'comment', 'mutation'), "f");
        Object.freeze(this);
    }
    get comment() { return __classPrivateFieldGet(this, _MutationIntent_comment, "f"); }
    get auditReason() { return __classPrivateFieldGet(this, _MutationIntent_comment, "f"); }
    readbackIntent() {
        return new QueryIntent(__classPrivateFieldGet(this, _MutationIntent_comment, "f"), 'verify persisted mutation result');
    }
}
exports.MutationIntent = MutationIntent;
_MutationIntent_comment = new WeakMap();
/**
 * Request intent is owned separately from the mutable query builder. A snapshot
 * retains local, non-enumerable pagination capabilities without serializing them.
 */
class QueryRequest {
    constructor(query, intent) {
        _QueryRequest_intent.set(this, void 0);
        _QueryRequest_query.set(this, void 0);
        const source = query;
        __classPrivateFieldSet(this, _QueryRequest_intent, intent === undefined
            ? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText)
            : new QueryIntent(intent?.comment, intent?.purpose), "f");
        __classPrivateFieldSet(this, _QueryRequest_query, (0, query_snapshot_1.snapshotQuery)(query), "f");
        const captured = __classPrivateFieldGet(this, _QueryRequest_query, "f");
        // Internal derivations cannot pick a nested builder's different intent.
        for (const [field, value] of [
            ['commentText', this.comment], ['purposeText', this.purpose],
            ['_comment', this.comment], ['_purpose', this.purpose],
        ]) {
            Object.defineProperty(captured, field, { value, enumerable: !field.startsWith('_'),
                configurable: true, writable: false });
        }
        querySources.set(captured, (0, trace_chain_1.cloneTraceNodes)(querySources.get(query)
            ?? (0, trace_chain_1.queryTraceSource)(String(source.entity), this.comment, this.purpose)));
        Object.freeze(this);
    }
    get intent() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f"); }
    get query() { return __classPrivateFieldGet(this, _QueryRequest_query, "f"); }
    get comment() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f").comment; }
    get purpose() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f").purpose; }
    get traceSource() { return querySources.get(__classPrivateFieldGet(this, _QueryRequest_query, "f")); }
    /** Runtime derivation preserves this invocation's source across builder clones. */
    withQuery(query) {
        const request = new QueryRequest(query, this.intent);
        querySources.set(request.query, (0, trace_chain_1.cloneTraceNodes)(this.traceSource));
        return request;
    }
    /** Append one local relation and its qualified property; never accept caller frames. */
    derive(query, relation) {
        const request = this.withQuery(query);
        querySources.set(request.query, (0, trace_chain_1.cloneTraceNodes)([...this.traceSource, {
                kind: 'relation', name: relation, detail: `${String(this.query.entity)}.${relation}`,
            }]));
        return request;
    }
}
exports.QueryRequest = QueryRequest;
_QueryRequest_intent = new WeakMap(), _QueryRequest_query = new WeakMap();
/** A batch also needs this root envelope; child comments are not a fallback. */
class MutationRequest {
    constructor(mutation, intent) {
        _MutationRequest_intent.set(this, void 0);
        _MutationRequest_mutation.set(this, void 0);
        __classPrivateFieldSet(this, _MutationRequest_intent, new MutationIntent(intent === undefined ? mutation?.comment : intent?.comment), "f");
        __classPrivateFieldSet(this, _MutationRequest_mutation, { ...mutation }, "f");
        Object.defineProperty(__classPrivateFieldGet(this, _MutationRequest_mutation, "f"), 'comment', {
            value: __classPrivateFieldGet(this, _MutationRequest_intent, "f").comment, enumerable: true, writable: false, configurable: false,
        });
        Object.freeze(this);
    }
    get intent() { return __classPrivateFieldGet(this, _MutationRequest_intent, "f"); }
    get mutation() { return __classPrivateFieldGet(this, _MutationRequest_mutation, "f"); }
    get comment() { return __classPrivateFieldGet(this, _MutationRequest_intent, "f").comment; }
    /** @internal Generated hydration/commit provenance, never a wire field. */
    withLoadedSnapshot(snapshot) {
        mutationSnapshots.set(this, new loaded_scalar_snapshot_1.LoadedScalarSnapshot(snapshot.values()));
        return this;
    }
    /** @internal Does not become part of the write payload or policy input. */
    loadedValues() { return mutationSnapshots.get(this)?.values() ?? {}; }
    /** Runtime-owned execution capability; raw mutation fields cannot forge it. */
    get graphSession() { return graphRequests.get(this)?.session; }
    scopeFor(key) {
        const graph = graphRequests.get(this);
        const scope = (0, trace_chain_1.mutationScopeForEntity)(graph?.parent, key.entity, key.id, this.comment, graph?.localComment);
        if (graph)
            scopeOwners.set(scope, graph.session);
        return scope;
    }
    traceFor(key) {
        const mutation = __classPrivateFieldGet(this, _MutationRequest_mutation, "f");
        const specific = mutation.ledgerRoot?.traceChain(mutation.ledgerKey ?? key);
        return specific?.length ? (0, trace_chain_1.cloneTraceNodes)(specific) : this.scopeFor(key).recover();
    }
    /** Safe event projection; internal policy intent is never mutated. */
    auditProjection(key, payload, bindings) {
        const secrets = [...(0, log_privacy_1.logValueStrings)(payload), ...(0, log_privacy_1.logValueStrings)(__classPrivateFieldGet(this, _MutationRequest_mutation, "f").id),
            ...(bindings ? (0, log_privacy_1.privateLogValueStrings)(bindings) : (0, log_privacy_1.logValueStrings)(this.loadedValues())),
            ...(0, log_privacy_1.privateLogValueStrings)(this.graphSession?.logBindings)];
        return Object.freeze({ reason: (0, log_privacy_1.scrubLogText)(this.comment, secrets),
            mutationLineage: (0, trace_chain_1.cloneTraceNodes)(this.traceFor(key).map(node => ({ ...node,
                detail: (0, log_privacy_1.scrubLogText)(node.detail, secrets) }))) });
    }
}
exports.MutationRequest = MutationRequest;
_MutationRequest_intent = new WeakMap(), _MutationRequest_mutation = new WeakMap();
/** One explicit graph invocation, never a Context-owned trace stack. */
class GraphMutationSession {
    constructor(intent) {
        _GraphMutationSession_intent.set(this, void 0);
        _GraphMutationSession_bindings.set(this, void 0);
        __classPrivateFieldSet(this, _GraphMutationSession_intent, new MutationIntent(intent?.comment), "f");
        Object.freeze(this);
    }
    get intent() { return __classPrivateFieldGet(this, _GraphMutationSession_intent, "f"); }
    request(mutation, parent, localComment) {
        if (parent && scopeOwners.get(parent) !== this)
            throw new Error('GRAPH_TRACE_SCOPE_MISMATCH: parent scope belongs to another graph invocation');
        const request = new MutationRequest(mutation, __classPrivateFieldGet(this, _GraphMutationSession_intent, "f"));
        graphRequests.set(request, { session: this, parent, localComment });
        return request;
    }
    /** @internal Preflight snapshots bind provenance for all siblings before SQL. */
    captureLogBindings(source) {
        __classPrivateFieldSet(this, _GraphMutationSession_bindings, (0, log_privacy_1.inheritSQLLogBindings)(source, __classPrivateFieldGet(this, _GraphMutationSession_bindings, "f")), "f");
    }
    /** @internal Never put this raw provenance on a wire or log record. */
    get logBindings() { return __classPrivateFieldGet(this, _GraphMutationSession_bindings, "f"); }
}
exports.GraphMutationSession = GraphMutationSession;
_GraphMutationSession_intent = new WeakMap(), _GraphMutationSession_bindings = new WeakMap();
/** Database committed; retrying this operation as a rolled-back write is unsafe. */
class GraphCommittedError extends Error {
    constructor(cause) {
        super('GRAPH_ALREADY_COMMITTED: post-commit processing failed; do not retry as an uncommitted mutation');
        this.cause = cause;
        this.committed = true;
        this.name = 'GraphCommittedError';
    }
}
exports.GraphCommittedError = GraphCommittedError;
//# sourceMappingURL=request-intent.js.map