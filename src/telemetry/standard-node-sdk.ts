import { context, ROOT_CONTEXT, defaultTextMapSetter } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { AlwaysOnSampler, BasicTracerProvider, BatchSpanProcessor, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { LoggerProvider, BatchLogRecordProcessor, LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ExportResult, W3CTraceContextPropagator } from '@opentelemetry/core';
import { AggregationTemporality, MeterProvider, PeriodicExportingMetricReader, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { ProtobufLogsSerializer, ProtobufMetricsSerializer, ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { OpenTelemetryRuntimeTelemetry } from './opentelemetry';
import { telemetryNotice } from '../core/telemetry-startup';
import { ExportHealth, lifecycleDeadline } from './export-health';
import { OwnedOTLPHTTP, ownedExporter } from './owned-otlp-http';
import { ResponseHealth } from './response-health';

function reportedExporter<T>(delegate: { export(records: T[], done: (result: ExportResult) => void): void;
  shutdown(): Promise<void>; forceFlush?(): Promise<void> }, health: ExportHealth) {
  return {
    export: (records: T[], done: (result: ExportResult) => void) => {
      const ticket = health.beginExport(records as object[]);
      if (!ticket) {done({code: 0}); return;}
      let completed = false;
      const finish = (result: ExportResult) => {
        if (completed) return;
        completed = true;
        ticket.complete(result.code !== 0);
        done(result);
      };
      try { delegate.export(records, finish); }
      catch { finish({ code: 1 }); }
    },
    shutdown: () => delegate.shutdown(),
    forceFlush: () => delegate.forceFlush?.() ?? Promise.resolve(),
  };
}

/** Isolated providers; never registers or replaces process-global OTel configuration. */
export function createStandardNodePipeline(serviceName: string, endpoint: string) {
  const resource = resourceFromAttributes({ 'service.name': serviceName, 'teaql.runtime.language': 'typescript' });
  const manager = new AsyncLocalStorageContextManager().enable();
  const transport = new OwnedOTLPHTTP();
  let lossCounter: ReturnType<import('@opentelemetry/api').Meter['createCounter']> | undefined;
  let rejectedCounter: typeof lossCounter, responseCounter: typeof lossCounter;
  const responses = new ResponseHealth((signal, reason, rejected) => {
    rejectedCounter?.add(rejected, {'teaql.telemetry.signal': signal});
    responseCounter?.add(1, {'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': reason});
  });
  const metricPoints = (data: ResourceMetrics) => data.scopeMetrics.reduce((n, scope) =>
    n + scope.metrics.reduce((m, metric) => m + metric.dataPoints.length, 0), 0);
  const metricExporter = ownedExporter(transport, endpoint, 'metrics', ProtobufMetricsSerializer,
    metricPoints, (signal, kind, rejected) => responses.observe(signal, kind, rejected));
  let metricDataObjectsFailed = 0;
  let metricFailureAnnounced = false;
  const meterProvider = new MeterProvider({ resource, readers: [new PeriodicExportingMetricReader({
    exporter: { export: (data, done) => {
      let completed = false;
      const finish = (result: ExportResult) => {
        if (completed) return;
        completed = true;
        if (result.code !== 0) {
          const objects = data.scopeMetrics.reduce((n, scope) => n + scope.metrics.length, 0);
          metricDataObjectsFailed += objects;
          lossCounter?.add(objects, {'teaql.telemetry.signal': 'metrics', 'teaql.telemetry.reason': 'export_failure'});
          if (!metricFailureAnnounced) {
            metricFailureAnnounced = true;
            telemetryNotice('TeaQL telemetry: records lost; signal=metrics reason=export_failure. Business outcome unchanged.', true);
          }
        }
        done(result);
      };
      try { metricExporter.export(data, finish); } catch { finish({ code: 1 }); }
    }, forceFlush: () => metricExporter.forceFlush(), shutdown: () => metricExporter.shutdown(),
    selectAggregationTemporality: () => AggregationTemporality.CUMULATIVE },
    exportIntervalMillis: 10000, exportTimeoutMillis: 5000 })] });
  const meter = meterProvider.getMeter('io.teaql.runtime');
  lossCounter = meter.createCounter('teaql.telemetry.export.lost', {
    description: 'Lost span/log records or failed metric-data objects; not metric data points', unit: '{entry}' });
  rejectedCounter = meter.createCounter('teaql.telemetry.export.rejected', {
    description: 'Receiver-rejected spans, log records or metric data points', unit: '{item}' });
  responseCounter = meter.createCounter('teaql.telemetry.export.response', {unit: '{response}'});
  for (const signal of ['traces', 'logs', 'metrics']) {
    rejectedCounter.add(0, {'teaql.telemetry.signal': signal});
    for (const reason of ['partial_success', 'warning', 'invalid_response'])
      responseCounter.add(0, {'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': reason});
    lossCounter.add(0, {'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': 'export_failure'});
  }
  const lost = (amount: number, signal: string, reason: string) => lossCounter!.add(amount,
    {'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': reason});
  const spanHealth = new ExportHealth('traces', 2048, lost);
  const logHealth = new ExportHealth('logs', 2048, lost);
  const spanBatch = new BatchSpanProcessor(reportedExporter(ownedExporter(transport, endpoint, 'traces',
    ProtobufTraceSerializer, spans => spans.length, (signal, kind, rejected) => responses.observe(signal, kind, rejected)), spanHealth), { maxQueueSize: 2048, maxExportBatchSize: 128,
    scheduledDelayMillis: 1000, exportTimeoutMillis: 5000 });
  const spanProcessor: SpanProcessor = {
    onStart: (...args) => spanBatch.onStart(...args),
    onEnd: span => spanHealth.handoff(span, () => spanBatch.onEnd(span)),
    forceFlush: () => spanBatch.forceFlush(), shutdown: () => spanBatch.shutdown(),
  };
  const logBatch = new BatchLogRecordProcessor({
    exporter: reportedExporter(ownedExporter(transport, endpoint, 'logs', ProtobufLogsSerializer,
      logs => logs.length, (signal, kind, rejected) => responses.observe(signal, kind, rejected)), logHealth),
    maxQueueSize: 2048, maxExportBatchSize: 128, scheduledDelayMillis: 1000, exportTimeoutMillis: 5000 });
  const logProcessor: LogRecordProcessor = {
    onEmit: record => logHealth.handoff(record, () => logBatch.onEmit(record)),
    forceFlush: () => logBatch.forceFlush(), shutdown: () => logBatch.shutdown(),
  };
  const tracerProvider = new BasicTracerProvider({ resource, sampler: new AlwaysOnSampler(),
    spanProcessors: [spanProcessor] });
  const loggerProvider = new LoggerProvider({ resource, processors: [logProcessor] });
  let closed = false;
  let shutdownPromise: Promise<void> | undefined;
  const flush = async () => {
    if (closed) return shutdownPromise;
    const spans = spanHealth.waitForPrefix(), logs = logHealth.waitForPrefix();
    await lifecycleDeadline((async () => {
    const records = await Promise.allSettled([tracerProvider.forceFlush(), loggerProvider.forceFlush(), spans, logs]);
    if (closed) return;
    await meterProvider.forceFlush(); // loss/rejection counters follow record completion
    if (records.some(result => result.status === 'rejected')) throw new Error('TeaQL telemetry export incomplete');
  })()); };
  const shutdown = () => shutdownPromise ??= (async () => {
    closed = true;
    spanHealth.close(); logHealth.close();
    const started = performance.now();
    const stopped = Promise.allSettled([tracerProvider.shutdown(), loggerProvider.shutdown()]);
    try {
      try {await Promise.all([spanHealth.waitForPrefix(5000), logHealth.waitForPrefix(5000)]);}
      catch {
        spanHealth.abortQueued(); logHealth.abortQueued(); transport.abort();
        await Promise.all([spanHealth.waitForIdle(200), logHealth.waitForIdle(200)]);
      }
      await lifecycleDeadline(stopped, Math.max(1, 5700 - (performance.now() - started)));
      await lifecycleDeadline(meterProvider.shutdown(), Math.max(1, 5800 - (performance.now() - started)));
    } finally {
      spanHealth.abortQueued(); logHealth.abortQueued(); transport.close();
      await lifecycleDeadline(Promise.all([transport.waitForIdle(200), metricExporter.forceFlush()]),
        Math.max(1, 6000 - (performance.now() - started))).catch(() => {
          telemetryNotice('TeaQL telemetry: owned cleanup deadline reached; business outcome unchanged.', true);
        });
      manager.disable();
    }
  })();
  const executionContext = {
    active: () => manager.active() === ROOT_CONTEXT ? context.active() : manager.active(),
    with: <T>(active: import('@opentelemetry/api').Context, work: () => T): T => manager.with(active, work),
  };
  const adapter = new OpenTelemetryRuntimeTelemetry(tracerProvider.getTracer('io.teaql.runtime'),
    meterProvider.getMeter('io.teaql.runtime'), {}, loggerProvider.getLogger('io.teaql.runtime'), executionContext);
  const telemetry: import('../core/telemetry').RuntimeTelemetry = {
    start: operation => {
      const delegate = closed ? undefined : adapter.start(operation);
      let finished = false;
      const finish = (work: () => void) => {
        if (finished) return; finished = true;
        if (closed) {spanHealth.rejectLate(); logHealth.rejectLate();} else work();
      };
      return {correlation: () => closed ? undefined : delegate?.correlation?.(),
        run: work => !closed && delegate?.run ? delegate.run(work) : work(),
        success: completion => finish(() => delegate!.success(completion)),
        failure: error => finish(() => delegate!.failure(error))};
    },
    recordsSQLDiagnostics: () => !closed,
    recordDiagnostic: event => {if (!closed) adapter.recordDiagnostic(event);},
  };
  const propagator = new W3CTraceContextPropagator();
  telemetry.inject = carrier => propagator.inject(executionContext.active(), carrier, defaultTextMapSetter);
  telemetryNotice('TeaQL telemetry: enabled; traces, metrics, logs, complete TraceChain and masked SQL; recording=all.');
  return { telemetry, flush, shutdown, health: () => ({traceSpansFailed: spanHealth.failedRecords,
    logRecordsFailed: logHealth.failedRecords, metricDataObjectsFailed, responses: responses.snapshot(),
    queues: {traces: spanHealth.snapshot(), logs: logHealth.snapshot()}}) };
}
