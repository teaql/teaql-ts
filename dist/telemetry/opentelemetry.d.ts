import { Meter, Tracer } from '@opentelemetry/api';
import { RuntimeOperation, RuntimeTelemetry, RuntimeTelemetryScope } from '../core/telemetry';
export interface OpenTelemetryRuntimeLifecycle {
    flush?: () => void | Promise<void>;
    shutdown?: () => void | Promise<void>;
}
/** Bridges the provider-neutral TeaQL lifecycle to application-owned OTel providers. */
export declare class OpenTelemetryRuntimeTelemetry implements RuntimeTelemetry {
    private readonly tracer;
    private readonly lifecycle;
    private readonly duration;
    private readonly operations;
    constructor(tracer: Tracer, meter: Meter, lifecycle?: OpenTelemetryRuntimeLifecycle);
    start(operation: RuntimeOperation): RuntimeTelemetryScope;
    flush(): void | Promise<void>;
    shutdown(): void | Promise<void>;
    private setSafeCompletionAttributes;
    private errorType;
}
//# sourceMappingURL=opentelemetry.d.ts.map