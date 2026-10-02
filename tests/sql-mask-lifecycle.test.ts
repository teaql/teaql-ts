import { UserContext } from '../src/core/context';
import { SelectQuery } from '../src/core/ast';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK, projectSQLLog } from '../src/core/log-privacy';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionMetadata, SQLExecutionEvidenceStore,
  TextDiagnosticSQLLogSink, SqlQueryResult } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { GraphMutationSession, MutationIntent } from '../src/core/request-intent';

const schema: Record<string, EntitySchema> = { Customer: {
  table: 'customer_data', auditMaskFields: ['display_name'], columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
    displayName: { columnName: 'display_name', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
    publicAddress: { columnName: 'public_address', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
    passwordHash: { columnName: 'password_hash', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
  },
} };

class Driver extends SQLiteDriver {
  fault?: Error;
  readbackFault?: Error;
  readbackRows?: number;
  failStreamAfter?: number;
  closedCursor = false;
  values: unknown[] = [];
  async query(sql: string, values: any[] = []): Promise<SqlQueryResult> {
    if (sql.startsWith('SELECT') && sql.includes('customer_data') && sql.includes('WHERE "id" = ?')) {
      if (this.readbackFault) throw this.readbackFault;
      if (this.readbackRows !== undefined) {
        const result = await super.query(sql, values);
        return { rowCount: this.readbackRows, rows: Array.from({ length: this.readbackRows }, () => result.rows[0]) };
      }
    }
    if (this.fault && sql.includes('customer_data')) {
      this.values = [...values];
      throw this.fault;
    }
    return super.query(sql, values);
  }
  async *stream(sql: string, values: any[] = []): AsyncIterable<any> {
    this.values = [...values];
    let seen = 0;
    try {
      for await (const row of super.stream(sql, values)) {
        if (this.failStreamAfter === seen++) throw this.fault;
        yield row;
      }
    } finally { this.closedCursor = true; }
  }
}
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: Driver) { super(driver, schema); }
}
const previous = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = previous;
});

async function fixture() {
  const driver = new Driver(':memory:');
  const client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  await new UserContext().insertResource('dataService', client).ensureSchema();
  for (let id = 1; id <= 3; id++) await client.executeMutation({
    entity: 'Customer', action: 'Create', id: String(id),
    payload: { displayName: 'Riverside', publicAddress: '1 Runtime Road', passwordHash: 'PASSWORD-CANARY' },
    comment: 'seed lifecycle fixture',
  });
  const logs: SQLExecutionMetadata[] = [], output: string[] = [];
  const evidence = new SQLExecutionEvidenceStore();
  client.setRuntimeTelemetrySink(evidence).setDiagnosticSQLLogSink({ write(entry) {
    logs.push(entry); new TextDiagnosticSQLLogSink(line => output.push(line)).write(entry);
  } });
  return { driver, client, logs, output, evidence };
}
function query() {
  return new SelectQuery('Customer').filter({ displayName: { $eq: 'Riverside' },
    publicAddress: { $eq: '1 Runtime Road' }, passwordHash: { $eq: 'PASSWORD-CANARY' } })
    .limit(10).comment('what: stream matching customers').purpose('why: verify lifecycle masking');
}
function verify(f: Awaited<ReturnType<typeof fixture>>, outcome: string, count?: number) {
  expect(f.logs).toHaveLength(1);
  const entry = f.logs[0];
  expect(entry.executionOutcome).toBe(outcome);
  expect(entry.resultCount).toBe(count);
  expect(entry.tracePath.length).toBeGreaterThan(0);
  const all = JSON.stringify([f.logs, f.output, f.evidence.snapshot()]);
  expect(all).not.toContain('Riverside');
  expect(all).not.toContain('PASSWORD-CANARY');
  expect(all).not.toContain('DRIVER-CANARY');
  expect(entry.debugSQL).toContain('Ri*****de');
  expect(entry.debugSQL).toContain('1 Runtime Road');
  expect(f.output.join('\n')).toContain(`outcome=${outcome}`);
}

