import {UserContext} from '../src/core/context';
import {EntityCreation, EntityCreationError, runGeneratedBootstrap} from '../src/core/entity-creation';
import {EntityRoot, EntityKey} from '../src/core/entity-root';
import {LoadedScalarSnapshot} from '../src/core/loaded-scalar-snapshot';

const key = (id = '701'): EntityKey => ({entity: 'WorkItem', id});
function baseline(id: string) {
  const value = {id}, root = new EntityRoot(); root.markAsNew(key(id));
  LoadedScalarSnapshot.captureFor(value, value, key(id), undefined, 'creationBaseline');
  return {value, root};
}

test('allocation finishes before construction and independent graphs never share ledgers', async () => {
  let release!: (id: string) => void, constructed = 0;
  const context = new UserContext().withInternalIdGenerator({generateId: () => new Promise<string>(resolve => {release = resolve;})});
  const pending = EntityCreation.create(context, 'WorkItem', id => {constructed++; return baseline(id);});
  expect(constructed).toBe(0); release('701'); const first = await pending; expect(constructed).toBe(1);
  context.withInternalIdGenerator({generateId: () => '702'});
  const second = await EntityCreation.create(context, 'WorkItem', id => baseline(id));
  expect(first.root).not.toBe(second.root); expect(first.value.id).toBe('701'); expect(second.value.id).toBe('702');
});

test.each(['0', '-1', '01', '9223372036854775808', 9007199254740992])('invalid allocation %s constructs nothing', async invalid => {
  const construct = jest.fn(); const context = new UserContext().withInternalIdGenerator({generateId: () => invalid});
  await expect(EntityCreation.create(context, 'WorkItem', construct)).rejects.toThrow(); expect(construct).not.toHaveBeenCalled();
});

test('selected allocator error is unchanged; recovery uses that allocator, never provider fallback', async () => {
  const failure = new Error('selected failure'); const fallback = jest.fn(); let fail = true;
  const context = new UserContext().insertResource('dataService', {reserveInternalId: fallback})
    .withInternalIdGenerator({generateId: () => {if (fail) throw failure; return '701';}});
  await expect(EntityCreation.create(context, 'WorkItem', id => ({id}))).rejects.toBe(failure);
  fail = false; expect(await EntityCreation.create(context, 'WorkItem', id => ({id}))).toEqual({id:'701'});
  expect(fallback).not.toHaveBeenCalled();
});

test('only reserved creation baseline with explicit new intent admits Create', async () => {
  const context = new UserContext().withInternalIdGenerator({generateId: () => '701'}); let root!: EntityRoot;
  const value = await EntityCreation.create(context, 'WorkItem', id => {const b=baseline(id);root=b.root;return b.value;});
  expect(() => EntityCreation.requireMutation(value,key(),value.id,'Create',root,true)).not.toThrow();
  root.clearEntity(key()); expect(() => EntityCreation.requireMutation(value,key(),value.id,'Create',root,true)).toThrow(EntityCreationError);
});

test('unchanged sparse hydration is inert, but cannot invent insertion or original version', () => {
  const value=EntityCreation.hydrated({id:'701',version:9}), root=new EntityRoot();
  LoadedScalarSnapshot.captureFor(value,{id:'701'},key());
  expect(() => EntityCreation.requireMutation(value,key(),value.id,'Update',root,false)).not.toThrow();
  expect(() => EntityCreation.requireMutation(value,key(),value.id,'Update',root,true)).toThrow(EntityCreationError);
  root.markAsNew(key()); expect(() => EntityCreation.requireMutation(value,key(),value.id,'Create',root,true)).toThrow(EntityCreationError);
});

test('original version is immutable and creation origin never impersonates hydration', () => {
  const value=EntityCreation.hydrated({id:'701',version:3}), root=new EntityRoot(); root.setOriginalVersion(key(),3);
  const snapshot=LoadedScalarSnapshot.captureFor(value,value,key(),3); value.version=4;
  expect(snapshot.persistedVersion).toBe(3); expect(snapshot.origin).toBe('hydrated'); expect(JSON.stringify(snapshot)).toBe('{}');
  expect(() => snapshot.validateNativeIdentity(key(),value.id,value.version)).toThrow();
  const creation=new LoadedScalarSnapshot({id:'701',version:3},key(),3,'creationBaseline');
  expect(creation.persistedVersion).toBeUndefined(); expect(creation.origin).toBe('creationBaseline');
});

test.each([0,-3,'9223372036854775807'])('known persisted version %s reaches existing lifecycle validators', version => {
  const value=EntityCreation.hydrated({id:'701'}),root=new EntityRoot();
  LoadedScalarSnapshot.captureFor(value,value,key(),version);
  expect(() => EntityCreation.requireMutation(value,key(),value.id,'Update',root,true)).not.toThrow();
});

test('bootstrap permits only model fixed IDs, consumes no allocation and always closes scope', async () => {
  const allocate=jest.fn(),context=new UserContext().withInternalIdGenerator({generateId:allocate});
  const bootstrap={defaultDomainRoot:{entity:'Platform',id:'1'},constants:[{entity:'SchoolType',id:'1001'}]};
  const make=(entity:string,id:string) => EntityCreation.bootstrap(context,entity,id,reserved=>({id:reserved}));
  expect(() => make('Platform','1')).toThrow(EntityCreationError);
  await runGeneratedBootstrap(context,bootstrap,async()=>{
    expect(make('Platform','1').id).toBe('1');expect(make('SchoolType','1001').id).toBe('1001');
    expect(() => make('SchoolType','1002')).toThrow(EntityCreationError);
    expect(() => make('WorkItem','1')).toThrow(EntityCreationError);
  });
  expect(() => make('Platform','1')).toThrow(EntityCreationError);expect(allocate).not.toHaveBeenCalled();
  const failure=new Error('bootstrap failed');
  await expect(runGeneratedBootstrap(context,bootstrap,async()=>{throw failure;})).rejects.toBe(failure);
  expect(() => make('Platform','1')).toThrow(EntityCreationError);
});

test('nested schema scopes restore the outer model rather than broadening it', async () => {
  const context=new UserContext();
  const make=(id:string)=>EntityCreation.bootstrap(context,'Platform',id,reserved=>({id:reserved}));
  await runGeneratedBootstrap(context,{defaultDomainRoot:{entity:'Platform',id:'1'}},async()=>{
    await runGeneratedBootstrap(context,{defaultDomainRoot:{entity:'Platform',id:'2'}},async()=>{
      expect(make('2').id).toBe('2');expect(()=>make('1')).toThrow(EntityCreationError);
    });
    expect(make('1').id).toBe('1');expect(()=>make('2')).toThrow(EntityCreationError);
  });
});
