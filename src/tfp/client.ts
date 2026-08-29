import { SelectQuery } from '../core/ast';
import { SmartList, SmartListRecord } from '../core/smart-list';
import {
  NOOP_RUNTIME_TELEMETRY,
  injectRuntimeContext,
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
    if (normalized === 'hardlimit' || normalized === 'hardlimitvalue'
      || normalized.startsWith('continuouspage') || normalized.startsWith('idsetpagination')
      || normalized.startsWith('paginationwithidset')) {
      throw new Error(`TFP_FORBIDDEN_FIELD: ${path}.${key} is server-local policy`);
    }
    rejectRemoteHardLimit(child, `${path}.${key}`);
  }
}

function serializeQuery(query: SelectQuery, nestedFacet = false): Record<string, unknown> {
  if (!Number.isSafeInteger(query.offsetValue) || query.offsetValue < 0) {
    throw new Error('TFP_INVALID_REQUEST: offset must be a non-negative safe integer');
  }
  if (query.limitValue && (!Number.isSafeInteger(query.limitValue) || query.limitValue < 1)) {
    throw new Error('TFP_INVALID_REQUEST: limit must be a positive safe integer');
  }
  rejectRemoteHardLimit(JSON.parse(JSON.stringify(query)));
  if (!query.commentText?.trim()) throw new Error('TFP_INVALID_REQUEST: commentText is required');
  if (!query.purposeText?.trim()) throw new Error('TFP_POLICY_VIOLATION: purposeText is required');
  if (query.relations.length || query.joins.length) {
    throw new Error('TFP_INVALID_REQUEST: relations and joins are not part of canonical TFP v1');
  }
  if (nestedFacet && query.facets.length) {
    throw new Error('TFP_INVALID_REQUEST: nested facets are not supported');
  }
  return {
    entity: query.entity,
    filterCondition: query.filterCondition,
    limitValue: query.limitValue || undefined,
    offsetValue: query.offsetValue || undefined,
    orderItems: query.orderItems,
    selectItems: query.selectItems,
    groupByItems: query.groupByItems,
    aggregateItems: query.aggregateItems,
    facets: query.facets.map(facet => ({
      facetName: facet.facetName,
      relationName: facet.relationName,
      includeAllFacets: facet.includeAllFacets,
      query: serializeQuery(facet.query, true),
    })),
    commentText: query.commentText,
    purposeText: query.purposeText,
  };
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

  async executeQuery<T = any>(query: SelectQuery): Promise<SmartList<T>> {
    const payload = serializeQuery(query);
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/query`;
    
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      { family: 'tfp', name: 'client.query', attributes: { 'teaql.tfp.role': 'client' } },
      async () => {
        const headers = injectRuntimeContext(
          this.runtimeTelemetry, await this.requestHeaders(),
        );
        const response = await this.fetchImpl(url, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`TEAQL Query Error [${response.status}]: ${errText}`);
        }
        const responseJson = await response.json();
        const facets: Record<string, SmartList<SmartListRecord>> = {};
        for (const [name, values] of Object.entries(responseJson.facets ?? {})) {
          facets[name] = new SmartList(values as SmartListRecord[]);
        }
        return new SmartList<T>(responseJson.data ?? [], { facets });
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
    if (!query?.comment?.trim?.()) {
      throw new Error('TFP_AUDIT_REASON_REQUIRED: mutation audit reason is required');
    }
    const payload = {
      entity: query.entity, action: query.action, payload: query.payload,
      id: query.id, expectedVersion: query.expectedVersion, comment: query.comment,
    };
    rejectRemoteHardLimit(payload);
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      { family: 'tfp', name: 'client.mutation', attributes: { 'teaql.tfp.role': 'client' } },
      async () => {
        const headers = injectRuntimeContext(
          this.runtimeTelemetry, await this.requestHeaders(),
        );
        const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, '')}/mutate`, {
          method: 'POST', headers, body: JSON.stringify(payload),
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
