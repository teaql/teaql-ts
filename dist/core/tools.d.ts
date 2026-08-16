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
export declare class ToolPolicy {
    private readonly allowed;
    private readonly allowMemoryOnly;
    constructor(allowed: ReadonlySet<string>, allowMemoryOnly?: boolean);
    static standard(): ToolPolicy;
    static denyAll(): ToolPolicy;
    static builder(): ToolPolicyBuilder;
    allows<T>(token: ToolToken<T>): boolean;
}
export declare class ToolPolicyBuilder {
    private readonly allowed;
    allow<T>(token: ToolToken<T>): this;
    build(): ToolPolicy;
}
export interface Tools {
    has<T>(token: ToolToken<T>): boolean;
    get<T>(token: ToolToken<T>): T;
    descriptors(): readonly ToolToken<unknown>[];
}
export declare class ContextTools {
    static builder(context: UserContext): ContextToolsBuilder;
    static of(context: UserContext): Tools;
}
export declare class ContextToolsBuilder {
    private readonly context;
    private selectedPolicy;
    private readonly providers;
    constructor(context: UserContext);
    policy(policy: ToolPolicy): this;
    provider<T>(provider: ToolProvider<T>): this;
    build(): Tools;
}
export interface ExecutableHttpTool {
    execute(): Promise<string>;
}
export interface HttpIntentPhase {
    purpose(intent: string): ExecutableHttpTool;
    auditAs(intent: string): ExecutableHttpTool;
}
export interface HttpTool {
    get(url: string): HttpIntentPhase;
    post(url: string, body: unknown): HttpIntentPhase;
}
export declare const HTTP_TOOL: ToolToken<HttpTool>;
export declare class FetchHttpToolProvider implements ToolProvider<HttpTool> {
    private readonly fetchImpl;
    readonly token: ToolToken<HttpTool>;
    constructor(fetchImpl?: typeof fetch);
    create(_context: UserContext): HttpTool;
}
//# sourceMappingURL=tools.d.ts.map