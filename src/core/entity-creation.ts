import {UserContext} from './context';
import {internalId} from './internal-id';
import type {EntityKey, EntityRoot} from './entity-root';
import {LoadedScalarSnapshot} from './loaded-scalar-snapshot';
import type {RuntimeBootstrap} from './runtime-module';

const reservations = new WeakMap<object, Readonly<{entity: string; id: string}>>();
const hydrated = new WeakSet<object>();
const bootstrapScopes = new WeakMap<UserContext, ReadonlySet<string>>();
const identity = (entity: string, id: string) => JSON.stringify([entity, id]);

/** Stable, value-free diagnostic. Never includes data or Context resources. */
export class EntityCreationError extends Error {
  readonly code = 'ENTITY_CREATION_CONTEXT_REQUIRED';
  constructor() {
    super('ENTITY_CREATION_CONTEXT_REQUIRED: create through the Context-bound Q factory or load a persisted version before mutation');
    this.name = 'EntityCreationError';
  }
}

/** Core provenance, separate from each graph's mutation ledger and from JSON. */
export class EntityCreation {
  static async create<T extends object>(context: UserContext, entity: string, construct: (id: string) => T): Promise<T> {
    if (!(context instanceof UserContext)) throw new EntityCreationError();
    const id = await context.generateInternalId(entity);
    const value = construct(id);
    reservations.set(value, Object.freeze({entity, id}));
    return value;
  }

  /** @internal Only an installed model's fixed IDs inside Context.ensureSchema. */
  static bootstrap<T extends object>(context: UserContext, entity: string, value: unknown, construct: (id: string) => T): T {
    if (!(context instanceof UserContext)) throw new EntityCreationError();
    const id = internalId(value);
    if (!bootstrapScopes.get(context)?.has(identity(entity, id))) throw new EntityCreationError();
    const result = construct(id);
    reservations.set(result, Object.freeze({entity, id}));
    return result;
  }

  /** @internal Provider/JSON hydration is never insert intent. */
  static hydrated<T extends object>(value: T): T {hydrated.add(value); return value;}

  /** Pure admission: must run before provider, Fix, clock or mutation callbacks. */
  static requireMutation(value: object, key: EntityKey, nativeId: unknown, action: string, root: EntityRoot, pending: boolean): void {
    if (!pending) return;
    let id: string;
    try {id = internalId(nativeId);} catch {throw new EntityCreationError();}
    if (internalId(key.id) !== id) throw new EntityCreationError();
    const snapshot = LoadedScalarSnapshot.forEntity(value);
    if (action === 'Create') {
      const reservation = reservations.get(value);
      if (!reservation || reservation.entity !== key.entity || reservation.id !== id
        || snapshot?.origin !== 'creationBaseline' || !root.isNew(key)) throw new EntityCreationError();
    } else if ((!hydrated.has(value) && !reservations.has(value))
      || snapshot?.origin !== 'hydrated' || snapshot.persistedVersion === undefined) {
      throw new EntityCreationError();
    }
  }
}

/** Package-internal: not exported from the public package entry point. */
export async function runGeneratedBootstrap(context: UserContext, bootstrap: RuntimeBootstrap, work: () => Promise<void>): Promise<void> {
  const previous = bootstrapScopes.get(context);
  const allowed = new Set<string>();
  for (const value of [bootstrap.defaultDomainRoot, ...(bootstrap.constants ?? [])]) {
    if (value) allowed.add(identity(value.entity, internalId(value.id)));
  }
  bootstrapScopes.set(context, allowed);
  try {await work();}
  finally {if (previous) bootstrapScopes.set(context, previous); else bootstrapScopes.delete(context);}
}
