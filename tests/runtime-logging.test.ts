import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {spawn, ChildProcess} from 'node:child_process';
import {RuntimeLogger, RuntimeLoggingError, loggingTelemetry, parseRuntimeLogSize} from '../src/core/runtime-logging';
import {UserContext} from '../src/core/context';
import {observeRuntimeOperation} from '../src/core/telemetry';
import {RuntimeDiagnosticSQLLogSink} from '../src/sql/core';
import {MutationPolicyError} from '../src/core/mutation-policy';
import {SQLiteTeaQLClient} from '../src/sql/sqlite';
import {SelectQuery} from '../src/core/ast';

let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'teaql-runtime-logging-')); });
afterEach(() => { fs.rmSync(directory, {recursive: true}); });
const make = (environment: Record<string, string> = {}) => new RuntimeLogger({workingDirectory: directory, environment});
function records(...files: string[]): any[] {
  return files.flatMap(file => {
    const data = fs.readFileSync(file, 'utf8'); expect(data.endsWith('\n')).toBe(true);
    return data.trimEnd().split('\n').map(line => {
      const record = JSON.parse(line);
      for (const key of ['timestamp', 'level', 'log_name', 'runtime', 'event', 'message']) expect(record[key]).toBeTruthy();
      expect(record.runtime).toBe('typescript'); expect(record.timestamp.endsWith('Z')).toBe(true);
      expect(Number.isFinite(Date.parse(record.timestamp))).toBe(true); return record;
    });
  });
}

test('default file exists before a query and two starts append', () => {
  const first = make(); expect(first.path).toBe(path.join(directory, 'logs/teaql.log'));
  expect(first.maxSize).toBe(50n * 1024n * 1024n); expect(first.maxFiles).toBe(7);
  expect(records(first.path!)[0].event).toBe('runtime.start');
  const second = make(); expect(second.write('INFO', 'probe', 'Completed')).toBe(true);
  expect(records(first.path!)).toHaveLength(3);
});

test.each([
  ['application', 'domain', ['model'], 'application'], [undefined, 'domain', ['model'], 'domain'],
  [undefined, '', ['model'], 'model'], [undefined, '', ['one', 'two'], 'teaql'], ['订单', '', [], '订单'],
] as const)('name precedence and destination override: %s', (logName, domain, modelNames, expected) => {
  const logger = new RuntimeLogger({logName, modelNames, environment: {TEAQL_DOMAIN: domain, TEAQL_LOG_ENDPOINT: 'other/output.jsonl'}, workingDirectory: directory});
  expect(logger.logName).toBe(expected); expect(logger.path).toBe(path.join(directory, 'other/output.jsonl'));
  expect(records(logger.path!)[0].log_name).toBe(expected);
});

test.each(['', '.', '..', '../secret', 'a/b', 'a\\b', 'bad\nname', 'NUL', 'COM1.txt', 'trailing.', 'trailing ', '\ud800', 'x'.repeat(256)])('invalid names fail startup: %j', logName => {
  expect(() => new RuntimeLogger({logName, environment: {}, workingDirectory: directory})).toThrow(RuntimeLoggingError);
});
test.each([['1', 1n], ['2K', 2048n], ['3KB', 3072n], ['2m', 2097152n], ['1MB', 1048576n], ['1G', 1073741824n], ['1GB', 1073741824n]])('binary sizes %s', (input, expected) => {
  expect(parseRuntimeLogSize(input as string)).toBe(expected);
});
test.each(['0', '-1', '1.2M', '1TB', '999999999999999999999G'])('invalid sizes %s', input => { expect(() => parseRuntimeLogSize(input)).toThrow(); });
test.each(['-1', 'invalid', '1.5', '2147483648'])('invalid retention %s', input => { expect(() => make({TEAQL_LOG_MAX_FILES: input})).toThrow(); });

test('UTF8 oversized records stay whole and archives retain newest order', () => {
  const logger = make({TEAQL_LOG_MAX_SIZE: '256', TEAQL_LOG_MAX_FILES: '2'});
  for (let i = 0; i < 5; i++) expect(logger.write('INFO', 'probe', '界'.repeat(200), {sequence: i})).toBe(true);
  for (let i = 0; i < 3; i++) {
    const file = logger.path + (i ? '.' + i : ''); const [record] = records(file);
    expect(records(file)).toHaveLength(1); expect(record.sequence).toBe(4 - i); expect(record.message).toBe('界'.repeat(200));
  }
  expect(fs.existsSync(logger.path + '.3')).toBe(false);
  const zero = make({TEAQL_LOG_MAX_SIZE: '256', TEAQL_LOG_MAX_FILES: '0'});
  zero.write('INFO', 'probe', 'x'.repeat(400)); expect(fs.readdirSync(path.dirname(zero.path!))).toEqual(['teaql.log']);
  expect(records(zero.path!)).toHaveLength(1);
});

