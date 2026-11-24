import { TransactionOutcomeUnknownError } from '../core/context-transaction';
import { GraphCommittedError } from '../core/request-intent';

/** Internal completion signals issued by the native owner, never the callback. */
export class SqlTransactionOutcomeUnknown extends TransactionOutcomeUnknownError {}
export class SqlCommittedCleanupError extends GraphCommittedError {}
/** Some drivers acknowledge ROLLBACK in response to COMMIT on an aborted session. */
export class SqlCommitRejectedError extends Error {}

export async function finishSqlTransaction<T>(
  work: () => Promise<T>,
  commit: () => unknown,
  rollback: () => unknown,
  invalidate: () => unknown,
): Promise<T> {
  const discard = async () => {
    try { await invalidate(); } catch { /* never return this connection to normal use */ }
  };
  let result: T;
  try { result = await work(); }
  catch (error) {
    try { await rollback(); }
    catch { await discard(); throw new SqlTransactionOutcomeUnknown(); }
    throw error;
  }
  try { await commit(); }
  catch (error) {
    if (error instanceof SqlCommitRejectedError) throw error;
    try { await rollback(); }
    catch { await discard(); }
    throw new SqlTransactionOutcomeUnknown();
  }
  return result;
}
