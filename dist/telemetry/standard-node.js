"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStandardNodeTelemetry = void 0;
const telemetry_startup_1 = require("../core/telemetry-startup");
const pipelines = new Map();
const announcements = new Set();
/** Node entry point; importing it does not import or initialize any OTel SDK. */
function startStandardNodeTelemetry() {
    const configuration = (0, telemetry_startup_1.readTelemetryStartupConfiguration)(process.env);
    const message = (0, telemetry_startup_1.telemetryStartupMessage)(configuration);
    if (!announcements.has(message)) {
        announcements.add(message);
        (0, telemetry_startup_1.telemetryNotice)(message);
    }
    if (!configuration.enabled)
        return Promise.resolve(undefined);
    const key = `${configuration.serviceName}|${configuration.endpoint}`;
    let entry = pipelines.get(key);
    if (!entry) {
        entry = { references: 0, ready: Promise.resolve().then(() => __importStar(require('./standard-node-sdk'))).then(module => module.createStandardNodePipeline(configuration.serviceName, configuration.endpoint)) };
        pipelines.set(key, entry);
    }
    const ownedEntry = entry;
    ownedEntry.references++;
    return ownedEntry.ready.then(pipeline => {
        let released = false;
        return {
            telemetry: pipeline.telemetry,
            flush: () => pipeline.flush(),
            health: pipeline.health ? () => pipeline.health() : undefined,
            release: async () => {
                if (released)
                    return;
                released = true;
                ownedEntry.references--;
                if (ownedEntry.references !== 0)
                    return;
                if (pipelines.get(key) === ownedEntry)
                    pipelines.delete(key);
                try {
                    await pipeline.shutdown();
                }
                catch {
                    (0, telemetry_startup_1.telemetryNotice)('TeaQL telemetry: owned pipeline shutdown failed; business outcome unchanged.', true);
                }
            },
        };
    }).catch(() => {
        if (pipelines.get(key) === ownedEntry)
            pipelines.delete(key);
        (0, telemetry_startup_1.telemetryNotice)('TeaQL telemetry: standard module unavailable; check installed SDK dependencies. Business continues without export.', true);
        return undefined;
    });
}
exports.startStandardNodeTelemetry = startStandardNodeTelemetry;
//# sourceMappingURL=standard-node.js.map