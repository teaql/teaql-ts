/** Isolated providers; never registers or replaces process-global OTel configuration. */
export declare function createStandardNodePipeline(serviceName: string, endpoint: string): {
    telemetry: import("../core/telemetry").RuntimeTelemetry;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
    health: () => {
        traceSpansFailed: number;
        logRecordsFailed: number;
        metricDataObjectsFailed: number;
        responses: {
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
        queues: {
            traces: Readonly<{
                offered: number;
                admitted: number;
                completed: number;
                outstanding: number;
                exporting: number;
                overflow: number;
                postShutdown: number;
                handoffFailed: number;
                retired: number;
            }>;
            logs: Readonly<{
                offered: number;
                admitted: number;
                completed: number;
                outstanding: number;
                exporting: number;
                overflow: number;
                postShutdown: number;
                handoffFailed: number;
                retired: number;
            }>;
        };
    };
};
//# sourceMappingURL=standard-node-sdk.d.ts.map