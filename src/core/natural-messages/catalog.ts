import builtin from './builtin-v1.json';
import {Locale, locales, parseLocale} from '../i18n';

export type MessageShape = 'one' | 'two' | 'deep';
export type SafeArguments = Readonly<Record<string,string>>;
type Node = string | Readonly<{argument:string}>;
type Template = readonly Node[];
export type MessageSelection = Readonly<{locale:Locale; render:(args:SafeArguments,literal?:(text:string)=>string)=>string}>;
const selectionTemplates=new WeakMap<MessageSelection,Template>();
function selectionFor(locale:Locale,template:Template):MessageSelection {
  const selection=Object.freeze({locale,render:(args:SafeArguments,literal?:(text:string)=>string)=>render(template,args,literal)});
  selectionTemplates.set(selection,template);return selection;
}
/** Project now, retaining only safe nodes, never a callback over the invocation. */
export function projectMessageSelection(selection:MessageSelection,project:(text:string)=>string):MessageSelection {
  const template=selectionTemplates.get(selection);if(!template)return invalid();
  return selectionFor(selection.locale,Object.freeze(template.map(node=>typeof node==='string'?project(node):node)));
}
type Patterns = Readonly<{reference:Template;item:Template;separator:string}>;
type LocaleEntry = Readonly<{rules:Readonly<Record<string,Readonly<Partial<Record<MessageShape,Template>>>>>; patterns?:Patterns}>;
const invalid = ():never => {throw new TypeError('Invalid Checker message catalog');};
const own = (value:object,key:string):boolean => Object.prototype.hasOwnProperty.call(value,key);
export function object(value:unknown):Record<string,unknown> {
  if(!value || typeof value!=='object' || Array.isArray(value))return invalid();
  return value as Record<string,unknown>;
}
export function text(value:unknown):string {if(typeof value!=='string'||!value.trim())return invalid();return value;}
export function keys(value:Record<string,unknown>,allowed:readonly string[]):void {
  if(Object.keys(value).some(key=>!allowed.includes(key)))invalid();
}

/** Strict JSON reader: duplicate keys reject before a map can overwrite them. */
export function strictJson(source:string):unknown {
  if(typeof source!=='string')return invalid();
  let offset=0;
  const whitespace=()=>{while(/[\t\n\r ]/.test(source[offset]??'x'))offset++;};
  function string():string {
    if(source[offset]!=='"')return invalid();
    const start=offset++;
    while(offset<source.length){
      const c=source[offset++];
      if(c==='"'){try{return JSON.parse(source.slice(start,offset));}catch{return invalid();}}
      if(c==='\\')offset++;
    }
    return invalid();
  }
  function value():unknown {
    whitespace();
    if(source[offset]==='{'){
      offset++;whitespace();const result:Record<string,unknown>=Object.create(null),seen=new Set<string>();
      if(source[offset]==='}'){offset++;return result;}
      for(;;){
        whitespace();const name=string();if(seen.has(name))return invalid();seen.add(name);
        whitespace();if(source[offset++]!==':')return invalid();
        result[name]=value();whitespace();const next=source[offset++];
        if(next==='}')return result;if(next!==',')return invalid();
      }
    }
    if(source[offset]==='['){
      offset++;whitespace();const result:unknown[]=[];if(source[offset]===']'){offset++;return result;}
      for(;;){result.push(value());whitespace();const next=source[offset++];if(next===']')return result;if(next!==',')return invalid();}
    }
    if(source[offset]==='"')return string();
    const token=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(offset));
    if(!token)return invalid();offset+=token[0].length;
    try{return JSON.parse(token[0]);}catch{return invalid();}
  }
  const result=value();whitespace();if(offset!==source.length)return invalid();return result;
}

function compile(source:unknown,allowed:readonly string[],required:readonly string[]):Template {
  const input=text(source),nodes:Node[]=[],seen=new Set<string>();let literal='';
  for(let i=0;i<input.length;){
    const c=input[i];
    if((c==='{'||c==='}')&&input[i+1]===c){literal+=c;i+=2;continue;}
    if(c==='}')return invalid();
    if(c!=='{'){literal+=c;i++;continue;}
    const end=input.indexOf('}',i+1);if(end<0)return invalid();
    const name=input.slice(i+1,end);if(!allowed.includes(name))return invalid();
    if(literal)nodes.push(literal);nodes.push(Object.freeze({argument:name}));literal='';seen.add(name);i=end+1;
  }
  if(literal)nodes.push(literal);if(required.some(name=>!seen.has(name)))return invalid();
  return Object.freeze(nodes);
}
function render(template:Template,args:SafeArguments,literal?:(text:string)=>string):string {
  return template.map(node=>typeof node==='string'?(literal?literal(node):node):args[node.argument]??'-').join('');
}
export function ordinal(position:bigint):string {
  const last=position%100n,ending=last>=11n&&last<=13n?'th':position%10n===1n?'st':position%10n===2n?'nd':position%10n===3n?'rd':'th';
  return String(position)+ending;
}

