import { UserContext } from '../src/core/context';
import { SelectQuery } from '../src/core/ast';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK, projectSQLLog } from '../src/core/log-privacy';
import { EntitySchema, SQLExecutionMetadata, TextDiagnosticSQLLogSink } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

const previous = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = previous;
});

function metadata(sql: string, parameters: unknown[]): SQLExecutionMetadata {
  return { operation: 'select', tracePath: [], parameterizedSQL: sql, parameters,
    debugSQL: '', elapsedMicros: 1, resultSummary: 'one row',
    comment: 'what: load a bounded customer', purpose: 'why: verify safe diagnostics' };
}

it('renders mixed field policies through the existing dialect renderer', () => {
  const raw = { ...metadata('SELECT $1, $2, $1', ["O'Reilly", true]),
    databaseKind: 'postgresql' as const, parameterLogPolicies: ['masked', 'plain'] as const };
  const safe = projectSQLLog(raw);
  expect(safe.debugSQL).toContain("'O''****ly' /* masked */, TRUE, 'O''****ly' /* masked */");
  expect(safe.maskedParameters).toEqual([true, false]);
  expect(safe.debugSQL).not.toContain("O''Reilly");
  expect(raw.parameters).toEqual(["O'Reilly", true]);
  expect(projectSQLLog(safe)).toBe(safe);
});

it.each([1, 'customer'])('preserves the compiled SQL structure through a copied projection: %s', value => {
  const sql = 'SELECT id FROM customer WHERE name = ? LIMIT 10000';
  const safe = projectSQLLog({...metadata(sql,[value]),sqlOrigin:'generated'});
  expect(safe.parameterizedSQL).toBe(sql);
  expect(projectSQLLog({...safe}).debugSQL).toContain('FROM customer');
  expect(projectSQLLog({...safe}).debugSQL).toContain('LIMIT 10000');
});

it.each([false,true])('projects inherited unknown/nested credentials without retaining their source (debug=%s)', debug => {
  if(debug) process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const source = {parameterizedSQL:'UPDATE customer SET a=?, b=?, c=?, d=?',sqlOrigin:'generated' as const,
    parameters:['Riverside','UNKNOWN-CANARY',{apiKey:'NESTED-CANARY'},12345],
    parameterLogPolicies:['masked','unknown','plain','masked'] as const};
  const raw = {...metadata('SELECT id FROM customer WHERE id=?',['1']),sqlOrigin:'generated' as const,
    parameterLogPolicies:['plain'] as const,auditReason:'what: inspect Riverside UNKNOWN-CANARY NESTED-CANARY 12345'};
  const projected = projectSQLLog(raw,source);
  expect(projected.auditReason?.includes('Riverside')).toBe(debug);
  expect(projected.auditReason?.includes('12345')).toBe(debug);
  expect(JSON.stringify(projected)).not.toMatch(/UNKNOWN-CANARY|NESTED-CANARY/);
  expect(Object.getOwnPropertySymbols(projected)).toHaveLength(0);
  expect(Object.keys(projected)).not.toContain('inherited');
  expect(source.parameters[0]).toBe('Riverside');
  if(!debug) {
    process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
    expect(JSON.stringify(projectSQLLog({...projected}))).not.toMatch(/Riverside|UNKNOWN-CANARY|NESTED-CANARY/);
    expect(projectSQLLog({...projected}).logMode).toBe('masked');
  }
});

it('preserves typed plain literals while masking derived and collection values', () => {
  const raw = { ...metadata('SELECT ?, ?, ?, ?', [
    { type: 'Date', value: '2024-02-29' }, { type: 'Timestamp', value: -123 },
    ['Riverside', '12345678'], null]), databaseKind: 'postgresql' as const,
    parameterLogPolicies: ['plain', 'plain', 'masked', 'masked'] as const };
  const safe = projectSQLLog(raw);
  expect(safe.debugSQL).toContain("DATE '2024-02-29'");
  expect(safe.debugSQL).toContain("TIMESTAMPTZ '1969-12-31T23:59:59.877Z'");
  expect(safe.debugSQL).toContain('Ri*****de');
  expect(safe.debugSQL).not.toContain('Riverside');
  expect(safe.debugSQL).toContain('NULL /* masked */');
});

it('uses trusted compiler identifiers and ignores fake placeholders in literals/comments', () => {
  const raw = { ...metadata("SELECT `field?`, 'constant?', ? /* static ? */", ['Riverside']),
    sqlOrigin: 'generated' as const, parameterLogPolicies: ['masked'] as const };
  expect(projectSQLLog(raw).debugSQL).toContain("`field?`, 'constant?', 'Ri*****de' /* masked */");
});

