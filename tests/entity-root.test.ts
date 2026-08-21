import { EntityRoot } from '../src/core/entity-root';

test('entity root tracks final values, versions and lifecycle', () => {
  const root = new EntityRoot();
  const order = { entity: 'Order', id: 10 } as const;
  const line = { entity: 'OrderLine', id: 20 } as const;
  root.setOriginalVersion(order, 3);
  root.set(order, 'status', 'pending');
  root.set(order, 'status', 'confirmed');
  root.set(line, 'quantity', 2);
  root.markAsNew(line);
  const entries = new Map(root.snapshot().map(change => [change.key.entity, change]));
  expect(entries.get('Order')?.values.status).toBe('confirmed');
  expect(root.originalVersion(order)).toBe(3);
  expect(root.isNew(line)).toBe(true);
  root.markAsDeleted(line);
  expect(root.isDeleted(line)).toBe(true);
  expect(root.snapshot()).toHaveLength(1);
  root.clearCommitted();
  expect(root.snapshot()).toHaveLength(0);
  expect(root.isNew(line)).toBe(false);
  expect(root.isDeleted(line)).toBe(false);
});
