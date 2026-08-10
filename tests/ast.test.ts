import { SelectQuery, SortDirection, OrderBy, MutationQuery } from '../src/core/ast';

describe('AST Classes', () => {
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

  it('MutationQuery should build correctly', () => {
    const mut = new MutationQuery("Task", "Create", { name: "New Task" }, 1, "Creation comment");

    expect(mut.entity).toBe("Task");
    expect(mut.action).toBe("Create");
    expect(mut.payload.name).toBe("New Task");
    expect(mut.id).toBe(1);
    expect(mut.comment).toBe("Creation comment");
  });
});
