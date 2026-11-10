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
export declare function internalId(value: unknown): string;
//# sourceMappingURL=internal-id.d.ts.map