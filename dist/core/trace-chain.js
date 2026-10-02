"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryTraceSource = exports.canonicalSQLTracePath = exports.cloneTraceNodes = void 0;
function cloneTraceNodes(source) {
    return Object.freeze(source.map(node => Object.freeze({ ...node })));
}
exports.cloneTraceNodes = cloneTraceNodes;
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