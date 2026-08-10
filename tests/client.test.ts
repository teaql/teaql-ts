import { TeaQLClient } from '../src/client';
import { SelectQuery, SortDirection, OrderBy } from '../src/query';

// Mock fetch globally
global.fetch = jest.fn();

describe('TeaQLClient Backend/Node.js Tests', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should serialize SelectQuery correctly and send via fetch', async () => {
    // 1. Arrange: Setup mock response
    const mockResponse = [{ id: 1, name: "Test User" }];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
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
    expect(result).toEqual(mockResponse);
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
});
