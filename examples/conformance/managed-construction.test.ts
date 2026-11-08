import {UserContext} from 'teaql-ts';
import {WorkItem} from './src/generated/models/WorkItem';
import {Q} from './src/generated/Q';

const creation = (context: UserContext) => Q.workItems().comment('reserve a work item').purpose('verify creation boundary').newEntity(context);

test('bare JavaScript construction cannot create an insert candidate', () => {
  expect(() => Reflect.construct(WorkItem, [])).toThrow();
});

test('awaited allocator validates exact IDs, propagates failure and recovers without fallback or shared ledgers', async () => {
  const failure = new Error('allocator offline'); let step = 0;
  const values = ['701', failure, '0', '9223372036854775808', '702'];
  const context = new UserContext().withInternalIdGenerator({generateId: async (entity, actual) => {
    expect(entity).toBe('WorkItem'); expect(actual).toBe(context);
    const value = values[step++]; if (value instanceof Error) throw value; return value;
  }});
  const first = await creation(context); expect(first.id).toBe('701');
  await expect(creation(context)).rejects.toBe(failure);
  await expect(creation(context)).rejects.toThrow();
  await expect(creation(context)).rejects.toThrow();
  const second = await creation(context); expect(second.id).toBe('702'); expect(step).toBe(5);
  first.updateTitle('first only'); expect(second.title).not.toBe('first only');
  expect((first as any)._root).not.toBe((second as any)._root);
});

test('hydrated complete record is a read view with no insert intent', () => {
  const read = WorkItem.fromRecord({id: '77', version: 3, title: 'loaded', description: null, platform: '1'});
  expect((read as any)._action).toBe('Update');
  expect((read as any)._root.isNew((read as any).teaqlEntityKey())).toBe(false);
  expect(JSON.stringify(read)).not.toContain('creationBaseline');
});

test('writing the current version cannot forge missing persisted provenance and fails before provider or clock', async () => {
  let callbacks = 0;
  const context = new UserContext().withBusinessClock({now: () => {callbacks++; throw new Error('clock must not run');}});
  const read = WorkItem.fromRecord({id: '77', title: 'loaded', description: null, platform: '1'});
  read.updateTitle('changed'); read.updateVersion(1);
  await expect(read.auditAs('reject versionless write').save(context)).rejects.toHaveProperty('code', 'ENTITY_CREATION_CONTEXT_REQUIRED');
  expect(callbacks).toBe(0);
});

test('unchanged empty hydration is inert without a provider or allocator', async () => {
  const read = WorkItem.fromRecord({});
  await expect(read.auditAs('save inert read view').save(new UserContext())).resolves.toBe(read);
});

test('fixed bootstrap IDs cannot be minted outside Context schema execution', () => {
  expect(() => (WorkItem as any).teaqlBootstrapNew('701')).toThrow();
});
