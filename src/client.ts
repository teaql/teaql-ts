import { SelectQuery } from './query';

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

    return response.json();
  }
}
