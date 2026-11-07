import {CheckException, decimal, FixedBusinessClock, UserContext} from '../../src';
import {Q} from 'generated/generated/Q';
import {E} from 'generated/generated/E';
import {SQLiteTeaQLClient} from 'generated/teaql-node-sqlite';

const emit = (name: string, facts: unknown) => process.stdout.write('TYPESCRIPT_GRAPH_FIX_IDEMPOTENCE=' + JSON.stringify({case: name, facts}) + '\n');
const database = process.env.TEAQL_FIX_E_DB! + '.idempotence.sqlite';
const instant = Date.parse('2033-01-02T03:04:05Z');
async function setup(filename: string) {
  const context = new UserContext().withActiveRoot({entity: 'Tenant', id: '1'})
    .withBusinessClock(new FixedBusinessClock(new Date(instant)));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context).setDiagnosticSQLLogSink(undefined);
  context.insertResource('dataService', client); await context.ensureSchema();
  return {context, client, driver: (client as any).driver};
}
async function make(context: UserContext, label: string) {
  const parent = (await Q.purchaseOrders().comment('Prepare the graph owner ' + label).purpose('Verify Fix traversal identity')
    .newEntity(context)).updateContactPhone('5550140');
  const child = (await Q.orderItems().comment('Prepare the graph child ' + label).purpose('Verify one entity Fix per graph')
    .newEntity(context)).updateProductName(label).updateUnitPrice(decimal('12.34'));
  parent.orderItemList().push(child); return {parent, child};
}
function observe(client: SQLiteTeaQLClient, context: UserContext) {
  const driver = (client as any).driver, checkers = (client as any).checkers;
  const query = jest.spyOn(driver, 'query'), transaction = jest.spyOn(driver, 'transaction'), allocation = jest.spyOn(driver, 'nextId');
  const effects = () => [query.mock.calls.length, transaction.mock.calls.length, allocation.mock.calls.length];
  const visits: Array<{entity: string; action: string; time: number; providerCallsDuringFix: number}> = [];
  for (const type of ['PurchaseOrder', 'OrderItem']) {
    const delegate = checkers[type]; checkers[type] = {checkAndFix(ctx: UserContext, mutation: any, results: any[]) {
      const before = effects(); delegate.checkAndFix(ctx, mutation, results);
      expect(effects()).toEqual(before);
      visits.push({entity: type, action: mutation.action, time: context.requireResource<Date>('fixTime').getTime(), providerCallsDuringFix: 0});
    }};
  }
  return {visits, effects, transaction, clear: () => {visits.length = 0; query.mockClear(); transaction.mockClear(); allocation.mockClear();}};
}

test('the same child instance reached twice is fixed and persisted once per invocation', async () => {
  const filename = database, round = Number(process.env.TEAQL_FIX_E_ROUND);
  const {client, context} = await setup(filename), observed = observe(client, context);
  let tick = instant + round * 1000; const created = tick;
  context.withBusinessClock({now: () => new Date(tick++)});
  try {
    const {parent, child} = (await make(context, 'Repeated child')); parent.orderItemList().push(child);
    let failure: unknown;
    try {await parent.auditAs('Create with repeated references to one child instance').save(context);} catch (error) {failure = error;}
    const createFacts = {round, visits: [...observed.visits], clockCaptures: tick - created, providerEffects: observed.effects(),
      error: failure instanceof Error ? {name: failure.name, code: (failure as any).code ?? null,
        violations: failure instanceof CheckException ? failure.violations.map(v => ({ruleId: v.ruleId, path: v.location.modelPath()})) : []} : null,
      scopeReleased: context.getResource('fixTime') === undefined && context.getResource('fixEvidenceCurrent') === undefined};
    emit('duplicate-create', createFacts);
    if (failure) throw failure;
    expect(createFacts.visits.map(v => v.entity)).toEqual(['PurchaseOrder', 'OrderItem']);
    expect(createFacts.visits.every(v => v.time === created && v.providerCallsDuringFix === 0)).toBe(true);
    expect(tick).toBe(created + 1); expect(createFacts.scopeReleased).toBe(true);
    parent.updateContactPhone('5550141'); child.updateUnitPrice(decimal('23.45')); observed.clear(); const updated = tick;
    await parent.auditAs('Update the same repeated child once at a new graph instant').save(context);
    expect(observed.visits.map(v => v.entity)).toEqual(['PurchaseOrder', 'OrderItem']); expect(observed.visits.every(v => v.time === updated)).toBe(true);
    expect(tick).toBe(created + 2); expect(context.getResource('fixTime')).toBeUndefined(); expect(context.getResource('fixEvidenceCurrent')).toBeUndefined();
    const owner = (await Q.purchaseOrders().withIdIs(parent.id!).limit(1).comment('Reload the deduplicated owner').purpose('Verify persisted Fix values').executeForList(context))[0];
    const item = (await Q.orderItems().withIdIs(child.id!).limit(1).comment('Reload the deduplicated child').purpose('Verify once-only persistence').executeForList(context))[0];
    expect(E.purchaseOrder(owner).version().eval()).toBe(2); expect(E.orderItem(item).version().eval()).toBe(2);
    expect(new Date(E.orderItem(item).createTime().eval()!).getTime()).toBe(created); expect(new Date(E.orderItem(item).updateTime().eval()!).getTime()).toBe(updated);
    expect(E.orderItem(item).productName().eval()).toBe('Repeated child'); expect(E.purchaseOrder(owner).contactPhone().eval()).toBe('5550141');
    emit('duplicate-update', {round, visits: [...observed.visits], clockCaptures: 1, created, updated, parentId: parent.id, childId: child.id, version: 2});
  } finally {await client.close();}
});

