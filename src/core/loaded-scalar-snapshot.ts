import { snapshotQuery } from './query-snapshot';

/** @internal Loaded scalar provenance. No relations, ownership, SQL or Context. */
export class LoadedScalarSnapshot {
  readonly #values: Readonly<Record<string, unknown>>;

  constructor(values: Record<string, unknown> = {}) {
    this.#values = snapshotQuery(values);
    Object.freeze(this);
  }

  /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
  values(): Readonly<Record<string, unknown>> { return snapshotQuery(this.#values); }
}
