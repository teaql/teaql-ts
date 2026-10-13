import { readTelemetryStartupConfiguration, telemetryStartupMessage, TELEMETRY_ENVIRONMENT, telemetryNotice } from '../src/core/telemetry-startup';
import { projectSafeSQLLog, PLAINTEXT_LOG_ACK, PLAINTEXT_LOG_ENV } from '../src/core/log-privacy';
import { sqlDiagnosticEvent } from '../src/core/sql-diagnostic-event';
import type { SQLExecutionMetadata } from '../src/sql/core';

test('a broken startup log writer cannot change application behavior', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => { throw new Error('broken writer'); });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => { throw new Error('broken writer'); });
  try {
    expect(() => telemetryNotice('startup')).not.toThrow();
    expect(() => telemetryNotice('export unavailable', true)).not.toThrow();
  } finally { info.mockRestore(); warn.mockRestore(); }
});

test('disabled startup reports the three enablement parameters without reading unrelated values', () => {
  const configuration = readTelemetryStartupConfiguration({
    TEAQL_TELEMETRY_SERVICE_NAME: 'PRIVATE-SERVICE', TEAQL_TELEMETRY_OTLP_ENDPOINT: 'PRIVATE-ENDPOINT',
  });
  expect(configuration).toEqual({ enabled: false });
  const text = telemetryStartupMessage(configuration);
  for (const key of Object.values(TELEMETRY_ENVIRONMENT)) expect(text).toContain(key);
  expect(text).toContain('supported, disabled');
  expect(text).not.toContain('PRIVATE-');
});

test('enabled configuration announces full recording and concrete safe settings', () => {
  const configuration = readTelemetryStartupConfiguration({ TEAQL_TELEMETRY_ENABLED: 'TRUE',
    TEAQL_TELEMETRY_SERVICE_NAME: 'order-service', TEAQL_TELEMETRY_OTLP_ENDPOINT: 'http://localhost:4318/' });
  expect(configuration.enabled).toBe(true);
  expect(configuration.endpoint).toBe('http://localhost:4318');
  expect(telemetryStartupMessage(configuration)).toContain('full recording, masked SQL');
  expect(telemetryStartupMessage(configuration)).toContain('order-service');
});

test.each(['http://secret:password@localhost:4318', 'http://localhost:4318?token=SECRET',
  'http://localhost:4318#SECRET', 'file:///SECRET'])('invalid endpoint is not echoed: %s', endpoint => {
  const configuration = readTelemetryStartupConfiguration({ TEAQL_TELEMETRY_ENABLED: 'true',
    TEAQL_TELEMETRY_SERVICE_NAME: 'orders', TEAQL_TELEMETRY_OTLP_ENDPOINT: endpoint });
  expect(configuration).toEqual({ enabled: false, error: 'invalid-endpoint' });
  expect(telemetryStartupMessage(configuration)).not.toContain(endpoint);
  expect(telemetryStartupMessage(configuration)).not.toContain('SECRET');
});

test('invalid enable and missing configuration cannot claim telemetry is enabled', () => {
  expect(readTelemetryStartupConfiguration({ TEAQL_TELEMETRY_ENABLED: 'yes' }).error).toBe('invalid-enable');
  expect(readTelemetryStartupConfiguration({ TEAQL_TELEMETRY_ENABLED: 'true' }).error).toBe('invalid-service');
  expect(readTelemetryStartupConfiguration({ TEAQL_TELEMETRY_ENABLED: 'false' })).toEqual({ enabled: false });
});

test('telemetry safe projection preserves masking even during local plaintext debug', () => {
  const before = process.env[PLAINTEXT_LOG_ENV];
  process.env[PLAINTEXT_LOG_ENV] = PLAINTEXT_LOG_ACK;
  try {
    const input: SQLExecutionMetadata = { operation: 'select', tracePath: [],
      traceChain: [{ kind: 'comment', name: 'Order', detail: 'load PRIVATE-PARAM', entityId: 'PRIVATE-ID' }],
      parameterizedSQL: 'SELECT id FROM orders WHERE order_number = ?', parameters: ['PRIVATE-PARAM'],
      parameterLogPolicies: ['masked'], sqlOrigin: 'generated', debugSQL: '', elapsedMicros: 17,
      resultSummary: '1 row returned', resultCount: 1, comment: 'load PRIVATE-PARAM' };
    const projected = projectSafeSQLLog(input);
    const event = sqlDiagnosticEvent(projected, { traceId: '1'.repeat(32), spanId: '2'.repeat(16) });
    expect(event.attributes['teaql.sql.debug']).toContain('masked');
    expect(JSON.stringify(event)).not.toContain('PRIVATE-PARAM');
    expect(JSON.stringify(event)).not.toContain('PRIVATE-ID');
    expect(event.attributes['teaql.intent.comment']).toContain('[REDACTED]');
    expect(event.correlation?.spanId).toBe('2'.repeat(16));
    expect(event.attributes).not.toHaveProperty('parameters');
  } finally {
    if (before === undefined) delete process.env[PLAINTEXT_LOG_ENV]; else process.env[PLAINTEXT_LOG_ENV] = before;
  }
});
