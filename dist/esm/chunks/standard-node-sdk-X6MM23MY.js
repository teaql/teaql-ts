import {
  OpenTelemetryRuntimeTelemetry
} from "./chunk-O2KIXNMG.js";
import {
  telemetryNotice
} from "./chunk-LGSUBUWZ.js";
import "./chunk-D5QV4N46.js";
import "./chunk-IQGZNIAK.js";

// src/telemetry/standard-node-sdk.ts
import { context, ROOT_CONTEXT, defaultTextMapSetter } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { AlwaysOnSampler, BasicTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { AggregationTemporality, MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { ProtobufLogsSerializer, ProtobufMetricsSerializer, ProtobufTraceSerializer } from "@opentelemetry/otlp-transformer";
import { resourceFromAttributes } from "@opentelemetry/resources";

// src/telemetry/export-health.ts
var ExportHealth = class {
  constructor(signal, capacity, onLoss) {
    this.signal = signal;
    this.capacity = capacity;
    this.onLoss = onLoss;
    this.pending = /* @__PURE__ */ new Set();
    this.records = /* @__PURE__ */ new WeakMap();
    this.changed = /* @__PURE__ */ new Set();
    this.offered = 0;
    this.admitted = 0;
    this.completed = 0;
    this.overflow = 0;
    this.postShutdown = 0;
    this.handoffFailed = 0;
    this.retired = 0;
    this.failures = 0;
    this.closed = false;
    this.aborted = false;
    this.announced = /* @__PURE__ */ new Set();
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("Invalid telemetry queue capacity");
  }
  admit(amount = 1) {
    if (!this.reserve(amount)) return false;
    for (let index = 0; index < amount; index++) this.pending.add({ sequence: ++this.admitted, state: "queued" });
    return true;
  }
  complete(amount, failed) {
    this.settle([...this.pending].slice(0, amount), failed);
  }
  reserve(amount) {
    this.offered += amount;
    if (this.closed) {
      this.postShutdown += amount;
      this.lost(amount, "shutdown");
      return false;
    }
    if (this.pending.size + amount > this.capacity) {
      this.overflow += amount;
      this.lost(amount, "queue_overflow");
      return false;
    }
    return true;
  }
  /** SDK object identity carries admission; never infer tickets from equal data or completion order. */
  handoff(record, submit) {
    if (!this.reserve(1)) return;
    const admission = { state: "queued" };
    this.pending.add(admission);
    this.records.set(record, admission);
    try {
      submit();
      admission.sequence = ++this.admitted;
      if (admission.state === "complete") this.completed++;
    } catch {
      this.pending.delete(admission);
      this.records.delete(record);
      this.handoffFailed++;
      this.lost(1, "handoff_failure");
    }
    this.notify();
  }
  beginExport(records) {
    if (this.aborted) return void 0;
    const batch = records.map((record) => this.records.get(record));
    if (batch.some((record) => !record || record.state !== "queued")) return void 0;
    const admissions = batch;
    for (const admission of admissions) admission.state = "exporting";
    let completed = false;
    return { complete: (failed) => {
      if (completed) return;
      completed = true;
      this.settle(admissions, failed);
    } };
  }
  settle(admissions, failed) {
    let settled = 0;
    for (const admission of admissions) {
      if (!this.pending.delete(admission)) continue;
      admission.state = "complete";
      settled++;
      if (admission.sequence !== void 0) this.completed++;
    }
    if (failed && settled) {
      this.failures += settled;
      this.lost(settled, "export_failure");
    }
    this.notify();
  }
  abortQueued() {
    if (this.aborted) return;
    this.aborted = true;
    let retired = 0;
    for (const admission of this.pending) if (admission.state === "queued") {
      this.pending.delete(admission);
      admission.state = "retired";
      retired++;
    }
    this.retired += retired;
    if (retired) this.lost(retired, "shutdown");
    this.notify();
  }
  /** Captured prefix excludes later submissions and cannot be satisfied by their completion. */
  waitForPrefix(timeoutMillis = 5e3) {
    const target = this.admitted;
    return this.wait(() => ![...this.pending].some((record) => record.sequence !== void 0 && record.sequence <= target), timeoutMillis);
  }
  waitForIdle(timeoutMillis = 200) {
    return this.wait(() => this.pending.size === 0, timeoutMillis);
  }
  wait(ready, timeoutMillis) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = (failed) => {
        clearTimeout(timer);
        this.changed.delete(check);
        if (failed) reject(new Error("TeaQL telemetry drain timed out"));
        else resolve();
      };
      const check = () => {
        if (ready()) finish(false);
      };
      const timer = setTimeout(() => finish(true), timeoutMillis);
      this.changed.add(check);
      check();
    });
  }
  notify() {
    for (const observer of [...this.changed]) observer();
  }
  lost(amount, reason) {
    try {
      this.onLoss(amount, this.signal, reason);
    } catch {
    }
    if (this.announced.has(reason)) return;
    this.announced.add(reason);
    telemetryNotice(`TeaQL telemetry: records lost; signal=${this.signal} reason=${reason}. Business outcome unchanged.`, true);
  }
  get pendingRecords() {
    return this.pending.size;
  }
  get failedRecords() {
    return this.failures;
  }
  close() {
    this.closed = true;
  }
  rejectLate() {
    this.offered++;
    this.postShutdown++;
    this.lost(1, "shutdown");
  }
  snapshot() {
    return {
      offered: this.offered,
      admitted: this.admitted,
      completed: this.completed,
      outstanding: this.pending.size,
      exporting: [...this.pending].filter((record) => record.state === "exporting").length,
      overflow: this.overflow,
      postShutdown: this.postShutdown,
      handoffFailed: this.handoffFailed,
      retired: this.retired
    };
  }
};
function lifecycleDeadline(work, timeoutMillis = 6e3) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TeaQL telemetry lifecycle timed out")), timeoutMillis);
    work.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// src/telemetry/owned-otlp-http.ts
