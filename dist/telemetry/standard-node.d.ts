import type { RuntimeTelemetry } from '../core/telemetry';
import type { QueueHealth, TelemetrySignal } from './export-health';
export interface StandardTelemetryHealth {
    readonly traceSpansFailed: number;
    readonly logRecordsFailed: number;
    readonly metricDataObjectsFailed: number;
    readonly responses: Readonly<Record<TelemetrySignal, Readonly<{
        rejected: number;
        partialSuccess: number;
        warnings: number;
        invalidResponses: number;
    }>>>;
    readonly queues: Readonly<Record<'traces' | 'logs', QueueHealth>>;
}
export interface StandardTelemetryHandle {
    readonly telemetry: RuntimeTelemetry;
    flush(): Promise<void>;
    release(): Promise<void>;
    health?(): StandardTelemetryHealth;
}
/** Node entry point; importing it does not import or initialize any OTel SDK. */
export declare function startStandardNodeTelemetry(): Promise<StandardTelemetryHandle | undefined>;
//# sourceMappingURL=standard-node.d.ts.map