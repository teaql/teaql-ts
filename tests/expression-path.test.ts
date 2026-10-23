import { ExpressionPath, TeaQLNotLoadedError } from '../src';

test('early repeated relation failure retains the full native chain and exactly one marker', () => {
  const parent = ExpressionPath.root('E.node(<root>)').member('parent', 'parent').markMissing();
  const full = parent.member('parent', 'parent').member('user_url', 'userUrl');
  const error = new TeaQLNotLoadedError(parent, 'parent').withPath(full).terminal('eval()');
  expect(error.toWire()).toMatchObject({
    code: 'NOT_LOADED', instancePath: '/parent', attemptedInstancePath: '/parent/parent/userUrl',
    breakPointIndex: 0, originalExpression: 'E.node(<root>).parent().parent().userUrl().eval()',
    expressionWithBrokenPoint: 'E.node(<root>).parent()<broken>.parent().userUrl().eval()',
  });
  expect(error.details.expressionWithBrokenPoint.match(/<broken>/g)).toHaveLength(1);
  expect(error.details.suggestedFix).toEqual({ action: 'preload', location: error.details.location });
});

test('canonical keys, wire profiles, first, real indices and size remain distinct', () => {
  for (const profile of ['camelCase', 'snake_case', 'PascalCase'] as const) {
    const items = ExpressionPath.root('E.order(<root>)', profile).member('order_items', 'orderItems').markMissing();
    const error = new TeaQLNotLoadedError(items.index(12).member('user_url', 'userUrl'), 'order_items').terminal('eval()');
    expect(error.details.attemptedLocation[1]).toEqual({ kind: 'index', index: 12 });
    expect(error.details.location).toEqual([{ kind: 'property', name: 'order_items' }]);
    expect(error.message).toContain('.get(12).userUrl().eval()');
    const first = new TeaQLNotLoadedError(items.index(0, true), 'order_items').terminal('eval()');
    expect(first.message).toContain('.first().eval()');
    const size = new TeaQLNotLoadedError(items.operation('size()'), 'order_items').terminal('isPresent()');
    expect(size.details.attemptedLocation).toEqual(size.details.location);
  }
  const name = ExpressionPath.root('E.node(<root>)').member('a~/b.c', 'safeMethod').markMissing();
  expect(new TeaQLNotLoadedError(name, 'a~/b.c').details.instancePath).toBe('/a~0~1b.c');
});

test('sibling diagnostic paths do not mutate one another or contain entity input values', () => {
  const missing = ExpressionPath.root('E.node(<root>)').member('child', 'child').markMissing();
  const first = new TeaQLNotLoadedError(missing.member('name', 'name'), 'child').terminal('orElse(<fallback>)');
  const second = new TeaQLNotLoadedError(missing.member('code', 'code'), 'child').terminal('eval()');
  expect(first.message).toContain('.name().orElse(<fallback>)');
  expect(first.message).not.toContain('.code()');
  expect(second.details).not.toHaveProperty('root');
  expect(second.details).not.toHaveProperty('inputValue');
});
