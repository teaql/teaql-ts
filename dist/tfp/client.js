"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeaQLClient = void 0;
function rejectRemoteHardLimit(value, path = '$') {
    if (Array.isArray(value)) {
        value.forEach((item, index) => rejectRemoteHardLimit(item, `${path}[${index}]`));
        return;
    }
    if (!value || typeof value !== 'object')
        return;
    for (const [key, child] of Object.entries(value)) {
        const normalized = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (normalized === 'hardlimit' || normalized === 'hardlimitvalue' || normalized.startsWith('continuouspage')) {
            throw new Error(`TFP_FORBIDDEN_FIELD: ${path}.${key} is server-local policy`);
        }
        rejectRemoteHardLimit(child, `${path}.${key}`);
    }
}
class TeaQLClient {
    constructor(config) {
        this.config = config;
        // Fallback to global fetch if available
        this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    }
    async executeQuery(query) {
        query.prepareForList();
        const payload = JSON.parse(JSON.stringify(query));
        rejectRemoteHardLimit(payload);
        const url = `${this.config.baseUrl.replace(/\/$/, '')}/query`;
        let headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (this.config.getHeaders) {
            const extraHeaders = await this.config.getHeaders();
            headers = { ...headers, ...extraHeaders };
        }
        const response = await this.fetchImpl(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`TEAQL Query Error [${response.status}]: ${errText}`);
        }
        const responseJson = await response.json();
        return responseJson.data;
    }
    async *executeForStream(_query, _chunkSize = 1000) {
        throw new Error('TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol');
    }
    async executeMutation(query) {
        const response = await this.fetchImpl(`${this.config.baseUrl}/mutate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TeaQL Mutation failed: ${response.status} ${errorText}`);
        }
        return response.json();
    }
}
exports.TeaQLClient = TeaQLClient;
//# sourceMappingURL=client.js.map