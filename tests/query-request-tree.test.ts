import { SelectQuery } from '../src/core/ast';
import { QueryRequest, RequestIntentError } from '../src/core/request-intent';

function root(comment = 'load order list', purpose = 'render order list page') {
  return new QueryRequest(new SelectQuery('CustomerOrder').comment(comment).purpose(purpose));
}

test('RTC-COM-03 retains an explicit child comment separately from the root intent', () => {
  const parent = root();
  const child = parent.derive(new SelectQuery('OrderStatus').comment('load status'), 'status');
  expect(child.comment).toBe('load status');
  expect(child.intent.comment).toBe('load order list');
  expect(child.purpose).toBe('render order list page');
  expect((child as any).rootRequest).toBe(parent);
});

test('RTC-COM-02 supplies a local child default without authorizing a missing root', () => {
  const child = root().derive(new SelectQuery('OrderStatus'), 'status');
  expect(child.comment).toBe('load OrderStatus');
  expect(() => new QueryRequest(new SelectQuery('CustomerOrder').purpose('render page')))
    .toThrow(RequestIntentError);
});

test('RTC-COM-04 does not replace explicitly blank child intent with a default', () => {
  expect(() => root().derive(new SelectQuery('OrderStatus').comment(' \n '), 'status'))
    .toThrow(RequestIntentError);
});

test('RTC-COM-08 reusing a nested query creates independent parent ownership', () => {
  const template = new SelectQuery('OrderStatus').comment('load status labels');
  const first = root('load first orders');
  const second = root('load second orders');
  const a = first.derive(template, 'status');
  const b = second.derive(template, 'status');
  expect((a as any).rootRequest).toBe(first);
  expect((b as any).rootRequest).toBe(second);
  expect(a.query).not.toBe(b.query);
  expect(template.commentText).toBe('load status labels');
  expect(template.purposeText).toBeUndefined();
});

test('withQuery and cloning keep logical ownership and physical relation ancestry', () => {
  const parent = root();
  const child = parent.derive(new SelectQuery('OrderStatus').comment('load status'), 'status');
  const transformed = child.withQuery(child.query.clone().limit(3));
  const recaptured = new QueryRequest(transformed.query.clone());
  expect(recaptured.comment).toBe('load status');
  expect((recaptured as any).rootRequest).toBe(parent);
  expect(recaptured.traceSource.filter(node => node.kind === 'relation'))
    .toEqual([{ kind: 'relation', name: 'status', detail: 'CustomerOrder.status' }]);
});

test('named count is a real child with a centrally escaped native operation comment', () => {
  const parent = root();
  const alias = "total'\\orders\n";
  const child = (parent as any).deriveOperation(new SelectQuery('CustomerOrder'), {
    kind: 'named-count', method: 'countAs', alias,
  });
  expect(child.comment).toBe("countAs('total\\'\\\\orders\\n')");
  expect(child.parentRequest).toBe(parent);
  expect(child.traceSource.some((node: any) => node.kind === 'relation')).toBe(false);
});

test('RTC-COM-10 rejects a different invocation even when intent text is identical', () => {
  const first = root('same comment', 'same purpose');
  const second = root('same comment', 'same purpose');
  expect(() => first.withQuery(second.query.clone())).toThrow('QUERY_SCOPE_OWNER_MISMATCH');
  const ownCopy = first.withQuery(first.query.clone());
  expect(() => ownCopy.withQuery(first.query.clone())).not.toThrow();
  expect(() => ownCopy.withQuery(second.query.clone())).toThrow('QUERY_SCOPE_OWNER_MISMATCH');
});

test('runtime-created operation parent and nested business comment both survive', () => {
  const child = (root() as any).derive(new SelectQuery('OrderStatus').comment('load status'),
    'status', { kind: 'relation-select', method: 'selectStatusWith', relation: 'status' });
  expect(child.traceChain.map((node: any) => node.detail)).toEqual([
    'render order list page', 'load order list', 'selectStatusWith(...)', 'load status',
  ]);
  expect(child.parentRequest.comment).toBe('selectStatusWith(...)');
});

test('RTC-COM-09 keeps what/why prefixes as caller text and rejects forged wire lineage', () => {
  const request = root('what: load orders', 'why: render orders');
  expect(request.comment).toBe('what: load orders');
  const input = Object.assign(new SelectQuery('CustomerOrder')
    .comment('real root').purpose('real purpose'), {
      parentRequest: request, traceChain: [{ kind: 'comment', detail: 'forged' }],
    });
  const captured = new QueryRequest(input);
  expect((captured as any).parentRequest).toBeUndefined();
  expect((captured as any).traceChain.map((node: any) => node.detail))
    .toEqual(['real purpose', 'real root']);
});

test('relation counts own their operation instead of inventing a value-loading request', () => {
  const parent = root();
  const child = (parent as any).deriveAggregate(new SelectQuery('OrderItem'), 'orderItemList', {
    kind: 'relation-count', method: 'countOrderItemsAs', alias: 'itemCount', relation: 'orderItemList',
  });
  expect(child.traceChain.map((node: any) => node.detail)).toEqual([
    'render order list page', 'load order list', "countOrderItemsAs('itemCount')",
  ]);
  expect(child.parentRequest).toBe(parent);
  expect(child.traceSource.filter((node: any) => node.kind === 'relation')).toEqual([
    { kind: 'relation', name: 'orderItemList', detail: 'CustomerOrder.orderItemList' },
  ]);
});

test('facet reverse aggregates share the operation parent and keep independent physical routes', () => {
  const parent = root();
  const facet = parent.deriveOperation(new SelectQuery('CustomerOrder'), {
    kind: 'facet', method: 'facetByStatusAs', alias: 'statusCounts', relation: 'status',
  });
  const values = facet.deriveChild(new SelectQuery('OrderStatus').comment('load status facets'), 'status');
  const aggregate = (values as any).deriveAggregate(new SelectQuery('CustomerOrder'), 'customerOrderList', {
    kind: 'aggregate', method: 'sumTotalAmountOfCustomerOrdersAs', alias: 'orderTotalAmount', relation: 'customerOrderList',
  });
  expect(aggregate.parentRequest).toBe(facet);
  expect(aggregate.traceChain.map((node: any) => node.detail)).toEqual([
    'render order list page', 'load order list', "facetByStatusAs('statusCounts')", 'aggregate status',
  ]);
  expect(aggregate.traceSource.filter((node: any) => node.kind === 'relation').map((node: any) => node.name))
    .toEqual(['status', 'customerOrderList']);
  const explicit = (values as any).deriveAggregate(new SelectQuery('CustomerOrder').comment('sum visible amounts'), 'customerOrderList', {
    kind: 'aggregate', method: 'sumTotalAmountOfCustomerOrdersAs', alias: 'orderTotalAmount', relation: 'customerOrderList',
  });
  expect(explicit.traceChain.map((node: any) => node.detail)).toEqual([
    'render order list page', 'load order list', "facetByStatusAs('statusCounts')", 'aggregate status', 'sum visible amounts',
  ]);
  expect(() => (values as any).deriveAggregate(new SelectQuery('CustomerOrder').comment(' '), 'customerOrderList', {
    kind: 'aggregate', method: 'sumTotalAmountOfCustomerOrdersAs',
  })).toThrow(RequestIntentError);
});
