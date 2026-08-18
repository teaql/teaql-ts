export type RuntimeOperationFamily =
  | 'query'
  | 'mutation'
  | 'relation_load'
  | 'provider'
  | 'cache'
  | 'tfp'
  | 'audit';

export type RuntimeAttributeValue = string | number | boolean;

export interface RuntimeOperation {
  readonly family: RuntimeOperationFamily;
  readonly name: string;
  readonly attributes?: Readonly<Record<string, RuntimeAttributeValue>>;
}

export interface RuntimeOperationCompletion {
  readonly attributes?: Readonly<Record<string, RuntimeAttributeValue>>;
}

export interface RuntimeTelemetryScope {
  success(completion?: RuntimeOperationCompletion): void;
  failure(error: unknown): void;
}

/** Provider-neutral TeaQL lifecycle contract. Implementations must be fail open. */
export interface RuntimeTelemetry {
  start(operation: RuntimeOperation): RuntimeTelemetryScope;
  flush?(): void | Promise<void>;
  shutdown?(): void | Promise<void>;
}

const noopScope: RuntimeTelemetryScope = Object.freeze({
  success: () => undefined,
  failure: () => undefined,
});

export const NOOP_RUNTIME_TELEMETRY: RuntimeTelemetry = Object.freeze({
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

export function safeRuntimeOperation(operation: RuntimeOperation): RuntimeOperation {
  const attributes: Record<string, RuntimeAttributeValue> = {
    'teaql.operation.family': operation.family,
    'teaql.operation.name': operation.name,
  };
  for (const [key, value] of Object.entries(operation.attributes || {})) {
    if (!forbiddenAttributes.has(key)) attributes[key] = value;
  }
  return Object.freeze({ ...operation, attributes: Object.freeze(attributes) });
}

export function startRuntimeOperation(
  telemetry: RuntimeTelemetry | undefined,
  operation: RuntimeOperation,
): RuntimeTelemetryScope {
  if (!telemetry) return noopScope;
  try {
    const delegate = telemetry.start(safeRuntimeOperation(operation));
    let ended = false;
    return {
      success(completion) {
        if (ended) return;
        ended = true;
        try { delegate?.success(completion); } catch { /* telemetry is fail open */ }
      },
      failure(error) {
        if (ended) return;
        ended = true;
        try { delegate?.failure(error); } catch { /* telemetry is fail open */ }
      },
    };
  } catch {
    return noopScope;
  }
}

export async function observeRuntimeOperation<T>(
  telemetry: RuntimeTelemetry | undefined,
  operation: RuntimeOperation,
  work: () => Promise<T>,
  completion?: (result: T) => RuntimeOperationCompletion,
): Promise<T> {
  const scope = startRuntimeOperation(telemetry, operation);
  try {
    const result = await work();
    scope.success(completion?.(result));
    return result;
  } catch (error) {
    scope.failure(error);
    throw error;
  }
}
