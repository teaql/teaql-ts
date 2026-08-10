"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeaQLClient = void 0;
class TeaQLClient {
    constructor(config) {
        this.config = config;
        // Fallback to global fetch if available
        this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    }
    async executeQuery(query) {
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
            body: JSON.stringify(query),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`TEAQL Query Error [${response.status}]: ${errText}`);
        }
        const responseJson = await response.json();
        return responseJson.data;
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