it.each(['complete', 'cancel', 'consumer-error', 'provider-error'])(
  'logs masked SQL once when the stream ends: %s', async mode => {
    const f = await fixture();
    const fault = new Error('Riverside DRIVER-CANARY PASSWORD-CANARY');
    if (mode === 'provider-error') { f.driver.fault = fault; f.driver.failStreamAfter = 1; }
    try {
      const consume = async () => {
        for await (const rows of f.client.executeForStream(query(), 1)) {
          expect(rows[0].displayName).toBe('Riverside');
          if (mode === 'cancel') break;
          if (mode === 'consumer-error') throw fault;
        }
      };
      if (mode.endsWith('error')) await expect(consume()).rejects.toBe(fault);
      else await consume();
      verify(f, mode === 'complete' ? 'success' : mode === 'provider-error' ? 'failure' : 'cancelled', mode === 'complete' ? 3 : 1);
      expect(f.driver.closedCursor).toBe(true);
      expect(f.driver.values).toContain('Riverside');
      expect(f.driver.values).toContain('PASSWORD-CANARY');
    } finally { await f.client.close(); }
  });

it('records an empty stream and honors the query logging switch', async () => {
  const f = await fixture();
  try {
    const empty = query().filter({ id: { $eq: '999' } });
    for await (const rows of f.client.executeForStream(empty, 2)) expect(rows).toHaveLength(0);
    expect(f.logs).toHaveLength(1);
    expect(f.logs[0].resultCount).toBe(0);
    f.logs.length = 0; f.evidence.enableAll(); f.client.setQueryLoggingEnabled(false);
    for await (const _rows of f.client.executeForStream(query(), 2)) { /* consume */ }
    expect(f.logs).toHaveLength(0);
    expect(f.evidence.snapshot()).toHaveLength(0);
  } finally { await f.client.close(); }
});

it('records failed list SQL without logging or changing the original driver error', async () => {
  const f = await fixture();
  const fault = new Error('Riverside DRIVER-CANARY PASSWORD-CANARY');
  f.driver.fault = fault;
  try {
    await expect(f.client.executeQuery(query())).rejects.toBe(fault);
    verify(f, 'failure');
    expect(f.logs[0].affectedRows).toBeUndefined();
  } finally { await f.client.close(); }
});

it.each(['Create', 'Update', 'Delete'])('records failed %s with audit reason, not exception payload', async action => {
  const f = await fixture();
  const fault = new Error('Riverside DRIVER-CANARY PASSWORD-CANARY');
  f.driver.fault = fault;
  try {
    const targetID = action === 'Create' ? '4' : '1';
    await expect(f.client.executeMutation({ entity: 'Customer', action, id: targetID,
      version: 1, payload: { displayName: 'Riverside', publicAddress: '1 Runtime Road', passwordHash: 'PASSWORD-CANARY' },
      comment: `verify failed mutation ${targetID}` })).rejects.toBe(fault);
    expect(f.logs).toHaveLength(1);
    expect(f.logs[0].executionOutcome).toBe('failure');
    expect(f.logs[0].auditReason).toBe('verify failed mutation [REDACTED]');
    expect(f.logs[0].affectedRows).toBeUndefined();
    const all = JSON.stringify([f.logs, f.output, f.evidence.snapshot()]);
    expect(all).not.toMatch(/Riverside|PASSWORD-CANARY|DRIVER-CANARY/);
    expect(f.logs[0].debugSQL).not.toContain('?');
  } finally { await f.client.close(); }
});

it('does not redact a structural row count when the target ID is short', async () => {
  const f = await fixture();
  try {
    await f.client.executeMutation({entity:'Customer',action:'Update',id:'1',version:1,
      payload:{publicAddress:'Changed Road'},comment:'update target 1'});
    expect(f.logs).toHaveLength(1);
    expect(f.logs[0].auditReason).toBe('update target [REDACTED]');
    expect(f.logs[0].resultSummary).toBe('1 rows affected');
    expect(f.logs[0].parameters).toContain('1');
  } finally { await f.client.close(); }
});

