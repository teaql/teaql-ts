import { TeaQLClient } from '../src/tfp/client';
import { SelectQuery, SortDirection, OrderBy, MutationQuery } from '../src/core/ast';

// Mock fetch globally
global.fetch = jest.fn();

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
    const query = new SelectQuery("User")
      .filter({ "name": { "$eq": "Test User" } })
      .order(OrderBy.desc("id"))
      .limit(10);

    // 3. Act: Execute query
    const result = await client.executeQuery(query);

    // 4. Assert: Check response and fetch payload
    expect(result).toEqual(mockData);
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

  it('should support facets in SelectQuery', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], facets: { statusCount: [{ code: 'NEW', count: 5 }] } })
    });

    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const query = new SelectQuery("Task");
    
    const facetQuery = new SelectQuery("Task").aggregate("Count", "id", "count");
    query.facetBy("statusCount", "STATUS_PROPERTY", { query: facetQuery });

    const result = await client.executeQuery(query);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.facets).toBeDefined();
    expect(body.facets.length).toBe(1);
    expect(body.facets[0].facetName).toBe("statusCount");
    expect(body.facets[0].relationName).toBe("STATUS_PROPERTY");
    expect(body.facets[0].query.entity).toBe("Task");
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
      const query = new SelectQuery('Order') as SelectQuery & Record<string, unknown>;
      query[field] = 20_000;

      await expect(client.executeQuery(query)).rejects.toThrow('TFP_FORBIDDEN_FIELD');
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('rejects nested remote hard-limit injection without issuing HTTP', async () => {
    const client = new TeaQLClient({ baseUrl: 'http://localhost:8080/api' });
    const nested = new SelectQuery('OrderLine') as SelectQuery & Record<string, unknown>;
    nested.hard_limit = 20_000;
    const query = new SelectQuery('Order').relationQuery('lines', nested);

    await expect(client.executeQuery(query)).rejects.toThrow('TFP_FORBIDDEN_FIELD');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
