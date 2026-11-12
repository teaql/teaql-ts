import defaultsJson from './presentation-defaults-v1.json';
import {Locale, locales, parseLocale} from '../i18n';
import {ObjectLocation} from '../object-location';
import {CheckerMessageCatalog, MessageSelection, MessageShape, SafeArguments, keys, object, strictJson, text} from './catalog';

export type CheckerMessageWarning='CHECKER_MESSAGE_LABEL_FALLBACK'|'CHECKER_MESSAGE_GENERIC_RULE'|'CHECKER_MESSAGE_RENDER_FALLBACK';
export type MessageOutput=Readonly<{message:string;warnings:readonly CheckerMessageWarning[]}>;
type Labels=Readonly<Partial<Record<Locale,string>>>;
type Field=Readonly<{name:string;targetType?:string;labels:Labels;classifiers:Labels;aliases:readonly string[]}>;
type Step=Readonly<{identity?:string;field?:Field;indices:readonly number[]}>;
const invalid=():never=>{throw new TypeError('Invalid Checker presentation metadata');};
export function sanitize(value:string):string{return value.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu,' ').trim();}
function labels(value:unknown):Labels {
  const result:Partial<Record<Locale,string>>=Object.create(null);
  for(const [code,label] of Object.entries(object(value))){const locale=parseLocale(code);if(Object.prototype.hasOwnProperty.call(result,locale))return invalid();result[locale]=text(label);}
  return Object.freeze(result);
}
const defaults=defaultsJson.locales as Readonly<Record<Locale,Readonly<{currentObject:string;utf16:string;scalar:string;byte:string}>>>;
for(const locale of locales){for(const value of Object.values(defaults[locale]))if(!value||sanitize(value)!==value)invalid();Object.freeze(defaults[locale]);}Object.freeze(defaults);
export function checkerCountingUnit(locale:Locale,unit:'utf16'|'scalar'|'byte'):string{return defaults[locale][unit];}

