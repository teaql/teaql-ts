/** Environment activation is process configuration, never request input. */
export declare const TELEMETRY_ENVIRONMENT: Readonly<{
    enabled: "TEAQL_TELEMETRY_ENABLED";
    service: "TEAQL_TELEMETRY_SERVICE_NAME";
    endpoint: "TEAQL_TELEMETRY_OTLP_ENDPOINT";
}>;
export declare function telemetryNotice(message: string, warning?: boolean): void;
export type TelemetryStartupConfiguration = Readonly<{
    enabled: boolean;
    serviceName?: string;
    endpoint?: string;
    error?: 'invalid-enable' | 'invalid-service' | 'invalid-endpoint';
}>;
export declare function readTelemetryStartupConfiguration(environment: Readonly<Record<string, string | undefined>>): TelemetryStartupConfiguration;
export declare function telemetryStartupMessage(configuration: TelemetryStartupConfiguration): string;
//# sourceMappingURL=telemetry-startup.d.ts.map