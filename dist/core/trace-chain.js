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
var _MutationTraceScope_parent, _MutationTraceScope_node;
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryTraceSource = exports.canonicalSQLTracePath = exports.mutationScopeForEntity = exports.MutationTraceScope = exports.cloneTraceNodes = void 0;
function cloneTraceNodes(source) {
    return Object.freeze(source.map(node => Object.freeze({ ...node })));
}
exports.cloneTraceNodes = cloneTraceNodes;
/** Persistent graph-local responsibility. Creating a branch is O(1). */
class MutationTraceScope {
    constructor(parent, node) {
        _MutationTraceScope_parent.set(this, void 0);
        _MutationTraceScope_node.set(this, void 0);
        __classPrivateFieldSet(this, _MutationTraceScope_parent, parent, "f");
        __classPrivateFieldSet(this, _MutationTraceScope_node, Object.freeze({ ...node }), "f");
        Object.freeze(this);
    }
    recover() {
        const nodes = [];
        let scope = this;
        while (scope) {
            nodes.push(__classPrivateFieldGet(scope, _MutationTraceScope_node, "f"));
            scope = __classPrivateFieldGet(scope, _MutationTraceScope_parent, "f");
        }
        return cloneTraceNodes(nodes.reverse());
    }
}
exports.MutationTraceScope = MutationTraceScope;
_MutationTraceScope_parent = new WeakMap(), _MutationTraceScope_node = new WeakMap();
function mutationScopeForEntity(parent, entity, id, rootComment, localComment) {
    const reason = parent ? localComment : rootComment;
    if (parent && (typeof reason !== 'string' || /^\p{White_Space}*$/u.test(reason)))
        return parent;
    const rawId = String(id);
    const entityId = /^(0|[1-9][0-9]*)$/.test(rawId) && BigInt(rawId) <= 18446744073709551615n
        ? id : undefined;
    return new MutationTraceScope(parent, { kind: 'auditReason', name: entity,
        entityId, detail: reason });
}
exports.mutationScopeForEntity = mutationScopeForEntity;
const intentKinds = new Set(['comment', 'purpose', 'auditReason']);
const nonBlank = (value) => !/^\p{White_Space}*$/u.test(value);
/** Pure Rust-baseline algorithm. Request validation remains a separate mandatory gate. */
function canonicalSQLTracePath(source, backend, operation) {
    const last = (kind) => {
        for (let index = source.length - 1; index >= 0; index--) {
            if (source[index].kind === kind)
                return source[index].detail ?? '';
        }
        return undefined;
    };
    const canonical = ['operation', 'provider', 'sql'].every(kind => source.some(node => node.kind === kind));
    let path;
    if (canonical)
        path = source.filter(node => !intentKinds.has(node.kind));
    else {
        const root = source.find(node => nonBlank(node.name))?.name ?? 'unknown';
        let entity = root;
        if (operation !== 'select') {
            for (const node of source)
                if (node.kind === 'entity' && nonBlank(node.name))
                    entity = node.name;
        }
        path = [
            { kind: 'operation', name: root, detail: operation === 'select' ? 'query' : 'mutation' },
            { kind: operation === 'select' ? 'request' : 'entity', name: operation === 'select' ? root : entity, detail: '' },
            ...source.filter(node => node.kind === 'relation'),
            { kind: 'provider', name: nonBlank(backend) ? backend : 'unknown', detail: '' },
            { kind: 'sql', name: operation, detail: '' },
        ];
    }
    return Object.freeze({ tracePath: cloneTraceNodes(path), comment: last('comment'),
        purpose: last('purpose'), auditReason: last('auditReason') });
}
exports.canonicalSQLTracePath = canonicalSQLTracePath;
function queryTraceSource(entity, comment, purpose) {
    return cloneTraceNodes([{ kind: 'comment', name: entity, detail: comment },
        { kind: 'purpose', name: entity, detail: purpose }]);
}
exports.queryTraceSource = queryTraceSource;
//# sourceMappingURL=trace-chain.js.map