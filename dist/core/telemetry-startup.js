"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryStartupMessage = exports.readTelemetryStartupConfiguration = exports.telemetryNotice = exports.TELEMETRY_ENVIRONMENT = void 0;
/** Environment activation is process configuration, never request input. */
exports.TELEMETRY_ENVIRONMENT = Object.freeze({
    enabled: 'TEAQL_TELEMETRY_ENABLED',
    service: 'TEAQL_TELEMETRY_SERVICE_NAME',
    endpoint: 'TEAQL_TELEMETRY_OTLP_ENDPOINT',
});
function telemetryNotice(message, warning = false) {
    try {
        if (warning)
            console.warn(message);
        else
            console.info(message);
    }
    catch { /* diagnostic output must not change application startup or business work */ }
}
exports.telemetryNotice = telemetryNotice;
function readTelemetryStartupConfiguration(environment) {
    const flag = environment[exports.TELEMETRY_ENVIRONMENT.enabled]?.trim().toLowerCase();
    if (!flag || flag === 'false')
        return Object.freeze({ enabled: false });
    if (flag !== 'true')
        return Object.freeze({ enabled: false, error: 'invalid-enable' });
    const serviceName = environment[exports.TELEMETRY_ENVIRONMENT.service]?.trim();
    if (!serviceName || !/^[a-zA-Z0-9_.-]{1,120}$/.test(serviceName)) {
        return Object.freeze({ enabled: false, error: 'invalid-service' });
    }
    try {
        const endpoint = new URL(environment[exports.TELEMETRY_ENVIRONMENT.endpoint] || '');
        if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password
            || endpoint.search || endpoint.hash)
            throw new Error('invalid endpoint');
        return Object.freeze({ enabled: true, serviceName, endpoint: endpoint.href.replace(/\/$/, '') });
    }
    catch {
        return Object.freeze({ enabled: false, error: 'invalid-endpoint' });
    }
}
exports.readTelemetryStartupConfiguration = readTelemetryStartupConfiguration;
function telemetryStartupMessage(configuration) {
    const variables = `${exports.TELEMETRY_ENVIRONMENT.enabled}=true `
        + `${exports.TELEMETRY_ENVIRONMENT.service}=<application-name> `
        + `${exports.TELEMETRY_ENVIRONMENT.endpoint}=<collector-url>`;
    if (configuration.error)
        return `TeaQL telemetry: disabled; configuration=${configuration.error}. ${variables}`;
    if (!configuration.enabled)
        return `TeaQL telemetry: supported, disabled. Enable full masked diagnostics with ${variables}`;
    return `TeaQL telemetry: starting standard module; full recording, masked SQL; `
        + `${exports.TELEMETRY_ENVIRONMENT.enabled}=true ${exports.TELEMETRY_ENVIRONMENT.service}=${configuration.serviceName} `
        + `${exports.TELEMETRY_ENVIRONMENT.endpoint}=${configuration.endpoint}`;
}
exports.telemetryStartupMessage = telemetryStartupMessage;
//# sourceMappingURL=telemetry-startup.js.map