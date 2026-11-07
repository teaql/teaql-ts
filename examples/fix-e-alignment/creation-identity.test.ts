import { UserContext, FixedBusinessClock } from 'teaql-ts';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { PurchaseOrder } from 'generated/generated/models/PurchaseOrder';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';
import { TeaQLClient } from 'generated/teaql-ts';
import { GENERATED_RUNTIME_MODULE } from 'generated/runtime-module';
import { join } from 'node:path';

function database(name: string) {
  const directory = process.env.TEAQL_CREATION_DATABASES;
  if (!directory) throw new Error('Explicit retained creation database directory required');
  return join(directory, name);
}
async function fixture(name: string) {
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new SQLiteTeaQLClient(database(name + '.sqlite')).setUserContext(context);
  context.insertResource('dataService', client); await context.ensureSchema();
  const allocation = jest.spyOn((client as any).driver, 'nextId');
  const mutation = jest.spyOn(client, 'executeMutation');
  return {context, client, allocation, mutation, close: async () => { allocation.mockRestore(); mutation.mockRestore(); await client.close(); }};
}
const create = (context: UserContext) => Q.purchaseOrders().comment('Reserve an order identity')
  .purpose('Verify creation before any business persistence').newEntity(context);

test('default SQLite factory reserves a real identity, keeps its ledger key, then saves without reallocating', async () => {
  const f = await fixture('default');
  try {
    const audit = f.client.auditTrace.length, owner = await create(f.context), id = owner.id!;
    expect(id).toMatch(/^[1-9][0-9]*$/); expect(owner.version).toBeUndefined();
    expect(E.purchaseOrder(owner).id().eval()).toBe(id);
    expect((owner as any)._ledgerId).toBe(id); expect((owner as any)._root.isNew({entity: 'PurchaseOrder', id})).toBe(true);
    expect(f.allocation).toHaveBeenCalledTimes(1); expect(f.mutation).not.toHaveBeenCalled();
    expect(f.client.auditTrace.length).toBe(audit);
    owner.updateContactPhone('5550199'); await owner.auditAs('Save an already allocated order').save(f.context);
    expect(owner.id).toBe(id); expect(owner.version).toBe(1); expect(f.allocation).toHaveBeenCalledTimes(1);
    const loaded = (await Q.purchaseOrders().withIdIs(id).limit(1).comment('Read reserved identity')
      .purpose('Verify persistence keeps the original ID').executeForList(f.context))[0];
    expect(E.purchaseOrder(loaded).id().eval()).toBe(id);
    expect(E.purchaseOrder(loaded).contactPhone().eval()).toBe('5550199');
  } finally { await f.close(); }
});

test.each(['error', 'zero'] as const)('default allocation %s returns no entity or ledger; a later call recovers', async mode => {
  const f = await fixture(mode), sentinel = new Error('creation allocator unavailable');
  const construct = jest.spyOn(PurchaseOrder, 'teaqlNewWithId');
  try {
    if (mode === 'error') f.allocation.mockRejectedValueOnce(sentinel);
    else f.allocation.mockResolvedValueOnce('0');
    if (mode === 'error') await expect(create(f.context)).rejects.toBe(sentinel);
    else await expect(create(f.context)).rejects.toThrow('positive');
    expect(construct).not.toHaveBeenCalled(); expect(f.mutation).not.toHaveBeenCalled();
    const recovered = await create(f.context); expect(recovered.id).toMatch(/^[1-9][0-9]*$/);
    expect(construct).toHaveBeenCalledTimes(1); expect(f.allocation).toHaveBeenCalledTimes(2);
  } finally { construct.mockRestore(); await f.close(); }
});

test('selected provider is awaited; failures do not fall back and successful independent graphs do not leak', async () => {
  const f = await fixture('custom'), sentinel = new Error('selected provider unavailable');
  const generateId = jest.fn().mockRejectedValueOnce(sentinel).mockResolvedValueOnce('0')
    .mockResolvedValueOnce('41').mockResolvedValueOnce('42');
  f.context.withInternalIdGenerator({generateId});
  try {
    await expect(create(f.context)).rejects.toBe(sentinel); await expect(create(f.context)).rejects.toThrow('positive');
    const first = await create(f.context), other = await create(f.context);
    expect(generateId).toHaveBeenLastCalledWith('PurchaseOrder', f.context);
    expect(first.id).toBe('41'); expect(other.id).toBe('42'); expect((first as any)._root).not.toBe((other as any)._root);
    first.updateContactPhone('saved'); other.updateContactPhone('unsaved');
    await first.auditAs('Save only the selected independent graph').save(f.context);
    const rows = await Q.purchaseOrders().limit(100).comment('Inspect independent creation graphs')
      .purpose('Verify an unrelated pending entity was not saved').executeForList(f.context);
    expect(rows.map(row => row.id)).toEqual(['41']); expect(other.version).toBeUndefined();
    expect((other as any)._root.hasPending({entity: 'PurchaseOrder', id: '42'})).toBe(true);
    expect(f.allocation).not.toHaveBeenCalled();
  } finally { await f.close(); }
});

test('a pending provider cannot return an entity and missing Context fails before allocation', async () => {
  let finish!: (id: string) => void;
  const generateId = jest.fn(() => new Promise<string>(resolve => { finish = resolve; }));
  const context = new UserContext().withInternalIdGenerator({generateId});
  const construct = jest.spyOn(PurchaseOrder, 'teaqlNewWithId');
  try {
    const pending = create(context); await Promise.resolve(); expect(construct).not.toHaveBeenCalled();
    finish('61'); expect((await pending).id).toBe('61');
    await expect(create(undefined as any)).rejects.toThrow('UserContext'); expect(generateId).toHaveBeenCalledTimes(1);
  } finally { construct.mockRestore(); }
});

test('file-backed reservations survive reopen, reserve distinct IDs and create no business rows', async () => {
  const file = database('reserved.json');
  const first = new TeaQLClient(file).install(GENERATED_RUNTIME_MODULE);
  const ctx = new UserContext().insertResource('dataService', first);
  const rows = await Promise.all([create(ctx), create(ctx)]);
  expect(rows[0].id).not.toBe(rows[1].id);
  const second = new TeaQLClient(file).install(GENERATED_RUNTIME_MODULE);
  const reopened = new UserContext().insertResource('dataService', second);
  expect((await create(reopened)).id).not.toBe(rows[0].id);
  expect((await Q.purchaseOrders().limit(100).comment('Inspect reservation-only storage')
    .purpose('Confirm ID reservation is not business persistence').executeForList(reopened)).length).toBe(0);
});

test('actual SQLite ID exhaustion rolls back reservation without returning a rounded identity', async () => {
  const f = await fixture('exhaustion');
  const construct = jest.spyOn(PurchaseOrder, 'teaqlNewWithId');
  try {
    await create(f.context); construct.mockClear();
    // Test-only sequence fixture, not a business-data mutation. Model writes
    // still go through the generated API in the ordinary acceptance cases.
    const database = (f.client as any).driver.database;
    database.prepare('UPDATE teaql_id_space SET current_level = ? WHERE type_name = ?')
      .run(Number.MAX_SAFE_INTEGER, 'PurchaseOrder');
    await expect(create(f.context)).rejects.toThrow('exhausted');
    expect(construct).not.toHaveBeenCalled(); expect(f.mutation).not.toHaveBeenCalled();
    expect(database.prepare('SELECT current_level AS value FROM teaql_id_space WHERE type_name = ?')
      .get('PurchaseOrder').value).toBe(Number.MAX_SAFE_INTEGER);
  } finally { construct.mockRestore(); await f.close(); }
});
