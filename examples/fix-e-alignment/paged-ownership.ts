import { UserContext } from '../../src';
import { E } from 'generated/generated/E';
import { Q } from 'generated/generated/Q';
import { PurchaseOrder } from 'generated/generated/models/PurchaseOrder';

export async function verifyPageStream(context: UserContext,
    idA: Parameters<ReturnType<typeof Q.purchaseOrders>['withIdIs']>[0],
    idB: Parameters<ReturnType<typeof Q.purchaseOrders>['withIdIs']>[0]): Promise<void> {
  const before = await Q.purchaseOrders().limit(20).comment('Inspect the page ownership fixture')
    .purpose('Establish the bounded exact total').executeForList(context);
  const sentinel = Q.purchaseOrders().comment('Prepare a page-offset sentinel')
    .purpose('Exercise a genuine nonzero page offset').newEntity(context);
  sentinel.updateContactPhone('5550500');
  await sentinel.auditAs('Save the synthetic page sentinel').save(context);
  const exercise = async (rows: Iterable<PurchaseOrder>, label: string, previous: string, next: string, version: number) => {
    const values = Array.from(rows);
    const a = values.find(row => row.id === idA)!; const b = values.find(row => row.id === idB)!;
    expect(a).toBeDefined(); expect(b).toBeDefined();
    a.updateContactPhone('55503' + next.slice(-2)); b.updateContactPhone(next);
    await Q.tenantsWithMinimalFields().limit(1).comment('Run an unrelated query before deferred saves')
      .purpose('Verify deferred ownership survives Context reuse').executeForList(context);
    await a.auditAs('Save only A from ' + label).save(context);
    let persisted = await Q.purchaseOrders().withIdIs(idB).limit(1).comment('Inspect B after deferred A save')
      .purpose('Verify unrelated root value and version remain untouched').executeForList(context);
    expect(persisted).toHaveLength(1);
    expect(E.purchaseOrder(persisted[0]).contactPhone().eval()).toBe(previous);
    expect(E.purchaseOrder(persisted[0]).version().eval()).toBe(version);
    await b.auditAs('Save B later from ' + label).save(context);
    persisted = await Q.purchaseOrders().withIdIs(idB).limit(1).comment('Inspect the later deferred B save')
      .purpose("Verify B's pending mutation survived A's commit").executeForList(context);
    expect(persisted).toHaveLength(1);
    expect(E.purchaseOrder(persisted[0]).contactPhone().eval()).toBe(next);
    expect(E.purchaseOrder(persisted[0]).version().eval()).toBe(version + 1);
  };
  const page = await Q.purchaseOrders().orderByIdDescending().offset(1).limit(2).count()
    .comment('Load a nonzero-offset page of independent roots').purpose('Verify exact count and page ownership').executeForList(context);
  expect(page).toHaveLength(2); expect(page.totalCount).toBe(before.length + 1);
  await exercise(page, 'a nonzero-offset page', '5550401', '5550402', 2);
  const streamed: PurchaseOrder[] = [];
  for await (const row of Q.purchaseOrders().orderByIdAscending().limit(20)
    .comment('Stream independent roots across single-row chunks').purpose('Verify cross-chunk deferred-save ownership')
    .executeForStream(context, 1)) streamed.push(row);
  expect(streamed).toHaveLength(before.length + 1);
  await exercise(streamed, 'a fully consumed scalar stream', '5550402', '5550403', 3);
  process.stdout.write('CORE_MUTATION_PAGING=' + JSON.stringify({
    language: 'typescript', passed: true, pageOffset: 1, pageSize: 2, exactCount: before.length + 1,
    pageRootIsolation: true, deferredSaveAfterContextReuse: true, streamProfile: 'scalar-typed',
    streamChunkSize: 1, streamRootIsolation: true, siblingPendingMutationRetained: true,
  }) + '\n');
}