it.each(['Create', 'Update', 'Delete'])(
  'scrubs the target id from successful %s audit reason but keeps the typed id', async action => {
    const f = await fixture();
    try {
      if (action !== 'Create') {
        await f.client.executeMutation({
          entity: 'Customer', action: 'Create', id: '1001',
          payload: { displayName: 'Seed', publicAddress: 'Seed Road' },
          comment: 'seed audit target',
        });
      }
      const mutation = {
        entity: 'Customer', action, id: '1001', version: 1,
        payload: action === 'Delete' ? {} : { displayName: 'Changed' },
        comment: `${action.toLowerCase()} target 1001`,
      };
      await f.client.executeMutation(mutation);
      const auditTrace = f.client.auditTrace;
      const audit = auditTrace[auditTrace.length - 1];
      expect(audit?.id).toBe('1001');
      expect(audit?.reason).toBe(`${action.toLowerCase()} target [REDACTED]`);
      const sqlEntry = f.logs[f.logs.length - 1];
      expect(sqlEntry.auditReason).toBe(`${action.toLowerCase()} target [REDACTED]`);
      expect(JSON.stringify(sqlEntry.tracePath)).not.toContain('1001');
      expect(sqlEntry).not.toHaveProperty('targetID');
      expect(sqlEntry.parameters).toContain('1001');
      expect(sqlEntry.mutationLineage?.[0].entityId).toBe('1001');
      expect(sqlEntry.mutationLineage?.[0].detail).toBe(`${action.toLowerCase()} target [REDACTED]`);
      expect(Object.isFrozen(sqlEntry.mutationLineage?.[0])).toBe(true);
      expect(mutation.id).toBe('1001');
      expect(mutation.comment).toContain('1001');
    } finally { await f.client.close(); }
  });

it('does not report prefetched but undelivered rows on a stream failure', async () => {
  const f = await fixture();
  const fault = new Error('DRIVER-CANARY');
  f.driver.fault = fault; f.driver.failStreamAfter = 1;
  try {
    const consume = async () => { for await (const _rows of f.client.executeForStream(query(), 3)) { /* consume */ } };
    await expect(consume()).rejects.toBe(fault);
    verify(f, 'failure', 0);
    expect(f.driver.closedCursor).toBe(true);
  } finally { await f.client.close(); }
});

it('keeps credentials private and labels each debug stream/failure record', async () => {
  const f = await fixture();
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  try {
    for await (const _rows of f.client.executeForStream(query(), 1)) break;
    f.driver.fault = new Error('DRIVER-CANARY');
    await expect(f.client.executeQuery(query())).rejects.toBe(f.driver.fault);
    expect(f.logs).toHaveLength(2);
    for (const entry of f.logs) {
      expect(entry.debugSQL).toContain('Riverside');
      expect(entry.debugSQL).toContain('EXPLICIT OPT-IN');
      expect(entry.debugSQL).toContain('NOT REPLAYABLE');
      expect(JSON.stringify(entry)).not.toMatch(/PASSWORD-CANARY|DRIVER-CANARY/);
    }
  } finally { await f.client.close(); }
});

it('does not replace a driver error with a diagnostic-sink error', async () => {
  const f = await fixture();
  const fault = new Error('DRIVER-CANARY');
  f.driver.fault = fault;
  f.client.setDiagnosticSQLLogSink({ write() { throw new Error('SINK-FAILURE'); } });
  try {
    await expect(f.client.executeQuery(query())).rejects.toBe(fault);
    f.driver.failStreamAfter = 0;
    const consume = async () => { for await (const _rows of f.client.executeForStream(query(), 1)) { /* consume */ } };
    await expect(consume()).rejects.toBe(fault);
    expect(f.driver.closedCursor).toBe(true);
  } finally { await f.client.close(); }
});

