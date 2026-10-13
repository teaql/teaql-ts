import { snapshotQuery } from './query-snapshot';

const loadedSnapshots = new WeakMap<object, LoadedScalarSnapshot>();

/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
export class LoadedScalarSnapshot {
  readonly #values: Readonly<Record<string, unknown>>;

  constructor(values: Record<string, unknown> = {}) {
    this.#values = snapshotQuery(values);
    Object.freeze(this);
  }

  /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
  values(): Readonly<Record<string, unknown>> { return snapshotQuery(this.#values); }

  /** @internal Generated hydration stores provenance outside entity/JSON state. */
  static captureFor(entity: object, values: Record<string, unknown>): LoadedScalarSnapshot {
    const snapshot = new LoadedScalarSnapshot(values);
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
}
