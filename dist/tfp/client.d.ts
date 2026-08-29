import { SelectQuery } from '../core/ast';
import { SmartList } from '../core/smart-list';
import { RuntimeTelemetry } from '../core/telemetry';
export interface TeaQLClientConfig {
    baseUrl: string;
    fetch?: typeof fetch;
    getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
    runtimeTelemetry?: RuntimeTelemetry;
}
export declare class TeaQLClient {
    private config;
    private fetchImpl;
    private runtimeTelemetry;
    constructor(config: TeaQLClientConfig);
    setRuntimeTelemetry(telemetry: RuntimeTelemetry | undefined): this;
    private requestHeaders;
    executeQuery<T = any>(query: SelectQuery): Promise<SmartList<T>>;
    executeForStream<T = any>(_query: SelectQuery, _chunkSize?: number): AsyncIterable<T[]>;
    executeMutation(query: any): Promise<any>;
}
//# sourceMappingURL=client.d.ts.map