import { context, trace, ROOT_CONTEXT } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { BasicTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { LoggerProvider, SimpleLogRecordProcessor, InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { OpenTelemetryRuntimeTelemetry } from '../src/telemetry/opentelemetry';
import { AbstractSQLTeaQLClient, EntitySchema } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { SelectQuery } from '../src/core/ast';
import { UserContext } from '../src/core/context';

test('a broken optional SQL-diagnostic capability cannot change a real query result or expose its error', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const diagnostic = jest.fn();
  class Client extends AbstractSQLTeaQLClient {
    constructor() {super(new SQLiteDriver(':memory:'), {School: {table:'school_data',columns:{
      id:{columnName:'id',logicalType:'integer',decode:'string'},version:{columnName:'version',logicalType:'integer',decode:'number'},
    }}});}
  }
  const client = new Client().setDiagnosticSQLLogSink(undefined).setRuntimeTelemetry({
    start: () => ({success() {},failure() {}}), recordDiagnostic: diagnostic,
    recordsSQLDiagnostics: () => {throw new Error('PRIVATE-CUSTOM-CAPABILITY');},
  });
  try {
    await new UserContext().insertResource('dataService',client).ensureSchema();
    const rows = await client.executeQuery(new SelectQuery('School').limit(1)
      .comment('inspect empty fixture').purpose('verify fail-open capability'));
    expect(rows).toEqual([]);expect(diagnostic).not.toHaveBeenCalled();
    expect(JSON.stringify(warning.mock.calls)).not.toContain('PRIVATE-CUSTOM-CAPABILITY');
  } finally {await client.close();warning.mockRestore();}
});

test('out-of-order SQL completion retains its own span and does not replace global SDK context', async () => {
  const beforeProvider = trace.getTracerProvider();
  const beforeContext = context.active();
  const manager = new AsyncLocalStorageContextManager().enable();
  const spanExporter = new InMemorySpanExporter();
  const logExporter = new InMemoryLogRecordExporter();
  const tracerProvider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(spanExporter)] });
  const loggerProvider = new LoggerProvider({ processors: [new SimpleLogRecordProcessor({ exporter: logExporter })] });
  const meterProvider = new MeterProvider();
  const telemetry = new OpenTelemetryRuntimeTelemetry(tracerProvider.getTracer('io.teaql.runtime'),
    meterProvider.getMeter('io.teaql.runtime'), {}, loggerProvider.getLogger('io.teaql.runtime'), {
      active: () => manager.active() === ROOT_CONTEXT ? context.active() : manager.active(),
      with: (active, work) => manager.with(active, work),
    });
  const schemas: Record<string, EntitySchema> = { School: { table: 'school_data', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
  } } };
  class Driver extends SQLiteDriver {
    concurrent = false;
    private calls = 0;
    private releaseFirst!: () => void;
    private readonly secondFinished = new Promise<void>(resolve => { this.releaseFirst = resolve; });
    async query(sql: string, values: any[]) {
      if (!this.concurrent) return super.query(sql, values);
      const call = ++this.calls;
      if (call === 1) await this.secondFinished;
      const result = await super.query(sql, values);
      if (call === 2) this.releaseFirst();
      return result;
    }
  }
  const driver = new Driver(':memory:');
  class Client extends AbstractSQLTeaQLClient {
    constructor() { super(driver, schemas); }
  }
  const client = new Client().setRuntimeTelemetry(telemetry).setDiagnosticSQLLogSink(undefined);
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    driver.concurrent = true;
    await Promise.all([1, 2].map(limit => client.executeQuery(new SelectQuery('School').limit(limit)
      .comment(`concurrent ${limit}`).purpose('verify isolated SQL identity'))));
    await Promise.all([tracerProvider.forceFlush(), loggerProvider.forceFlush()]);
    const logs = logExporter.getFinishedLogRecords().filter(log => log.body === 'TeaQL SQL execution');
    const spans = spanExporter.getFinishedSpans();
    expect(logs).toHaveLength(2);
    expect(logs.map(log => log.attributes['teaql.intent.comment'])).toEqual(['concurrent 2', 'concurrent 1']);
    for (const log of logs) {
      const provider = spans.find(span => span.spanContext().spanId === log.spanContext?.spanId);
      expect(provider?.attributes['teaql.operation.family']).toBe('provider');
      const query = spans.find(span => span.spanContext().spanId === provider?.parentSpanContext?.spanId);
      expect(query?.attributes['teaql.operation.family']).toBe('query');
      expect(provider?.spanContext().traceId).toBe(log.spanContext?.traceId);
    }
    expect(new Set(logs.map(log => log.spanContext?.traceId)).size).toBe(2);
    expect(trace.getTracerProvider()).toBe(beforeProvider);
    expect(context.active()).toBe(beforeContext);
  } finally {
    await client.close();
    await Promise.all([tracerProvider.shutdown(), loggerProvider.shutdown(), meterProvider.shutdown()]);
    manager.disable();
  }
});

test('an existing customer SDK stays installed and receives no TeaQL-owned exports', async () => {
  const externalManager = new AsyncLocalStorageContextManager().enable();
  context.setGlobalContextManager(externalManager);
  const externalExporter = new InMemorySpanExporter();
  const externalProvider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(externalExporter)] });
  trace.setGlobalTracerProvider(externalProvider);
  const originalGlobalProvider = trace.getTracerProvider();
  const manager = new AsyncLocalStorageContextManager().enable();
  const ownExporter = new InMemorySpanExporter();
  const ownProvider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(ownExporter)] });
  const meterProvider = new MeterProvider();
  const telemetry = new OpenTelemetryRuntimeTelemetry(ownProvider.getTracer('io.teaql.runtime'),
    meterProvider.getMeter('io.teaql.runtime'), {}, undefined, {
      active: () => manager.active() === ROOT_CONTEXT ? context.active() : manager.active(),
      with: (active, work) => manager.with(active, work),
    });
  const externalSpan = externalProvider.getTracer('customer').startSpan('HTTP request');
  try {
    await context.with(trace.setSpan(context.active(), externalSpan), async () => {
      const scope = telemetry.start({ family: 'query', name: 'Order.list' });
      await scope.run!(async () => {}); scope.success();
      expect(trace.getTracerProvider()).toBe(originalGlobalProvider);
      expect(trace.getSpan(context.active())).toBe(externalSpan);
    });
    await ownProvider.forceFlush();
    expect(ownExporter.getFinishedSpans()).toHaveLength(1);
    expect(ownExporter.getFinishedSpans()[0].parentSpanContext?.spanId).toBe(externalSpan.spanContext().spanId);
    expect(externalExporter.getFinishedSpans()).toHaveLength(0);
    await ownProvider.shutdown(); manager.disable();
    externalSpan.end(); await externalProvider.forceFlush();
    expect(externalExporter.getFinishedSpans()).toHaveLength(1);
    expect(trace.getTracerProvider()).toBe(originalGlobalProvider);
  } finally {
    externalSpan.end();
    await ownProvider.shutdown(); manager.disable();
    await externalProvider.shutdown(); await meterProvider.shutdown();
    context.disable(); trace.disable(); externalManager.disable();
  }
});
