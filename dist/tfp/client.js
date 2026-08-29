"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeaQLClient = void 0;
const smart_list_1 = require("../core/smart-list");
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
function serializeQuery(query, nestedFacet = false) {
    if (!Number.isSafeInteger(query.offsetValue) || query.offsetValue < 0) {
        throw new Error('TFP_INVALID_REQUEST: offset must be a non-negative safe integer');
    }
    if (query.limitValue && (!Number.isSafeInteger(query.limitValue) || query.limitValue < 1)) {
        throw new Error('TFP_INVALID_REQUEST: limit must be a positive safe integer');
    }
    rejectRemoteHardLimit(JSON.parse(JSON.stringify(query)));
    if (!query.commentText?.trim())
        throw new Error('TFP_INVALID_REQUEST: commentText is required');
    if (!query.purposeText?.trim())
        throw new Error('TFP_POLICY_VIOLATION: purposeText is required');
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
class TeaQLClient {
    constructor(config) {
        this.config = config;
        // Fallback to global fetch if available
        this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
        this.runtimeTelemetry = config.runtimeTelemetry ?? telemetry_1.NOOP_RUNTIME_TELEMETRY;
    }
    setRuntimeTelemetry(telemetry) {
        this.runtimeTelemetry = telemetry ?? telemetry_1.NOOP_RUNTIME_TELEMETRY;
        return this;
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
        const payload = serializeQuery(query);
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
        throw new Error('TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol');
    }
    async executeMutation(query) {
        if (!query?.comment?.trim?.()) {
            throw new Error('TFP_AUDIT_REASON_REQUIRED: mutation audit reason is required');
        }
        const payload = {
            entity: query.entity, action: query.action, payload: query.payload,
            id: query.id, expectedVersion: query.expectedVersion, comment: query.comment,
        };
        rejectRemoteHardLimit(payload);
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