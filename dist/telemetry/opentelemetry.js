"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryRuntimeTelemetry = void 0;
const api_1 = require("@opentelemetry/api");
const telemetry_1 = require("../core/telemetry");
/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
class OpenTelemetryRuntimeTelemetry {
    constructor(tracer, meter, lifecycle = {}, logger, executionContext = api_1.context) {
        this.tracer = tracer;
        this.lifecycle = lifecycle;
        this.logger = logger;
        this.executionContext = executionContext;
        this.duration = meter.createHistogram('teaql.runtime.operation.duration', {
            description: 'TeaQL runtime operation duration',
            unit: 'ms',
        });
        this.operations = meter.createCounter('teaql.runtime.operation.count', {
            description: 'Completed TeaQL runtime operations',
            unit: '{operation}',
        });
    }
    start(operation) {
        const startedAt = performance.now();
        const span = this.tracer.startSpan(`teaql.${operation.family}`, {
            attributes: operation.attributes,
        }, this.executionContext.active());
        const activeContext = api_1.trace.setSpan(this.executionContext.active(), span);
        let ended = false;
        const finishInContext = (outcome, completion, errorCategory) => {
            if (ended)
                return;
            ended = true;
            if (outcome === 'success')
                this.setSafeCompletionAttributes(span, completion);
            span.setStatus(outcome === 'success'
                ? { code: api_1.SpanStatusCode.OK }
                : { code: api_1.SpanStatusCode.ERROR });
            const durationMs = Math.max(0, performance.now() - startedAt);
            const metricAttributes = {
                'teaql.operation.family': operation.family,
                'teaql.operation.outcome': outcome,
            };
            this.duration.record(durationMs, metricAttributes);
            this.operations.add(1, metricAttributes);
            this.logger?.emit({
                context: activeContext,
                severityNumber: 9,
                severityText: 'INFO',
                body: 'TeaQL runtime operation completed',
                attributes: {
                    ...metricAttributes,
                    'teaql.operation.name': operation.name,
                    'teaql.operation.duration_ms': durationMs,
                    ...(errorCategory ? { 'teaql.error.category': errorCategory } : {}),
                },
            });
            span.end();
        };
        const finish = (outcome, completion, errorCategory) => this.executionContext.with(activeContext, () => finishInContext(outcome, completion, errorCategory));
        return {
            correlation: () => ({ traceId: span.spanContext().traceId, spanId: span.spanContext().spanId }),
            run: work => this.executionContext.with(activeContext, work),
            success: completion => finish('success', completion),
            failure: error => {
                const category = (0, telemetry_1.runtimeErrorCategory)(error);
                span.setAttribute('teaql.error.type', this.errorType(error));
                span.setAttribute('teaql.error.category', category);
                finish('failure', undefined, category);
            },
        };
    }
    recordDiagnostic(event) {
        const identity = event.correlation;
        if (!identity || !/^[0-9a-f]{32}$/.test(identity.traceId) || !/^[0-9a-f]{16}$/.test(identity.spanId)
            || /^0+$/.test(identity.traceId) || /^0+$/.test(identity.spanId)) {
            throw new Error('Missing SQL execution correlation');
        }
        this.logger?.emit({ severityNumber: 9, severityText: 'INFO', body: event.body,
            context: api_1.trace.setSpanContext(this.executionContext.active(), { ...identity, traceFlags: 1 }),
            attributes: event.attributes });
    }
    inject(carrier) {
        api_1.propagation.inject(this.executionContext.active(), carrier);
    }
    flush() {
        return this.lifecycle.flush?.();
    }
    shutdown() {
        return this.lifecycle.shutdown?.();
    }
    setSafeCompletionAttributes(span, completion) {
        for (const [key, value] of Object.entries(completion?.attributes || {})) {
            if (key === 'teaql.result.cardinality' || key === 'teaql.cache.result') {
                span.setAttribute(key, value);
            }
        }
    }
    errorType(error) {
        if (error instanceof Error && error.constructor?.name)
            return error.constructor.name;
        return typeof error;
    }
}
exports.OpenTelemetryRuntimeTelemetry = OpenTelemetryRuntimeTelemetry;
//# sourceMappingURL=opentelemetry.js.map