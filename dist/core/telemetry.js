"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeRuntimeOperation = exports.startRuntimeOperation = exports.safeRuntimeOperation = exports.NOOP_RUNTIME_TELEMETRY = void 0;
const noopScope = Object.freeze({
    success: () => undefined,
    failure: () => undefined,
});
exports.NOOP_RUNTIME_TELEMETRY = Object.freeze({
    start: () => noopScope,
});
const forbiddenAttributes = new Set([
    'teaql.entity.id',
    'teaql.user.id',
    'teaql.tenant.id',
    'teaql.query.parameters',
    'teaql.field.values',
    'teaql.audit.reason',
    'db.query.parameter_values',
    'http.request.body',
    'url.full',
]);
function safeRuntimeOperation(operation) {
    const attributes = {
        'teaql.operation.family': operation.family,
        'teaql.operation.name': operation.name,
    };
    for (const [key, value] of Object.entries(operation.attributes || {})) {
        if (!forbiddenAttributes.has(key))
            attributes[key] = value;
    }
    return Object.freeze({ ...operation, attributes: Object.freeze(attributes) });
}
exports.safeRuntimeOperation = safeRuntimeOperation;
function startRuntimeOperation(telemetry, operation) {
    if (!telemetry)
        return noopScope;
    try {
        const delegate = telemetry.start(safeRuntimeOperation(operation));
        let ended = false;
        return {
            run: delegate.run
                ? (work) => delegate.run(work)
                : (work) => work(),
            success(completion) {
                if (ended)
                    return;
                ended = true;
                try {
                    delegate?.success(completion);
                }
                catch { /* telemetry is fail open */ }
            },
            failure(error) {
                if (ended)
                    return;
                ended = true;
                try {
                    delegate?.failure(error);
                }
                catch { /* telemetry is fail open */ }
            },
        };
    }
    catch {
        return noopScope;
    }
}
exports.startRuntimeOperation = startRuntimeOperation;
async function observeRuntimeOperation(telemetry, operation, work, completion) {
    const scope = startRuntimeOperation(telemetry, operation);
    try {
        const result = await (scope.run ? scope.run(work) : work());
        scope.success(completion?.(result));
        return result;
    }
    catch (error) {
        scope.failure(error);
        throw error;
    }
}
exports.observeRuntimeOperation = observeRuntimeOperation;
//# sourceMappingURL=telemetry.js.map