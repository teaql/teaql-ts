import { CheckException } from './checker';
import { ObjectLocation } from './object-location';

/** Trusted generated model vocabulary, shared by instances, never inferred from input. */
export class MutationFieldLayout {
  readonly #fields: ReadonlySet<string>;
  readonly #immutable: Readonly<Record<string, string>>;

  constructor(readonly entity: string, fields: readonly string[], immutable: Readonly<Record<string, string>> = {}) {
    this.#fields = new Set(fields);
    this.#immutable = Object.freeze({ ...immutable });
    Object.freeze(this);
  }

  /** Admission must run before an equal value can disappear from pending intent. */
  validate(values: Readonly<Record<string, unknown>>, updating = false): void {
    const violations = Object.keys(values).flatMap(field => {
      const ruleId = !this.#fields.has(field) ? 'unknown_field'
        : updating && Object.prototype.hasOwnProperty.call(this.#immutable, field) ? this.#immutable[field] : undefined;
      return ruleId ? [{ ruleId, location: ObjectLocation.property(field),
        message: ruleId === 'unknown_field' ? 'Expected a canonical model field name' : 'Field is immutable after create' }] : [];
    });
    if (violations.length) throw new CheckException(violations);
  }
}
