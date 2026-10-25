import { UserContext } from '../../src';
import { E } from 'generated/generated/E';
import { Q } from 'generated/generated/Q';
import { verifyPageStream } from './paged-ownership';

export async function verifyOwnership(context: UserContext): Promise<void> {
  const before = await Q.purchaseOrders().limit(20).comment('Inspect the initial ownership fixture')
    .purpose('Verify Context and multi-root results do not own shared mutation ledgers').executeForList(context);
  const first = Q.purchaseOrders().comment('Prepare independent new owner A')
    .purpose('Verify Context does not own mutation ledgers').newEntity(context);
  const second = Q.purchaseOrders().comment('Prepare independent new owner B')
    .purpose('Verify Context does not own mutation ledgers').newEntity(context);
  first.updateContactPhone('5550300'); second.updateContactPhone('5550400');
  const savedA = await first.auditAs('Save only independent new owner A').save(context);
  const initial = await Q.purchaseOrders().limit(20).comment("Inspect A's save before saving B")
    .purpose('Verify an independent new owner did not leak into persistence').executeForList(context);
  expect(initial).toHaveLength(before.length + 1);
  const savedB = await second.auditAs('Explicitly save independent new owner B').save(context);
  const batch = await Q.purchaseOrders().limit(20).comment('Load independent owners in one batch')
    .purpose('Verify independently saveable list roots retain separate mutation boundaries').executeForList(context);
  expect(batch).toHaveLength(before.length + 2);
  const ownerA = batch.find(row => row.id === savedA.id)!;
  const ownerB = batch.find(row => row.id === savedB.id)!;
  expect(ownerA).toBeDefined(); expect(ownerB).toBeDefined();
  ownerA.updateContactPhone('5550301'); ownerB.updateContactPhone('5550401');
  await ownerA.auditAs('Save only A from a multi-root query result').save(context);
  const unchanged = (await Q.purchaseOrders().withIdIs(savedB.id!).limit(1)
    .comment('Inspect B after saving only A').purpose('Verify A neither persists nor commits B').executeForList(context))[0];
  expect(E.purchaseOrder(unchanged).contactPhone().eval()).toBe('5550400');
  expect(E.purchaseOrder(unchanged).version().eval()).toBe(1);
  await ownerB.auditAs('Save B after A without discarding its pending mutation').save(context);
  const changed = (await Q.purchaseOrders().withIdIs(savedB.id!).limit(1)
    .comment('Inspect the later independent B save').purpose("Verify B's pending mutation survived A's save").executeForList(context))[0];
  expect(E.purchaseOrder(changed).contactPhone().eval()).toBe('5550401');
  expect(E.purchaseOrder(changed).version().eval()).toBe(2);
  await verifyPageStream(context, savedA.id!, savedB.id!);
  process.stdout.write('CORE_MUTATION_OWNERSHIP=' + JSON.stringify({
    language: 'typescript', passed: true, independentNewRoots: true,
    batchRootIsolation: true, siblingVersionUnchanged: true, siblingPendingMutationRetained: true,
  }) + '\n');
}
