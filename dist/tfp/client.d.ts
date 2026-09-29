import { SelectQuery } from '../core/ast';
import { SmartList } from '../core/smart-list';
import { UserContext } from '../core/context';
import { MutationGovernanceSnapshot } from '../core/mutation-policy';
import { RuntimeTelemetry } from '../core/telemetry';
export interface TeaQLClientConfig {
    baseUrl: string;
    fetch?: typeof fetch;
    getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
    runtimeTelemetry?: RuntimeTelemetry;
    /** Trusted local context; never serialized into the TFP request. */
    userContext?: UserContext;
}
export declare class TeaQLClient {
    private config;
    private fetchImpl;
    private runtimeTelemetry;
    private userContext;
    private readonly mutationGovernanceEvents;
    constructor(config: TeaQLClientConfig);
    setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this;
    setUserContext(context: UserContext): this;
    get mutationGovernanceTrace(): readonly MutationGovernanceSnapshot[];
    private requestHeaders;
    executeQuery<T = any>(query: SelectQuery): Promise<SmartList<T>>;
    executeForStream<T = any>(_query: SelectQuery, _chunkSize?: number): AsyncIterable<T[]>;
    executeMutation(query: any): Promise<any>;
}
//# sourceMappingURL=client.d.ts.map