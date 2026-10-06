"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshotQuery = exports.retainQueryDiagnosticOrigin = exports.queryDiagnosticOrigin = void 0;
// Internal execution plumbing. Never export provenance from the public facade
// or store it as a JSON/symbol property on a builder, entity or Context.
const origins = new WeakMap();
function queryDiagnosticOrigin(query) { return origins.get(query); }
exports.queryDiagnosticOrigin = queryDiagnosticOrigin;
function retainQueryDiagnosticOrigin(source, target) {
    origins.set(target, origins.get(source) ?? snapshotQuery(source));
}
exports.retainQueryDiagnosticOrigin = retainQueryDiagnosticOrigin;
/** Capture request-owned AST values while retaining opaque local capabilities.
 * Date/binary values keep their native types. Non-enumerable runtime policy and
 * Context handles are intentionally not traversed or serialized. */
function snapshotQuery(value, seen = new Map()) {
    if (!value || typeof value !== 'object')
        return value;
    if (seen.has(value))
        return seen.get(value);
    if (value instanceof Date)
        return new Date(value.getTime());
    if (value instanceof Uint8Array)
        return new Uint8Array(value);
    const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    seen.set(value, copy);
    for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if ('value' in descriptor && descriptor.enumerable)
            descriptor.value = snapshotQuery(descriptor.value, seen);
        Object.defineProperty(copy, key, descriptor);
    }
    const origin = origins.get(value);
    if (origin)
        origins.set(copy, origin);
    return copy;
}
exports.snapshotQuery = snapshotQuery;
//# sourceMappingURL=query-snapshot.js.map