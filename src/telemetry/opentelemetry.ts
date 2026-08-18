import {
  Attributes,
  Meter,
  Span,
  SpanStatusCode,
  Tracer,
} from '@opentelemetry/api';
import {
  RuntimeAttributeValue,
  RuntimeOperation,
  RuntimeOperationCompletion,
  RuntimeTelemetry,
  RuntimeTelemetryScope,
} from '../core/telemetry';

export interface OpenTelemetryRuntimeLifecycle {
  flush?: () => void | Promise<void>;
  shutdown?: () => void | Promise<void>;
}

/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
export class OpenTelemetryRuntimeTelemetry implements RuntimeTelemetry {
  private readonly duration;
  private readonly operations;

  constructor(
    private readonly tracer: Tracer,
    meter: Meter,
    private readonly lifecycle: OpenTelemetryRuntimeLifecycle = {},
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
    });
    let ended = false;

    const finish = (outcome: 'success' | 'failure', completion?: RuntimeOperationCompletion) => {
      if (ended) return;
      ended = true;
      if (outcome === 'success') this.setSafeCompletionAttributes(span, completion);
      span.setStatus(outcome === 'success'
        ? { code: SpanStatusCode.OK }
        : { code: SpanStatusCode.ERROR });
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
