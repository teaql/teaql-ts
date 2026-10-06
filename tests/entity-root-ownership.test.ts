import { EntityRoot } from '../src/core/entity-root';

test('imports only one typed entity and retains all foreign pending state', () => {
  const source = new EntityRoot(), receiver = new EntityRoot();
  const reached = { entity: 'OrderItem', id: '1' }, unrelated = { entity: 'Payment', id: '1' };
  source.setOriginalVersion(reached, 3); source.setOriginalVersion(unrelated, 7);
  source.set(reached, 'name', 'reached'); source.set(unrelated, 'reference_code', 'unrelated');
  source.markAsNew(unrelated);
  source.setTraceChain(reached, [{ kind: 'auditReason', name: 'OrderItem', entityId: '1', detail: 'local reason' }]);
  const before = source.snapshot();
  receiver.mergeEntityFrom(source, reached);
  expect(receiver.change(reached)).toEqual({ name: 'reached' });
  expect(receiver.originalVersion(reached)).toBe(3);
  expect(receiver.traceChain(reached)).toEqual(source.traceChain(reached));
  expect(receiver.change(unrelated)).toEqual({}); expect(receiver.isNew(unrelated)).toBe(false);
  expect(receiver.originalVersion(unrelated)).toBeUndefined();
  receiver.clearEntity(reached);
  expect(source.snapshot()).toEqual(before); expect(source.hasPending(reached)).toBe(true);
});

test('retains clean hydration and typed lifecycle without creating a change', () => {
  const source = new EntityRoot(), receiver = new EntityRoot();
  const key = { entity: 'Order', id: '1' };
  source.setOriginalVersion(key, 2); receiver.mergeEntityFrom(source, key);
  expect(receiver.hasPending(key)).toBe(false); expect(receiver.snapshot()).toEqual([]);
  expect(receiver.originalVersion(key)).toBe(2);
  source.markAsDeleted(key); receiver.mergeEntityFrom(source, key);
  expect(receiver.hasPending(key)).toBe(true); expect(receiver.isDeleted(key)).toBe(true);
  expect(source.isDeleted(key)).toBe(true);
});

test.each(['single', 'whole', 'rekey'])('rejects conflicting loaded versions atomically: %s', mode => {
  const target = new EntityRoot(), source = new EntityRoot();
  const key = { entity: 'Order', id: '1' }, otherType = { entity: 'Payment', id: '1' };
  target.setOriginalVersion(key, 2); target.set(key, 'name', 'receiver');
  source.setOriginalVersion(key, 3); source.set(key, 'name', 'foreign');
  source.set(otherType, 'reference_code', 'must not import first');
  const before = target.snapshot();
  if (mode === 'rekey') {
    const temporary = { entity: 'Order', id: -1 };
    target.setOriginalVersion(temporary, 3); target.set(temporary, 'name', 'temporary');
    expect(() => target.rekey(temporary, key)).toThrow('ENTITY_VERSION_CONFLICT');
    expect(target.change(temporary)).toEqual({ name: 'temporary' });
  } else {
    expect(() => mode === 'single' ? target.mergeEntityFrom(source, key) : target.mergeFrom(source)).toThrow('ENTITY_VERSION_CONFLICT');
    expect(target.snapshot()).toEqual(before);
  }
  expect(target.originalVersion(key)).toBe(2); expect(target.change(key)).toEqual({ name: 'receiver' });
  expect(target.change(otherType)).toEqual({}); expect(source.originalVersion(key)).toBe(3);
});

test('permits distinct entity types sharing an ID and explicit post-commit version advancement', () => {
  const root = new EntityRoot(), order = { entity: 'Order', id: '1' }, payment = { entity: 'Payment', id: '1' };
  root.setOriginalVersion(order, 2); root.setOriginalVersion(payment, 7);
  root.set(order, 'name', 'change');
  expect(() => root.setOriginalVersion(order, 3)).toThrow('ENTITY_VERSION_CONFLICT');
  expect(() => root.acceptCommittedVersion(order, 3)).toThrow('ENTITY_COMMIT_PENDING');
  root.clearEntity(order); root.acceptCommittedVersion(order, 3);
  expect(root.originalVersion(order)).toBe(3); expect(root.originalVersion(payment)).toBe(7);
});
