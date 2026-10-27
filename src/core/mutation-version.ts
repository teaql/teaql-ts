import {CheckException} from './checker';
import {Long, long} from './long';
import {ObjectLocation} from './object-location';

/** Ordinary versions remain numbers; wide versions use the existing exact JSON-safe Long. */
export type EntityVersion = number | Long;
export type EntityVersionInput = number | string | bigint;
export type VersionOperation = 'Create' | 'Update' | 'Delete' | 'Recover';
const MIN = -(1n << 63n), MAX = (1n << 63n) - 1n, SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** Stable, value-free diagnostics. A rounded number can never recover lost bits. */
export class MutationVersionError extends CheckException {
  constructor(readonly code: 'invalid_type' | 'version_exhausted', operation = 'mutation') {
    super([{ruleId: code, location: ObjectLocation.property('version'),
      message: code === 'version_exhausted'
        ? `${operation} version is exhausted in the signed 64-bit domain`
        : `${operation} requires an exact version in its permitted lifecycle state`}]);
    this.name = 'MutationVersionError';
  }
}

/** Normalize only exact inputs. Canonical decimal text is also the wide JSON representation. */
export function entityVersion(value: unknown): EntityVersion {
  let exact: bigint;
  if (typeof value === 'bigint') exact = value;
  else if (typeof value === 'number' && Number.isSafeInteger(value)) exact = BigInt(value);
  else if (typeof value === 'string' && /^(?:0|-?[1-9][0-9]*)$/.test(value)) exact = BigInt(value);
  else throw new MutationVersionError('invalid_type');
  if (exact < MIN || exact > MAX) throw new MutationVersionError('invalid_type');
  return exact >= -SAFE && exact <= SAFE ? Number(exact) : long(exact);
}

/** The same checked transitions as Java/Rust. Creation starts at one, never old+one. */
export function nextEntityVersion(operation: VersionOperation, original?: unknown): EntityVersion {
  if (operation === 'Create') return 1;
  const version = BigInt(entityVersion(original));
  let next: bigint;
  switch (operation) {
    case 'Update':
      if (version <= 0n) throw new MutationVersionError('invalid_type', operation);
      next = version + 1n; break;
    case 'Delete':
      if (version <= 0n) throw new MutationVersionError('invalid_type', operation);
      next = -version - 1n; break;
    case 'Recover':
      if (version >= 0n) throw new MutationVersionError('invalid_type', operation);
      next = -version + 1n; break;
    default: throw new MutationVersionError('invalid_type');
  }
  if (next < MIN || next > MAX) throw new MutationVersionError('version_exhausted', operation);
  return entityVersion(next);
}
