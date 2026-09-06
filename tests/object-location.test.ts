import { checkResultToWire, ObjectLocation } from '../src';

test('renders canonical, native, and JSON locations from one structure', () => {
  const location = ObjectLocation.root().property('order_items').index(2).property('user_url');
  expect(location.modelPath()).toBe('order_items[2].user_url');
  expect(location.nativePath()).toBe('orderItems[2].userUrl');
  expect(location.instancePath()).toBe('/orderItems/2/userUrl');
  expect(location.instancePath('snake_case')).toBe('/order_items/2/user_url');
  expect(location.instancePath('PascalCase')).toBe('/OrderItems/2/UserUrl');
});

test('wire checker path preserves an accepted submitted alias', () => {
  const wire = checkResultToWire({
    ruleId: 'required',
    entityType: 'customer_account',
    location: ObjectLocation.property('user_url'),
    sourceInstancePath: '/user_url',
  });
  expect(wire.instancePath).toBe('/userUrl');
  expect(wire.sourceInstancePath).toBe('/user_url');
  expect(wire.location).toEqual([{kind: 'property', name: 'user_url'}]);
});
