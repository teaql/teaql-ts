import type { UserContext } from './context';

export type InternalIdInput = string | number | bigint;

/** Context-selected allocation may reserve storage, but must not save business data. */
export interface InternalIdGenerator {
  generateId(entity: string, context: UserContext): InternalIdInput | Promise<InternalIdInput>;
}

export interface InternalIdReservationService {
  reserveInternalId(entity: string, context: UserContext): Promise<string>;
}

/** Exact, positive IDs; never round a numeric provider result or accept a sentinel. */
export function internalId(value: unknown): string {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new RangeError('Internal ID must be a positive safe integer when supplied as a number');
  }
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
    throw new TypeError('Internal ID must be an exact positive integer');
  }
  const text = String(value);
  if (!/^[1-9][0-9]*$/.test(text)) throw new TypeError('Internal ID must be a canonical positive integer');
  if (BigInt(text) > (1n << 63n) - 1n) throw new RangeError('Internal ID exceeds signed 64-bit range');
  return text;
}
