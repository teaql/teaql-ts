import { SelectQuery } from '../core/ast';
import { SmartList, SmartListRecord } from '../core/smart-list';
import { UserContext } from '../core/context';
import { MutationGovernanceSnapshot } from '../core/mutation-policy';
import { MutationRequest, QueryIntent, QueryRequest } from '../core/request-intent';
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

function serializeQuery(query: SelectQuery, nestedFacet = false,
  intent?: QueryIntent): Record<string, unknown> {
  const request = new QueryRequest(query, intent);
  query = request.query;
  if (!Number.isSafeInteger(query.offsetValue) || query.offsetValue < 0) {
    throw new Error('TFP_INVALID_REQUEST: offset must be a non-negative safe integer');
  }
  if (query.limitValue && (!Number.isSafeInteger(query.limitValue) || query.limitValue < 1)) {
    throw new Error('TFP_INVALID_REQUEST: limit must be a positive safe integer');
  }
  rejectRemoteHardLimit(JSON.parse(JSON.stringify(query)));
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
      query: serializeQuery(facet.query, true, request.intent),
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
  /** Trusted local context; never serialized into the TFP request. */
  userContext?: UserContext;
}

export class TeaQLClient {
  private config: TeaQLClientConfig;
  private fetchImpl: typeof fetch;
  private runtimeTelemetry: RuntimeTelemetry;
  private userContext: UserContext;
  private readonly mutationGovernanceEvents: MutationGovernanceSnapshot[] = [];

  constructor(config: TeaQLClientConfig) {
    this.config = config;
    // Fallback to global fetch if available
    this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    this.runtimeTelemetry = config.runtimeTelemetry ?? NOOP_RUNTIME_TELEMETRY;
    this.userContext = config.userContext ?? new UserContext();
  }

  setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this {
    this.runtimeTelemetry = telemetry ?? NOOP_RUNTIME_TELEMETRY;
    return this;
  }

  setUserContext(context: UserContext): this {
    if (!context) throw new TypeError('UserContext is required');
    this.userContext = context;
    return this;
  }

  get mutationGovernanceTrace(): readonly MutationGovernanceSnapshot[] {
    return [...this.mutationGovernanceEvents];
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

  async executeQuery<T = any>(query: SelectQuery | QueryRequest): Promise<SmartList<T>> {
    const request = query instanceof QueryRequest ? query : new QueryRequest(query);
    const payload = serializeQuery(request.query, false, request.intent);
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
    new QueryRequest(_query);
    throw new Error(
      'TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol',
    );
  }

  async executeMutation(query: any): Promise<any> {
    const request = query instanceof MutationRequest ? query : new MutationRequest(query);
    query = request.mutation;
    const payload = {
      entity: query.entity, action: query.action, payload: query.payload,
      id: query.id, expectedVersion: query.expectedVersion, comment: query.comment,
    };
    rejectRemoteHardLimit(payload);
    // Client policy is defense in depth for browser/Node applications. The
    // receiving TeaQL server remains authoritative and evaluates its own policy.
    const mutationGovernance = this.userContext.enterMutationPolicy(payload);
    this.mutationGovernanceEvents.push(mutationGovernance);
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
