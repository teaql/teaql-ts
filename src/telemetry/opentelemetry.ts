import {
  Attributes,
  Context,
  context,
  Meter,
  propagation,
  Span,
  SpanStatusCode,
  Tracer,
  trace,
} from '@opentelemetry/api';
import type { Logger } from '@opentelemetry/api-logs';
import {
  RuntimeAttributeValue,
  RuntimeOperation,
  RuntimeOperationCompletion,
  RuntimeTelemetry,
  RuntimeTelemetryScope,
  RuntimeDiagnosticEvent,
  runtimeErrorCategory,
} from '../core/telemetry';

export interface OpenTelemetryRuntimeLifecycle {
  flush?: () => void | Promise<void>;
  shutdown?: () => void | Promise<void>;
}

export interface OpenTelemetryExecutionContext {
  active(): Context;
  with<T>(active: Context, work: () => T): T;
}

/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
export class OpenTelemetryRuntimeTelemetry implements RuntimeTelemetry {
  private readonly duration;
  private readonly operations;

  constructor(
    private readonly tracer: Tracer,
    meter: Meter,
    private readonly lifecycle: OpenTelemetryRuntimeLifecycle = {},
    private readonly logger?: Logger,
    private readonly executionContext: OpenTelemetryExecutionContext = context,
  ) {
    this.duration = meter.createHistogram('teaql.runtime.operation.duration', {
      description: 'TeaQL runtime operation duration',
      unit: 'ms',
    });
    this.operations = meter.createCounter('teaql.runtime.operation.count', {
      description: 'Completed TeaQL runtime operations',
      unit: '{operation}',
    });
  }

  start(operation: RuntimeOperation): RuntimeTelemetryScope {
    const startedAt = performance.now();
    const span = this.tracer.startSpan(`teaql.${operation.family}`, {
      attributes: operation.attributes as Attributes,
    }, this.executionContext.active());
    const activeContext = trace.setSpan(this.executionContext.active(), span);
    let ended = false;

    const finishInContext = (outcome: 'success' | 'failure', completion?: RuntimeOperationCompletion,
      errorCategory?: string) => {
      if (ended) return;
      ended = true;
      if (outcome === 'success') this.setSafeCompletionAttributes(span, completion);
      span.setStatus(outcome === 'success'
        ? { code: SpanStatusCode.OK }
        : { code: SpanStatusCode.ERROR });
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
    const finish = (outcome: 'success' | 'failure', completion?: RuntimeOperationCompletion,
      errorCategory?: string) =>
      this.executionContext.with(activeContext, () => finishInContext(outcome, completion, errorCategory));

    return {
      correlation: () => ({ traceId: span.spanContext().traceId, spanId: span.spanContext().spanId }),
      run: work => this.executionContext.with(activeContext, work),
      success: completion => finish('success', completion),
      failure: error => {
        const category = runtimeErrorCategory(error);
        span.setAttribute('teaql.error.type', this.errorType(error));
        span.setAttribute('teaql.error.category', category);
        finish('failure', undefined, category);
      },
    };
  }

  recordDiagnostic(event: RuntimeDiagnosticEvent): void {
    const identity = event.correlation;
    if (!identity || !/^[0-9a-f]{32}$/.test(identity.traceId) || !/^[0-9a-f]{16}$/.test(identity.spanId)
      || /^0+$/.test(identity.traceId) || /^0+$/.test(identity.spanId)) {
      throw new Error('Missing SQL execution correlation');
    }
    this.logger?.emit({ severityNumber: 9, severityText: 'INFO', body: event.body,
      context: trace.setSpanContext(this.executionContext.active(), { ...identity, traceFlags: 1 }),
      attributes: event.attributes });
  }

  inject(carrier: Record<string, string>): void {
    propagation.inject(this.executionContext.active(), carrier);
  }

  flush(): void | Promise<void> {
    return this.lifecycle.flush?.();
  }

  shutdown(): void | Promise<void> {
    return this.lifecycle.shutdown?.();
  }

  private setSafeCompletionAttributes(span: Span, completion?: RuntimeOperationCompletion): void {
    for (const [key, value] of Object.entries(completion?.attributes || {})) {
      if (key === 'teaql.result.cardinality' || key === 'teaql.cache.result') {
        span.setAttribute(key, value as RuntimeAttributeValue);
      }
    }
  }

  private errorType(error: unknown): string {
    if (error instanceof Error && error.constructor?.name) return error.constructor.name;
    return typeof error;
  }
}