import * as http from "node:http";
import * as https from "node:https";
var responseLimit = 4 * 1024 * 1024;
var rejectedFields = { traces: "rejectedSpans", logs: "rejectedLogRecords", metrics: "rejectedDataPoints" };
function validateAcknowledgementBytes(bytes, partial = false) {
  if (bytes.byteLength > responseLimit) throw new Error("Invalid telemetry acknowledgement");
  let position = 0;
  const varint = () => {
    let result = 0n;
    for (let index = 0; index < 10; index++) {
      if (position === bytes.length) throw new Error("Invalid telemetry acknowledgement");
      const value = bytes[position++];
      if (index === 9 && value > 1) throw new Error("Invalid telemetry acknowledgement");
      result |= BigInt(value & 127) << BigInt(index * 7);
      if (!(value & 128)) return result;
    }
    throw new Error("Invalid telemetry acknowledgement");
  };
  while (position < bytes.length) {
    const tag = varint();
    if (tag === 0n || tag > 0xffffffffn || tag >> 3n === 0n) throw new Error("Invalid telemetry acknowledgement");
    const field = Number(tag >> 3n), wire = Number(tag & 7n);
    if (!partial && field === 1 && wire !== 2 || partial && field === 1 && wire !== 0 || partial && field === 2 && wire !== 2) throw new Error("Invalid telemetry acknowledgement");
    if (wire === 0) varint();
    else if (wire === 1) position += 8;
    else if (wire === 5) position += 4;
    else if (wire === 2) {
      const length = varint();
      if (length > BigInt(bytes.length - position)) throw new Error("Invalid telemetry acknowledgement");
      const value = bytes.subarray(position, position + Number(length));
      if (!partial && field === 1) validateAcknowledgementBytes(value, true);
      if (partial && field === 2) {
        try {
          new TextDecoder("utf-8", { fatal: true }).decode(value);
        } catch {
          throw new Error("Invalid telemetry acknowledgement");
        }
      }
      position += Number(length);
    } else throw new Error("Invalid telemetry acknowledgement");
    if (position > bytes.length) throw new Error("Invalid telemetry acknowledgement");
  }
}
function acknowledgementResult(signal, response, submitted) {
  const partial = response.partialSuccess;
  const rejected = partial?.[rejectedFields[signal]] ?? 0;
  if (!Number.isSafeInteger(rejected) || rejected < 0 || rejected > submitted)
    throw new Error("Invalid telemetry acknowledgement");
  return { rejected, kind: rejected > 0 ? "partial_success" : partial?.errorMessage ? "warning" : void 0 };
}
var OwnedOTLPHTTP = class {
  constructor() {
    this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 8, maxFreeSockets: 4 });
    this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 8, maxFreeSockets: 4 });
    this.requests = /* @__PURE__ */ new Set();
    this.closed = false;
    this.idleWaiters = /* @__PURE__ */ new Set();
  }
  send(url, payload) {
    if (this.closed) return Promise.resolve({});
    return new Promise((resolve) => {
      let finished = false, request;
      const finish = (value) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (request) this.requests.delete(request);
        if (!this.requests.size) for (const waiter of [...this.idleWaiters]) waiter();
        resolve(value);
      };
      const timer = setTimeout(() => {
        finish({});
        request?.destroy();
      }, 3e3);
      try {
        const target = new URL(url), secure = target.protocol === "https:";
        request = (secure ? https : http).request({
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port,
          path: target.pathname,
          method: "POST",
          agent: secure ? this.httpsAgent : this.httpAgent,
          headers: { "Content-Type": "application/x-protobuf", "Content-Length": String(payload.byteLength) }
        }, (response) => {
          if (response.statusCode !== 200) {
            finish({});
            response.destroy();
            return;
          }
          const type = String(response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
          if (type !== "application/x-protobuf" || response.headers["content-encoding"] || Number(response.headers["content-length"] || 0) > responseLimit) {
            finish({ invalid: true });
            response.destroy();
            return;
          }
          const chunks = [];
          let length = 0;
          response.on("data", (chunk) => {
            length += chunk.length;
            if (length > responseLimit) {
              finish({ invalid: true });
              response.destroy();
            } else chunks.push(chunk);
          });
          response.once("end", () => finish({ bytes: Buffer.concat(chunks, length) }));
          response.once("error", () => finish({}));
          response.once("aborted", () => finish({}));
        });
        this.requests.add(request);
        request.once("error", () => finish({}));
        request.once("close", () => finish({}));
        request.end(Buffer.from(payload));
      } catch {
        finish({});
        request?.destroy();
      }
    });
  }
  abort() {
    for (const request of this.requests) request.destroy();
  }
  close() {
    this.closed = true;
    this.abort();
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
  waitForIdle(timeoutMillis = 200) {
    if (!this.requests.size) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.idleWaiters.delete(finish);
        resolve();
      };
      const timer = setTimeout(finish, timeoutMillis);
      this.idleWaiters.add(finish);
    });
  }
};
function ownedExporter(transport, endpoint, signal, serializer, submitted, observe) {
  const active = /* @__PURE__ */ new Set();
  return {
    export(data, done) {
      const work = async () => {
        let failed = true;
        try {
          const payload = serializer.serializeRequest(data);
          if (!payload) throw new Error("Telemetry serialization failed");
          const result = await transport.send(endpoint + "/v1/" + signal, payload);
          if (result.invalid) observe(signal, "invalid_response", 0);
          else if (result.bytes) {
            try {
              validateAcknowledgementBytes(result.bytes);
              const acknowledgement = acknowledgementResult(signal, serializer.deserializeResponse(result.bytes), submitted(data));
              if (acknowledgement.kind) observe(signal, acknowledgement.kind, acknowledgement.rejected);
              failed = false;
            } catch {
              observe(signal, "invalid_response", 0);
            }
          }
        } catch {
        }
        done(failed ? { code: 1, error: new Error("TeaQL telemetry export failed") } : { code: 0 });
      };
      const pending = work();
      active.add(pending);
      void pending.then(() => active.delete(pending), () => active.delete(pending));
    },
    async forceFlush() {
      await Promise.all([...active]);
    },
    async shutdown() {
      await Promise.all([...active]);
    }
  };
}