it.each(['SELECT $0', 'SELECT $2', 'SELECT ?, ?', 'SELECT @p0', 'SELECT 1'])(
  'fails closed for bind mismatch: %s', sql => {
    const safe = projectSQLLog(metadata(sql, ['CANARY-MISSING-BIND']));
    expect(safe.debugSQL).toContain('NOT REPLAYABLE');
    expect(safe.debugSQL).not.toContain('CANARY-MISSING-BIND');
    expect(safe.debugSQL).not.toContain('SELECT');
  });

it('cannot expose credentials with a forged plain policy during debug', () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const safe = projectSQLLog({ ...metadata('UPDATE customer SET password = ?', ['CREDENTIAL-CANARY']),
    parameterLogPolicies: ['plain'] });
  expect(JSON.stringify(safe)).not.toContain('CREDENTIAL-CANARY');
  expect(safe.debugSQL).toContain('masked');
  expect(safe.maskedParameters).toEqual([true]);
});

it.each([false, true])('preserves generated field policies beside credential columns (debug=%s)', debug => {
  if (debug) process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const raw: SQLExecutionMetadata = {
    ...metadata('SELECT password_hash FROM customer WHERE display_name = ? AND public_address = ? AND password_hash = ?',
      ['Riverside', '1 Runtime Road', 'PASSWORD-CANARY']),
    sqlOrigin: 'generated', parameterLogPolicies: ['masked', 'plain', 'credential'],
  };
  const safe = projectSQLLog(raw);
  expect(safe.parameterLogPolicies).toEqual(raw.parameterLogPolicies);
  expect(safe.debugSQL).toContain(debug ? 'Riverside' : 'Ri*****de');
  expect(safe.debugSQL).toContain('1 Runtime Road');
  expect(JSON.stringify(safe)).not.toContain('PASSWORD-CANARY');
  expect(projectSQLLog(safe)).toBe(safe);
  expect(raw.parameters[2]).toBe('PASSWORD-CANARY');
});

it.each([undefined, ['unknown'], ['unsupported-policy']])(
  'keeps unclassified bindings private even with explicit debug opt-in: %s', supplied => {
    process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
    const raw = { ...metadata('SELECT ?', ['UNKNOWN-BINDING-CANARY']),
      parameterLogPolicies: supplied as SQLExecutionMetadata['parameterLogPolicies'],
      comment: 'what: locate UNKNOWN-BINDING-CANARY' };
    const safe = projectSQLLog(raw);
    expect(JSON.stringify(safe)).not.toContain('UNKNOWN-BINDING-CANARY');
    expect(safe.maskedParameters).toEqual([true]);
    expect(safe.debugSQL).toContain('SELECT');
    expect(safe.debugSQL).toContain('NOT REPLAYABLE');
    expect(raw.parameters).toEqual(['UNKNOWN-BINDING-CANARY']);
  });

it('only explicit business policies permit plaintext debug, never unknown or credential values', () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const safe = projectSQLLog({ ...metadata('SELECT ?, ?, ?, ?',
    ['Ordinary', 'Riverside', 'UNKNOWN-BINDING-CANARY', 'CREDENTIAL-CANARY']),
    parameterLogPolicies: ['plain', 'masked', 'unknown', 'credential'] });
  expect(safe.parameters).toEqual(['Ordinary', 'Riverside', '[REDACTED]', '[REDACTED]']);
  expect(safe.maskedParameters).toEqual([false, false, true, true]);
});

it('omits untrusted inline credentials even during debug and explains the omission', () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const raw = metadata("UPDATE customer SET password = 'INLINE-CREDENTIAL-CANARY'", []);
  const output: string[] = [];
  new TextDiagnosticSQLLogSink(line => output.push(line)).write(raw);
  expect(output.join('\n')).not.toContain('INLINE-CREDENTIAL-CANARY');
  expect(output.join('\n')).toContain('SQL omitted: untrusted-literal-sql');
  expect(JSON.stringify(projectSQLLog(raw))).not.toContain('INLINE-CREDENTIAL-CANARY');
});

it('preserves operational counts even when their digits match a masked binding', () => {
  const safe = projectSQLLog({ ...metadata('SELECT ?', [1]), resultCount: 1 });
  expect(safe.resultSummary).toBe('1 rows returned');
  expect(safe.parameters).toEqual(['[REDACTED]']);
});

it('explains invalid policy/bind counts without leaking values or driver errors', () => {
  const raw = { ...metadata('SELECT ?', ['COUNT-CANARY']), parameterLogPolicies: [] };
  expect(projectSQLLog(raw).omissionReason).toBe('policy-count-mismatch');
  expect(projectSQLLog(metadata('SELECT ?, ?', ['COUNT-CANARY'])).omissionReason)
    .toBe('unsupported-or-mismatched-bindings');
  expect(JSON.stringify(projectSQLLog(raw))).not.toContain('COUNT-CANARY');
});

