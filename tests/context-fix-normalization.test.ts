import {EntityRoot, LoadedScalarSnapshot} from '../src';
import {PreparedGraphState, PreparedMutationError} from '../src/core/prepared-mutation';

function fixture(changeVersion=false) {
  const root=new EntityRoot(),key={entity:'Probe',id:'7'};
  root.setOriginalVersion(key,1);
  const entity={id:'7',version:1,name:'NORMALIZE',teaqlRestoreFixedValues(values:Readonly<Record<string,unknown>>){
    if('name' in values)this.name=String(values.name);
    if(changeVersion)this.version=99;
  }};
  LoadedScalarSnapshot.captureFor(entity,{id:'7',version:1,name:'same'},key,1);
  const state=new PreparedGraphState();
  state.register(entity,root,key,{},()=>({id:entity.id,version:entity.version,name:entity.name}));
  state.captureInput();
  root.set(key,'name','same');
  const normalized=state.normalizeRestored({entity:'Probe',action:'Update',id:'7',version:1,
    ledgerRoot:root,ledgerKey:key,payload:{name:'same'}})!;
  expect(normalized.empty).toBe(true);
  state.seal();
  return{entity,state,normalized};
}

test('authorized scalar restoration updates the expected view without a write entry',()=>{
  const f=fixture();f.normalized.restore!();
  expect(f.entity.name).toBe('same');expect(f.state.size).toBe(0);
  expect(()=>f.state.complete()).not.toThrow();
  f.entity.name='external edit';expect(()=>f.state.validate()).toThrow(PreparedMutationError);
});
test('restoration does not accept a source changed before the completion callback',()=>{
  const f=fixture();f.entity.name='external edit';
  expect(()=>f.normalized.restore!()).toThrow(PreparedMutationError);
  expect(f.entity.name).toBe('external edit');
});
test('a restoration hook cannot rebaseline an unrelated identity or version change',()=>{
  const f=fixture(true);
  expect(()=>f.normalized.restore!()).toThrow(PreparedMutationError);
  expect(()=>f.state.validate()).toThrow(PreparedMutationError);
});
