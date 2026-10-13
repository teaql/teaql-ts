import { telemetryNotice } from '../core/telemetry-startup';
import type { TelemetrySignal } from './export-health';
import type { ResponseKind } from './owned-otlp-http';

export class ResponseHealth {
  private readonly signals = {
    traces: {rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0},
    logs: {rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0},
    metrics: {rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0},
  };
  private readonly announced = new Set<string>();
  constructor(private readonly record: (signal: TelemetrySignal, kind: ResponseKind, rejected: number) => void) {}
  observe(signal: TelemetrySignal, kind: ResponseKind, rejected: number): void {
    const current = this.signals[signal];
    current.rejected += rejected;
    if (kind === 'partial_success') current.partialSuccess++;
    else if (kind === 'warning') current.warnings++;
    else current.invalidResponses++;
    try { this.record(signal, kind, rejected); } catch { /* diagnosis cannot govern business results */ }
    const key = signal + '/' + kind;
    if (this.announced.has(key)) return;
    this.announced.add(key);
    telemetryNotice(`TeaQL telemetry: receiver response; signal=${signal} reason=${kind}. Business outcome unchanged.`, true);
  }
  snapshot() {
    return {traces: {...this.signals.traces}, logs: {...this.signals.logs}, metrics: {...this.signals.metrics}};
  }
}
