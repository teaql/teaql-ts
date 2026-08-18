import { context, metrics } from '@opentelemetry/api';
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
import { observeRuntimeOperation } from '../src/core/telemetry';
import { OpenTelemetryRuntimeTelemetry } from '../src/telemetry/opentelemetry';

test('exports safe balanced spans through the official OpenTelemetry SDK', async () => {
  const contextManager = new AsyncLocalStorageContextManager().enable();
  context.setGlobalContextManager(contextManager);
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60_000,
  });
  const meterProvider = new MeterProvider({ readers: [metricReader] });
  const telemetry = new OpenTelemetryRuntimeTelemetry(
    provider.getTracer('io.teaql.runtime'),
    meterProvider.getMeter('io.teaql.runtime'),
    {
      flush: async () => { await provider.forceFlush(); await meterProvider.forceFlush(); },
      shutdown: async () => { await provider.shutdown(); await meterProvider.shutdown(); },
    },
  );

  await observeRuntimeOperation(telemetry, {
    family: 'query',
    name: 'School.list',
    attributes: {
      'teaql.entity.type': 'School',
      'teaql.entity.id': 'redacted',
    },
  }, async () => observeRuntimeOperation(telemetry, {
    family: 'provider',
    name: 'sqlite.query',
    attributes: {
      'teaql.provider.kind': 'sqlite',
      'teaql.provider.operation': 'query',
    },
  }, async () => ['one']), rows => ({
    attributes: { 'teaql.result.cardinality': rows.length },
  }));
  await telemetry.flush();

  const spans = exporter.getFinishedSpans();
  expect(spans).toHaveLength(2);
  const querySpan = spans.find(span => span.name === 'teaql.query')!;
  const providerSpan = spans.find(span => span.name === 'teaql.provider')!;
  expect(querySpan.attributes).toMatchObject({
    'teaql.operation.family': 'query',
    'teaql.operation.name': 'School.list',
    'teaql.entity.type': 'School',
    'teaql.result.cardinality': 1,
  });
  expect(querySpan.attributes).not.toHaveProperty('teaql.entity.id');
  expect(providerSpan.parentSpanContext?.spanId).toBe(querySpan.spanContext().spanId);
  const metricNames = metricExporter.getMetrics().flatMap(resourceMetrics =>
    resourceMetrics.scopeMetrics.flatMap(scope => scope.metrics.map(metric => metric.descriptor.name)));
  expect(metricNames).toEqual(expect.arrayContaining([
    'teaql.runtime.operation.duration',
    'teaql.runtime.operation.count',
  ]));
  await telemetry.shutdown();
  metrics.disable();
  context.disable();
});
