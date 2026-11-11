import {
  LoadedScalarSnapshot,
  UserContext,
  internalId
} from "./chunk-V4EWL6CG.js";

// src/core/entity-creation.ts
var reservations = /* @__PURE__ */ new WeakMap();
var hydrated = /* @__PURE__ */ new WeakSet();
var bootstrapScopes = /* @__PURE__ */ new WeakMap();
var identity = (entity, id) => JSON.stringify([entity, id]);
var EntityCreationError = class extends Error {
  constructor() {
    super("ENTITY_CREATION_CONTEXT_REQUIRED: create through the Context-bound Q factory or load a persisted version before mutation");
    this.code = "ENTITY_CREATION_CONTEXT_REQUIRED";
    this.name = "EntityCreationError";
  }
};
var EntityCreation = class {
  static async create(context, entity, construct) {
    if (!(context instanceof UserContext)) throw new EntityCreationError();
    const id = await context.generateInternalId(entity);
    const value = construct(id);
    reservations.set(value, Object.freeze({ entity, id }));
    return value;
  }
  /** @internal Only an installed model's fixed IDs inside Context.ensureSchema. */
  static bootstrap(context, entity, value, construct) {
    if (!(context instanceof UserContext)) throw new EntityCreationError();
    const id = internalId(value);
    if (!bootstrapScopes.get(context)?.has(identity(entity, id))) throw new EntityCreationError();
    const result = construct(id);
    reservations.set(result, Object.freeze({ entity, id }));
    return result;
  }
  /** @internal Provider/JSON hydration is never insert intent. */
  static hydrated(value) {
    hydrated.add(value);
    return value;
  }
  /** Pure admission: must run before provider, Fix, clock or mutation callbacks. */
  static requireMutation(value, key, nativeId, action, root, pending) {
    if (!pending) return;
    let id;
    try {
      id = internalId(nativeId);
    } catch {
      throw new EntityCreationError();
    }
    if (internalId(key.id) !== id) throw new EntityCreationError();
    const snapshot = LoadedScalarSnapshot.forEntity(value);
    if (action === "Create") {
      const reservation = reservations.get(value);
      if (!reservation || reservation.entity !== key.entity || reservation.id !== id || snapshot?.origin !== "creationBaseline" || !root.isNew(key)) throw new EntityCreationError();
    } else if (!hydrated.has(value) && !reservations.has(value) || snapshot?.origin !== "hydrated" || snapshot.persistedVersion === void 0) {
      throw new EntityCreationError();
    }
  }
};
async function runGeneratedBootstrap(context, bootstrap, work) {
  const previous = bootstrapScopes.get(context);
  const allowed = /* @__PURE__ */ new Set();
  for (const value of [bootstrap.defaultDomainRoot, ...bootstrap.constants ?? []]) {
    if (value) allowed.add(identity(value.entity, internalId(value.id)));
  }
  bootstrapScopes.set(context, allowed);
  try {
    await work();
  } finally {
    if (previous) bootstrapScopes.set(context, previous);
    else bootstrapScopes.delete(context);
  }
}

export {
  EntityCreationError,
  EntityCreation,
  runGeneratedBootstrap
};
//# sourceMappingURL=chunk-DEC24JLO.js.map
