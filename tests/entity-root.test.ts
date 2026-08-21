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

test('entity root merges, rekeys and clears one entity', () => {
  const child = new EntityRoot(); const temporary = { entity: 'Line', id: -1 }; const persisted = { entity: 'Line', id: 42 };
  child.markAsNew(temporary); child.set(temporary, 'quantity', 2);
  const root = new EntityRoot(); root.mergeFrom(child); root.rekey(temporary, persisted);
  expect(root.isNew(persisted)).toBe(true); expect(root.change(persisted).quantity).toBe(2);
  root.clearEntity(persisted); expect(root.isNew(persisted)).toBe(false); expect(root.change(persisted)).toEqual({});
});
