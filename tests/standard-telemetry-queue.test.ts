import { createServer, type ServerResponse } from 'node:http';
import { createStandardNodePipeline } from '../src/telemetry/standard-node-sdk';

test('flush waits for a batch already exporting before the flush invocation', async () => {
  let held: ServerResponse | undefined;
  let received!: () => void;
  const first = new Promise<void>(resolve => {received = resolve;});
  const server = createServer((request, response) => {
    request.on('data', () => {});
    request.once('end', () => {
      response.setHeader('Content-Type', 'application/x-protobuf');
      if (request.url === '/v1/traces' && !held) {held = response; received();}
      else response.end(Buffer.from([0x0a,0x00]));
    });
  });
  const port = await new Promise<number>(resolve => server.listen(0,'127.0.0.1',() =>
    resolve((server.address() as {port:number}).port)));
  const pipeline = createStandardNodePipeline('flush-prefix-probe', `http://127.0.0.1:${port}`);
  try {
    for (let index = 0; index < 128; index++) pipeline.telemetry.start({family:'query',name:'prefix probe'}).success();
    await first;
    const flushing = pipeline.flush();
    const early = await Promise.race([flushing.then(() => 'completed'),
      new Promise<string>(resolve => setTimeout(() => resolve('pending'), 100))]);
    expect(early).toBe('pending');
    held!.end(Buffer.from([0x0a,0x00]));
    await flushing;
    expect(pipeline.health().queues.traces.outstanding).toBe(0);
  } finally {
    held?.end(Buffer.from([0x0a,0x00]));
    try {await pipeline.shutdown();} finally {await new Promise<void>(resolve => server.close(() => resolve()));}
  }
},15000);

test('backlogged shutdown settles every admitted record before returning within its finite budget', async () => {
  const server = createServer((request, _response) => {request.on('data', () => {});});
  const port = await new Promise<number>(resolve => server.listen(0,'127.0.0.1',() =>
    resolve((server.address() as {port:number}).port)));
  const pipeline = createStandardNodePipeline('shutdown-backlog-probe',`http://127.0.0.1:${port}`);
  try {
    for (let index = 0; index < 2300; index++) pipeline.telemetry.start({family:'query',name:'backlog probe'}).success();
    expect(pipeline.health().queues.traces.outstanding).toBe(2048);
    expect(pipeline.health().queues.logs.outstanding).toBe(2048);
    const started = performance.now();
    await pipeline.shutdown().catch(() => {});
    expect(performance.now() - started).toBeLessThan(6500);
    expect(pipeline.health().queues.traces.outstanding).toBe(0);
    expect(pipeline.health().queues.logs.outstanding).toBe(0);
    const health = pipeline.health();
    expect(health.queues.logs.retired).toBeGreaterThan(0);
    for (const signal of ['traces','logs'] as const) {
      const queue = health.queues[signal];
      expect(queue.exporting).toBe(0);
      expect(queue.admitted).toBe(queue.completed + queue.retired);
      expect(queue.overflow).toBe(252);
    }
    pipeline.telemetry.start({family:'query',name:'late probe'}).success();
    expect(pipeline.health().queues.traces.postShutdown).toBe(1);
    expect(pipeline.health().queues.logs.postShutdown).toBe(1);
  } finally {await new Promise<void>(resolve => server.close(() => resolve()));}
},15000);
