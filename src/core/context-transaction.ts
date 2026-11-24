import type { UserContext } from './context';

export const transactionServiceCapability = Symbol('teaql transaction service');
export const transactionContextCapability = Symbol('teaql transaction context');

export interface ContextTransactionService {
  [transactionServiceCapability]<T>(context: UserContext, work: (context: UserContext) => T | Promise<T>): Promise<T>;
  requireTransactionAccess(): void;
  recordSaveFailure(error: unknown): void;
}

/** The database could have committed. Reload authoritative state before acting. */
export class TransactionOutcomeUnknownError extends Error {
  constructor() {
    super('TRANSACTION_OUTCOME_UNKNOWN: reload authoritative state before attempting the operation again');
    this.name = 'TransactionOutcomeUnknownError';
  }
}

const uncertainEntities = new WeakSet<object>();
export function fenceTransactionEntity(entity: object): void { uncertainEntities.add(entity); }
export function requireKnownTransactionOutcome(entity: object): void {
  if (uncertainEntities.has(entity)) throw new TransactionOutcomeUnknownError();
}
