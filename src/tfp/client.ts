import { SelectQuery } from '../core/ast';
import {
  NOOP_RUNTIME_TELEMETRY,
  observeRuntimeOperation,
  RuntimeTelemetry,
} from '../core/telemetry';

function rejectRemoteHardLimit(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectRemoteHardLimit(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (normalized === 'hardlimit' || normalized === 'hardlimitvalue' || normalized.startsWith('continuouspage')) {
      throw new Error(`TFP_FORBIDDEN_FIELD: ${path}.${key} is server-local policy`);
    }
    rejectRemoteHardLimit(child, `${path}.${key}`);
  }
}

export interface TeaQLClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  runtimeTelemetry?: RuntimeTelemetry;
}

export class TeaQLClient {
  private config: TeaQLClientConfig;
  private fetchImpl: typeof fetch;
  private runtimeTelemetry: RuntimeTelemetry;

  constructor(config: TeaQLClientConfig) {
    this.config = config;
    // Fallback to global fetch if available
    this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    this.runtimeTelemetry = config.runtimeTelemetry ?? NOOP_RUNTIME_TELEMETRY;
  }

  setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this {
    this.runtimeTelemetry = telemetry ?? NOOP_RUNTIME_TELEMETRY;
    return this;
  }

  private async requestHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    return this.config.getHeaders
      ? { ...headers, ...await this.config.getHeaders() }
      : headers;
  }

  async executeQuery<T = any>(query: SelectQuery): Promise<T[]> {
    query.prepareForList();
    const payload = JSON.parse(JSON.stringify(query));
    rejectRemoteHardLimit(payload);
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/query`;
    
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      { family: 'tfp', name: 'client.query', attributes: { 'teaql.tfp.role': 'client' } },
      async () => {
        const headers = await this.requestHeaders();
        const response = await this.fetchImpl(url, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`TEAQL Query Error [${response.status}]: ${errText}`);
        }
        const responseJson = await response.json();
        return responseJson.data;
      },
      result => ({ attributes: { 'teaql.result.cardinality': result.length } }),
    );
  }

  async *executeForStream<T = any>(
    _query: SelectQuery,
    _chunkSize = 1000,
  ): AsyncIterable<T[]> {
    throw new Error(
      'TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol',
    );
  }

  async executeMutation(query: any): Promise<any> {
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      { family: 'tfp', name: 'client.mutation', attributes: { 'teaql.tfp.role': 'client' } },
      async () => {
        const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, '')}/mutate`, {
          method: 'POST', headers: await this.requestHeaders(), body: JSON.stringify(query),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TeaQL Mutation failed: ${response.status} ${errorText}`);
        }
        return response.json();
      },
    );
  }
}
