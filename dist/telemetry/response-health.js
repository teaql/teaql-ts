"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHealth = void 0;
const telemetry_startup_1 = require("../core/telemetry-startup");
class ResponseHealth {
    constructor(record) {
        this.record = record;
        this.signals = {
            traces: { rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0 },
            logs: { rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0 },
            metrics: { rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0 },
        };
        this.announced = new Set();
    }
    observe(signal, kind, rejected) {
        const current = this.signals[signal];
        current.rejected += rejected;
        if (kind === 'partial_success')
            current.partialSuccess++;
        else if (kind === 'warning')
            current.warnings++;
        else
            current.invalidResponses++;
        try {
            this.record(signal, kind, rejected);
        }
        catch { /* diagnosis cannot govern business results */ }
        const key = signal + '/' + kind;
        if (this.announced.has(key))
            return;
        this.announced.add(key);
        (0, telemetry_startup_1.telemetryNotice)(`TeaQL telemetry: receiver response; signal=${signal} reason=${kind}. Business outcome unchanged.`, true);
    }
    snapshot() {
        return { traces: { ...this.signals.traces }, logs: { ...this.signals.logs }, metrics: { ...this.signals.metrics } };
    }
}
exports.ResponseHealth = ResponseHealth;
//# sourceMappingURL=response-health.js.map