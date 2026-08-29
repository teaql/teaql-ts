import { SelectQuery, SortDirection, OrderBy, MutationQuery } from '../src/core/ast';

describe('AST Classes', () => {
  it('keeps continuous page optimization local and validates it', () => {
    const query = new SelectQuery('Order').optimizeForContinuousPageFetchWith('orders', 30);
    expect(query.localContinuousPageOptions()).toEqual({ namespace: 'orders', ttlSeconds: 30 });
    expect(JSON.stringify(query)).not.toContain('continuousPage');
    expect(() => new SelectQuery('Order').optimizeForContinuousPageFetchWith(' ', 30)).toThrow('namespace');
    expect(() => new SelectQuery('Order').optimizeForContinuousPageFetchWith('orders', 0)).toThrow('ttlSeconds');
  });
  it('keeps ID set pagination local and validates it', () => {
    const query = new SelectQuery('Order').optimizePaginationWithIdSetConfig('orders', 30, 1_000);
    expect(query.localIdSetPaginationOptions()).toEqual({ namespace: 'orders', ttlSeconds: 30, maxIds: 1_000 });
    expect(JSON.stringify(query)).not.toContain('idSetPagination');
    expect(() => new SelectQuery('Order').optimizePaginationWithIdSetConfig(' ', 30, 1)).toThrow('namespace');
    expect(() => new SelectQuery('Order').optimizePaginationWithIdSetConfig('orders', 0, 1)).toThrow('ttlSeconds');
    expect(() => new SelectQuery('Order').optimizePaginationWithIdSetConfig('orders', 30, 0)).toThrow('maxIds');
  });
  it('enforces a local-only materialized list hard limit', () => {
    expect(new SelectQuery('Order').prepareForList().limitValue).toBe(10_000);
    expect(() => new SelectQuery('Order').limit(10_001).prepareForList()).toThrow('QUERY_HARD_LIMIT_EXCEEDED');
    expect(() => new SelectQuery('Order').limit(0)).toThrow('QUERY_INVALID_LIMIT');
    expect(() => new SelectQuery('Order').limit(-1)).toThrow('QUERY_INVALID_LIMIT');
    expect(() => new SelectQuery('Order').offset(-1)).toThrow('QUERY_INVALID_OFFSET');
  });

  it('uses a fixed 10,000 ceiling for every nested relation query', () => {
    const nested = new SelectQuery('OrderLine');
    const query = new SelectQuery('Order').relationQuery('lines', nested);

    query.prepareForList();
    expect(query.limitValue).toBe(10_000);
    expect(nested.limitValue).toBe(10_000);

    nested.limit(10_001);
    expect(() => query.prepareForList()).toThrow('QUERY_HARD_LIMIT_EXCEEDED');
  });

  it('SelectQuery should build correctly', () => {
    const query = new SelectQuery("Task")
      .filter({ "status": { "$eq": 1001 } })
      .order(OrderBy.desc("id"))
      .limit(5)
      .offset(10);

    expect(query.entity).toBe("Task");
    expect(query.filterCondition.status.$eq).toBe(1001);
    expect(query.limitValue).toBe(5);
    expect(query.offsetValue).toBe(10);
    expect(query.orderItems.length).toBe(1);
    expect(query.orderItems[0].field).toBe("id");
    expect(query.orderItems[0].direction).toBe(SortDirection.Desc);
  });

  it('captures forward and reverse relation join semantics', () => {
    const organization = new SelectQuery('Organization').select(['id', 'name']);
    const children = new SelectQuery('Child').select(['id', 'parent']);
    const query = new SelectQuery('Person')
      .relationQuery('organization', organization, 'organization', 'id', false)
      .relationQuery('childList', children, 'id', 'parent', true);

    expect(query.relations).toEqual([
      { name: 'organization', query: organization, localKey: 'organization', foreignKey: 'id', many: false },
      { name: 'childList', query: children, localKey: 'id', foreignKey: 'parent', many: true },
    ]);
  });

  it('SelectQuery should support aggregations and groupBy', () => {
    const query = new SelectQuery("Task")
      .aggregate("Count", "id", "taskCount")
      .groupBy("status");

    expect(query.aggregateItems.length).toBe(1);
    expect(query.aggregateItems[0].function).toBe("Count");
    expect(query.aggregateItems[0].field).toBe("id");
    expect(query.aggregateItems[0].alias).toBe("taskCount");

    expect(query.groupByItems.length).toBe(1);
    expect(query.groupByItems[0]).toBe("status");
  });

  it('SelectQuery should preserve nested relation limit in JSON', () => {
    const query = new SelectQuery('Order').relationQuery(
      'lines',
      new SelectQuery('OrderLine').order(OrderBy.desc('id')).limit(3),
    );

    const payload = JSON.parse(JSON.stringify(query));

    expect(payload.relations[0].name).toBe('lines');
    expect(payload.relations[0].query.limitValue).toBe(3);
    expect(payload.relations[0].query.orderItems[0].field).toBe('id');
  });

  it('MutationQuery should build correctly', () => {
    const mut = new MutationQuery("Task", "Create", { name: "New Task" }, 1, "Creation comment");

    expect(mut.entity).toBe("Task");
    expect(mut.action).toBe("Create");
    expect(mut.payload.name).toBe("New Task");
    expect(mut.id).toBe(1);
    expect(mut.comment).toBe("Creation comment");
  });
});