test.each([false, true])('UTC day rotation and restart %s', restart => {
  let logger = make(); const before = fs.readFileSync(logger.path!);
  const yesterday = new Date(Date.now() - 86_400_000); fs.utimesSync(logger.path!, yesterday, yesterday);
  if (restart) logger = make(); else logger.write('INFO', 'next.day', 'Next day');
  expect(fs.readFileSync(logger.path + '.1')).toEqual(before); expect(records(logger.path!)).toHaveLength(1);
});

test('ordinary UTF8 records rotate at the whole-line byte limit', () => {
  const logger = make({TEAQL_LOG_MAX_SIZE: '1K', TEAQL_LOG_MAX_FILES: '1000'});
  for (let index = 0; index < 40; index++) expect(logger.write('INFO', 'regular', '界'.repeat(30), {index})).toBe(true);
  const files = fs.readdirSync(path.dirname(logger.path!)).map(name => path.join(path.dirname(logger.path!), name));
  expect(files.length).toBeGreaterThan(1);
  for (const file of files) { expect(fs.statSync(file).size).toBeGreaterThan(0); expect(fs.statSync(file).size).toBeLessThanOrEqual(1024); }
  const all = records(...files); expect(all).toHaveLength(41);
  expect(all.filter(row => row.event === 'regular').map(row => row.index).sort((a, b) => a - b)).toEqual(Array.from({length: 40}, (_, index) => index));
});

test('rotation failure preserves a foreign archive directory and business results', async () => {
  const logger = make(); const before = fs.readFileSync(logger.path!); const archive = logger.path + '.1';
  fs.mkdirSync(archive); fs.writeFileSync(path.join(archive, 'marker'), 'preserve');
  const yesterday = new Date(Date.now() - 86_400_000); fs.utimesSync(logger.path!, yesterday, yesterday);
  const telemetry = loggingTelemetry(undefined, logger);
  expect(await observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => 42)).toBe(42);
  const original = new Error('private-original-error');
  await expect(observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => { throw original; })).rejects.toBe(original);
  expect(logger.write('INFO', 'probe', 'Completed')).toBe(false);
  expect(fs.readFileSync(logger.path!)).toEqual(before); expect(fs.readFileSync(path.join(archive, 'marker'), 'utf8')).toBe('preserve');
});

test('native policy rejection is a warning and keeps the original error', async () => {
  const logger = make(); const original = new MutationPolicyError('private-policy-value');
  await expect(observeRuntimeOperation(loggingTelemetry(undefined, logger), {family: 'mutation', name: 'probe'}, async () => { throw original; })).rejects.toBe(original);
  expect(records(logger.path!).map(row => row.level)).toEqual(['INFO', 'WARN']);
  expect(fs.readFileSync(logger.path!, 'utf8')).not.toContain('private-policy-value');
});

test('startup failure is fatal and post-startup writes preserve business results and error identity', async () => {
  fs.mkdirSync(path.join(directory, 'logs/teaql.log'), {recursive: true}); expect(() => make()).toThrow(RuntimeLoggingError);
  fs.rmdirSync(path.join(directory, 'logs/teaql.log')); const logger = make(); const context = new UserContext(logger);
  expect(context.runtimeLogger).toBe(logger);
  fs.unlinkSync(logger.path!); fs.mkdirSync(logger.path!);
  const telemetry = loggingTelemetry(undefined, logger);
  expect(await observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => 42)).toBe(42);
  const original = new Error('private-original-error');
  await expect(observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => { throw original; })).rejects.toBe(original);
  expect(logger.write('INFO', 'probe', 'Completed')).toBe(false);
});

class ValidationError extends Error {}
test('native scopes and projected SQL assign outcome severity without logging error text', async () => {
  const logger = make(); const telemetry = loggingTelemetry(undefined, logger);
  await observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => 7);
  for (const error of [new ValidationError('private-error-value'), new Error('private-error-value')])
    await expect(observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => { throw error; })).rejects.toBe(error);
  new RuntimeDiagnosticSQLLogSink(() => logger).write({operation: 'select', executionOutcome: 'retrying',
    parameterizedSQL: 'SELECT * FROM customer WHERE password = ?', parameters: ['private-password-value'],
    debugSQL: 'private-password-value', tracePath: [], elapsedMicros: 1, resultSummary: ''});
  expect(records(logger.path!).map(record => record.level)).toEqual(['INFO', 'INFO', 'WARN', 'ERROR', 'WARN']);
  const last = records(logger.path!).slice(-1)[0]; expect(last.event).toBe('sql.retry'); expect(last.category).toBe('SQL');
  expect(fs.readFileSync(logger.path!, 'utf8')).not.toMatch(/private-error-value|private-password-value/);
});

