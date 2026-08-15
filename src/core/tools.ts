import { UserContext } from './context';

export type ToolRisk = 'MEMORY_ONLY' | 'EXTERNAL_RESOURCE' | 'PRIVILEGED';

export interface ToolToken<T> {
  readonly id: string;
  readonly risk: ToolRisk;
  readonly _type?: T;
}

export interface ToolProvider<T> {
  readonly token: ToolToken<T>;
  create(context: UserContext): T;
}

export class ToolPolicy {
  constructor(
    private readonly allowed: ReadonlySet<string>,
    private readonly allowMemoryOnly = true,
  ) {}

  static standard(): ToolPolicy { return new ToolPolicy(new Set()); }
  static denyAll(): ToolPolicy { return new ToolPolicy(new Set(), false); }
  static builder(): ToolPolicyBuilder { return new ToolPolicyBuilder(); }

  allows<T>(token: ToolToken<T>): boolean {
    return (token.risk === 'MEMORY_ONLY' && this.allowMemoryOnly) || this.allowed.has(token.id);
  }
}

export class ToolPolicyBuilder {
  private readonly allowed = new Set<string>();
  allow<T>(token: ToolToken<T>): this { this.allowed.add(token.id); return this; }
  build(): ToolPolicy { return new ToolPolicy(new Set(this.allowed)); }
}

export interface Tools {
  has<T>(token: ToolToken<T>): boolean;
  get<T>(token: ToolToken<T>): T;
  descriptors(): readonly ToolToken<unknown>[];
}

class DefaultTools implements Tools {
  private readonly providers = new Map<string, ToolProvider<unknown>>();

  constructor(
    private readonly context: UserContext,
    private readonly policy: ToolPolicy,
    providers: readonly ToolProvider<unknown>[],
  ) {
    for (const provider of providers) this.providers.set(provider.token.id, provider);
  }

  has<T>(token: ToolToken<T>): boolean { return this.providers.has(token.id); }

  get<T>(token: ToolToken<T>): T {
    const provider = this.providers.get(token.id);
    if (!provider) throw new Error(`Tool not available: ${token.id}`);
    if (!this.policy.allows(token)) throw new Error(`Tool denied by policy: ${token.id}`);
    return provider.create(this.context) as T;
  }

  descriptors(): readonly ToolToken<unknown>[] {
    return [...this.providers.values()].map((provider) => provider.token);
  }
}

export class ContextTools {
  static builder(context: UserContext): ContextToolsBuilder { return new ContextToolsBuilder(context); }
  static of(context: UserContext): Tools { return this.builder(context).build(); }
}

export class ContextToolsBuilder {
  private selectedPolicy = ToolPolicy.standard();
  private readonly providers: ToolProvider<unknown>[] = [];
  constructor(private readonly context: UserContext) {}
  policy(policy: ToolPolicy): this { this.selectedPolicy = policy; return this; }
  provider<T>(provider: ToolProvider<T>): this {
    this.providers.push(provider as ToolProvider<unknown>);
    return this;
  }
  build(): Tools { return new DefaultTools(this.context, this.selectedPolicy, this.providers); }
}

export interface ExecutableHttpTool { execute(): Promise<string>; }
export interface HttpIntentPhase {
  purpose(intent: string): ExecutableHttpTool;
  auditAs(intent: string): ExecutableHttpTool;
}
export interface HttpTool {
  get(url: string): HttpIntentPhase;
  post(url: string, body: unknown): HttpIntentPhase;
}

export const HTTP_TOOL: ToolToken<HttpTool> = Object.freeze({
  id: 'http', risk: 'EXTERNAL_RESOURCE' as const,
});

export class FetchHttpToolProvider implements ToolProvider<HttpTool> {
  readonly token = HTTP_TOOL;
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}
  create(_context: UserContext): HttpTool {
    const stage = (method: 'GET' | 'POST', url: string, body?: unknown): HttpIntentPhase => ({
      purpose: (intent) => executable(method, url, body, intent),
      auditAs: (intent) => executable(method, url, body, intent),
    });
    const executable = (
      method: 'GET' | 'POST', url: string, body: unknown, intent: string,
    ): ExecutableHttpTool => ({
      execute: async () => {
        if (!intent.trim()) throw new Error('HTTP tool execution requires non-empty intent');
        const response = await this.fetchImpl(url, method === 'GET' ? { method } : {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`HTTP tool failed: ${response.status}`);
        return response.text();
      },
    });
    return { get: (url) => stage('GET', url), post: (url, body) => stage('POST', url, body) };
  }
}
