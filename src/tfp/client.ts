import { SelectQuery } from '../core/ast';

export interface TeaQLClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

export class TeaQLClient {
  private config: TeaQLClientConfig;
  private fetchImpl: typeof fetch;

  constructor(config: TeaQLClientConfig) {
    this.config = config;
    // Fallback to global fetch if available
    this.fetchImpl = config.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  }

  async executeQuery<T = any>(query: SelectQuery): Promise<T[]> {
    query.prepareForList();
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/query`;
    
    let headers: Record<string, string> = {
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

  async *executeForStream<T = any>(
    _query: SelectQuery,
    _chunkSize = 1000,
  ): AsyncIterable<T[]> {
    throw new Error(
      'TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol',
    );
  }

  async executeMutation(query: any): Promise<any> {
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
