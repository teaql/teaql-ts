import {
  readTelemetryStartupConfiguration,
  telemetryNotice,
  telemetryStartupMessage
} from "./chunk-LGSUBUWZ.js";

// src/telemetry/standard-node.ts
var pipelines = /* @__PURE__ */ new Map();
var announcements = /* @__PURE__ */ new Set();
function startStandardNodeTelemetry() {
  const configuration = readTelemetryStartupConfiguration(process.env);
  const message = telemetryStartupMessage(configuration);
  if (!announcements.has(message)) {
    announcements.add(message);
    telemetryNotice(message);
  }
  if (!configuration.enabled) return Promise.resolve(void 0);
  const key = `${configuration.serviceName}|${configuration.endpoint}`;
  let entry = pipelines.get(key);
  if (!entry) {
    entry = { references: 0, ready: import("./standard-node-sdk-CX5SOKI2.js").then((module) => module.createStandardNodePipeline(configuration.serviceName, configuration.endpoint)) };
    pipelines.set(key, entry);
  }
  const ownedEntry = entry;
  ownedEntry.references++;
  return ownedEntry.ready.then((pipeline) => {
    let released = false;
    return {
      telemetry: pipeline.telemetry,
      flush: () => pipeline.flush(),
      health: pipeline.health ? () => pipeline.health() : void 0,
      release: async () => {
        if (released) return;
        released = true;
        ownedEntry.references--;
        if (ownedEntry.references !== 0) return;
        if (pipelines.get(key) === ownedEntry) pipelines.delete(key);
        try {
          await pipeline.shutdown();
        } catch {
          telemetryNotice("TeaQL telemetry: owned pipeline shutdown failed; business outcome unchanged.", true);
        }
      }
    };
  }).catch(() => {
    if (pipelines.get(key) === ownedEntry) pipelines.delete(key);
    telemetryNotice("TeaQL telemetry: standard module unavailable; check installed SDK dependencies. Business continues without export.", true);
    return void 0;
  });
}

export {
  startStandardNodeTelemetry
};
//# sourceMappingURL=chunk-ZY7L4QDF.js.map