test('browser console methods carry matching prefix, structured record and no server domain', () => {
  const captures: Array<[string, string, any]> = [];
  const spies = ['info', 'warn', 'error'].map(method => jest.spyOn(console, method as 'info').mockImplementation((prefix: string, record: any) => { captures.push([method, prefix, record]); }));
  try {
    const logger = new RuntimeLogger({platform: 'browser', modelNames: ['model'], environment: {TEAQL_DOMAIN: 'server-domain'}});
    logger.write('INFO', 'probe.success', 'Completed'); logger.write('WARN', 'sql.retry', 'Retry scheduled', {category: 'SQL', outcome: 'retrying'});
    logger.write('ERROR', 'probe.failure', 'Failed', {error_code: 'provider'});
    expect(captures.map(record => record[0])).toEqual(['info', 'info', 'warn', 'error']);
    expect(captures[2][1]).toBe('[TeaQL][model][WARN] sql.retry'); expect(captures[2][2].log_name).toBe('model');
    expect(captures[2][2].level).toBe('WARN'); expect(captures[2][2].category).toBe('SQL'); expect(logger.path).toBeUndefined();
  } finally { spies.forEach(spy => spy.mockRestore()); }
});

test('separate processes coordinate size rotation and leave whole unique events', async () => {
  const modulePath = path.resolve(__dirname, '../dist/core/runtime-logging.js');
  const code = `const {RuntimeLogger}=require(process.argv[1]); const logger=new RuntimeLogger({workingDirectory:process.argv[2],environment:{TEAQL_LOG_MAX_SIZE:'1K',TEAQL_LOG_MAX_FILES:'1000'}}); for(let i=0;i<30;i++)if(!logger.write('INFO','concurrent','Completed',{id:process.argv[3]+'/'+i}))process.exit(1);`;
  const children: ChildProcess[] = [];
  try {
    const results = Array.from({length: 4}, (_, id) => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', code, modulePath, directory, String(id)], {env: {TMPDIR: os.tmpdir()}}); children.push(child);
      let error = ''; child.stderr!.on('data', data => { error += String(data); }); child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(error)));
    }));
    await Promise.all(results);
  } finally {
    await Promise.all(children.map(child => child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise<void>(resolve => {child.once('exit', () => resolve()); child.kill('SIGTERM');})));
  }
  const all = records(...fs.readdirSync(path.join(directory, 'logs')).map(name => path.join(directory, 'logs', name)));
  expect(all).toHaveLength(124); expect(new Set(all.filter(record => record.id).map(record => record.id)).size).toBe(120);
}, 60_000);

test('default SQL and audit files stay projected while SQLite retains original values', async () => {
  const previous = process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS;
  delete process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS;
  const logger = make(); const context = new UserContext(logger);
  const client = new SQLiteTeaQLClient(':memory:', {Customer: {table: 'customer', auditMaskFields: ['email'], columns: {
    id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
    version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
    email: {columnName: 'email', logicalType: 'text', decode: 'native'},
    password: {columnName: 'password', logicalType: 'text', decode: 'native'},
  }}}).setUserContext(context);
  const email = 'PRIVATE-EMAIL-CANARY'; const password = 'UNIQUE-LOG-PASSWORD-CANARY';
  try {
    await context.insertResource('dataService', client).ensureSchema();
    const mutation = {entity: 'Customer', action: 'Create', id: '42', payload: {email, password}, comment: 'create target 42 ' + password};
    await client.executeMutation(mutation);
    await expect(client.executeMutation(mutation)).rejects.toMatchObject({code: 'SQLITE_CONSTRAINT_PRIMARYKEY'});
    const stored = await client.executeQuery(new SelectQuery('Customer').comment('read fixture').purpose('verify original values'));
    expect(stored[0]).toMatchObject({email, password});
    const all = records(logger.path!);
    expect(all.some(row => row.category === 'SQL' && row.level === 'ERROR')).toBe(true);
    expect(all.some(row => row.category === 'AUDIT' && row.audit.id === '42')).toBe(true);
    const text = fs.readFileSync(logger.path!, 'utf8'); expect(text).not.toContain(email); expect(text).not.toContain(password);
    expect(mutation.payload).toEqual({email, password});
  } finally {
    await client.close();
    if (previous === undefined) delete process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS; else process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS = previous;
  }
});

test('operation and SQL files keep available trace correlation', async () => {
  const logger = make(); const identity = {traceId: '0123456789abcdef0123456789abcdef', spanId: '0123456789abcdef'};
  const telemetry = loggingTelemetry({start: () => ({success() {}, failure() {}, correlation: () => identity})}, logger);
  expect(await observeRuntimeOperation(telemetry, {family: 'query', name: 'probe'}, async () => 42)).toBe(42);
  new RuntimeDiagnosticSQLLogSink(() => logger).write({operation: 'select', executionOutcome: 'success', telemetryCorrelation: identity,
    parameterizedSQL: 'SELECT id FROM customer', parameters: [], debugSQL: 'SELECT id FROM customer', tracePath: [], elapsedMicros: 1, resultSummary: '1 row'});
  expect(records(logger.path!).filter(row => row.event !== 'runtime.start').map(row => row.trace_id)).toEqual([identity.traceId, identity.traceId]);
});
