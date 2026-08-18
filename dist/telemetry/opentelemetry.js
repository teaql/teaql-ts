"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryRuntimeTelemetry = void 0;
const api_1 = require("@opentelemetry/api");
/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
class OpenTelemetryRuntimeTelemetry {
    constructor(tracer, meter, lifecycle = {}) {
        this.tracer = tracer;
        this.lifecycle = lifecycle;
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
        let ended = false;
        const finish = (outcome, completion) => {
            if (ended)
                return;
            ended = true;
            if (outcome === 'success')
                this.setSafeCompletionAttributes(span, completion);
            span.setStatus(outcome === 'success'
                ? { code: api_1.SpanStatusCode.OK }
                : { code: api_1.SpanStatusCode.ERROR });
            const metricAttributes = {
                'teaql.operation.family': operation.family,
                'teaql.operation.outcome': outcome,
            };
            this.duration.record(Math.max(0, performance.now() - startedAt), metricAttributes);
            this.operations.add(1, metricAttributes);
            span.end();
        };
        return {
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