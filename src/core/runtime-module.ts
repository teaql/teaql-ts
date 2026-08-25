import type { EntitySchema } from '../sql/core';
import type { EntityChecker } from './checker';

export type BootstrapEntity = Readonly<{
  entity: string;
  id: string;
  values?: Readonly<Record<string, unknown>>;
}>;

export type RuntimeBootstrap = Readonly<{
  defaultDomainRoot?: BootstrapEntity;
  constants?: readonly BootstrapEntity[];
}>;

export function mergeRuntimeBootstrap(
  left: RuntimeBootstrap,
  right: RuntimeBootstrap,
): RuntimeBootstrap {
  const leftRoot = left.defaultDomainRoot;
  const rightRoot = right.defaultDomainRoot;
  if (leftRoot && rightRoot &&
      (leftRoot.entity !== rightRoot.entity || leftRoot.id !== rightRoot.id)) {
    throw new Error('Cannot compose Runtime Modules with different Default Domain Roots');
  }
  const constants = new Map<string, BootstrapEntity>();
  for (const value of [...(left.constants ?? []), ...(right.constants ?? [])]) {
    constants.set(`${value.entity}:${value.id}`, value);
  }
  return {
    defaultDomainRoot: rightRoot ?? leftRoot,
    constants: [...constants.values()],
  };
}

export interface RuntimeModuleTarget {
  install(module: RuntimeModule): RuntimeModuleTarget;
}

/** Passive, immutable metadata manifest. It never creates or alters database tables. */
export class RuntimeModule {
  readonly schemas: Readonly<Record<string, EntitySchema>>;
  readonly checkers: Readonly<Record<string, EntityChecker>>;
  readonly bootstrap: RuntimeBootstrap;

  constructor(
    schemas: Record<string, EntitySchema> = {},
    checkers: Record<string, EntityChecker> = {},
    bootstrap: RuntimeBootstrap = {},
  ) {
    this.schemas = Object.freeze({ ...schemas });
    this.checkers = Object.freeze({ ...checkers });
    this.bootstrap = Object.freeze({
      defaultDomainRoot: bootstrap.defaultDomainRoot,
      constants: Object.freeze([...(bootstrap.constants ?? [])]),
    });
  }

  and(other: RuntimeModule): RuntimeModule {
    return new RuntimeModule(
      { ...this.schemas, ...other.schemas },
      { ...this.checkers, ...other.checkers },
      mergeRuntimeBootstrap(this.bootstrap, other.bootstrap),
    );
  }
}