class Entity {
  readonly #fields:ReadonlyMap<string,Field>;
  readonly labels:Labels;
  readonly fingerprint:string;
  constructor(value:unknown){
    const data=object(value);keys(data,['labels','fields']);this.labels=labels(data.labels??{});
    if(!Array.isArray(data.fields))throw new TypeError('Invalid Checker presentation fields');const index=new Map<string,Field>();
    const canonical:Field[]=[];
    for(const value of data.fields){
      const source=object(value);keys(source,['name','targetType','labels','classifiers','aliases']);
      const name=text(source.name),targetType=source.targetType===undefined?undefined:text(source.targetType);
      if(source.aliases!==undefined&&!Array.isArray(source.aliases))throw new TypeError('Invalid Checker presentation aliases');
      const aliases=Object.freeze(((source.aliases??[]) as unknown[]).map(text));
      const field:Field=Object.freeze({name,targetType,labels:labels(source.labels??{}),classifiers:labels(source.classifiers??{}),aliases});
      for(const identity of [name,...aliases]){if(index.has(identity))throw new TypeError('Ambiguous Checker presentation identity');index.set(identity,field);}
      canonical.push(field);
    }
    this.#fields=index;
    const sorted=(data:Labels)=>Object.entries(data).sort(([a],[b])=>a.localeCompare(b));
    this.fingerprint=JSON.stringify([sorted(this.labels),canonical.sort((a,b)=>a.name.localeCompare(b.name)).map(f=>[f.name,f.targetType,sorted(f.labels),sorted(f.classifiers),[...f.aliases].sort()])]);
    Object.freeze(this);
  }
  field(name:string):Field|undefined{return this.#fields.get(name);}
}

/** Shared model metadata. All public labels/descriptors are frozen copies. */
export class CheckerPresentationModel {
  readonly #entities:ReadonlyMap<string,Entity>;
  readonly #current:Labels;
  static readonly empty=new CheckerPresentationModel('unconfigured',new Map(),Object.freeze(Object.fromEntries(locales.map(locale=>[locale,defaults[locale].currentObject]))));
  private constructor(readonly revision:string,entities:ReadonlyMap<string,Entity>,current:Labels){this.#entities=entities;this.#current=current;Object.freeze(this);}
  static fromJson(source:string):CheckerPresentationModel {
    const root=object(strictJson(source));keys(root,['schema','revision','entities','currentObject']);
    if(root.schema!=='teaql.checker-model/v1')return invalid();const revision=text(root.revision),entities=new Map<string,Entity>();
    for(const [identity,value] of Object.entries(object(root.entities))){text(identity);entities.set(identity,new Entity(value));}
    return new CheckerPresentationModel(revision,entities,Object.freeze({...this.empty.#current,...labels(root.currentObject??{})}));
  }
  entity(name:string|undefined):Entity|undefined{return name===undefined?undefined:this.#entities.get(name);}
  currentLabels():Labels{return this.#current;}
  merge(other:CheckerPresentationModel):CheckerPresentationModel {
    if(this===CheckerPresentationModel.empty)return other;if(other===CheckerPresentationModel.empty||this===other)return this;
    const entities=new Map(this.#entities);let changed=false;
    for(const [key,entity] of other.#entities){const previous=entities.get(key);if(previous&&previous.fingerprint!==entity.fingerprint)return invalid();if(!previous){entities.set(key,entity);changed=true;}}
    for(const locale of locales)if(this.#current[locale]!==other.#current[locale])return invalid();
    return changed?new CheckerPresentationModel(this.revision+'+'+other.revision,entities,this.#current):this;
  }
}

/** Finite path and immutable model only: no entity values, Context or service. */
export class CheckerPresentation {
  readonly #steps:readonly Step[];
  private constructor(readonly model:CheckerPresentationModel,readonly origin:string|undefined,readonly shape:MessageShape,steps:readonly Step[]){this.#steps=steps;Object.freeze(this);}
  static capture(model:CheckerPresentationModel,origin:string|undefined,location:ObjectLocation):CheckerPresentation {
    let entity=model.entity(origin),unusual=!entity;const steps:Array<{identity?:string;field?:Field;indices:number[]}>=[];
    for(const segment of location.segments){
      if(segment.kind==='property'){
        const field=entity?.field(segment.name);entity=model.entity(field?.targetType);steps.push({identity:segment.name,field,indices:[]});
      }else{
        if(!Number.isSafeInteger(segment.index)||segment.index<0)return invalid();
        if(!steps.length){steps.push({indices:[]});unusual=true;}
        const step=steps[steps.length-1];step.indices.push(segment.index);if(step.indices.length>1)unusual=true;
      }
    }
    if(!steps.length||steps[steps.length-1].indices.length)unusual=true;
    const shape=unusual||steps.length>2?'deep':steps.length===1?'one':'two';
    return new CheckerPresentation(model,origin,shape,Object.freeze(steps.map(step=>Object.freeze({...step,indices:Object.freeze(step.indices)}))));
  }
  relocate(location:ObjectLocation):CheckerPresentation{return CheckerPresentation.capture(this.model,this.origin,location);}
  render(catalog:CheckerMessageCatalog,selection:MessageSelection,safe:SafeArguments):MessageOutput {
    const warnings=new Set<CheckerMessageWarning>(),locale=selection.locale;
    const vocabulary=(labels:Labels,identity:string):string=>{
      let label=labels[locale];if(!label?.trim()){warnings.add('CHECKER_MESSAGE_LABEL_FALLBACK');label=labels.en;}
      const value=sanitize(label?.trim()?label:identity.replace(/_/g,' '));
      if(value)return value;warnings.add('CHECKER_MESSAGE_LABEL_FALLBACK');return defaults[locale].currentObject;
    };
    const current=()=>vocabulary(this.model.currentLabels(),'current object');
    const rootEntity=this.model.entity(this.origin),root=rootEntity?vocabulary(rootEntity.labels,this.origin!):current();
    const label=(step:Step)=>vocabulary(step.field?.labels??{},step.field?.name??step.identity??'current object');
    const leaf=this.#steps[this.#steps.length-1];
    const args:Record<string,string>=Object.fromEntries(['system','input','input_len','unit'].filter(key=>Object.prototype.hasOwnProperty.call(safe,key)).map(key=>[key,safe[key]]));
    args.field=leaf?.identity?label(leaf):root;
    const ownerCount=this.#steps.length-(leaf?.identity&&!leaf.indices.length?1:0),owners:string[]=[];
    for(const step of this.#steps.slice(0,ownerCount)){
      const relation=step.identity?label(step):root;
      if(!step.indices.length)owners.push(catalog.reference(locale,relation));
      else for(let j=0;j<step.indices.length;j++)owners.push(catalog.item(locale,j===0?relation:current(),step.indices[j],sanitize(step.field?.classifiers[locale]??(locale==='zh-CN'||locale==='zh-TW'?'项':''))));
    }
    args.object=owners[0]??root;args.objectPath=owners.length?owners.join(catalog.separator(locale)):root;
    return Object.freeze({message:selection.render(args),warnings:Object.freeze([...warnings])});
  }
}
