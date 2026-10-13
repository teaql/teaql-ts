/** Environment activation is process configuration, never request input. */
export const TELEMETRY_ENVIRONMENT = Object.freeze({
  enabled: 'TEAQL_TELEMETRY_ENABLED',
  service: 'TEAQL_TELEMETRY_SERVICE_NAME',
  endpoint: 'TEAQL_TELEMETRY_OTLP_ENDPOINT',
});

export function telemetryNotice(message: string, warning = false): void {
  try { if (warning) console.warn(message); else console.info(message); }
  catch { /* diagnostic output must not change application startup or business work */ }
}

export type TelemetryStartupConfiguration = Readonly<{
  enabled: boolean;
  serviceName?: string;
  endpoint?: string;
  error?: 'invalid-enable' | 'invalid-service' | 'invalid-endpoint';
}>;

export function readTelemetryStartupConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): TelemetryStartupConfiguration {
  const flag = environment[TELEMETRY_ENVIRONMENT.enabled]?.trim().toLowerCase();
  if (!flag || flag === 'false') return Object.freeze({ enabled: false });
  if (flag !== 'true') return Object.freeze({ enabled: false, error: 'invalid-enable' });
  const serviceName = environment[TELEMETRY_ENVIRONMENT.service]?.trim();
  if (!serviceName || !/^[a-zA-Z0-9_.-]{1,120}$/.test(serviceName)) {
    return Object.freeze({ enabled: false, error: 'invalid-service' });
  }
  try {
    const endpoint = new URL(environment[TELEMETRY_ENVIRONMENT.endpoint] || '');
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password
      || endpoint.search || endpoint.hash) throw new Error('invalid endpoint');
    return Object.freeze({ enabled: true, serviceName, endpoint: endpoint.href.replace(/\/$/, '') });
  } catch { return Object.freeze({ enabled: false, error: 'invalid-endpoint' }); }
}

export function telemetryStartupMessage(configuration: TelemetryStartupConfiguration): string {
  const variables = `${TELEMETRY_ENVIRONMENT.enabled}=true `
    + `${TELEMETRY_ENVIRONMENT.service}=<application-name> `
    + `${TELEMETRY_ENVIRONMENT.endpoint}=<collector-url>`;
  if (configuration.error) return `TeaQL telemetry: disabled; configuration=${configuration.error}. ${variables}`;
  if (!configuration.enabled) return `TeaQL telemetry: supported, disabled. Enable full masked diagnostics with ${variables}`;
  return `TeaQL telemetry: starting standard module; full recording, masked SQL; `
    + `${TELEMETRY_ENVIRONMENT.enabled}=true ${TELEMETRY_ENVIRONMENT.service}=${configuration.serviceName} `
    + `${TELEMETRY_ENVIRONMENT.endpoint}=${configuration.endpoint}`;
}
