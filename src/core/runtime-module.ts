import type { EntitySchema } from '../sql/core';

export interface RuntimeModuleTarget {
  install(module: RuntimeModule): RuntimeModuleTarget;
}

/** Passive, immutable metadata manifest. It never creates or alters database tables. */
export class RuntimeModule {
  readonly schemas: Readonly<Record<string, EntitySchema>>;

  constructor(schemas: Record<string, EntitySchema> = {}) {
    this.schemas = Object.freeze({ ...schemas });
  }

  and(other: RuntimeModule): RuntimeModule {
    return new RuntimeModule({ ...this.schemas, ...other.schemas });
  }
}