/** Compiled, immutable, data-only catalog; no dynamic evaluation or runtime I/O. */
export class CheckerMessageCatalog {
  readonly #locales:Readonly<Partial<Record<Locale,LocaleEntry>>>;
  readonly #application:boolean;
  static readonly builtin=CheckerMessageCatalog.parse(JSON.stringify(builtin),true);
  private constructor(data:Readonly<Partial<Record<Locale,LocaleEntry>>>,application:boolean){this.#locales=data;this.#application=application;Object.freeze(this);}
  static fromJson(source:string):CheckerMessageCatalog{return this.parse(source,false);}
  private static parse(source:string,complete:boolean):CheckerMessageCatalog {
    const root=object(strictJson(source));keys(root,['schema','defaultLocale','locales']);
    if(root.schema!=='teaql.checker-messages/v1'||root.defaultLocale!=='en')return invalid();
    const entries:Partial<Record<Locale,LocaleEntry>>=Object.create(null);
    for(const [code,value] of Object.entries(object(root.locales))){
      const locale=parseLocale(code);if(own(entries,locale))return invalid();
      const entry=object(value);keys(entry,['rules','locationPatterns']);
      const rules:Record<string,Partial<Record<MessageShape,Template>>>=Object.create(null);
      for(const [rule,shapes] of Object.entries(entry.rules===undefined?{}:object(entry.rules))){
        if(!rule.startsWith('checker.')||rule.length===8)return invalid();
        const templates:Partial<Record<MessageShape,Template>>=Object.create(null);
        for(const [shape,source] of Object.entries(object(shapes))){
          if(!['one','two','deep'].includes(shape))return invalid();
          let allowed=['field','system','input','input_len','unit'];const required=['field'];
          if(['checker.required','checker.invalid'].includes(rule))allowed=['field'];
          else if(['checker.min','checker.max'].includes(rule)){allowed=['field','system','input'];required.push('system');}
          else if(['checker.minLength','checker.maxLength'].includes(rule)){allowed=['field','system','input_len','unit'];required.push('system','input_len','unit');}
          if(shape!=='one'){const owner=shape==='two'?'object':'objectPath';allowed.push(owner);required.push(owner);}
          templates[shape as MessageShape]=compile(source,allowed,required);
        }
        rules[rule]=Object.freeze(templates);
      }
      let patterns:Patterns|undefined;
      if(entry.locationPatterns!==undefined){
        const p=object(entry.locationPatterns);keys(p,['reference','item','separator']);
        const reference=compile(p.reference,['relation'],['relation']),item=compile(p.item,['relation','position','ordinal','classifier'],['relation']);
        if(!item.some(node=>typeof node!=='string'&&['position','ordinal'].includes(node.argument)))return invalid();
        const separator=text(p.separator);if(/[{}\r\n\u0000-\u001f\u007f-\u009f]/u.test(separator))return invalid();
        patterns=Object.freeze({reference,item,separator});
      }
      entries[locale]=Object.freeze({rules:Object.freeze(rules),patterns});
    }
    if(complete)for(const locale of locales){
      const entry=entries[locale];if(!entry?.patterns)return invalid();
      for(const rule of ['checker.required','checker.min','checker.max','checker.minLength','checker.maxLength','checker.invalid'])
        for(const shape of ['one','two','deep'] as const)if(!entry.rules[rule]?.[shape])return invalid();
    }
    return new CheckerMessageCatalog(Object.freeze(entries),!complete);
  }
  lookup(locale:Locale,rule:string,shape:MessageShape):MessageSelection|undefined {
    const template=this.#locales[locale]?.rules[rule]?.[shape];
    return template&&selectionFor(locale,template);
  }
  override(locale:Locale,rule:string,shape:MessageShape):MessageSelection|undefined {return this.#application?this.lookup(locale,rule,shape):undefined;}
  select(locale:Locale,rule:string,shape:MessageShape):MessageSelection {
    for(const candidate of [locale,'en'] as const){const selected=this.lookup(candidate,rule,shape)??CheckerMessageCatalog.builtin.lookup(candidate,rule,shape);if(selected)return selected;}
    return CheckerMessageCatalog.builtin.lookup(locale,'checker.invalid',shape)!;
  }
  private patterns(locale:Locale):Patterns{return this.#locales[locale]?.patterns??CheckerMessageCatalog.builtin.#locales[locale]!.patterns!;}
  /** A finite location-pattern view; no raw application template is retained. */
  projectPatterns(locale:Locale,project:(text:string)=>string):CheckerMessageCatalog {
    const patterns=this.#locales[locale]?.patterns;if(this===CheckerMessageCatalog.builtin||!patterns)return CheckerMessageCatalog.builtin;
    const safe=(nodes:Template)=>Object.freeze(nodes.map(node=>typeof node==='string'?project(node):node));
    return new CheckerMessageCatalog(Object.freeze({[locale]:Object.freeze({rules:Object.freeze({}),patterns:Object.freeze({
      reference:safe(patterns.reference),item:safe(patterns.item),separator:project(patterns.separator)})})}),false);
  }
  reference(locale:Locale,relation:string):string{return render(this.patterns(locale).reference,{relation});}
  item(locale:Locale,relation:string,index:number,classifier:string):string {
    if(!Number.isSafeInteger(index)||index<0)return invalid();const position=BigInt(index)+1n;
    return render(this.patterns(locale).item,{relation,position:String(position),ordinal:ordinal(position),classifier});
  }
  separator(locale:Locale):string{return this.patterns(locale).separator;}
}
