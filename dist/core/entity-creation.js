"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGeneratedBootstrap = exports.EntityCreation = exports.EntityCreationError = void 0;
const context_1 = require("./context");
const internal_id_1 = require("./internal-id");
const loaded_scalar_snapshot_1 = require("./loaded-scalar-snapshot");
const reservations = new WeakMap();
const hydrated = new WeakSet();
const bootstrapScopes = new WeakMap();
const identity = (entity, id) => JSON.stringify([entity, id]);
/** Stable, value-free diagnostic. Never includes data or Context resources. */
class EntityCreationError extends Error {
    constructor() {
        super('ENTITY_CREATION_CONTEXT_REQUIRED: create through the Context-bound Q factory or load a persisted version before mutation');
        this.code = 'ENTITY_CREATION_CONTEXT_REQUIRED';
        this.name = 'EntityCreationError';
    }
}
exports.EntityCreationError = EntityCreationError;
/** Core provenance, separate from each graph's mutation ledger and from JSON. */
class EntityCreation {
    static async create(context, entity, construct) {
        if (!(context instanceof context_1.UserContext))
            throw new EntityCreationError();
        const id = await context.generateInternalId(entity);
        const value = construct(id);
        reservations.set(value, Object.freeze({ entity, id }));
        return value;
    }
    /** @internal Only an installed model's fixed IDs inside Context.ensureSchema. */
    static bootstrap(context, entity, value, construct) {
        if (!(context instanceof context_1.UserContext))
            throw new EntityCreationError();
        const id = (0, internal_id_1.internalId)(value);
        if (!bootstrapScopes.get(context)?.has(identity(entity, id)))
            throw new EntityCreationError();
        const result = construct(id);
        reservations.set(result, Object.freeze({ entity, id }));
        return result;
    }
    /** @internal Provider/JSON hydration is never insert intent. */
    static hydrated(value) { hydrated.add(value); return value; }
    /** Pure admission: must run before provider, Fix, clock or mutation callbacks. */
    static requireMutation(value, key, nativeId, action, root, pending) {
        if (!pending)
            return;
        let id;
        try {
            id = (0, internal_id_1.internalId)(nativeId);
        }
        catch {
            throw new EntityCreationError();
        }
        if ((0, internal_id_1.internalId)(key.id) !== id)
            throw new EntityCreationError();
        const snapshot = loaded_scalar_snapshot_1.LoadedScalarSnapshot.forEntity(value);
        if (action === 'Create') {
            const reservation = reservations.get(value);
            if (!reservation || reservation.entity !== key.entity || reservation.id !== id
                || snapshot?.origin !== 'creationBaseline' || !root.isNew(key))
                throw new EntityCreationError();
        }
        else if ((!hydrated.has(value) && !reservations.has(value))
            || snapshot?.origin !== 'hydrated' || snapshot.persistedVersion === undefined) {
            throw new EntityCreationError();
        }
    }
}
exports.EntityCreation = EntityCreation;
/** Package-internal: not exported from the public package entry point. */
async function runGeneratedBootstrap(context, bootstrap, work) {
    const previous = bootstrapScopes.get(context);
    const allowed = new Set();
    for (const value of [bootstrap.defaultDomainRoot, ...(bootstrap.constants ?? [])]) {
        if (value)
            allowed.add(identity(value.entity, (0, internal_id_1.internalId)(value.id)));
    }
    bootstrapScopes.set(context, allowed);
    try {
        await work();
    }
    finally {
        if (previous)
            bootstrapScopes.set(context, previous);
        else
            bootstrapScopes.delete(context);
    }
}
exports.runGeneratedBootstrap = runGeneratedBootstrap;
//# sourceMappingURL=entity-creation.js.map