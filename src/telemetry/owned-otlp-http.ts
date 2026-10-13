import * as http from 'node:http';
import * as https from 'node:https';
import type { ExportResult } from '@opentelemetry/core';
import type { ISerializer } from '@opentelemetry/otlp-transformer';
import type { TelemetrySignal } from './export-health';

export type ResponseKind = 'partial_success' | 'warning' | 'invalid_response';
export type Acknowledgement = { partialSuccess?: {
  rejectedSpans?: number; rejectedLogRecords?: number; rejectedDataPoints?: number; errorMessage?: string;
} };
const responseLimit = 4 * 1024 * 1024;
const rejectedFields = { traces: 'rejectedSpans', logs: 'rejectedLogRecords', metrics: 'rejectedDataPoints' } as const;

/** Strict framing guard for the two-level proto3 acknowledgement, not a second OTLP codec. */
export function validateAcknowledgementBytes(bytes: Uint8Array, partial = false): void {
  if (bytes.byteLength > responseLimit) throw new Error('Invalid telemetry acknowledgement');
  let position = 0;
  const varint = (): bigint => {
    let result = 0n;
    for (let index = 0; index < 10; index++) {
      if (position === bytes.length) throw new Error('Invalid telemetry acknowledgement');
      const value = bytes[position++];
      if (index === 9 && value > 1) throw new Error('Invalid telemetry acknowledgement');
      result |= BigInt(value & 127) << BigInt(index * 7);
      if (!(value & 128)) return result;
    }
    throw new Error('Invalid telemetry acknowledgement');
  };
  while (position < bytes.length) {
    const tag = varint();
    if (tag === 0n || tag > 0xffffffffn || tag >> 3n === 0n) throw new Error('Invalid telemetry acknowledgement');
    const field = Number(tag >> 3n), wire = Number(tag & 7n);
    if ((!partial && field === 1 && wire !== 2) || (partial && field === 1 && wire !== 0)
      || (partial && field === 2 && wire !== 2)) throw new Error('Invalid telemetry acknowledgement');
    if (wire === 0) varint();
    else if (wire === 1) position += 8;
    else if (wire === 5) position += 4;
    else if (wire === 2) {
      const length = varint();
      if (length > BigInt(bytes.length - position)) throw new Error('Invalid telemetry acknowledgement');
      const value = bytes.subarray(position, position + Number(length));
      if (!partial && field === 1) validateAcknowledgementBytes(value, true);
      if (partial && field === 2) {
        try { new TextDecoder('utf-8', {fatal: true}).decode(value); }
        catch { throw new Error('Invalid telemetry acknowledgement'); }
      }
      position += Number(length);
    } else throw new Error('Invalid telemetry acknowledgement'); // no groups in OTLP proto3
    if (position > bytes.length) throw new Error('Invalid telemetry acknowledgement');
  }
}

export function acknowledgementResult(signal: TelemetrySignal, response: Acknowledgement, submitted: number) {
  const partial = response.partialSuccess;
  const rejected = partial?.[rejectedFields[signal]] ?? 0;
  if (!Number.isSafeInteger(rejected) || rejected < 0 || rejected > submitted)
    throw new Error('Invalid telemetry acknowledgement');
  return { rejected, kind: rejected > 0 ? 'partial_success' as const
    : partial?.errorMessage ? 'warning' as const : undefined };
}

/** Pipeline-owned agents, no global fetch/agent/SDK interception, retries or redirects. */
export class OwnedOTLPHTTP {
  private readonly httpAgent = new http.Agent({keepAlive: true, maxSockets: 8, maxFreeSockets: 4});
  private readonly httpsAgent = new https.Agent({keepAlive: true, maxSockets: 8, maxFreeSockets: 4});
  private readonly requests = new Set<http.ClientRequest>();
  private closed = false;
  private readonly idleWaiters = new Set<() => void>();