// src/telemetry/response-health.ts
var ResponseHealth = class {
  constructor(record) {
    this.record = record;
    this.signals = {
      traces: { rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0 },
      logs: { rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0 },
      metrics: { rejected: 0, partialSuccess: 0, warnings: 0, invalidResponses: 0 }
    };
    this.announced = /* @__PURE__ */ new Set();
  }
  observe(signal, kind, rejected) {
    const current = this.signals[signal];
    current.rejected += rejected;
    if (kind === "partial_success") current.partialSuccess++;
    else if (kind === "warning") current.warnings++;
    else current.invalidResponses++;
    try {
      this.record(signal, kind, rejected);
    } catch {
    }
    const key = signal + "/" + kind;
    if (this.announced.has(key)) return;
    this.announced.add(key);
    telemetryNotice(`TeaQL telemetry: receiver response; signal=${signal} reason=${kind}. Business outcome unchanged.`, true);
  }
  snapshot() {
    return { traces: { ...this.signals.traces }, logs: { ...this.signals.logs }, metrics: { ...this.signals.metrics } };
  }
};

// src/telemetry/standard-node-sdk.ts
function reportedExporter(delegate, health) {
  return {
    export: (records, done) => {
      const ticket = health.beginExport(records);
      if (!ticket) {
        done({ code: 0 });
        return;
      }
      let completed = false;
      const finish = (result) => {
        if (completed) return;
        completed = true;
        ticket.complete(result.code !== 0);
        done(result);
      };
      try {
        delegate.export(records, finish);
      } catch {
        finish({ code: 1 });
      }
    },
    shutdown: () => delegate.shutdown(),
    forceFlush: () => delegate.forceFlush?.() ?? Promise.resolve()
  };
}
function createStandardNodePipeline(serviceName, endpoint) {
  const resource = resourceFromAttributes({ "service.name": serviceName, "teaql.runtime.language": "typescript" });
  const manager = new AsyncLocalStorageContextManager().enable();
  const transport = new OwnedOTLPHTTP();
  let lossCounter;
  let rejectedCounter, responseCounter;
  const responses = new ResponseHealth((signal, reason, rejected) => {
    rejectedCounter?.add(rejected, { "teaql.telemetry.signal": signal });
    responseCounter?.add(1, { "teaql.telemetry.signal": signal, "teaql.telemetry.reason": reason });
  });
  const metricPoints = (data) => data.scopeMetrics.reduce((n, scope) => n + scope.metrics.reduce((m, metric) => m + metric.dataPoints.length, 0), 0);
  const metricExporter = ownedExporter(
    transport,
    endpoint,
    "metrics",
    ProtobufMetricsSerializer,
    metricPoints,
    (signal, kind, rejected) => responses.observe(signal, kind, rejected)
  );
  let metricDataObjectsFailed = 0;
  let metricFailureAnnounced = false;
  const meterProvider = new MeterProvider({ resource, readers: [new PeriodicExportingMetricReader({
    exporter: {
      export: (data, done) => {
        let completed = false;
        const finish = (result) => {
          if (completed) return;
          completed = true;
          if (result.code !== 0) {
            const objects = data.scopeMetrics.reduce((n, scope) => n + scope.metrics.length, 0);
            metricDataObjectsFailed += objects;
            lossCounter?.add(objects, { "teaql.telemetry.signal": "metrics", "teaql.telemetry.reason": "export_failure" });
            if (!metricFailureAnnounced) {
              metricFailureAnnounced = true;
              telemetryNotice("TeaQL telemetry: records lost; signal=metrics reason=export_failure. Business outcome unchanged.", true);
            }
          }
          done(result);
        };
        try {
          metricExporter.export(data, finish);
        } catch {
          finish({ code: 1 });
        }
      },
      forceFlush: () => metricExporter.forceFlush(),
      shutdown: () => metricExporter.shutdown(),
      selectAggregationTemporality: () => AggregationTemporality.CUMULATIVE
    },
    exportIntervalMillis: 1e4,
    exportTimeoutMillis: 5e3
  })] });
  const meter = meterProvider.getMeter("io.teaql.runtime");
  lossCounter = meter.createCounter("teaql.telemetry.export.lost", {
    description: "Lost span/log records or failed metric-data objects; not metric data points",
    unit: "{entry}"
  });
  rejectedCounter = meter.createCounter("teaql.telemetry.export.rejected", {
    description: "Receiver-rejected spans, log records or metric data points",
    unit: "{item}"
  });
  responseCounter = meter.createCounter("teaql.telemetry.export.response", { unit: "{response}" });
  for (const signal of ["traces", "logs", "metrics"]) {
    rejectedCounter.add(0, { "teaql.telemetry.signal": signal });
    for (const reason of ["partial_success", "warning", "invalid_response"])
      responseCounter.add(0, { "teaql.telemetry.signal": signal, "teaql.telemetry.reason": reason });
    lossCounter.add(0, { "teaql.telemetry.signal": signal, "teaql.telemetry.reason": "export_failure" });
  }
  const lost = (amount, signal, reason) => lossCounter.add(
    amount,
    { "teaql.telemetry.signal": signal, "teaql.telemetry.reason": reason }
  );
  const spanHealth = new ExportHealth("traces", 2048, lost);
  const logHealth = new ExportHealth("logs", 2048, lost);
  const spanBatch = new BatchSpanProcessor(reportedExporter(ownedExporter(
    transport,
    endpoint,
    "traces",
    ProtobufTraceSerializer,
    (spans) => spans.length,
    (signal, kind, rejected) => responses.observe(signal, kind, rejected)
  ), spanHealth), {
    maxQueueSize: 2048,
    maxExportBatchSize: 128,
    scheduledDelayMillis: 1e3,
    exportTimeoutMillis: 5e3
  });
  const spanProcessor = {
    onStart: (...args) => spanBatch.onStart(...args),
    onEnd: (span) => spanHealth.handoff(span, () => spanBatch.onEnd(span)),
    forceFlush: () => spanBatch.forceFlush(),
    shutdown: () => spanBatch.shutdown()
  };
  const logBatch = new BatchLogRecordProcessor({
    exporter: reportedExporter(ownedExporter(
      transport,
      endpoint,
      "logs",
      ProtobufLogsSerializer,
      (logs) => logs.length,
      (signal, kind, rejected) => responses.observe(signal, kind, rejected)
    ), logHealth),
    maxQueueSize: 2048,
    maxExportBatchSize: 128,
    scheduledDelayMillis: 1e3,
    exportTimeoutMillis: 5e3
  });
  const logProcessor = {
    onEmit: (record) => logHealth.handoff(record, () => logBatch.onEmit(record)),
    forceFlush: () => logBatch.forceFlush(),
    shutdown: () => logBatch.shutdown()
  };
  const tracerProvider = new BasicTracerProvider({
    resource,
    sampler: new AlwaysOnSampler(),
    spanProcessors: [spanProcessor]
  });
  const loggerProvider = new LoggerProvider({ resource, processors: [logProcessor] });
  let closed = false;
  let shutdownPromise;
  const flush = async () => {
    if (closed) return shutdownPromise;
    const spans = spanHealth.waitForPrefix(), logs = logHealth.waitForPrefix();
    await lifecycleDeadline((async () => {
      const records = await Promise.allSettled([tracerProvider.forceFlush(), loggerProvider.forceFlush(), spans, logs]);
      if (closed) return;
      await meterProvider.forceFlush();
      if (records.some((result) => result.status === "rejected")) throw new Error("TeaQL telemetry export incomplete");
    })());
  };
  const shutdown = () => shutdownPromise ?? (shutdownPromise = (async () => {
    closed = true;
    spanHealth.close();
    logHealth.close();
    const started = performance.now();
    const stopped = Promise.allSettled([tracerProvider.shutdown(), loggerProvider.shutdown()]);
    try {
      try {
        await Promise.all([spanHealth.waitForPrefix(5e3), logHealth.waitForPrefix(5e3)]);
      } catch {
        spanHealth.abortQueued();
        logHealth.abortQueued();
        transport.abort();
        await Promise.all([spanHealth.waitForIdle(200), logHealth.waitForIdle(200)]);
      }
      await lifecycleDeadline(stopped, Math.max(1, 5700 - (performance.now() - started)));
      await lifecycleDeadline(meterProvider.shutdown(), Math.max(1, 5800 - (performance.now() - started)));
    } finally {
      spanHealth.abortQueued();
      logHealth.abortQueued();
      transport.close();
      await lifecycleDeadline(
        Promise.all([transport.waitForIdle(200), metricExporter.forceFlush()]),
        Math.max(1, 6e3 - (performance.now() - started))
      ).catch(() => {
        telemetryNotice("TeaQL telemetry: owned cleanup deadline reached; business outcome unchanged.", true);
      });
      manager.disable();
    }
  })());
  const executionContext = {
    active: () => manager.active() === ROOT_CONTEXT ? context.active() : manager.active(),
    with: (active, work) => manager.with(active, work)
  };
  const adapter = new OpenTelemetryRuntimeTelemetry(
    tracerProvider.getTracer("io.teaql.runtime"),
    meterProvider.getMeter("io.teaql.runtime"),
    {},
    loggerProvider.getLogger("io.teaql.runtime"),
    executionContext
  );
  const telemetry = {
    start: (operation) => {
      const delegate = closed ? void 0 : adapter.start(operation);
      let finished = false;
      const finish = (work) => {
        if (finished) return;
        finished = true;
        if (closed) {
          spanHealth.rejectLate();
          logHealth.rejectLate();
        } else work();
      };
      return {
        correlation: () => closed ? void 0 : delegate?.correlation?.(),
        run: (work) => !closed && delegate?.run ? delegate.run(work) : work(),
        success: (completion) => finish(() => delegate.success(completion)),
        failure: (error) => finish(() => delegate.failure(error))
      };
    },
    recordsSQLDiagnostics: () => !closed,
    recordDiagnostic: (event) => {
      if (!closed) adapter.recordDiagnostic(event);
    }
  };
  const propagator = new W3CTraceContextPropagator();
  telemetry.inject = (carrier) => propagator.inject(executionContext.active(), carrier, defaultTextMapSetter);
  telemetryNotice("TeaQL telemetry: enabled; traces, metrics, logs, complete TraceChain and masked SQL; recording=all.");
  return { telemetry, flush, shutdown, health: () => ({
    traceSpansFailed: spanHealth.failedRecords,
    logRecordsFailed: logHealth.failedRecords,
    metricDataObjectsFailed,
    responses: responses.snapshot(),
    queues: { traces: spanHealth.snapshot(), logs: logHealth.snapshot() }
  }) };
}
export {
  createStandardNodePipeline
};
//# sourceMappingURL=standard-node-sdk-X6MM23MY.js.map
