// src/core/telemetry-startup.ts
var TELEMETRY_ENVIRONMENT = Object.freeze({
  enabled: "TEAQL_TELEMETRY_ENABLED",
  service: "TEAQL_TELEMETRY_SERVICE_NAME",
  endpoint: "TEAQL_TELEMETRY_OTLP_ENDPOINT"
});
function telemetryNotice(message, warning = false) {
  try {
    if (warning) console.warn(message);
    else console.info(message);
  } catch {
  }
}
function readTelemetryStartupConfiguration(environment) {
  const flag = environment[TELEMETRY_ENVIRONMENT.enabled]?.trim().toLowerCase();
  if (!flag || flag === "false") return Object.freeze({ enabled: false });
  if (flag !== "true") return Object.freeze({ enabled: false, error: "invalid-enable" });
  const serviceName = environment[TELEMETRY_ENVIRONMENT.service]?.trim();
  if (!serviceName || !/^[a-zA-Z0-9_.-]{1,120}$/.test(serviceName)) {
    return Object.freeze({ enabled: false, error: "invalid-service" });
  }
  try {
    const endpoint = new URL(environment[TELEMETRY_ENVIRONMENT.endpoint] || "");
    if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error("invalid endpoint");
    return Object.freeze({ enabled: true, serviceName, endpoint: endpoint.href.replace(/\/$/, "") });
  } catch {
    return Object.freeze({ enabled: false, error: "invalid-endpoint" });
  }
}
function telemetryStartupMessage(configuration) {
  const variables = `${TELEMETRY_ENVIRONMENT.enabled}=true ${TELEMETRY_ENVIRONMENT.service}=<application-name> ${TELEMETRY_ENVIRONMENT.endpoint}=<collector-url>`;
  if (configuration.error) return `TeaQL telemetry: disabled; configuration=${configuration.error}. ${variables}`;
  if (!configuration.enabled) return `TeaQL telemetry: supported, disabled. Enable full masked diagnostics with ${variables}`;
  return `TeaQL telemetry: starting standard module; full recording, masked SQL; ${TELEMETRY_ENVIRONMENT.enabled}=true ${TELEMETRY_ENVIRONMENT.service}=${configuration.serviceName} ${TELEMETRY_ENVIRONMENT.endpoint}=${configuration.endpoint}`;
}

export {
  telemetryNotice,
  readTelemetryStartupConfiguration,
  telemetryStartupMessage
};
//# sourceMappingURL=chunk-LGSUBUWZ.js.map
