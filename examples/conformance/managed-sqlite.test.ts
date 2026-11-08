import {CheckException, UserContext} from 'teaql-ts';
import {Q} from './src/generated/Q';
import {E} from './src/generated/E';
import {WorkItem} from './src/generated/models/WorkItem';
import {SQLiteTeaQLClient} from './src/teaql-node-sqlite';

let context: UserContext, client: SQLiteTeaQLClient;
const create = () => Q.workItems().comment('reserve managed work item').purpose('verify SQLite creation boundary').newEntity(context);
const load = (id: string) => Q.workItems().withIdIs(id).limit(1).comment('read managed work item').purpose('verify persisted identity and values').executeForOne(context);
beforeAll(async () => {
  if (!process.env.TEAQL_MANAGED_DATABASE) throw new Error('Retained database path required');
  client = new SQLiteTeaQLClient(process.env.TEAQL_MANAGED_DATABASE);
  context = new UserContext().insertResource('dataService', client); client.setUserContext(context);
  await context.ensureSchema();
});
afterAll(async () => {await client?.close();});

test('repeated Context schema reconciliation reuses the same single root', async () => {
  await context.ensureSchema();
  const roots = await Q.platforms().limit(10).comment('inspect bootstrap roots').purpose('verify idempotent schema seed').executeForList(context);
  expect(roots.length).toBe(1);expect(roots[0].id).toBe('1');
});

test('reserve before return, save exactly that ID, and query through Q and E', async () => {
  const allocation=jest.spyOn((client as any).driver,'nextId');
  try {
    const entity=await create(), id=entity.id!;expect(allocation).toHaveBeenCalledTimes(1);expect(await load(id)).toBeUndefined();
    entity.updateTitle('managed persisted').updatePlatform('1');
    await entity.auditAs('persist already reserved ID').save(context);
    expect(entity.id).toBe(id);expect(entity.version).toBe(1);expect(allocation).toHaveBeenCalledTimes(1);
    const loaded=await load(id);expect(loaded).toBeDefined();expect(E.workItem(loaded!).title().eval()).toBe('managed persisted');
  } finally {allocation.mockRestore();}
});

test('business Checker rejects missing title before mutation SQL', async () => {
  const entity=await create();entity.updatePlatform('1');const before=client.sqlTrace.length;
  await expect(entity.auditAs('reject missing business title').save(context)).rejects.toBeInstanceOf(CheckException);
  expect(client.sqlTrace.length).toBe(before);expect(await load(entity.id!)).toBeUndefined();
});

test('complete hydrated update advances persisted original version', async () => {
  const entity=await create();await entity.updateTitle('before update').updatePlatform('1').auditAs('create update fixture').save(context);
  const loaded=(await load(entity.id!))!;await loaded.updateTitle('after update').auditAs('update hydrated row').save(context);
  const actual=(await load(entity.id!))!;expect(actual.version).toBe(2);expect(E.workItem(actual).title().eval()).toBe('after update');
});

test('unchanged sparse read is inert but a modified sparse read is rejected', async () => {
  const entity=await create();await entity.updateTitle('sparse original').updatePlatform('1').auditAs('create sparse fixture').save(context);
  const read=WorkItem.fromRecord({id:entity.id,version:1}),before=client.sqlTrace.length;
  await expect(read.auditAs('inert sparse read').save(context)).resolves.toBe(read);expect(client.sqlTrace.length).toBe(before);
  await expect(read.updateTitle('invalid partial').auditAs('reject partial write').save(context)).rejects.toBeInstanceOf(CheckException);
  expect(client.sqlTrace.length).toBe(before);expect(E.workItem((await load(entity.id!))!).title().eval()).toBe('sparse original');
});

test('missing persisted version rejects before provider transaction, clock or Fix', async () => {
  const entity=await create();await entity.updateTitle('version original').updatePlatform('1').auditAs('create version fixture').save(context);
  const read=WorkItem.fromRecord({id:entity.id,title:'version original',description:null,platform:'1'});
  const execute=jest.spyOn(client,'executeGraphSave'),before=client.sqlTrace.length;
  try {
    read.updateTitle('forged update').updateVersion(1);
    await expect(read.auditAs('reject missing persisted version').save(context)).rejects.toHaveProperty('code','ENTITY_CREATION_CONTEXT_REQUIRED');
    expect(execute).not.toHaveBeenCalled();expect(client.sqlTrace.length).toBe(before);
  } finally {execute.mockRestore();}
});

test('transaction rollback retains reservation and retry does not allocate again', async () => {
  const entity=await create(),id=entity.id!;entity.updateTitle('rollback retry').updatePlatform('1');
  const allocation=jest.spyOn((client as any).driver,'nextId'),failure=new Error('test-only after-write failure');
  const real=client.executeMutation.bind(client),execute=jest.spyOn(client,'executeMutation');
  execute.mockImplementationOnce(async request=>{await real(request);throw failure;});
  try {
    await expect(entity.auditAs('rollback business write').save(context)).rejects.toBe(failure);
    expect(entity.id).toBe(id);expect(entity.version).toBeUndefined();expect(await load(id)).toBeUndefined();
    execute.mockRestore();await entity.auditAs('retry original reservation').save(context);
    expect(entity.id).toBe(id);expect(entity.version).toBe(1);expect(allocation).not.toHaveBeenCalled();expect((await load(id))!.title).toBe('rollback retry');
  } finally {execute.mockRestore();allocation.mockRestore();}
});

test('saving one independent graph never saves its sibling in the same Context', async () => {
  const first=await create(),second=await create();first.updateTitle('only saved').updatePlatform('1');second.updateTitle('still pending').updatePlatform('1');
  await first.auditAs('save only selected graph').save(context);expect(await load(first.id!)).toBeDefined();expect(await load(second.id!)).toBeUndefined();
  expect(second.version).toBeUndefined();expect((second as any)._root.hasPending({entity:'WorkItem',id:second.id!})).toBe(true);
});
