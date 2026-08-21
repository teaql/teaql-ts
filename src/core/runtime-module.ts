import type { EntitySchema } from '../sql/core';
import type { EntityChecker } from './checker';

export interface RuntimeModuleTarget {
  install(module: RuntimeModule): RuntimeModuleTarget;
}

/** Passive, immutable metadata manifest. It never creates or alters database tables. */
export class RuntimeModule {
  readonly schemas: Readonly<Record<string, EntitySchema>>;
  readonly checkers: Readonly<Record<string, EntityChecker>>;

  constructor(schemas: Record<string, EntitySchema> = {}, checkers: Record<string, EntityChecker> = {}) {
    this.schemas = Object.freeze({ ...schemas });
    this.checkers = Object.freeze({ ...checkers });
  }

  and(other: RuntimeModule): RuntimeModule {
    return new RuntimeModule({ ...this.schemas, ...other.schemas }, { ...this.checkers, ...other.checkers });
  }
}
