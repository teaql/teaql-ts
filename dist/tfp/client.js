"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeaQLClient = void 0;
const smart_list_1 = require("../core/smart-list");
const context_1 = require("../core/context");
const request_intent_1 = require("../core/request-intent");
const telemetry_1 = require("../core/telemetry");
function rejectRemoteHardLimit(value, path = '$') {
    if (Array.isArray(value)) {
        value.forEach((item, index) => rejectRemoteHardLimit(item, `${path}[${index}]`));
        return;
    }
    if (!value || typeof value !== 'object')
        return;
    for (const [key, child] of Object.entries(value)) {
        const normalized = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (normalized === 'hardlimit' || normalized === 'hardlimitvalue'
            || normalized.startsWith('continuouspage') || normalized.startsWith('idsetpagination')
            || normalized.startsWith('paginationwithidset')) {
            throw new Error(`TFP_FORBIDDEN_FIELD: ${path}.${key} is server-local policy`);
        }
        rejectRemoteHardLimit(child, `${path}.${key}`);
    }
}
function serializeQuery(query, nestedFacet = false, intent) {
    const request = new request_intent_1.QueryRequest(query, intent);
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
class TeaQLClient {
    constructor(config) {
        this.mutationGovernanceEvents = [];
        this.config = config;
        // Fallback to global fetch if available
        this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
        this.runtimeTelemetry = config.runtimeTelemetry ?? telemetry_1.NOOP_RUNTIME_TELEMETRY;
        this.userContext = config.userContext ?? new context_1.UserContext();
    }
    setRuntimeTelemetry(telemetry) {
        this.runtimeTelemetry = telemetry ?? telemetry_1.NOOP_RUNTIME_TELEMETRY;
        return this;
    }
    setUserContext(context) {
        if (!context)
            throw new TypeError('UserContext is required');
        this.userContext = context;
        return this;
    }
    get mutationGovernanceTrace() {
        return [...this.mutationGovernanceEvents];
    }
    async requestHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        return this.config.getHeaders
            ? { ...headers, ...await this.config.getHeaders() }
            : headers;
    }
    async executeQuery(query) {
        const request = query instanceof request_intent_1.QueryRequest ? query : new request_intent_1.QueryRequest(query);
        const payload = serializeQuery(request.query, false, request.intent);
        const url = `${this.config.baseUrl.replace(/\/$/, '')}/query`;
        return (0, telemetry_1.observeRuntimeOperation)(this.runtimeTelemetry, { family: 'tfp', name: 'client.query', attributes: { 'teaql.tfp.role': 'client' } }, async () => {
            const headers = (0, telemetry_1.injectRuntimeContext)(this.runtimeTelemetry, await this.requestHeaders());
            const response = await this.fetchImpl(url, {
                method: 'POST', headers, body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`TEAQL Query Error [${response.status}]: ${errText}`);
            }
            const responseJson = await response.json();
            const facets = {};
            for (const [name, values] of Object.entries(responseJson.facets ?? {})) {
                facets[name] = new smart_list_1.SmartList(values);
            }
            return new smart_list_1.SmartList(responseJson.data ?? [], { facets });
        }, result => ({ attributes: { 'teaql.result.cardinality': result.length } }));
    }
    async *executeForStream(_query, _chunkSize = 1000) {
        new request_intent_1.QueryRequest(_query);
        throw new Error('TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol');
    }
    async executeMutation(query) {
        const request = query instanceof request_intent_1.MutationRequest ? query : new request_intent_1.MutationRequest(query);
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
        return (0, telemetry_1.observeRuntimeOperation)(this.runtimeTelemetry, { family: 'tfp', name: 'client.mutation', attributes: { 'teaql.tfp.role': 'client' } }, async () => {
            const headers = (0, telemetry_1.injectRuntimeContext)(this.runtimeTelemetry, await this.requestHeaders());
            const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, '')}/mutate`, {
                method: 'POST', headers, body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TeaQL Mutation failed: ${response.status} ${errorText}`);
            }
            return response.json();
        });
    }
}
exports.TeaQLClient = TeaQLClient;
//# sourceMappingURL=client.js.map