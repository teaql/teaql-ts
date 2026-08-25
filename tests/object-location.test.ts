import { ObjectLocation } from '../src';

test('renders canonical, native, and JSON locations from one structure', () => {
  const location = ObjectLocation.root().property('order_items').index(2).property('user_url');
  expect(location.modelPath()).toBe('order_items[2].user_url');
  expect(location.nativePath()).toBe('orderItems[2].userUrl');
  expect(location.instancePath()).toBe('/orderItems/2/userUrl');
});
