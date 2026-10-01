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
var _QueryIntent_comment, _QueryIntent_purpose, _MutationIntent_comment, _QueryRequest_intent, _QueryRequest_query, _MutationRequest_intent, _MutationRequest_mutation;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationRequest = exports.QueryRequest = exports.MutationIntent = exports.QueryIntent = exports.RequestIntentError = void 0;
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
        __classPrivateFieldSet(this, _QueryRequest_query, Object.create(Object.getPrototypeOf(query), Object.getOwnPropertyDescriptors(query)), "f");
        const captured = __classPrivateFieldGet(this, _QueryRequest_query, "f");
        // Internal derivations cannot pick a nested builder's different intent.
        for (const [field, value] of [
            ['commentText', this.comment], ['purposeText', this.purpose],
            ['_comment', this.comment], ['_purpose', this.purpose],
        ]) {
            Object.defineProperty(captured, field, { value, enumerable: !field.startsWith('_'),
                configurable: true, writable: false });
        }
        Object.freeze(this);
    }
    get intent() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f"); }
    get query() { return __classPrivateFieldGet(this, _QueryRequest_query, "f"); }
    get comment() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f").comment; }
    get purpose() { return __classPrivateFieldGet(this, _QueryRequest_intent, "f").purpose; }
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
}
exports.MutationRequest = MutationRequest;
_MutationRequest_intent = new WeakMap(), _MutationRequest_mutation = new WeakMap();
//# sourceMappingURL=request-intent.js.map