  send(url: string, payload: Uint8Array): Promise<{bytes?: Uint8Array; invalid?: boolean}> {
    if (this.closed) return Promise.resolve({});
    return new Promise(resolve => {
      let finished = false, request: http.ClientRequest | undefined;
      const finish = (value: {bytes?: Uint8Array; invalid?: boolean}) => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        if (request) this.requests.delete(request);
        if (!this.requests.size) for (const waiter of [...this.idleWaiters]) waiter();
        resolve(value);
      };
      const timer = setTimeout(() => { finish({}); request?.destroy(); }, 3000);
      try {
        const target = new URL(url), secure = target.protocol === 'https:';
        request = (secure ? https : http).request({protocol: target.protocol, hostname: target.hostname,
          port: target.port, path: target.pathname, method: 'POST',
          agent: secure ? this.httpsAgent : this.httpAgent,
          headers: {'Content-Type': 'application/x-protobuf', 'Content-Length': String(payload.byteLength)},
        }, response => {
          if (response.statusCode !== 200) { finish({}); response.destroy(); return; }
          const type = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
          if (type !== 'application/x-protobuf' || response.headers['content-encoding']
            || Number(response.headers['content-length'] || 0) > responseLimit) {
            finish({invalid: true}); response.destroy(); return;
          }
          const chunks: Buffer[] = []; let length = 0;
          response.on('data', (chunk: Buffer) => {
            length += chunk.length;
            if (length > responseLimit) { finish({invalid: true}); response.destroy(); }
            else chunks.push(chunk);
          });
          response.once('end', () => finish({bytes: Buffer.concat(chunks, length)}));
          response.once('error', () => finish({}));
          response.once('aborted', () => finish({}));
        });
        this.requests.add(request);
        request.once('error', () => finish({}));
        request.once('close', () => finish({}));
        request.end(Buffer.from(payload));
      } catch { finish({}); request?.destroy(); }
    });
  }

  abort(): void {
    for (const request of this.requests) request.destroy();
  }
  close(): void {
    this.closed = true; this.abort(); this.httpAgent.destroy(); this.httpsAgent.destroy();
  }
  waitForIdle(timeoutMillis = 200): Promise<void> {
    if (!this.requests.size) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => {clearTimeout(timer); this.idleWaiters.delete(finish); resolve();};
      const timer = setTimeout(finish, timeoutMillis); this.idleWaiters.add(finish);
    });
  }
}

export function ownedExporter<T, R extends Acknowledgement>(transport: OwnedOTLPHTTP, endpoint: string,
  signal: TelemetrySignal, serializer: ISerializer<T, R>, submitted: (data: T) => number,
  observe: (signal: TelemetrySignal, kind: ResponseKind, rejected: number) => void) {
  const active = new Set<Promise<void>>();
  return {
    export(data: T, done: (result: ExportResult) => void): void {
      const work = async () => {
        let failed = true;
        try {
          const payload = serializer.serializeRequest(data);
          if (!payload) throw new Error('Telemetry serialization failed');
          const result = await transport.send(endpoint + '/v1/' + signal, payload);
          if (result.invalid) observe(signal, 'invalid_response', 0);
          else if (result.bytes) {
            try {
              validateAcknowledgementBytes(result.bytes);
              const acknowledgement = acknowledgementResult(signal, serializer.deserializeResponse(result.bytes), submitted(data));
              if (acknowledgement.kind) observe(signal, acknowledgement.kind, acknowledgement.rejected);
              failed = false;
            } catch { observe(signal, 'invalid_response', 0); }
          }
        } catch { /* raw serializer, HTTP and decoder errors never enter SDK diagnostics */ }
        done(failed ? {code: 1, error: new Error('TeaQL telemetry export failed')} : {code: 0});
      };
      const pending = work(); active.add(pending);
      void pending.then(() => active.delete(pending), () => active.delete(pending));
    },
    async forceFlush(): Promise<void> { await Promise.all([...active]); },
    async shutdown(): Promise<void> { await Promise.all([...active]); },
  };
}
