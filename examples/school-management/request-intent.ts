import { Q } from './src/generated/Q';
import { UserContext } from './src/teaql-ts';
import { SQLiteTeaQLClient } from './src/teaql-node-sqlite';
import { RequestIntentError } from 'teaql-ts';

/** Application-owned probes; never patch the retained generated library. */
export async function verifyRequestIntent(context: UserContext, client: SQLiteTeaQLClient): Promise<void> {
  client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  const before = client.sqlTrace.length;
  const reject = async (execute: () => Promise<unknown>, kind: 'query' | 'mutation', field: 'comment' | 'purpose') => {
    try { await execute(); }
    catch (error) {
      if (!(error instanceof RequestIntentError) || error.requestKind !== kind || error.field !== field) throw error;
      if (error.code !== (field === 'comment' ? 'REQUEST_COMMENT_REQUIRED' : 'QUERY_PURPOSE_REQUIRED')) throw error;
      return;
    }
    throw new Error(`Missing ${kind} ${field} was accepted`);
  };
  try {
    await reject(() => Q.schools().limit(1).comment('').purpose('verify request gate').executeForList(context), 'query', 'comment');
    await reject(() => Q.schools().limit(1).comment('verify request gate').purpose('').executeForList(context), 'query', 'purpose');
    const school = Q.schools().comment('construct rejected school').purpose('verify request gate').newEntity(context);
    await reject(() => school.auditAs('').save(context), 'mutation', 'comment');
    if (client.sqlTrace.length !== before) throw new Error('Invalid request reached SQL compilation');
    console.log('PASS TypeScript generated School request-intent gates');
  } finally {
    client.setQueryLoggingEnabled(true).setMutationLoggingEnabled(true);
  }
}
