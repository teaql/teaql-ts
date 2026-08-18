import { context, metrics, propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { observeRuntimeOperation } from '../src/core/telemetry';
import { OpenTelemetryRuntimeTelemetry } from '../src/telemetry/opentelemetry';

test('exports safe balanced spans through the official OpenTelemetry SDK', async () => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60_000,
  });
  const meterProvider = new MeterProvider({ readers: [metricReader] });
  const logExporter = new InMemoryLogRecordExporter();
  const loggerProvider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter: logExporter })],
  });
  const telemetry = new OpenTelemetryRuntimeTelemetry(
    provider.getTracer('io.teaql.runtime'),
    meterProvider.getMeter('io.teaql.runtime'),
    {
      flush: async () => {
        await provider.forceFlush();
        await meterProvider.forceFlush();
        await loggerProvider.forceFlush();
      },
      shutdown: async () => {
        await provider.shutdown();
        await meterProvider.shutdown();
        await loggerProvider.shutdown();
      },
    },
    loggerProvider.getLogger('io.teaql.runtime'),
  );

  await observeRuntimeOperation(telemetry, {
    family: 'query',
    name: 'School.list',
    attributes: {
      'teaql.entity.type': 'School',
      'teaql.entity.id': 'redacted',
    },
  }, async () => ['one'], rows => ({
    attributes: { 'teaql.result.cardinality': rows.length },
  }));
  await telemetry.flush();

  const spans = exporter.getFinishedSpans();
  expect(spans).toHaveLength(1);
  const querySpan = spans[0];
  expect(querySpan.attributes).toMatchObject({
    'teaql.operation.family': 'query',
    'teaql.operation.name': 'School.list',
    'teaql.entity.type': 'School',
    'teaql.result.cardinality': 1,
  });
  expect(querySpan.attributes).not.toHaveProperty('teaql.entity.id');
  const metricNames = metricExporter.getMetrics().flatMap(resourceMetrics =>
    resourceMetrics.scopeMetrics.flatMap(scope => scope.metrics.map(metric => metric.descriptor.name)));
  expect(metricNames).toEqual(expect.arrayContaining([
    'teaql.runtime.operation.duration',
    'teaql.runtime.operation.count',
  ]));
  const logs = logExporter.getFinishedLogRecords();
  expect(logs).toHaveLength(1);
  expect(logs[0].body).toBe('TeaQL runtime operation completed');
  expect(logs[0].attributes).toMatchObject({
    'teaql.operation.family': 'query',
    'teaql.operation.name': 'School.list',
    'teaql.operation.outcome': 'success',
  });
  expect(logs[0].attributes).not.toHaveProperty('teaql.entity.id');
  expect(logs[0].spanContext?.traceId).toBe(querySpan.spanContext().traceId);
  expect(logs[0].spanContext?.spanId).toBe(querySpan.spanContext().spanId);
  await telemetry.shutdown();
  context.disable();
  metrics.disable();
});

test('injects the active operation span using W3C Trace Context', async () => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  const meterProvider = new MeterProvider();
  const telemetry = new OpenTelemetryRuntimeTelemetry(
    provider.getTracer('io.teaql.runtime'), meterProvider.getMeter('io.teaql.runtime'),
  );
  const carrier: Record<string, string> = {};

  await observeRuntimeOperation(telemetry, {
    family: 'tfp', name: 'client.query', attributes: { 'teaql.tfp.role': 'client' },
  }, async () => { telemetry.inject(carrier); });

  const span = exporter.getFinishedSpans()[0];
  expect(carrier.traceparent).toBe(
    `00-${span.spanContext().traceId}-${span.spanContext().spanId}-01`,
  );
  await provider.shutdown();
  await meterProvider.shutdown();
  propagation.disable();
  context.disable();
});
