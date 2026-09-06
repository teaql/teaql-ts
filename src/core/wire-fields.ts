import {
  JsonFieldNamingProfile,
  renderJsonFieldName,
} from './object-location';
import type { CheckResult } from './i18n';

export interface WireFieldMetadata {
  readonly canonicalName: string;
  readonly wireName: string;
  readonly aliases: readonly string[];
}

export interface WireEntityMetadata {
  readonly entityType: string;
  readonly profile: JsonFieldNamingProfile;
  readonly fields: Readonly<Record<string, WireFieldMetadata>>;
}

export interface NormalizedWireInput {
  /** Values keyed only by canonical KSML property names. */
  readonly values: Readonly<Record<string, unknown>>;
  /** Exact submitted RFC 6901 pointer, retained only for accepted aliases. */
  readonly sourceInstancePaths: Readonly<Record<string, string>>;
}

export class WireInputError extends Error {
  constructor(
    public readonly code: 'WIRE_UNKNOWN_FIELD' | 'WIRE_FIELD_COLLISION',
    public readonly instancePath: string,
    message: string,
  ) {
    super(message);
    this.name = 'WireInputError';
  }
}

export function createWireEntityMetadata(
  entityType: string,
  canonicalFields: readonly string[],
  profile: JsonFieldNamingProfile = 'camelCase',
  aliases: Readonly<Record<string, readonly string[]>> = {},
): WireEntityMetadata {
  const fields: Record<string, WireFieldMetadata> = {};
  const spellings = new Map<string, string>();
  for (const canonicalName of canonicalFields) {
    const wireName = renderJsonFieldName(canonicalName, profile);
    const fieldAliases = [...(aliases[canonicalName] ?? [])];
    for (const spelling of [wireName, ...fieldAliases]) {
      const existing = spellings.get(spelling);
      if (existing && existing !== canonicalName) {
        throw new Error(
          `Wire field spelling '${spelling}' maps to both '${existing}' and '${canonicalName}'`,
        );
      }
      spellings.set(spelling, canonicalName);
    }
    fields[canonicalName] = Object.freeze({
      canonicalName,
      wireName,
      aliases: Object.freeze(fieldAliases),
    });
  }
  return Object.freeze({ entityType, profile, fields: Object.freeze(fields) });
}

/**
 * Normalize one JSON object before checker or mutation execution.
 *
 * No serializer naming policy is consulted. The generated field map is the
 * complete authority, and two submitted spellings for one canonical field are
 * always rejected, even when their values happen to be equal.
 */
export function normalizeWireInput(
  input: Readonly<Record<string, unknown>>,
  metadata: WireEntityMetadata,
  parentPointer = '',
): NormalizedWireInput {
  const lookup = new Map<string, WireFieldMetadata>();
  for (const field of Object.values(metadata.fields)) {
    lookup.set(field.wireName, field);
    for (const alias of field.aliases) lookup.set(alias, field);
  }

  const values: Record<string, unknown> = {};
  const sourceInstancePaths: Record<string, string> = {};
  const submitted = new Map<string, string>();
  for (const [submittedName, value] of Object.entries(input)) {
    const pointer = `${parentPointer}/${escapeJsonPointer(submittedName)}`;
    const field = lookup.get(submittedName);
    if (!field) {
      throw new WireInputError(
        'WIRE_UNKNOWN_FIELD', pointer,
        `Unknown ${metadata.entityType} field '${submittedName}'`,
      );
    }
    const previous = submitted.get(field.canonicalName);
    if (previous !== undefined) {
      throw new WireInputError(
        'WIRE_FIELD_COLLISION', pointer,
        `Fields '${previous}' and '${submittedName}' both map to canonical field '${field.canonicalName}'`,
      );
    }
    submitted.set(field.canonicalName, submittedName);
    values[field.canonicalName] = value;
    if (submittedName !== field.wireName) {
      sourceInstancePaths[field.canonicalName] = pointer;
    }
  }
  return Object.freeze({
    values: Object.freeze(values),
    sourceInstancePaths: Object.freeze(sourceInstancePaths),
  });
}

/** Render canonical mutation values to the selected external profile. */
export function encodeWireOutput(
  values: Readonly<Record<string, unknown>>,
  metadata: WireEntityMetadata,
): Readonly<Record<string, unknown>> {
  const output: Record<string, unknown> = {};
  for (const [canonicalName, value] of Object.entries(values)) {
    const field = metadata.fields[canonicalName];
    if (!field) {
      throw new Error(`Unknown canonical ${metadata.entityType} field '${canonicalName}'`);
    }
    output[field.wireName] = value;
  }
  return Object.freeze(output);
}

/** Add submitted alias provenance to checker results without changing location identity. */
export function retainSubmittedPaths(
  results: readonly CheckResult[],
  normalized: NormalizedWireInput,
): CheckResult[] {
  return results.map(result => {
    const firstProperty = result.location.segments.find(segment => segment.kind === 'property');
    if (!firstProperty || firstProperty.kind !== 'property') return { ...result };
    const sourceInstancePath = normalized.sourceInstancePaths[firstProperty.name];
    return sourceInstancePath === undefined ? { ...result } : { ...result, sourceInstancePath };
  });
}

function escapeJsonPointer(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}
