// src/core/telemetry.ts
function runtimeErrorCategory(error) {
  const type = error instanceof Error && error.constructor?.name ? error.constructor.name.toLowerCase() : typeof error;
  if (/timeout|deadline/.test(type)) return "timeout";
  if (/authentication|authorization|unauthorized|forbidden|permission/.test(type)) return "authorization";
  if (/validation|invalidargument|valueerror|parse|format/.test(type)) return "validation";
  if (/conflict|optimistic|version|duplicate|alreadyexists/.test(type)) return "conflict";
  if (/transport|network|connection|socket|http|ioerror/.test(type)) return "transport";
  if (/provider|sql|database|jdbc/.test(type)) return "provider";
  return "internal";
}
function injectRuntimeContext(telemetry, carrier) {
  try {
    telemetry?.inject?.(carrier);
  } catch {
  }
  return carrier;
}
var noopScope = Object.freeze({
  success: () => void 0,
  failure: () => void 0
});
var NOOP_RUNTIME_TELEMETRY = Object.freeze({
  start: () => noopScope
});
var forbiddenAttributes = /* @__PURE__ */ new Set([
  "teaql.entity.id",
  "teaql.user.id",
  "teaql.tenant.id",
  "teaql.query.parameters",
  "teaql.field.values",
  "teaql.audit.reason",
  "db.query.parameter_values",
  "http.request.body",
  "url.full"
]);
function safeRuntimeOperation(operation) {
  const attributes = {
    "teaql.operation.family": operation.family,
    "teaql.operation.name": operation.name
  };
  for (const [key, value] of Object.entries(operation.attributes || {})) {
    if (!forbiddenAttributes.has(key)) attributes[key] = value;
  }
  return Object.freeze({ ...operation, attributes: Object.freeze(attributes) });
}
function startRuntimeOperation(telemetry, operation) {
  if (!telemetry) return noopScope;
  try {
    const delegate = telemetry.start(safeRuntimeOperation(operation));
    let ended = false;
    return {
      run: delegate.run ? (work) => delegate.run(work) : (work) => work(),
      success(completion) {
        if (ended) return;
        ended = true;
        try {
          delegate?.success(completion);
        } catch {
        }
      },
      failure(error) {
        if (ended) return;
        ended = true;
        try {
          delegate?.failure(error);
        } catch {
        }
      }
    };
  } catch {
    return noopScope;
  }
}
async function observeRuntimeOperation(telemetry, operation, work, completion) {
  const scope = startRuntimeOperation(telemetry, operation);
  try {
    const result = await (scope.run ? scope.run(work) : work());
    scope.success(completion?.(result));
    return result;
  } catch (error) {
    scope.failure(error);
    throw error;
  }
}

export {
  runtimeErrorCategory,
  injectRuntimeContext,
  NOOP_RUNTIME_TELEMETRY,
  safeRuntimeOperation,
  startRuntimeOperation,
  observeRuntimeOperation
};
//# sourceMappingURL=chunk-WZ3T4PU6.js.map
