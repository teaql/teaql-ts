import {
  ContextTools, FetchHttpToolProvider, HTTP_TOOL, ToolPolicy, UserContext,
} from '../src';

describe('context Tool API', () => {
  test('requires trusted policy and preserves native string response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    const context = new UserContext();
    const tools = ContextTools.builder(context)
      .policy(ToolPolicy.builder().allow(HTTP_TOOL).build())
      .provider(new FetchHttpToolProvider(fetchImpl as unknown as typeof fetch))
      .build();

    await expect(tools.get(HTTP_TOOL).get('https://example.com').purpose('status').execute())
      .resolves.toBe('ok');
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com', { method: 'GET' });
  });

  test('rejects denied, unknown and blank-intent operations', async () => {
    const context = new UserContext();
    const provider = new FetchHttpToolProvider(jest.fn() as unknown as typeof fetch);
    const denied = ContextTools.builder(context).provider(provider).build();
    expect(() => denied.get(HTTP_TOOL)).toThrow('Tool denied by policy: http');

    const allowed = ContextTools.builder(context)
      .policy(ToolPolicy.builder().allow(HTTP_TOOL).build()).provider(provider).build();
    await expect(allowed.get(HTTP_TOOL).get('https://example.com').purpose(' ').execute())
      .rejects.toThrow('requires non-empty intent');
    expect(() => allowed.get({ id: 'unknown', risk: 'MEMORY_ONLY' }))
      .toThrow('Tool not available: unknown');
  });
});
