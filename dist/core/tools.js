"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchHttpToolProvider = exports.HTTP_TOOL = exports.ContextToolsBuilder = exports.ContextTools = exports.ToolPolicyBuilder = exports.ToolPolicy = void 0;
class ToolPolicy {
    constructor(allowed, allowMemoryOnly = true) {
        this.allowed = allowed;
        this.allowMemoryOnly = allowMemoryOnly;
    }
    static standard() { return new ToolPolicy(new Set()); }
    static denyAll() { return new ToolPolicy(new Set(), false); }
    static builder() { return new ToolPolicyBuilder(); }
    allows(token) {
        return (token.risk === 'MEMORY_ONLY' && this.allowMemoryOnly) || this.allowed.has(token.id);
    }
}
exports.ToolPolicy = ToolPolicy;
class ToolPolicyBuilder {
    constructor() {
        this.allowed = new Set();
    }
    allow(token) { this.allowed.add(token.id); return this; }
    build() { return new ToolPolicy(new Set(this.allowed)); }
}
exports.ToolPolicyBuilder = ToolPolicyBuilder;
class DefaultTools {
    constructor(context, policy, providers) {
        this.context = context;
        this.policy = policy;
        this.providers = new Map();
        for (const provider of providers)
            this.providers.set(provider.token.id, provider);
    }
    has(token) { return this.providers.has(token.id); }
    get(token) {
        const provider = this.providers.get(token.id);
        if (!provider)
            throw new Error(`Tool not available: ${token.id}`);
        if (!this.policy.allows(token))
            throw new Error(`Tool denied by policy: ${token.id}`);
        return provider.create(this.context);
    }
    descriptors() {
        return [...this.providers.values()].map((provider) => provider.token);
    }
}
class ContextTools {
    static builder(context) { return new ContextToolsBuilder(context); }
    static of(context) { return this.builder(context).build(); }
}
exports.ContextTools = ContextTools;
class ContextToolsBuilder {
    constructor(context) {
        this.context = context;
        this.selectedPolicy = ToolPolicy.standard();
        this.providers = [];
    }
    policy(policy) { this.selectedPolicy = policy; return this; }
    provider(provider) {
        this.providers.push(provider);
        return this;
    }
    build() { return new DefaultTools(this.context, this.selectedPolicy, this.providers); }
}
exports.ContextToolsBuilder = ContextToolsBuilder;
exports.HTTP_TOOL = Object.freeze({
    id: 'http', risk: 'EXTERNAL_RESOURCE',
});
class FetchHttpToolProvider {
    constructor(fetchImpl = fetch) {
        this.fetchImpl = fetchImpl;
        this.token = exports.HTTP_TOOL;
    }
    create(_context) {
        const stage = (method, url, body) => ({
            purpose: (intent) => executable(method, url, body, intent),
            auditAs: (intent) => executable(method, url, body, intent),
        });
        const executable = (method, url, body, intent) => ({
            execute: async () => {
                if (!intent.trim())
                    throw new Error('HTTP tool execution requires non-empty intent');
                const response = await this.fetchImpl(url, method === 'GET' ? { method } : {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!response.ok)
                    throw new Error(`HTTP tool failed: ${response.status}`);
                return response.text();
            },
        });
        return { get: (url) => stage('GET', url), post: (url, body) => stage('POST', url, body) };
    }
}
exports.FetchHttpToolProvider = FetchHttpToolProvider;
//# sourceMappingURL=tools.js.map