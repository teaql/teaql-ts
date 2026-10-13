"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStandardNodePipeline = void 0;
const api_1 = require("@opentelemetry/api");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const core_1 = require("@opentelemetry/core");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const resources_1 = require("@opentelemetry/resources");
const opentelemetry_1 = require("./opentelemetry");
const telemetry_startup_1 = require("../core/telemetry-startup");
const export_health_1 = require("./export-health");
const owned_otlp_http_1 = require("./owned-otlp-http");
const response_health_1 = require("./response-health");
function reportedExporter(delegate, health) {
    return {
        export: (records, done) => {
            const ticket = health.beginExport(records);
            if (!ticket) {
                done({ code: 0 });
                return;
            }
            let completed = false;
            const finish = (result) => {
                if (completed)
                    return;
                completed = true;
                ticket.complete(result.code !== 0);
                done(result);
            };
            try {
                delegate.export(records, finish);
            }
            catch {
                finish({ code: 1 });
            }
        },
        shutdown: () => delegate.shutdown(),
        forceFlush: () => delegate.forceFlush?.() ?? Promise.resolve(),
    };
}
/** Isolated providers; never registers or replaces process-global OTel configuration. */
function createStandardNodePipeline(serviceName, endpoint) {
    const resource = (0, resources_1.resourceFromAttributes)({ 'service.name': serviceName, 'teaql.runtime.language': 'typescript' });
    const manager = new context_async_hooks_1.AsyncLocalStorageContextManager().enable();
    const transport = new owned_otlp_http_1.OwnedOTLPHTTP();
    let lossCounter;
    let rejectedCounter, responseCounter;
    const responses = new response_health_1.ResponseHealth((signal, reason, rejected) => {
        rejectedCounter?.add(rejected, { 'teaql.telemetry.signal': signal });
        responseCounter?.add(1, { 'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': reason });
    });
    const metricPoints = (data) => data.scopeMetrics.reduce((n, scope) => n + scope.metrics.reduce((m, metric) => m + metric.dataPoints.length, 0), 0);
    const metricExporter = (0, owned_otlp_http_1.ownedExporter)(transport, endpoint, 'metrics', otlp_transformer_1.ProtobufMetricsSerializer, metricPoints, (signal, kind, rejected) => responses.observe(signal, kind, rejected));
    let metricDataObjectsFailed = 0;
    let metricFailureAnnounced = false;
    const meterProvider = new sdk_metrics_1.MeterProvider({ resource, readers: [new sdk_metrics_1.PeriodicExportingMetricReader({
                exporter: { export: (data, done) => {
                        let completed = false;
                        const finish = (result) => {
                            if (completed)
                                return;
                            completed = true;
                            if (result.code !== 0) {
                                const objects = data.scopeMetrics.reduce((n, scope) => n + scope.metrics.length, 0);
                                metricDataObjectsFailed += objects;
                                lossCounter?.add(objects, { 'teaql.telemetry.signal': 'metrics', 'teaql.telemetry.reason': 'export_failure' });
                                if (!metricFailureAnnounced) {
                                    metricFailureAnnounced = true;
                                    (0, telemetry_startup_1.telemetryNotice)('TeaQL telemetry: records lost; signal=metrics reason=export_failure. Business outcome unchanged.', true);
                                }
                            }
                            done(result);
                        };
                        try {
                            metricExporter.export(data, finish);
                        }
                        catch {
                            finish({ code: 1 });
                        }
                    }, forceFlush: () => metricExporter.forceFlush(), shutdown: () => metricExporter.shutdown(),
                    selectAggregationTemporality: () => sdk_metrics_1.AggregationTemporality.CUMULATIVE },
                exportIntervalMillis: 10000, exportTimeoutMillis: 5000
            })] });
    const meter = meterProvider.getMeter('io.teaql.runtime');
    lossCounter = meter.createCounter('teaql.telemetry.export.lost', {
        description: 'Lost span/log records or failed metric-data objects; not metric data points', unit: '{entry}'
    });
    rejectedCounter = meter.createCounter('teaql.telemetry.export.rejected', {
        description: 'Receiver-rejected spans, log records or metric data points', unit: '{item}'
    });
    responseCounter = meter.createCounter('teaql.telemetry.export.response', { unit: '{response}' });
    for (const signal of ['traces', 'logs', 'metrics']) {
        rejectedCounter.add(0, { 'teaql.telemetry.signal': signal });
        for (const reason of ['partial_success', 'warning', 'invalid_response'])
            responseCounter.add(0, { 'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': reason });
        lossCounter.add(0, { 'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': 'export_failure' });
    }
    const lost = (amount, signal, reason) => lossCounter.add(amount, { 'teaql.telemetry.signal': signal, 'teaql.telemetry.reason': reason });
    const spanHealth = new export_health_1.ExportHealth('traces', 2048, lost);
    const logHealth = new export_health_1.ExportHealth('logs', 2048, lost);
    const spanBatch = new sdk_trace_base_1.BatchSpanProcessor(reportedExporter((0, owned_otlp_http_1.ownedExporter)(transport, endpoint, 'traces', otlp_transformer_1.ProtobufTraceSerializer, spans => spans.length, (signal, kind, rejected) => responses.observe(signal, kind, rejected)), spanHealth), { maxQueueSize: 2048, maxExportBatchSize: 128,
        scheduledDelayMillis: 1000, exportTimeoutMillis: 5000 });
    const spanProcessor = {
        onStart: (...args) => spanBatch.onStart(...args),
        onEnd: span => spanHealth.handoff(span, () => spanBatch.onEnd(span)),
        forceFlush: () => spanBatch.forceFlush(), shutdown: () => spanBatch.shutdown(),
    };
    const logBatch = new sdk_logs_1.BatchLogRecordProcessor({
        exporter: reportedExporter((0, owned_otlp_http_1.ownedExporter)(transport, endpoint, 'logs', otlp_transformer_1.ProtobufLogsSerializer, logs => logs.length, (signal, kind, rejected) => responses.observe(signal, kind, rejected)), logHealth),
        maxQueueSize: 2048, maxExportBatchSize: 128, scheduledDelayMillis: 1000, exportTimeoutMillis: 5000
    });
    const logProcessor = {
        onEmit: record => logHealth.handoff(record, () => logBatch.onEmit(record)),
        forceFlush: () => logBatch.forceFlush(), shutdown: () => logBatch.shutdown(),
    };
    const tracerProvider = new sdk_trace_base_1.BasicTracerProvider({ resource, sampler: new sdk_trace_base_1.AlwaysOnSampler(),
        spanProcessors: [spanProcessor] });
    const loggerProvider = new sdk_logs_1.LoggerProvider({ resource, processors: [logProcessor] });
    let closed = false;
    let shutdownPromise;
    const flush = async () => {
        if (closed)
            return shutdownPromise;
        const spans = spanHealth.waitForPrefix(), logs = logHealth.waitForPrefix();
        await (0, export_health_1.lifecycleDeadline)((async () => {
            const records = await Promise.allSettled([tracerProvider.forceFlush(), loggerProvider.forceFlush(), spans, logs]);
            if (closed)
                return;
            await meterProvider.forceFlush(); // loss/rejection counters follow record completion
            if (records.some(result => result.status === 'rejected'))
                throw new Error('TeaQL telemetry export incomplete');
        })());
    };
    const shutdown = () => shutdownPromise ?? (shutdownPromise = (async () => {
        closed = true;
        spanHealth.close();
        logHealth.close();
        const started = performance.now();
        const stopped = Promise.allSettled([tracerProvider.shutdown(), loggerProvider.shutdown()]);
        try {
            try {
                await Promise.all([spanHealth.waitForPrefix(5000), logHealth.waitForPrefix(5000)]);
            }
            catch {
                spanHealth.abortQueued();
                logHealth.abortQueued();
                transport.abort();
                await Promise.all([spanHealth.waitForIdle(200), logHealth.waitForIdle(200)]);
            }
            await (0, export_health_1.lifecycleDeadline)(stopped, Math.max(1, 5700 - (performance.now() - started)));
            await (0, export_health_1.lifecycleDeadline)(meterProvider.shutdown(), Math.max(1, 5800 - (performance.now() - started)));
        }
        finally {
            spanHealth.abortQueued();
            logHealth.abortQueued();
            transport.close();
            await (0, export_health_1.lifecycleDeadline)(Promise.all([transport.waitForIdle(200), metricExporter.forceFlush()]), Math.max(1, 6000 - (performance.now() - started))).catch(() => {
                (0, telemetry_startup_1.telemetryNotice)('TeaQL telemetry: owned cleanup deadline reached; business outcome unchanged.', true);
            });
            manager.disable();
        }
    })());
    const executionContext = {
        active: () => manager.active() === api_1.ROOT_CONTEXT ? api_1.context.active() : manager.active(),
        with: (active, work) => manager.with(active, work),
    };
    const adapter = new opentelemetry_1.OpenTelemetryRuntimeTelemetry(tracerProvider.getTracer('io.teaql.runtime'), meterProvider.getMeter('io.teaql.runtime'), {}, loggerProvider.getLogger('io.teaql.runtime'), executionContext);
    const telemetry = {
        start: operation => {
            const delegate = closed ? undefined : adapter.start(operation);
            let finished = false;
            const finish = (work) => {
                if (finished)
                    return;
                finished = true;
                if (closed) {
                    spanHealth.rejectLate();
                    logHealth.rejectLate();
                }
                else
                    work();
            };
            return { correlation: () => closed ? undefined : delegate?.correlation?.(),
                run: work => !closed && delegate?.run ? delegate.run(work) : work(),
                success: completion => finish(() => delegate.success(completion)),
                failure: error => finish(() => delegate.failure(error)) };
        },
        recordsSQLDiagnostics: () => !closed,
        recordDiagnostic: event => { if (!closed)
            adapter.recordDiagnostic(event); },
    };
    const propagator = new core_1.W3CTraceContextPropagator();
    telemetry.inject = carrier => propagator.inject(executionContext.active(), carrier, api_1.defaultTextMapSetter);
    (0, telemetry_startup_1.telemetryNotice)('TeaQL telemetry: enabled; traces, metrics, logs, complete TraceChain and masked SQL; recording=all.');
    return { telemetry, flush, shutdown, health: () => ({ traceSpansFailed: spanHealth.failedRecords,
            logRecordsFailed: logHealth.failedRecords, metricDataObjectsFailed, responses: responses.snapshot(),
            queues: { traces: spanHealth.snapshot(), logs: logHealth.snapshot() } }) };
}
exports.createStandardNodePipeline = createStandardNodePipeline;
//# sourceMappingURL=standard-node-sdk.js.map