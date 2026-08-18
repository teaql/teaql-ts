"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryRuntimeTelemetry = void 0;
const api_1 = require("@opentelemetry/api");
/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
class OpenTelemetryRuntimeTelemetry {
    constructor(tracer, meter, lifecycle = {}, logger) {
        this.tracer = tracer;
        this.lifecycle = lifecycle;
        this.logger = logger;
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
        });
        const activeContext = api_1.trace.setSpan(api_1.context.active(), span);
        let ended = false;
        const finishInContext = (outcome, completion) => {
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
                severityNumber: 9,
                severityText: 'INFO',
                body: 'TeaQL runtime operation completed',
                attributes: {
                    ...metricAttributes,
                    'teaql.operation.name': operation.name,
                    'teaql.operation.duration_ms': durationMs,
                },
            });
            span.end();
        };
        const finish = (outcome, completion) => api_1.context.with(activeContext, () => finishInContext(outcome, completion));
        return {
            run: work => api_1.context.with(activeContext, work),
            success: completion => finish('success', completion),
            failure: error => {
                span.setAttribute('teaql.error.type', this.errorType(error));
                finish('failure');
            },
        };
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