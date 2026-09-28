import { TextDiagnosticSQLLogSink, SQLExecutionMetadata } from '../src/sql/core';
import { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK, maskAuditValue } from '../src/core/log-privacy';
import { readFileSync } from 'fs';
import { join } from 'path';

const golden = readFileSync(join(__dirname, '../test-vectors/masking-v1.tsv'), 'utf8')
  .trimEnd().split('\n').slice(1).map(line => line.split('\t'));
it.each(golden)('mask golden: %s', (_case, raw, expected) => {
  expect(maskAuditValue(raw)).toBe(expected);
});

const cases = [['', ''], ['Ada', '***'], ['12345678', '********'],
  ['ABCDEFGH', 'AB****GH'], ['Riverside', 'Ri*****de'], ["O'Reilly", "O'****ly"]];
const previous = process.env[PLAINTEXT_LOG_ENV];
beforeEach(() => { delete process.env[PLAINTEXT_LOG_ENV]; });
afterEach(() => {
  if (previous === undefined) delete process.env[PLAINTEXT_LOG_ENV];
  else process.env[PLAINTEXT_LOG_ENV] = previous;
});
function entry(value: string): SQLExecutionMetadata {
  return { operation: 'update', parameterizedSQL: 'UPDATE customer SET name = ?',
    parameters: [value], debugSQL: "UPDATE customer SET name = '" + value.replace(/'/g, "''") + "'",
    tracePath: [], comment: 'what: edit customer', purpose: 'why: verify mask contract',
    elapsedMicros: 1, affectedRows: 1, resultSummary: '1 row affected' };
}
it.each(cases)('mask contract: inline SQL for %s', (raw, masked) => {
  const source = entry(raw); const output: string[] = [];
  new TextDiagnosticSQLLogSink(line => output.push(line)).write(source);
  const log = output.join('\n');
  expect(source.parameters).toEqual([raw]);
  // Unknown parameter provenance: retain SQL, but expose no value or partial mask.
  expect(log).toContain("name = '");
  if (raw.length >= 8 && !masked.startsWith('*')) expect(log).not.toContain(masked.replace(/'/g, "''"));
  expect(log.toLowerCase()).toContain('masked');
  expect(log).not.toContain('name = ?');
  expect(log).not.toContain('[REDACTED SQL');
  if (raw) expect(log).not.toContain("'" + raw.replace(/'/g, "''") + "'");
});
it('mask contract: every plaintext record identifies debug provenance', () => {
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  const output: string[] = []; const sink = new TextDiagnosticSQLLogSink(line => output.push(line));
  sink.write({ ...entry('Riverside'), parameterLogPolicies: ['masked'] });
  sink.write({ ...entry('Riverside'), parameterLogPolicies: ['masked'] });
  expect(output).toHaveLength(2);
  for (const log of output) {
    expect(log).toContain("'Riverside'");
    expect(log.toUpperCase()).toContain('DEBUG');
    expect(log.toUpperCase()).toContain('PLAINTEXT');
  }
});
