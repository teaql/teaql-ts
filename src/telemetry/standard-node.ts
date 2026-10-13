import { readTelemetryStartupConfiguration, telemetryStartupMessage, telemetryNotice } from '../core/telemetry-startup';
import type { RuntimeTelemetry } from '../core/telemetry';
import type { QueueHealth, TelemetrySignal } from './export-health';

export interface StandardTelemetryHealth {
  readonly traceSpansFailed: number;
  readonly logRecordsFailed: number;
  readonly metricDataObjectsFailed: number;
  readonly responses: Readonly<Record<TelemetrySignal, Readonly<{
    rejected: number; partialSuccess: number; warnings: number; invalidResponses: number;
  }>>>;
  readonly queues: Readonly<Record<'traces' | 'logs', QueueHealth>>;
}

export interface StandardTelemetryHandle {
  readonly telemetry: RuntimeTelemetry;
  flush(): Promise<void>;
  release(): Promise<void>;
  health?(): StandardTelemetryHealth;
}

type Pipeline = { telemetry: RuntimeTelemetry; flush(): Promise<void>; shutdown(): Promise<void>; health?(): StandardTelemetryHealth };
const pipelines = new Map<string, { references: number; ready: Promise<Pipeline> }>();
const announcements = new Set<string>();

/** Node entry point; importing it does not import or initialize any OTel SDK. */
export function startStandardNodeTelemetry(): Promise<StandardTelemetryHandle | undefined> {
  const configuration = readTelemetryStartupConfiguration(process.env);
  const message = telemetryStartupMessage(configuration);
  if (!announcements.has(message)) {
    announcements.add(message);
    telemetryNotice(message);
  }
  if (!configuration.enabled) return Promise.resolve(undefined);
  const key = `${configuration.serviceName}|${configuration.endpoint}`;
  let entry = pipelines.get(key);
  if (!entry) {
    entry = { references: 0, ready: import('./standard-node-sdk').then(module =>
      module.createStandardNodePipeline(configuration.serviceName!, configuration.endpoint!)) };
    pipelines.set(key, entry);
  }
  const ownedEntry = entry;
  ownedEntry.references++;
  return ownedEntry.ready.then(pipeline => {
    let released = false;
    return {
      telemetry: pipeline.telemetry,
      flush: () => pipeline.flush(),
      health: pipeline.health ? () => pipeline.health!() : undefined,
      release: async () => {
        if (released) return;
        released = true;
        ownedEntry.references--;
        if (ownedEntry.references !== 0) return;
        if (pipelines.get(key) === ownedEntry) pipelines.delete(key);
        try { await pipeline.shutdown(); }
        catch { telemetryNotice('TeaQL telemetry: owned pipeline shutdown failed; business outcome unchanged.', true); }
      },
    };
  }).catch(() => {
    if (pipelines.get(key) === ownedEntry) pipelines.delete(key);
    telemetryNotice('TeaQL telemetry: standard module unavailable; check installed SDK dependencies. Business continues without export.', true);
    return undefined;
  });
}