test('overlapping real generated graphs on separate contexts keep their own snapshot and receipt', async () => {
  const filename = database, round = Number(process.env.TEAQL_FIX_E_ROUND);
  const first = await setup(filename + '.first.sqlite'), second = await setup(filename + '.second.sqlite');
  const a = observe(first.client, first.context), b = observe(second.client, second.context);
  let tick = instant + round * 2000; const firstInstant = tick;
  const clock = {now: () => new Date(tick++)}; first.context.withBusinessClock(clock); second.context.withBusinessClock(clock);
  let entered!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => {entered = resolve;}), hold = new Promise<void>(resolve => {release = resolve;});
  const transaction = first.driver.transaction.bind(first.driver);
  a.transaction.mockImplementationOnce(async (work: any) => {entered(); await hold; return transaction(work);});
  let pending: Promise<unknown> | undefined;
  try {
    const left = (await make(first.context, 'First context')), right = (await make(second.context, 'Second context'));
    pending = left.parent.auditAs('Hold the first generated graph before provider entry').save(first.context);
    await Promise.race([ready, pending.then(() => {throw Error('first graph finished without reaching the held transaction');})]);
    const receipt = first.context.getResource('fixEvidenceCurrent'); expect(receipt).toBeDefined();
    await right.parent.auditAs('Commit another generated graph on an independent context').save(second.context);
    expect(first.context.requireResource<Date>('fixTime').getTime()).toBe(firstInstant); expect(first.context.getResource('fixEvidenceCurrent')).toBe(receipt);
    release(); await pending;
    expect(a.visits.map(v => v.time)).toEqual([firstInstant, firstInstant]); expect(b.visits.map(v => v.time)).toEqual([firstInstant + 1, firstInstant + 1]); expect(tick).toBe(firstInstant + 2);
    for (const c of [first.context, second.context]) {expect(c.getResource('fixTime')).toBeUndefined(); expect(c.getResource('fixEvidenceCurrent')).toBeUndefined(); expect(Object.isFrozen(c.lastFixEvidence())).toBe(true);}
    emit('independent-real-graphs', {round, first: [...a.visits], second: [...b.visits], clockCaptures: 2, heldEvidencePreserved: true, scopesReleased: true,
      receiptsIndependent: first.context.lastFixEvidence() !== second.context.lastFixEvidence()});
  } finally {release(); if (pending) await pending.catch(() => undefined); await first.client.close(); await second.client.close();}
});

test('different object views of one ID are not silently skipped by the identity traversal guard', async () => {
  const {client, context} = await setup(database + '.identity.sqlite');
  const observed = observe(client, context), {parent, child} = (await make(context, 'Distinct views'));
  try {
    await parent.auditAs('Create a baseline for duplicate identity protection').save(context);
    const other = (await Q.orderItems().withIdIs(child.id!).limit(1).comment('Load a separate child view').purpose('Do not confuse object identity with entity ID').executeForList(context))[0];
    expect(other).not.toBe(child); expect(other.id).toBe(child.id);
    child.updateUnitPrice(decimal('23.45')); other.updateUnitPrice(decimal('34.56')); parent.orderItemList().push(other); observed.clear();
    let failure: unknown;
    try {await parent.auditAs('Reject two conflicting views rather than skip by ID').save(context);} catch (error) {failure = error;}
    expect(failure).toBeInstanceOf(CheckException); expect((failure as CheckException).violations.some(v => v.ruleId === 'mutation_changed_after_preparation')).toBe(true);
    expect(observed.effects()).toEqual([0, 0, 0]);
    const persisted = (await Q.orderItems().withIdIs(child.id!).limit(1).comment('Verify rejected duplicate identity left storage intact').purpose('Validate the traversal guard does not hide conflicting views').executeForList(context))[0];
    expect(E.orderItem(persisted).version().eval()).toBe(1); expect(String(E.orderItem(persisted).unitPrice().eval())).toBe('12.34');
    emit('distinct-views-same-id-rejected', {round: Number(process.env.TEAQL_FIX_E_ROUND), rejectedBeforeProvider: true, sameEntityId: true, distinctObjectInstances: true, persistedVersion: 1, persistedPrice: '12.34'});
  } finally {await client.close();}
});
