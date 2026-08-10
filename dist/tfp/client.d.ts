import { SelectQuery } from '../core/ast';
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
    executeMutation(query: any): Promise<any>;
}
//# sourceMappingURL=client.d.ts.map