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
exports.ownedExporter = exports.OwnedOTLPHTTP = exports.acknowledgementResult = exports.validateAcknowledgementBytes = void 0;
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const responseLimit = 4 * 1024 * 1024;
const rejectedFields = { traces: 'rejectedSpans', logs: 'rejectedLogRecords', metrics: 'rejectedDataPoints' };
/** Strict framing guard for the two-level proto3 acknowledgement, not a second OTLP codec. */
function validateAcknowledgementBytes(bytes, partial = false) {
    if (bytes.byteLength > responseLimit)
        throw new Error('Invalid telemetry acknowledgement');
    let position = 0;
    const varint = () => {
        let result = 0n;
        for (let index = 0; index < 10; index++) {
            if (position === bytes.length)
                throw new Error('Invalid telemetry acknowledgement');
            const value = bytes[position++];
            if (index === 9 && value > 1)
                throw new Error('Invalid telemetry acknowledgement');
            result |= BigInt(value & 127) << BigInt(index * 7);
            if (!(value & 128))
                return result;
        }
        throw new Error('Invalid telemetry acknowledgement');
    };
    while (position < bytes.length) {
        const tag = varint();
        if (tag === 0n || tag > 0xffffffffn || tag >> 3n === 0n)
            throw new Error('Invalid telemetry acknowledgement');
        const field = Number(tag >> 3n), wire = Number(tag & 7n);
        if ((!partial && field === 1 && wire !== 2) || (partial && field === 1 && wire !== 0)
            || (partial && field === 2 && wire !== 2))
            throw new Error('Invalid telemetry acknowledgement');
        if (wire === 0)
            varint();
        else if (wire === 1)
            position += 8;
        else if (wire === 5)
            position += 4;
        else if (wire === 2) {
            const length = varint();
            if (length > BigInt(bytes.length - position))
                throw new Error('Invalid telemetry acknowledgement');
            const value = bytes.subarray(position, position + Number(length));
            if (!partial && field === 1)
                validateAcknowledgementBytes(value, true);
            if (partial && field === 2) {
                try {
                    new TextDecoder('utf-8', { fatal: true }).decode(value);
                }
                catch {
                    throw new Error('Invalid telemetry acknowledgement');
                }
            }
            position += Number(length);
        }
        else
            throw new Error('Invalid telemetry acknowledgement'); // no groups in OTLP proto3
        if (position > bytes.length)
            throw new Error('Invalid telemetry acknowledgement');
    }
}
exports.validateAcknowledgementBytes = validateAcknowledgementBytes;
function acknowledgementResult(signal, response, submitted) {
    const partial = response.partialSuccess;
    const rejected = partial?.[rejectedFields[signal]] ?? 0;
    if (!Number.isSafeInteger(rejected) || rejected < 0 || rejected > submitted)
        throw new Error('Invalid telemetry acknowledgement');
    return { rejected, kind: rejected > 0 ? 'partial_success'
            : partial?.errorMessage ? 'warning' : undefined };
}
exports.acknowledgementResult = acknowledgementResult;
/** Pipeline-owned agents, no global fetch/agent/SDK interception, retries or redirects. */
class OwnedOTLPHTTP {
    constructor() {
        this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 8, maxFreeSockets: 4 });
        this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 8, maxFreeSockets: 4 });
        this.requests = new Set();
        this.closed = false;
        this.idleWaiters = new Set();
    }
    send(url, payload) {
        if (this.closed)
            return Promise.resolve({});
        return new Promise(resolve => {
            let finished = false, request;
            const finish = (value) => {
                if (finished)
                    return;
                finished = true;
                clearTimeout(timer);
                if (request)
                    this.requests.delete(request);
                if (!this.requests.size)
                    for (const waiter of [...this.idleWaiters])
                        waiter();
                resolve(value);
            };
            const timer = setTimeout(() => { finish({}); request?.destroy(); }, 3000);
            try {
                const target = new URL(url), secure = target.protocol === 'https:';
                request = (secure ? https : http).request({ protocol: target.protocol, hostname: target.hostname,
                    port: target.port, path: target.pathname, method: 'POST',
                    agent: secure ? this.httpsAgent : this.httpAgent,
                    headers: { 'Content-Type': 'application/x-protobuf', 'Content-Length': String(payload.byteLength) },
                }, response => {
                    if (response.statusCode !== 200) {
                        finish({});
                        response.destroy();
                        return;
                    }
                    const type = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
                    if (type !== 'application/x-protobuf' || response.headers['content-encoding']
                        || Number(response.headers['content-length'] || 0) > responseLimit) {
                        finish({ invalid: true });
                        response.destroy();
                        return;
                    }
                    const chunks = [];
                    let length = 0;
                    response.on('data', (chunk) => {
                        length += chunk.length;
                        if (length > responseLimit) {
                            finish({ invalid: true });
                            response.destroy();
                        }
                        else
                            chunks.push(chunk);
                    });
                    response.once('end', () => finish({ bytes: Buffer.concat(chunks, length) }));
                    response.once('error', () => finish({}));
                    response.once('aborted', () => finish({}));
                });
                this.requests.add(request);
                request.once('error', () => finish({}));
                request.once('close', () => finish({}));
                request.end(Buffer.from(payload));
            }
            catch {
                finish({});
                request?.destroy();
            }
        });
    }
    abort() {
        for (const request of this.requests)
            request.destroy();
    }
    close() {
        this.closed = true;
        this.abort();
        this.httpAgent.destroy();
        this.httpsAgent.destroy();
    }
    waitForIdle(timeoutMillis = 200) {
        if (!this.requests.size)
            return Promise.resolve();
        return new Promise(resolve => {
            const finish = () => { clearTimeout(timer); this.idleWaiters.delete(finish); resolve(); };
            const timer = setTimeout(finish, timeoutMillis);
            this.idleWaiters.add(finish);
        });
    }
}
exports.OwnedOTLPHTTP = OwnedOTLPHTTP;
function ownedExporter(transport, endpoint, signal, serializer, submitted, observe) {
    const active = new Set();
    return {
        export(data, done) {
            const work = async () => {
                let failed = true;
                try {
                    const payload = serializer.serializeRequest(data);
                    if (!payload)
                        throw new Error('Telemetry serialization failed');
                    const result = await transport.send(endpoint + '/v1/' + signal, payload);
                    if (result.invalid)
                        observe(signal, 'invalid_response', 0);
                    else if (result.bytes) {
                        try {
                            validateAcknowledgementBytes(result.bytes);
                            const acknowledgement = acknowledgementResult(signal, serializer.deserializeResponse(result.bytes), submitted(data));
                            if (acknowledgement.kind)
                                observe(signal, acknowledgement.kind, acknowledgement.rejected);
                            failed = false;
                        }
                        catch {
                            observe(signal, 'invalid_response', 0);
                        }
                    }
                }
                catch { /* raw serializer, HTTP and decoder errors never enter SDK diagnostics */ }
                done(failed ? { code: 1, error: new Error('TeaQL telemetry export failed') } : { code: 0 });
            };
            const pending = work();
            active.add(pending);
            void pending.then(() => active.delete(pending), () => active.delete(pending));
        },
        async forceFlush() { await Promise.all([...active]); },
        async shutdown() { await Promise.all([...active]); },
    };
}
exports.ownedExporter = ownedExporter;
//# sourceMappingURL=owned-otlp-http.js.map