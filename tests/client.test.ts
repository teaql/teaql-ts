import { TeaQLClient } from '../src/tfp/client';
import { SelectQuery, SortDirection, OrderBy, MutationQuery } from '../src/core/ast';
import { RuntimeOperation, RuntimeTelemetry, RuntimeTelemetryScope } from '../src/core/telemetry';
import { SmartList } from '../src/core/smart-list';

class TfpRecordingTelemetry implements RuntimeTelemetry {
  readonly events: Array<{ operation: RuntimeOperation; outcome?: string; cardinality?: number }> = [];
  start(operation: RuntimeOperation): RuntimeTelemetryScope {
    const event = { operation } as { operation: RuntimeOperation; outcome?: string; cardinality?: number };
    this.events.push(event);
    return {
      success: completion => {
        event.outcome = 'success';
        event.cardinality = completion?.attributes?.['teaql.result.cardinality'] as number | undefined;
      },
      failure: () => { event.outcome = 'failure'; },
    };
  }
}

// Mock fetch globally
global.fetch = jest.fn();

const federalQuery = (entity: string) => new SelectQuery(entity)
  .comment('conformance query').purpose('conformance test');

describe('TeaQLClient Backend/Node.js Tests', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should serialize SelectQuery correctly and send via fetch', async () => {
    // 1. Arrange: Setup mock response
    const mockData = [{ id: 1, name: "Test User" }];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData })
    });

    // 2. Arrange: Create client and query
    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const query = federalQuery("User")
      .filter({ "name": { "$eq": "Test User" } })
      .order(OrderBy.desc("id"))
      .limit(10);

    // 3. Act: Execute query
    const result = await client.executeQuery(query);

    // 4. Assert: Check response and fetch payload
    expect(result).toBeInstanceOf(SmartList);
    expect(Array.from(result)).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Check fetch arguments
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/query');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    
    // Ensure the query was correctly serialized to JSON
    const body = JSON.parse(options.body);
    expect(body.entity).toBe("User");
    expect(body.limitValue).toBe(10);
    expect(body.filterCondition.name.$eq).toBe("Test User");
    expect(body.orderItems[0].field).toBe("id");
    expect(body.orderItems[0].direction).toBe(SortDirection.Desc);
  });

  it('serializes canonical facets and restores SmartList facet metadata', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], facets: { statusCount: [{ code: 'NEW', count: 5 }] } })
    });

    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const query = federalQuery("Task");
    
    const facetQuery = federalQuery("TaskStatus")
      .select(['id', 'code'])
      .aggregate("Count", "id", "count");
    query.facetBy("statusCount", "status", { toQuery: () => facetQuery });

    const result = await client.executeQuery(query);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.facets[0].facetName).toBe('statusCount');
    expect(body.facets[0].relationName).toBe('status');
    expect(body.facets[0].query.entity).toBe('TaskStatus');
    expect(result.facet('statusCount')?.[0]).toEqual({ code: 'NEW', count: 5 });
  });

  it('should support mutations and correctly serialize them to /mutate', async () => {
    const mockResponse = { success: true, saved_data: [{ id: 1, name: "Created" }] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const mutation = new MutationQuery("Task", "Create", { name: "Created" }, undefined, "create task");

    const result = await client.executeMutation(mutation);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/mutate');
    expect(options.method).toBe('POST');
    
    const body = JSON.parse(options.body);
    expect(body.entity).toBe("Task");
    expect(body.action).toBe("Create");
    expect(body.payload.name).toBe("Created");
    expect(body.comment).toBe("create task");
  });

  it('records balanced TFP client query and mutation lifecycles', async () => {
    const telemetry = new TfpRecordingTelemetry();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api', runtimeTelemetry: telemetry });

    await client.executeQuery(federalQuery('Task'));
    await client.executeMutation(new MutationQuery('Task', 'Create', {}, undefined, 'test'));

    expect(telemetry.events.map(event => [
      event.operation.family,
      event.operation.name,
      event.operation.attributes?.['teaql.tfp.role'],
      event.outcome,
    ])).toEqual([
      ['tfp', 'client.query', 'client', 'success'],
      ['tfp', 'client.mutation', 'client', 'success'],
    ]);
    expect(telemetry.events[0].cardinality).toBe(1);
  });

  it('records TFP transport failure and rethrows the original error', async () => {
    const telemetry = new TfpRecordingTelemetry();
    const transportError = new Error('network unavailable');
    (global.fetch as jest.Mock).mockRejectedValue(transportError);
    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' })
      .setRuntimeTelemetry(telemetry);

    await expect(client.executeQuery(federalQuery('Task'))).rejects.toBe(transportError);
    expect(telemetry.events).toHaveLength(1);
    expect(telemetry.events[0].outcome).toBe('failure');
  });

  it('injects trace metadata inside the TFP client operation without touching payload', async () => {
    const telemetry = new TfpRecordingTelemetry() as TfpRecordingTelemetry & RuntimeTelemetry;
    telemetry.inject = carrier => { carrier.traceparent = '00-trace-span-01'; };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true, json: async () => ({ data: [] }),
    });
    const client = new TeaQLClient({
      baseUrl: 'http://localhost:8080/api', runtimeTelemetry: telemetry,
    });

    await client.executeQuery(federalQuery('Task'));

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.traceparent).toBe('00-trace-span-01');
    expect(options.body).not.toContain('traceparent');
  });

  it('keeps TFP requests working when propagation injection fails', async () => {
    const telemetry = new TfpRecordingTelemetry() as TfpRecordingTelemetry & RuntimeTelemetry;
    telemetry.inject = () => { throw new Error('propagator unavailable'); };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true, json: async () => ({ data: [] }),
    });

    await new TeaQLClient({
      baseUrl: 'http://localhost:8080/api', runtimeTelemetry: telemetry,
    }).executeQuery(federalQuery('Task'));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('uses trusted authentication headers for mutations without serializing context', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const client = new TeaQLClient({
      baseUrl: 'http://localhost:8080/api/',
      getHeaders: async () => ({ Authorization: 'Bearer trusted-session' }),
    });
    const mutation = new MutationQuery('Task', 'Update', { id: 1 }, 2, 'update task');

    await client.executeMutation(mutation);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/mutate');
    expect(options.headers.Authorization).toBe('Bearer trusted-session');
    expect(options.body).not.toContain('trusted-session');
  });

  it('rejects streaming over the ordinary federation protocol without issuing HTTP', async () => {
    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const consume = async () => {
      for await (const _chunk of client.executeForStream(new SelectQuery('Task'))) { /* consume */ }
    };
    await expect(consume()).rejects.toThrow(/dedicated streaming protocol/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['hardLimit', 'hard_limit', 'hard_limit_value']) (
    'rejects remote hard-limit injection through %s without issuing HTTP',
    async (field) => {
      const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
      const query = federalQuery('Order') as SelectQuery & Record<string, unknown>;
      query[field] = 20_000;

      await expect(client.executeQuery(query)).rejects.toThrow('TFP_FORBIDDEN_FIELD');
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it.each(['continuousPageFetch', 'continuous_page_fetch', 'continuousPageRuntime']) (
    'rejects remote local cursor policy field %s without issuing HTTP',
    async (field) => {
      const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
      const query = federalQuery('Order') as SelectQuery & Record<string, unknown>;
      query[field] = { namespace: 'attacker', ttlSeconds: 999 };
      await expect(client.executeQuery(query)).rejects.toThrow('TFP_FORBIDDEN_FIELD');
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it.each(['idSetPagination', 'id_set_pagination', 'paginationWithIdSet']) (
    'rejects remote ID-set retention policy field %s without issuing HTTP',
    async (field) => {
      const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
      const query = federalQuery('Order') as SelectQuery & Record<string, unknown>;
      query[field] = { namespace: 'attacker', ttlSeconds: 999, maxIds: 9_999_999 };
      await expect(client.executeQuery(query)).rejects.toThrow('TFP_FORBIDDEN_FIELD');
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('rejects nested remote hard-limit injection without issuing HTTP', async () => {
    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const nested = new SelectQuery('OrderLine') as SelectQuery & Record<string, unknown>;
    nested.hard_limit = 20_000;
    const query = federalQuery('Order').relationQuery('lines', nested);

    await expect(client.executeQuery(query)).rejects.toThrow('TFP_FORBIDDEN_FIELD');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
