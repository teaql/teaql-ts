import type { ExportResult } from '@opentelemetry/core';
import type { ISerializer } from '@opentelemetry/otlp-transformer';
import type { TelemetrySignal } from './export-health';
export type ResponseKind = 'partial_success' | 'warning' | 'invalid_response';
export type Acknowledgement = {
    partialSuccess?: {
        rejectedSpans?: number;
        rejectedLogRecords?: number;
        rejectedDataPoints?: number;
        errorMessage?: string;
    };
};
/** Strict framing guard for the two-level proto3 acknowledgement, not a second OTLP codec. */
export declare function validateAcknowledgementBytes(bytes: Uint8Array, partial?: boolean): void;
export declare function acknowledgementResult(signal: TelemetrySignal, response: Acknowledgement, submitted: number): {
    rejected: number;
    kind: "partial_success" | "warning" | undefined;
};
/** Pipeline-owned agents, no global fetch/agent/SDK interception, retries or redirects. */
export declare class OwnedOTLPHTTP {
    private readonly httpAgent;
    private readonly httpsAgent;
    private readonly requests;
    private closed;
    private readonly idleWaiters;
    send(url: string, payload: Uint8Array): Promise<{
        bytes?: Uint8Array;
        invalid?: boolean;
    }>;
    abort(): void;
    close(): void;
    waitForIdle(timeoutMillis?: number): Promise<void>;
}
export declare function ownedExporter<T, R extends Acknowledgement>(transport: OwnedOTLPHTTP, endpoint: string, signal: TelemetrySignal, serializer: ISerializer<T, R>, submitted: (data: T) => number, observe: (signal: TelemetrySignal, kind: ResponseKind, rejected: number) => void): {
    export(data: T, done: (result: ExportResult) => void): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
};
//# sourceMappingURL=owned-otlp-http.d.ts.map