it('keeps successful SQL and graph mutation independent of broken diagnostic sinks', async () => {
  const f = await fixture();
  let evidenceCalls = 0;
  let diagnosticCalls = 0;
  f.client.setRuntimeTelemetrySink({ record(entry) {
    evidenceCalls++;
    expect(JSON.stringify(entry)).not.toContain('PASSWORD-CANARY');
    throw new Error('EVIDENCE-SINK-FAILURE');
  } }).setDiagnosticSQLLogSink({ write(entry) {
    diagnosticCalls++;
    expect(JSON.stringify(entry)).not.toContain('PASSWORD-CANARY');
    throw new Error('DIAGNOSTIC-SINK-FAILURE');
  } });
  try {
    await expect(f.client.executeMutation({
      entity: 'Customer', action: 'Create', id: '4',
      payload: { displayName: 'Riverside', publicAddress: '1 Runtime Road',
        passwordHash: 'PASSWORD-CANARY' },
      comment: 'what: create customer despite logging failure',
    })).resolves.toMatchObject({ success: true, id: '4' });
    const rows = await f.client.executeQuery(query());
    expect(rows).toHaveLength(4);
    const driverFault = new Error('DRIVER-CANARY');
    f.driver.fault = driverFault;
    await expect(f.client.executeQuery(query())).rejects.toBe(driverFault);
    expect(evidenceCalls).toBeGreaterThan(0);
    expect(diagnosticCalls).toBeGreaterThan(0);
  } finally { await f.client.close(); }
});

it.each(['Create', 'Update', 'Delete'].flatMap(action => ['error','empty','multiple'].map(mode => ({action,mode}))))(
  'retains independent write/readback facts for $action/$mode', async ({action,mode}) => {
    const f = await fixture();
    const fault = new Error('DRIVER-CANARY Riverside PASSWORD-CANARY');
    if (mode === 'error') f.driver.readbackFault = fault;
    else f.driver.readbackRows = mode === 'empty' ? 0 : 2;
    try {
      const mutation = { entity:'Customer', action, id:action === 'Create' ? '4':'1', version:1,
        payload:{displayName:'Riverside',passwordHash:'PASSWORD-CANARY'},
        comment: action === 'Delete' ? 'what: delete customer' : 'what: write Riverside PASSWORD-CANARY' };
      const pending = f.client.executeMutation(mutation);
      if (mode === 'error') await expect(pending).rejects.toBe(fault);
      else await expect(pending).rejects.toThrow('could not be read back');
      expect(f.logs).toHaveLength(2);
      expect(f.logs[0].executionOutcome).toBe('success');
      expect(f.logs[0].affectedRows).toBe(1);
      expect(f.logs[1].operation).toBe('select');
      expect(f.logs[1].executionOutcome).toBe(mode === 'error' ? 'failure':'success');
      expect(f.logs[1].resultCount).toBe(mode === 'error' ? undefined : mode === 'empty' ? 0:2);
      expect(f.logs[1].affectedRows).toBeUndefined();
      expect(f.logs[1].auditReason).toContain('what:');
      expect(f.logs[1].debugSQL).toContain('SELECT');
      expect(f.logs[1].debugSQL).not.toContain('?');
      expect(JSON.stringify([f.logs,f.output,f.evidence.snapshot()])).not.toMatch(/Riverside|PASSWORD-CANARY|DRIVER-CANARY/);
      f.driver.readbackFault = undefined; f.driver.readbackRows = undefined;
      const rows = await f.driver.query('SELECT * FROM customer_data');
      expect(rows.rowCount).toBe(3);
      expect(rows.rows[0].version).toBe(1);
      expect(rows.rows[0].display_name).toBe('Riverside');
    } finally { await f.client.close(); }
  });

it('preserves original error when the readback diagnostic sink fails', async () => {
  const f = await fixture();
  const fault = new Error('READBACK-FAILURE');
  f.driver.readbackFault = fault;
  let observed = 0;
  f.client.setDiagnosticSQLLogSink({write(entry) { observed++; if(entry.operation === 'select') throw new Error('SINK-FAILURE'); }});
  try {
    await expect(f.client.executeMutation({entity:'Customer',action:'Update',id:'1',version:1,payload:{displayName:'Riverside'},comment:'verify failed readback'})).rejects.toBe(fault);
    expect(observed).toBe(2);
    expect((await f.driver.query('SELECT version FROM customer_data')).rows[0].version).toBe(1);
  } finally { await f.client.close(); }
});

