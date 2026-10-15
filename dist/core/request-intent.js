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
var _QueryIntent_comment, _QueryIntent_purpose, _MutationIntent_comment, _QueryRequest_intent, _QueryRequest_query, _QueryRequest_parent, _QueryRequest_comment, _QueryRequest_name, _QueryRequest_operation, _QueryRequest_invocation, _MutationRequest_intent, _MutationRequest_mutation, _GraphMutationSession_intent, _GraphMutationSession_bindings;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphCommittedError = exports.GraphMutationSession = exports.MutationRequest = exports.QueryRequest = exports.MutationIntent = exports.QueryIntent = exports.RequestIntentError = exports.queryOperationComment = void 0;
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
function operationSnapshot(operation) {
    if (!['named-count', 'facet', 'relation-count', 'relation-select', 'aggregate', 'pagination'].includes(operation.kind)
        || (operation.method !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(operation.method))
        || (operation.alias !== undefined && typeof operation.alias !== 'string')
        || (operation.relation !== undefined && typeof operation.relation !== 'string')) {
        throw new Error('QUERY_OPERATION_INVALID: invalid generated operation descriptor');
    }
    return Object.freeze({ kind: operation.kind, method: operation.method,
        alias: operation.alias, relation: operation.relation });
}
/** One native literal renderer for all count/facet aliases. Never parse SQL. */
function queryOperationComment(operation) {
    const captured = operationSnapshot(operation);
    const literal = (value) => "'" + value.replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + "'";
    if (!captured.method)
        return 'framework: ' + captured.kind
            + (captured.relation ? ' ' + captured.relation : '')
            + (captured.alias !== undefined ? ' ' + literal(captured.alias) : '');
    return captured.method + '(' + (captured.alias !== undefined ? literal(captured.alias)
        : captured.kind === 'relation-select' ? '...' : '') + ')';
}
exports.queryOperationComment = queryOperationComment;
const requestBindingToken = Symbol('runtime request binding');
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
    constructor(query, intent, binding) {
        _QueryRequest_intent.set(this, void 0);
        _QueryRequest_query.set(this, void 0);
        _QueryRequest_parent.set(this, void 0);
        _QueryRequest_comment.set(this, void 0);
        _QueryRequest_name.set(this, void 0);
        _QueryRequest_operation.set(this, void 0);
        _QueryRequest_invocation.set(this, void 0);
        const source = query;
        const previous = (0, query_snapshot_1.queryExecutionOwner)(query);
        const previousOwner = previous instanceof QueryRequest ? previous : undefined;
        __classPrivateFieldSet(this, _QueryRequest_intent, intent === undefined
            ? previousOwner?.intent
                ?? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText)
            : new QueryIntent(intent?.comment, intent?.purpose), "f");
        if (binding && binding[requestBindingToken] !== true)
            throw new Error('QUERY_REQUEST_OWNERSHIP_INVALID: request binding is runtime-owned');
        const owner = previousOwner
            && previousOwner.intent.comment === __classPrivateFieldGet(this, _QueryRequest_intent, "f").comment
            && previousOwner.purpose === __classPrivateFieldGet(this, _QueryRequest_intent, "f").purpose ? previousOwner : undefined;
        __classPrivateFieldSet(this, _QueryRequest_invocation, binding?.invocation ?? (binding?.parent ? __classPrivateFieldGet(binding.parent, _QueryRequest_invocation, "f") : undefined)
            ?? (owner ? __classPrivateFieldGet(owner, _QueryRequest_invocation, "f") : undefined) ?? Object.freeze({}), "f");
        __classPrivateFieldSet(this, _QueryRequest_parent, binding ? binding.parent : owner?.parentRequest, "f");
        __classPrivateFieldSet(this, _QueryRequest_comment, requireText(binding?.comment ?? owner?.comment ?? __classPrivateFieldGet(this, _QueryRequest_intent, "f").comment, 'comment', 'query'), "f");
        __classPrivateFieldSet(this, _QueryRequest_name, binding?.name ?? owner?.requestName ?? String(source.entity ?? 'query'), "f");
        __classPrivateFieldSet(this, _QueryRequest_operation, binding?.operation ?? owner?.operation, "f");
        __classPrivateFieldSet(this, _QueryRequest_query, (0, query_snapshot_1.snapshotQuery)(query), "f");
        const captured = __classPrivateFieldGet(this, _QueryRequest_query, "f");
        // Every request owns its local comment. Purpose is resolved from the root
        // request through parent ownership and is copied only onto the private SQL
        // execution snapshot for boundary validation.
        for (const [field, value] of [
            ['commentText', this.comment], ['purposeText', this.purpose],
            ['_comment', this.comment], ['_purpose', this.purpose],
        ]) {
            Object.defineProperty(captured, field, { value, enumerable: !field.startsWith('_'),
                configurable: true, writable: false });
        }
        querySources.set(captured, (0, trace_chain_1.cloneTraceNodes)(binding?.source ?? owner?.traceSource ?? querySources.get(query)
            ?? (0, trace_chain_1.queryTraceSource)(String(source.entity), this.intent.comment, this.purpose)));
        (0, query_snapshot_1.retainQueryExecutionOwner)(captured, this);
        Object.freeze(this);
    }
    get intent() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f"); }
    get query() { return __classPrivateFieldGet(this, _QueryRequest_query, "f"); }
    get comment() { return __classPrivateFieldGet(this, _QueryRequest_comment, "f"); }
    get purpose() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f").purpose; }
    get traceSource() { return querySources.get(__classPrivateFieldGet(this, _QueryRequest_query, "f")); }
    get parentRequest() { return __classPrivateFieldGet(this, _QueryRequest_parent, "f"); }
    get rootRequest() {
        let root = this;
        while (root.parentRequest)
            root = root.parentRequest;
        return root;
    }
    get requestName() { return __classPrivateFieldGet(this, _QueryRequest_name, "f"); }
    get operation() { return __classPrivateFieldGet(this, _QueryRequest_operation, "f"); }
    get traceChain() {
        const comments = [];
        for (let node = this; node; node = node.parentRequest)
            comments.push({ kind: 'comment', name: node.requestName, detail: node.comment });
        return (0, trace_chain_1.cloneTraceNodes)([{ kind: 'purpose', name: this.rootRequest.requestName, detail: this.purpose },
            ...comments.reverse()]);
    }
    /** Runtime derivation preserves this invocation's source across builder clones. */
    withQuery(query) {
        const previous = (0, query_snapshot_1.queryExecutionOwner)(query);
        if (previous instanceof QueryRequest && __classPrivateFieldGet(previous, _QueryRequest_invocation, "f") !== __classPrivateFieldGet(this, _QueryRequest_invocation, "f")) {
            throw new Error('QUERY_SCOPE_OWNER_MISMATCH: replacement belongs to another query invocation');
        }
        return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
            parent: this.parentRequest, comment: this.comment, name: this.requestName,
            operation: this.operation, source: this.traceSource, invocation: __classPrivateFieldGet(this, _QueryRequest_invocation, "f") });
    }
    /** A real operation child need not execute SQL itself; descendants retain it. */
    deriveOperation(query, operation) {
        const captured = operationSnapshot(operation);
        return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
            parent: this, comment: queryOperationComment(captured), name: String(query.entity ?? this.requestName),
            operation: captured, source: this.traceSource });
    }
    /** Local description for work created by the framework, never a root authorization. */
    deriveHelper(query, comment) {
        return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
            parent: this, comment: requireText(comment, 'comment', 'query'),
            name: String(query.entity ?? this.requestName), source: this.traceSource });
    }
    /** Preserve the Q-operation parent and the actual nested request's own comment. */
    derive(query, relation, operation) {
        if (operation)
            return this.deriveOperation(this.query, operation).deriveChild(query, relation);
        const owner = `${String(this.query.entity)}.${relation}`;
        return this.deriveChild(query, relation, undefined, owner);
    }
    /** Aggregates execute their operation; an anonymous template is not a value load. */
    deriveAggregate(query, relation, operation) {
        const facet = this.parentRequest?.operation?.kind === 'facet' ? this.parentRequest : undefined;
        const branch = facet
            ? facet.deriveHelper(query, 'aggregate ' + facet.operation.relation)
            : this.deriveOperation(query, operation);
        const physical = [...this.traceSource, { kind: 'relation', name: relation,
                detail: `${String(this.query.entity)}.${relation}` }];
        const scoped = new QueryRequest(query, this.intent, { [requestBindingToken]: true,
            parent: branch.parentRequest, comment: branch.comment, name: branch.requestName,
            operation: branch.operation, source: physical });
        const comment = query._comment ?? query.commentText;
        return comment === undefined ? scoped : scoped.deriveChild(query);
    }
    /** Bind a framework helper or value query below an existing operation parent. */
    deriveChild(query, relation, defaultComment, requestName) {
        const source = query;
        const comment = source._comment ?? source.commentText;
        return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
            parent: this, comment: comment === undefined
                ? (defaultComment ?? `load ${String(source.entity)}`)
                : requireText(comment, 'comment', 'query'),
            name: requestName ?? String(source.entity), source: relation === undefined ? this.traceSource : [...this.traceSource, {
                    kind: 'relation', name: relation, detail: `${String(this.query.entity)}.${relation}`,
                }] });
    }
}
exports.QueryRequest = QueryRequest;
_QueryRequest_intent = new WeakMap(), _QueryRequest_query = new WeakMap(), _QueryRequest_parent = new WeakMap(), _QueryRequest_comment = new WeakMap(), _QueryRequest_name = new WeakMap(), _QueryRequest_operation = new WeakMap(), _QueryRequest_invocation = new WeakMap();
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