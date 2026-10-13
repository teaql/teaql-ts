import { createServer, type Server } from 'node:http';
import { diag, DiagLogLevel } from '@opentelemetry/api';
import { createStandardNodePipeline } from '../src/telemetry/standard-node-sdk';
import { acknowledgementResult, OwnedOTLPHTTP, validateAcknowledgementBytes } from '../src/telemetry/owned-otlp-http';

const canary = 'TEAQL_REMOTE_RESPONSE_PRIVATE_CANARY';
const listen = (server: Server) => new Promise<number>(resolve => server.listen(0, '127.0.0.1', () =>
  resolve((server.address() as {port: number}).port)));
const close = (server: Server) => new Promise<void>(resolve => server.close(() => resolve()));

test('actual owned SDK never logs receiver text and never retries a partially accepted batch', async () => {
  const diagnostics: unknown[] = [];
  const write = (...values: unknown[]) => { diagnostics.push(values); };
  const logger = { error: write, warn: write, info: write, debug: write, verbose: write };
  diag.setLogger(logger, DiagLogLevel.ALL);
  const requests: Record<string, number> = {};
  const server = createServer(async (request, response) => {
    await new Promise<void>(resolve => { request.on('data', () => {}); request.once('end', () => resolve()); });
    const signal = request.url!.split('/').pop()!;
    requests[signal] = (requests[signal] || 0) + 1;
    const protobuf = request.headers['content-type'] === 'application/x-protobuf';
    response.setHeader('Content-Type', protobuf ? 'application/x-protobuf' : 'application/json');
    if (protobuf) {
      const text = Buffer.from(canary);
      const partial = Buffer.concat([Buffer.from([0x08, 0x01, 0x12, text.length]), text]);
      response.end(Buffer.concat([Buffer.from([0x0a, partial.length]), partial]));
    } else response.end(JSON.stringify({ partialSuccess: { rejectedSpans: 1, rejectedLogRecords: 1,
      rejectedDataPoints: 1, errorMessage: canary } }));
  });
  const port = await listen(server);
  const pipeline = createStandardNodePipeline('sdk-private-response-probe', `http://127.0.0.1:${port}`);
  try {
    pipeline.telemetry.start({family: 'query', name: 'controlled query'}).success();
    await pipeline.flush();
    expect(requests.traces).toBe(1);
    expect(requests.logs).toBe(1);
    expect(requests.metrics).toBe(1);
    expect(JSON.stringify(diagnostics)).not.toContain(canary);
    for (const response of Object.values(pipeline.health().responses)) {
      expect(response.rejected).toBe(1);
      expect(response.partialSuccess).toBe(1);
      expect(response.invalidResponses).toBe(0);
    }
  } finally {
    try { await pipeline.shutdown(); } finally { diag.disable(); await close(server); }
  }
}, 15000);

test.each([
  [0x00], [0x09], [0x15, 0x01], [0x80], Array(11).fill(0xff), [0x08, 0x00],
  [0x0a, 0x03, 0x12, 0x01, 0xff], [0x0a, 0x02, 0x08, 0x80], [0x93, 0x03],
])('strict framing rejects malformed acknowledgement without trusting native tolerant decoding: %j', (...bytes) => {
  expect(() => validateAcknowledgementBytes(Uint8Array.from(bytes))).toThrow('telemetry acknowledgement');
});

test('zero rejection wrappers are accepted; warnings, rejections and failed batch entries stay distinct', () => {
  validateAcknowledgementBytes(Uint8Array.from([0x0a, 0x00]));
  expect(acknowledgementResult('logs', {partialSuccess: {}}, 4)).toEqual({rejected: 0, kind: undefined});
  expect(acknowledgementResult('metrics', {partialSuccess: {rejectedDataPoints: 0, errorMessage: canary}}, 7))
    .toEqual({rejected: 0, kind: 'warning'});
  expect(acknowledgementResult('metrics', {partialSuccess: {rejectedDataPoints: 3}}, 7))
    .toEqual({rejected: 3, kind: 'partial_success'});
  for (const count of [-1, 8, 1.5, Number.MAX_SAFE_INTEGER + 1])
    expect(() => acknowledgementResult('metrics', {partialSuccess: {rejectedDataPoints: count}}, 7)).toThrow();
  expect(() => validateAcknowledgementBytes(new Uint8Array(4 * 1024 * 1024 + 1))).toThrow();
});

test('real HTTP failure never retries or passes private body/transport details to customer SDK diagnostics', async () => {
  const diagnostics: unknown[] = [], requests: Record<string, number> = {};
  const write = (...values: unknown[]) => {diagnostics.push(values);};
  const logger = {error: write, warn: write, info: write, debug: write, verbose: write};
  diag.setLogger(logger, DiagLogLevel.ALL);
  const server = createServer((request, response) => {
    request.on('data', () => {});
    request.once('end', () => {
      const signal = request.url!.split('/').pop()!;
      requests[signal] = (requests[signal] || 0) + 1;
      response.statusCode = 503; response.end(canary);
    });
  });
  const port = await listen(server), pipeline = createStandardNodePipeline('sdk-failure-probe', `http://127.0.0.1:${port}`);
  try {
    pipeline.telemetry.start({family: 'query', name: 'controlled query'}).success();
    await expect(pipeline.flush()).rejects.toThrow('TeaQL telemetry export incomplete');
    expect(requests).toEqual({traces: 1, logs: 1, metrics: 1});
    expect(pipeline.health().traceSpansFailed).toBe(1);
    expect(pipeline.health().logRecordsFailed).toBe(1);
    expect(pipeline.health().metricDataObjectsFailed).toBeGreaterThan(1);
    expect(JSON.stringify(diagnostics)).not.toContain(canary);
    expect(JSON.stringify(diagnostics)).not.toContain('items to be sent');
  } finally {
    try { await pipeline.shutdown(); } finally {diag.disable(); await close(server);}
  }
}, 15000);

test('owned transport enforces an entire-attempt deadline rather than only socket idle time', async () => {
  const transport = new OwnedOTLPHTTP();
  const server = createServer((request, _response) => {request.on('data', () => {});});
  const port = await listen(server), started = performance.now();
  try {
    expect(await transport.send(`http://127.0.0.1:${port}/v1/traces`, new Uint8Array())).toEqual({});
    expect(performance.now() - started).toBeGreaterThanOrEqual(2900);
    expect(performance.now() - started).toBeLessThan(3800);
  } finally {transport.close(); await close(server);}
}, 10000);
