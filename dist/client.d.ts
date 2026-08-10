import { SelectQuery } from './query';
export interface TeaQLClientConfig {
    baseUrl: string;
    fetch?: typeof fetch;
    getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}
export declare class TeaQLClient {
    private config;
    private fetchImpl;
    constructor(config: TeaQLClientConfig);
    executeQuery<T = any>(query: SelectQuery): Promise<T[]>;
}
//# sourceMappingURL=client.d.ts.map