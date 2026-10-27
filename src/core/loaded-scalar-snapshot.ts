import { snapshotQuery } from './query-snapshot';
import type { EntityKey, EntityRoot } from './entity-root';
import {EntityVersion, EntityVersionInput, entityVersion} from './mutation-version';
import {CheckException} from './checker';
import {ObjectLocation} from './object-location';

const loadedSnapshots = new WeakMap<object, LoadedScalarSnapshot>();

/** Stable, value-free conflict; paths remain canonical Checker locations. */
export class LoadedEntityIdentityError extends CheckException {
  readonly code = 'ENTITY_VERSION_CONFLICT';
  constructor(field: 'id' | 'version') {
    super([{ruleId: 'entity_version_conflict', location: ObjectLocation.property(field),
      message: 'ENTITY_VERSION_CONFLICT: loaded entity identity must remain unchanged'}]);
    this.name = 'LoadedEntityIdentityError';
  }
}

/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
export class LoadedScalarSnapshot {
  readonly #values: Readonly<Record<string, unknown>>;
  readonly #owner?: Readonly<{key: EntityKey; version: EntityVersion}>;
  readonly #identityKey?: EntityKey;

  constructor(values: Record<string, unknown> = {}, key?: EntityKey, version?: EntityVersionInput) {
    this.#values = snapshotQuery(values);
    if (key && version !== undefined) {
      const exact = entityVersion(version);
      if (exact !== 0) {
        this.#identityKey = Object.freeze({...key});
        this.#owner = Object.freeze({key: this.#identityKey, version: exact});
      }
    }
    // An explicit ID-only reference still has an immutable identity. A new
    // entity's temporary key with no native ID must remain unbound until save.
    if (!this.#identityKey && key && values.id !== undefined) this.#identityKey = Object.freeze({...key});
    Object.freeze(this);
  }

  /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
  values(): Readonly<Record<string, unknown>> { return snapshotQuery(this.#values); }

  /** Validate even read-only nodes, before root attachment or FK normalization. */
  validateNativeIdentity(key: EntityKey, nativeID: unknown, nativeVersion: unknown): void {
    const expected = this.#identityKey;
    if (expected && (expected.entity !== key.entity || !Object.is(expected.id, key.id)
      || !Object.is(expected.id, nativeID))) throw new LoadedEntityIdentityError('id');
    if (this.#owner) {
      let version: EntityVersion;
      try {version = entityVersion(nativeVersion);} catch {throw new LoadedEntityIdentityError('version');}
      if (version !== this.#owner.version) throw new LoadedEntityIdentityError('version');
    }
  }

  /** Normalize restored intent first. Clean old views may observe an advanced
   * ledger, but a dirty old view must never borrow its newer committed version. */
  validateMutationVersion(root: EntityRoot, key: EntityKey): void {
    if (!this.#owner || !root.hasPending(key)) return;
    if (this.#owner.key.entity !== key.entity || !Object.is(this.#owner.key.id, key.id)
      || root.isNew(key) || root.originalVersion(key) !== this.#owner.version) {
      throw new LoadedEntityIdentityError('version');
    }
  }

  /** @internal Generated hydration stores provenance outside entity/JSON state. */
  static captureFor(entity: object, values: Record<string, unknown>, key?: EntityKey, version?: EntityVersionInput): LoadedScalarSnapshot {
    const snapshot = new LoadedScalarSnapshot(values, key, version);
    loadedSnapshots.set(entity, snapshot);
    return snapshot;
  }

  /** @internal Mutation uses the loaded values, not already-edited properties. */
  static forEntity(entity: object): LoadedScalarSnapshot | undefined { return loadedSnapshots.get(entity); }

  /** @internal Rollback restores provenance together with authoritative entity state. */
  static restoreFor(entity: object, snapshot: LoadedScalarSnapshot | undefined): void {
    if (snapshot) loadedSnapshots.set(entity, snapshot);
    else loadedSnapshots.delete(entity);
  }

  /** @internal Called only after model-field admission, before completeness and Fix. */
  discardRestoredFields(root: EntityRoot, key: EntityKey): void {
    const owner = this.#owner;
    if (!owner || owner.key.entity !== key.entity || !Object.is(owner.key.id, key.id)
      || root.originalVersion(key) !== owner.version || root.isNew(key) || root.isDeleted(key)) return;
    const restored: Record<string, unknown> = Object.create(null);
    for (const [field, value] of Object.entries(root.change(key))) {
      // Undefined is an unknown original, not a loaded null.
      const original = Object.getOwnPropertyDescriptor(this.#values, field);
      if (field !== 'id' && field !== 'version' && original && 'value' in original && original.value !== undefined
        && sameValue(original.value, value)) restored[field] = value;
    }
    root.discardFields(key, restored);
  }
}

/** Exact, bounded scalar/JSON comparison. No numeric or string coercion. */
function sameValue(a: unknown, b: unknown, budget = {nodes: 4096}, depth = 0): boolean {
  if (--budget.nodes < 0 || depth > 64 || typeof a !== typeof b) return false;
  if (typeof a === 'number') return Number.isFinite(a) && Number.isFinite(b) && Object.is(a, b);
  if (a === null || b === null || typeof a !== 'object') return Object.is(a, b);
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && Number.isFinite(a.getTime()) && a.getTime() === b.getTime();
  if (a instanceof Uint8Array || b instanceof Uint8Array) return a instanceof Uint8Array && b instanceof Uint8Array
    && a.length === b.length && a.every((value, index) => value === b[index]);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (!Array.isArray(a) && (Object.getPrototypeOf(a) !== Object.prototype && Object.getPrototypeOf(a) !== null
    || Object.getPrototypeOf(b) !== Object.prototype && Object.getPrototypeOf(b) !== null)) return false;
  if (Array.isArray(a) && a.length !== (b as unknown[]).length) return false;
  const left = Object.getOwnPropertyDescriptors(a), right = Object.getOwnPropertyDescriptors(b);
  const keys = Object.keys(left).filter(key => left[key].enumerable);
  if (keys.length !== Object.keys(right).filter(key => right[key].enumerable).length) return false;
  return keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && right[key].enumerable
    && 'value' in left[key] && 'value' in right[key] && sameValue(left[key].value, right[key].value, budget, depth + 1));
}
