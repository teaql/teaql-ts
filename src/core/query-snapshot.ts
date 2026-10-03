// Internal execution plumbing. Never export provenance from the public facade
// or store it as a JSON/symbol property on a builder, entity or Context.
const origins = new WeakMap<object, object>();

export function queryDiagnosticOrigin(query: object): object | undefined { return origins.get(query); }

export function retainQueryDiagnosticOrigin(source: object, target: object): void {
  origins.set(target, origins.get(source) ?? snapshotQuery(source));
}

/** Capture request-owned AST values while retaining opaque local capabilities.
 * Date/binary values keep their native types. Non-enumerable runtime policy and
 * Context handles are intentionally not traversed or serialized. */
export function snapshotQuery<T>(value: T, seen = new Map<object, unknown>()): T {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value) as T;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof Uint8Array) return new Uint8Array(value) as T;
  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if ('value' in descriptor && descriptor.enumerable) descriptor.value = snapshotQuery(descriptor.value, seen);
    Object.defineProperty(copy, key, descriptor);
  }
  const origin = origins.get(value);
  if (origin) origins.set(copy, origin);
  return copy;
}