it.each(['debug','disabled','success'])('handles readback mode %s without changing business values', async mode => {
  const f = await fixture();
  if (mode === 'debug') process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  if (mode === 'disabled') f.client.setQueryLoggingEnabled(false).setMutationLoggingEnabled(false);
  if (mode !== 'success') f.driver.readbackFault = new Error('READBACK-FAILURE');
  try {
    const pending = f.client.executeMutation({entity:'Customer',action:'Update',id:'1',version:1,
      payload:{displayName:'Riverside',passwordHash:'PASSWORD-CANARY'},comment:'what: update Riverside PASSWORD-CANARY'});
    if (mode === 'success') {
      const result = await pending;
      expect(result.persistedRecord?.displayName).toBe('Riverside');
      expect(result.persistedRecord?.passwordHash).toBe('PASSWORD-CANARY');
      expect(f.logs).toHaveLength(1);
    } else await expect(pending).rejects.toBe(f.driver.readbackFault);
    if (mode === 'disabled') { expect(f.logs).toHaveLength(0); expect(f.evidence.snapshot()).toHaveLength(0); }
    if (mode === 'debug') {
      expect(f.logs).toHaveLength(2);
      for (const entry of f.logs) {
        expect(entry.auditReason).toContain('Riverside');
        expect(entry.debugSQL).toContain('EXPLICIT OPT-IN');
        expect(JSON.stringify(entry)).not.toContain('PASSWORD-CANARY');
      }
      delete process.env[PLAINTEXT_LOG_ENV];
      for (const entry of f.logs) {
        const safe = projectSQLLog(entry);
        expect(safe.auditReason).toContain('what: update');
        expect(JSON.stringify(safe)).not.toMatch(/Riverside|PASSWORD-CANARY/);
        // Copying a record loses the private safe alternative. Unknown inherited
        // intent must then fail closed rather than survive in plaintext.
        expect(JSON.stringify(projectSQLLog({...entry}))).not.toMatch(/Riverside|PASSWORD-CANARY/);
      }
    }
  } finally { await f.client.close(); }
});

it.each(['write','readback'])('retains partial graph SQL facts and rolls back after %s failure', async phase => {
  const f = await fixture();
  const fault = new Error('GRAPH-FAILURE');
  const create = (id:string, graph?: GraphMutationSession) => {
    const mutation = {entity:'Customer',action:'Create',id,
      payload:{displayName:'Riverside',passwordHash:'PASSWORD-CANARY'},comment:'what: insert Riverside PASSWORD-CANARY'};
    return f.client.executeMutation(graph ? graph.request(mutation) : mutation);
  };
  try {
    await expect(f.client.executeGraphSave(new MutationIntent('what: insert Riverside PASSWORD-CANARY'), async graph => {
      await create('4', graph);
      if(phase === 'write') f.driver.fault = fault;
      else f.driver.readbackFault = fault;
      await create('5', graph);
      await create('6', graph);
    })).rejects.toBe(fault);
    expect(f.logs.map(entry => entry.executionOutcome)).toEqual(phase === 'write' ? ['success','failure'] : ['success','success','failure']);
    expect(JSON.stringify([f.logs,f.output,f.evidence.snapshot()])).not.toMatch(/Riverside|PASSWORD-CANARY|GRAPH-FAILURE/);
    f.driver.fault = undefined; f.driver.readbackFault = undefined;
    expect((await f.driver.query('SELECT * FROM customer_data')).rowCount).toBe(3);
    f.logs.length = 0;
    await create('7');
    expect(f.logs).toHaveLength(1);
    expect((await f.driver.query('SELECT * FROM customer_data')).rowCount).toBe(4);
  } finally { await f.client.close(); }
});

it.each(['AbortError','TimeoutError'])('records readback cancellation reported by the driver: %s', async name => {
  const f = await fixture();
  const fault = new Error('CANCEL-CANARY'); fault.name = name;
  f.driver.readbackFault = fault;
  try {
    await expect(f.client.executeMutation({entity:'Customer',action:'Update',id:'1',version:1,
      payload:{displayName:'Riverside'},comment:'what: update Riverside'})).rejects.toBe(fault);
    expect(f.logs.map(entry=>entry.executionOutcome)).toEqual(['success','cancelled']);
    expect(f.logs[1].resultCount).toBeUndefined();
    expect(JSON.stringify(f.logs)).not.toMatch(/Riverside|CANCEL-CANARY/);
    expect((await f.driver.query('SELECT version FROM customer_data')).rows[0].version).toBe(1);
  } finally { await f.client.close(); }
});