it('reprojects when debug is disabled and never recovers plaintext from a safe projection', () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const raw = { ...metadata('SELECT ?', ['Riverside']), parameterLogPolicies: ['masked'] as const };
  const debug = projectSQLLog(raw);
  expect(debug.debugSQL).toContain('Riverside');
  delete process.env[PLAINTEXT_LOG_ENV];
  const safe = projectSQLLog(debug);
  expect(JSON.stringify(safe)).not.toContain('Riverside');
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  expect(projectSQLLog(safe)).toBe(safe);
  expect(raw.parameters).toEqual(['Riverside']);
});

it('compiles trusted field policies on real SQLite mutations and predicates before logging', async () => {
  const schemas: Record<string, EntitySchema> = { Customer: {
    table: 'customer_data', auditMaskFields: ['display_name'], columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      displayName: { columnName: 'display_name', modelName: 'display_name', logicalType: 'text', decode: 'native' },
      active: { columnName: 'active', logicalType: 'boolean', decode: 'native', logPolicy: 'plain' },
      passwordHash: { columnName: 'password_hash', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
    },
  } };
  const captured: SQLExecutionMetadata[] = [];
  const output: string[] = [];
  const text = new TextDiagnosticSQLLogSink(line => output.push(line));
  const client = new SQLiteTeaQLClient(':memory:', schemas).setDiagnosticSQLLogSink({
    write: entry => { captured.push(entry); text.write(entry); },
  });
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    const created = await client.executeMutation({ entity: 'Customer', action: 'Create', id: '1',
      payload: { display_name: 'Riverside', active: true, passwordHash: 'PASSWORD-CANARY' }, comment: 'seed a customer' });
    const query = new SelectQuery('Customer').filter({ displayName: { $in: ['Riverside', 'Other'] }, active: { $eq: true } })
      .limit(1).comment('what: find the customer').purpose('why: verify field policy propagation');
    const rows = await client.executeQuery(query);
    expect(rows[0].displayName).toBe('Riverside');
    expect(captured[0].parameterLogPolicies).toContain('masked');
    expect(output.join('\n')).toContain('Ri*****de');
    expect(output.join('\n')).toContain('LIMIT 1');
    expect(output.join('\n')).not.toContain('Riverside');
    expect(output.join('\n')).not.toContain('Parameterized SQL:');
    expect(output.join('\n')).not.toContain('REDACTED SQL');
    const sql = captured.find(entry => entry.operation === 'select')!;
    expect(sql.maskedParameters).toEqual([true, true, false, false]);
    await client.executeMutation({ entity: 'Customer', action: 'Update', id: '1', version: created.version,
      payload: { display_name: "O'Reilly" }, comment: 'rename customer' });
    expect(output.join('\n')).toContain("O''****ly");
    expect(output.join('\n')).not.toContain("O''Reilly");
  } finally { await client.close(); }
});

it.each([false, true])('distinguishes old missing mask metadata from explicit empty (declared=%s)', async declared => {
  const customer: EntitySchema = {
    table: 'customer_data',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
      displayName: { columnName: 'display_name', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
    },
  };
  if (declared) customer.auditMaskFields = [];
  const captured: SQLExecutionMetadata[] = [];
  const output: string[] = [];
  const text = new TextDiagnosticSQLLogSink(line => output.push(line));
  const client = new SQLiteTeaQLClient(':memory:', { Customer: customer }).setDiagnosticSQLLogSink({
    write: entry => { captured.push(entry); text.write(entry); },
  });
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    await client.executeMutation({ entity: 'Customer', action: 'Create', id: '1',
      payload: { displayName: 'Riverside' }, comment: 'seed old descriptor fixture' });
    const rows = await client.executeQuery(new SelectQuery('Customer')
      .filter({ displayName: { $eq: 'Riverside' } }).limit(1)
      .comment('what: find old descriptor').purpose('why: verify fail-closed upgrade'));
    expect(rows[0].displayName).toBe('Riverside');
    const logged = captured.find(entry => entry.operation === 'select' &&
      entry.comment === 'what: find old descriptor');
    expect(logged?.parameterLogPolicies).toContain(declared ? 'plain' : 'unknown');
    if (declared) expect(output.join('\n')).toContain('Riverside');
    else {
      expect(output.join('\n')).toContain('[REDACTED]');
      expect(output.join('\n')).not.toContain('Riverside');
    }
  } finally { await client.close(); }
});
