import { UserContext } from '../src/core/context';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionEvidenceStore, SQLExecutionMetadata } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { PLAINTEXT_LOG_ACK, PLAINTEXT_LOG_ENV, projectSQLLog } from '../src/core/log-privacy';

const schemas: Record<string, EntitySchema> = { Customer: {
  table: 'readback_customer', auditMaskFields: ['name'], columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
    name: { columnName: 'name', logicalType: 'text', decode: 'string', logPolicy: 'plain' },
    passwordHash: { columnName: 'password_hash', logicalType: 'text', decode: 'string', logPolicy: 'plain' },
  },
} };
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: SQLiteDriver) { super(driver, schemas); }
}

it.each(['Create', 'Update', 'Delete'].flatMap(action => [0, 1, 2, 3].map(mode => ({ action, mode }))))(
  'retains actual successful write/SELECT facts for $action with logging mode $mode', async ({ action, mode }) => {
    const driver = new SQLiteDriver(':memory:');
    const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
    try {
      await new UserContext().insertResource('dataService', client).ensureSchema();
      if (action !== 'Create') await client.executeMutation({ entity: 'Customer', action: 'Create',
        id: '17', payload: { name: 'PRIVATE-CUSTOMER' }, comment: 'seed readback fixture' });
      const evidence = new SQLExecutionEvidenceStore(), logs: SQLExecutionMetadata[] = [];
      client.setRuntimeTelemetrySink(evidence).setDiagnosticSQLLogSink({ write(entry) { logs.push(entry); } })
        .setMutationLoggingEnabled(Boolean(mode & 1)).setQueryLoggingEnabled(Boolean(mode & 2));
      const comment = action === 'Delete' ? 'delete fixture' : 'persist PRIVATE-CUSTOMER';
      const result = await client.executeMutation({ entity: 'Customer', action, id: '17', version: 1,
        payload: action === 'Delete' ? {} : { name: 'PRIVATE-CUSTOMER' }, comment });
      const operation = action === 'Create' ? 'insert' : action.toLowerCase();
      expect(result.persistedRecord?.name).toBe('PRIVATE-CUSTOMER');
      expect(result).toMatchObject({ metadata: { operation, affectedRows: 1, statements: [
        { operation, affectedRows: 1, executionOutcome: 'success' },
        { operation: 'select', resultCount: 1, comment, executionOutcome: 'success', parameters: ['17'] },
      ] } });
      expect(Object.isFrozen(result.metadata?.statements)).toBe(true);
      if (action !== 'Delete') expect(result.metadata?.statements?.[0].parameters).toContain('PRIVATE-CUSTOMER');
      const entries = evidence.snapshot();
      expect(entries.map(entry => entry.operation)).toEqual([operation, 'select']);
      expect(entries[1]?.tracePath.map(node => node.kind)).toEqual(['operation', 'request', 'provider', 'sql']);
      expect(entries[1]?.tracePath[0].name).toBe('Customer');
      expect(entries[1]?.mutationLineage).toEqual(entries[0]?.mutationLineage);
      expect(logs.map(entry => entry.operation)).toEqual([
        ...(mode & 1 ? [operation] : []), ...(mode & 2 ? ['select'] : []),
      ]);
      expect(JSON.stringify([logs, entries])).not.toContain('PRIVATE-CUSTOMER');
      expect(client.auditTrace.filter(event => event.reason !== 'seed readback fixture')).toHaveLength(1);
    } finally { await client.close(); }
  });

it('retains result facts without sinks and safely reprojects nested readbacks after debug revocation', async () => {
  const previous = process.env[PLAINTEXT_LOG_ENV];
  const driver = new SQLiteDriver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  try {
    delete process.env[PLAINTEXT_LOG_ENV];
    await new UserContext().insertResource('dataService', client).ensureSchema();
    const result = await client.executeMutation({ entity: 'Customer', action: 'Create', id: '23',
      payload: { name: 'PRIVATE-CUSTOMER', passwordHash: 'PASSWORD-CANARY' },
      comment: 'persist PRIVATE-CUSTOMER PASSWORD-CANARY' });
    expect(result.metadata?.statements?.map(entry => entry.operation)).toEqual(['insert', 'select']);
    const safe = projectSQLLog(result.metadata!);
    expect(JSON.stringify(safe)).not.toContain('PRIVATE-CUSTOMER');
    expect(safe.statements?.[1].comment).toBe('persist [REDACTED] [REDACTED]');
    expect(JSON.stringify(safe)).not.toContain('PASSWORD-CANARY');
    process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
    const debug = projectSQLLog(result.metadata!);
    expect(debug.statements?.[1].comment).toBe('persist PRIVATE-CUSTOMER [REDACTED]');
    expect(JSON.stringify(debug)).not.toContain('PASSWORD-CANARY');
    delete process.env[PLAINTEXT_LOG_ENV];
    expect(JSON.stringify(projectSQLLog(debug))).not.toContain('PRIVATE-CUSTOMER');
    expect(result.persistedRecord?.name).toBe('PRIVATE-CUSTOMER');
    expect(result.metadata?.comment).toBeUndefined();
    expect(result.metadata?.auditReason).toBe('persist PRIVATE-CUSTOMER PASSWORD-CANARY');
  } finally {
    if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
    else process.env[PLAINTEXT_LOG_ENV] = previous;
    await client.close();
  }
});

it.each(['Update', 'Delete'])('does not invent a readback or committed audit for unmatched %s', async action => {
  const driver = new SQLiteDriver(':memory:');
  const evidence = new SQLExecutionEvidenceStore();
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined).setRuntimeTelemetrySink(evidence);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    await expect(client.executeMutation({ entity: 'Customer', action, id: '99', version: 1,
      payload: action === 'Delete' ? {} : { name: 'missing' }, comment: 'update absent fixture' }))
      .rejects.toThrow('Optimistic lock failed');
    expect(evidence.snapshot()).toHaveLength(1);
    expect(evidence.snapshot()[0]).toMatchObject({ operation: action.toLowerCase(), executionOutcome: 'success', affectedRows: 0 });
    expect(client.auditTrace).toHaveLength(0);
  } finally { await client.close(); }
});
