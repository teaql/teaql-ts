import { Context, Meter, Tracer } from '@opentelemetry/api';
import type { Logger } from '@opentelemetry/api-logs';
import { RuntimeOperation, RuntimeTelemetry, RuntimeTelemetryScope, RuntimeDiagnosticEvent } from '../core/telemetry';
export interface OpenTelemetryRuntimeLifecycle {
    flush?: () => void | Promise<void>;
    shutdown?: () => void | Promise<void>;
}
export interface OpenTelemetryExecutionContext {
    active(): Context;
    with<T>(active: Context, work: () => T): T;
}
/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
export declare class OpenTelemetryRuntimeTelemetry implements RuntimeTelemetry {
    private readonly tracer;
    private readonly lifecycle;
    private readonly logger?;
    private readonly executionContext;
    private readonly duration;
    private readonly operations;
    constructor(tracer: Tracer, meter: Meter, lifecycle?: OpenTelemetryRuntimeLifecycle, logger?: Logger | undefined, executionContext?: OpenTelemetryExecutionContext);
    start(operation: RuntimeOperation): RuntimeTelemetryScope;
    recordDiagnostic(event: RuntimeDiagnosticEvent): void;
    inject(carrier: Record<string, string>): void;
    flush(): void | Promise<void>;
    shutdown(): void | Promise<void>;
    private setSafeCompletionAttributes;
    private errorType;
}
//# sourceMappingURL=opentelemetry.d.ts.map