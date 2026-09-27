import { mkdtempSync, readFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK, projectSQLLog } from '../src/core/log-privacy';
import { SQLExecutionMetadata, TextDiagnosticSQLLogSink } from '../src/sql/core';

const oldSetting = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterAll(() => {
  if (oldSetting === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = oldSetting;
});

function fixture(field = 'name'): SQLExecutionMetadata {
  return {
    operation: 'update', comment: 'edit PRIVATE-CUSTOMER-CANARY', purpose: 'test logging',
    tracePath: [{ level: 0, kind: 'request', name: 'edit PRIVATE-CUSTOMER-CANARY' }],
    parameterizedSQL: `UPDATE customer SET ${field} = ?`, parameters: ['PRIVATE-CUSTOMER-CANARY'],
    debugSQL: `UPDATE customer SET ${field} = 'PRIVATE-CUSTOMER-CANARY'`,
    elapsedMicros: 1, affectedRows: 1, resultSummary: '1 rows affected',
  };
}

it.each([undefined, '', 'true', '1', `${PLAINTEXT_LOG_ACK} `, PLAINTEXT_LOG_ACK.toLowerCase()])(
  'redacts default/file logs for invalid opt-in %s without modifying input', setting => {
    if (setting !== undefined) process.env[PLAINTEXT_LOG_ENV] = setting;
    const file = join(mkdtempSync(join(tmpdir(), 'teaql-ts-log-')), 'runtime.log');
    const raw = fixture();
    new TextDiagnosticSQLLogSink(text => appendFileSync(file, text)).write(raw);
    const log = readFileSync(file, 'utf8');
    expect(log).not.toContain('PRIVATE-CUSTOMER-CANARY');
    expect(log).toContain('NOT REPLAYABLE');
    expect(log).toContain('1 rows affected');
    expect(raw.parameters[0]).toBe('PRIVATE-CUSTOMER-CANARY');
  },
);

it('accepts only the exact opt-in and warns without values', () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const output: string[] = [];
  try {
    new TextDiagnosticSQLLogSink(text => output.push(text)).write(fixture());
    expect(output[0]).toContain('PRIVATE-CUSTOMER-CANARY');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('may be written to disk'));
    expect(JSON.stringify(warning.mock.calls)).not.toContain('PRIVATE-CUSTOMER-CANARY');
  } finally { warning.mockRestore(); }
});

it.each(['password', 'accessToken', 'private_key', 'api_key', 'refresh_token'])(
  'never exposes %s on opt-in', field => {
    process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
    expect(JSON.stringify(projectSQLLog(fixture(field)))).not.toContain('PRIVATE-CUSTOMER-CANARY');
  },
);

it('fails closed for unclassified literal SQL', () => {
  expect(projectSQLLog({ ...fixture(), parameterizedSQL: "SELECT 'INLINE-CANARY'", parameters: [] }).parameterizedSQL)
    .toBe('[REDACTED SQL; NOT REPLAYABLE]');
});
