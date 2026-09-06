export type ObjectLocationSegment =
  | { readonly kind: 'property'; readonly name: string }
  | { readonly kind: 'index'; readonly index: number };

export type JsonFieldNamingProfile = 'camelCase' | 'snake_case' | 'PascalCase';

function lowerCamel(name: string): string {
  const parts = name.split('_');
  return parts[0] + parts.slice(1).map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join('');
}

export function renderJsonFieldName(name: string, profile: JsonFieldNamingProfile): string {
  if (profile === 'snake_case') return name;
  const camel = lowerCamel(name);
  if (profile === 'camelCase' || !camel) return camel;
  return camel[0].toUpperCase() + camel.slice(1);
}

function escapeJsonPointer(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** A casing-neutral location expressed with canonical KSML property names. */
export class ObjectLocation {
  private constructor(public readonly segments: readonly ObjectLocationSegment[]) {}

  static root(): ObjectLocation { return new ObjectLocation([]); }
  static property(name: string): ObjectLocation { return ObjectLocation.root().property(name); }

  property(name: string): ObjectLocation {
    return new ObjectLocation([...this.segments, { kind: 'property', name }]);
  }

  index(index: number): ObjectLocation {
    return new ObjectLocation([...this.segments, { kind: 'index', index }]);
  }

  prefixedBy(prefix: ObjectLocation): ObjectLocation {
    return new ObjectLocation([...prefix.segments, ...this.segments]);
  }

  modelPath(): string {
    return this.render(name => name);
  }

  nativePath(): string {
    return this.render(lowerCamel);
  }

  instancePath(profile: JsonFieldNamingProfile = 'camelCase'): string {
    return this.segments.map(segment => segment.kind === 'index'
      ? String(segment.index)
      : escapeJsonPointer(renderJsonFieldName(segment.name, profile))).map(value => `/${value}`).join('');
  }

  toString(): string { return this.nativePath(); }

  private render(propertyName: (name: string) => string): string {
    let result = '';
    for (const segment of this.segments) {
      if (segment.kind === 'index') result += `[${segment.index}]`;
      else result += `${result ? '.' : ''}${propertyName(segment.name)}`;
    }
    return result;
  }
}
