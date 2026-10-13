import type { TelemetrySignal } from './export-health';
import type { ResponseKind } from './owned-otlp-http';
export declare class ResponseHealth {
    private readonly record;
    private readonly signals;
    private readonly announced;
    constructor(record: (signal: TelemetrySignal, kind: ResponseKind, rejected: number) => void);
    observe(signal: TelemetrySignal, kind: ResponseKind, rejected: number): void;
    snapshot(): {
        traces: {
            rejected: number;
            partialSuccess: number;
            warnings: number;
            invalidResponses: number;
        };
        logs: {
            rejected: number;
            partialSuccess: number;
            warnings: number;
            invalidResponses: number;
        };
        metrics: {
            rejected: number;
            partialSuccess: number;
            warnings: number;
            invalidResponses: number;
        };
    };
}
//# sourceMappingURL=response-health.d.ts.map