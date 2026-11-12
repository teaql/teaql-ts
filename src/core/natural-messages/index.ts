import {CheckResult, I18nCatalog, Locale, locales, parseLocale} from '../i18n';
import {ObjectLocation} from '../object-location';
import {checkerInputLength, checkerRenderingWasAutomatic, checkerTemplateLiteral, markCheckerRendering} from '../checker-privacy';
import {CheckerMessageCatalog, MessageSelection, MessageShape, SafeArguments, projectMessageSelection} from './catalog';
import {CheckerMessageWarning, CheckerPresentation, CheckerPresentationModel, MessageOutput, checkerCountingUnit, sanitize} from './presentation';
export {CheckerMessageCatalog, MessageShape, MessageSelection, SafeArguments, ordinal} from './catalog';
export {CheckerPresentation, CheckerPresentationModel, CheckerMessageWarning, MessageOutput} from './presentation';

export type CheckerMessageRequest=Readonly<{presentation:CheckerPresentation;catalog:CheckerMessageCatalog;selection:MessageSelection;arguments:SafeArguments}>;
export type CheckerMessageRenderer=(request:CheckerMessageRequest)=>MessageOutput;
export const standardCheckerMessageRenderer:CheckerMessageRenderer=request=>request.presentation.render(request.catalog,request.selection,request.arguments);
export type CheckerMessageConfiguration=Readonly<{
  model:CheckerPresentationModel;catalog:CheckerMessageCatalog;legacy:I18nCatalog;locale:Locale;
  renderer:CheckerMessageRenderer;warning:(code:CheckerMessageWarning)=>void;
}>;
/** Immutable invocation data. No Context or entity graph in this boundary. */
export type CheckerValidationOrigin=Readonly<{model:CheckerPresentationModel;entity:string}>;
const token=Symbol('TeaQL.NaturalCheckerPresentation');
type LegacyNode=string|Readonly<{argument:string}>;
type PreparedMessage=Readonly<{selection?:MessageSelection;legacy?:readonly LegacyNode[];catalog:CheckerMessageCatalog;generic:boolean;application:boolean}>;
type MessagePlan=Readonly<{literal?:string;locales?:Readonly<Record<Locale,Readonly<Record<MessageShape,PreparedMessage>>>>}>;
const bindings=new WeakMap<object,Readonly<{presentation:CheckerPresentation;automaticMessage?:string;plan?:MessagePlan}>>();
type Bound=CheckResult&{[token]?:object};
const binding=(result:CheckResult)=>{const key=(result as Bound)[token];return key&&bindings.get(key);};
function retain(result:CheckResult,presentation:CheckerPresentation,automaticMessage?:string,plan?:MessagePlan):void {
  const key=Object.freeze({});bindings.set(key,Object.freeze({presentation,automaticMessage,plan}));
  Object.defineProperty(result,token,{value:key,enumerable:true,configurable:true});
}
function automatic(result:CheckResult):boolean {
  const state=binding(result);return state?.automaticMessage!==undefined&&state.automaticMessage===result.message||checkerRenderingWasAutomatic(result);
}
/** Runtime Checker admission supplies the actual local origin, never a type guessed from an error. */
export function bindCheckerOrigin(results:readonly CheckResult[],origin:CheckerValidationOrigin):CheckResult[] {
  return results.map(result=>{
    const copy={...result},auto=automatic(result);retain(copy,CheckerPresentation.capture(origin.model,origin.entity,result.location),auto?result.message:undefined,auto?binding(result)?.plan:undefined);return copy;
  });
}

const ruleKeys:Readonly<Record<string,string>>=Object.freeze({required:'checker.required',min:'checker.min',max:'checker.max',min_str_len:'checker.minLength',min_length:'checker.minLength',max_str_len:'checker.maxLength',max_length:'checker.maxLength'});
function scalar(value:unknown):string {
  if(value===null)return 'null';if(value===undefined)return 'undefined';
  if(typeof value==='string')return sanitize(value);
  if(typeof value==='number'||typeof value==='bigint'||typeof value==='boolean')return String(value);
  if(value instanceof Date&&Object.getPrototypeOf(value)===Date.prototype&&Number.isFinite(value.getTime()))return value.toISOString();
  return '[value omitted]';
}
const warningCodes:readonly CheckerMessageWarning[]=['CHECKER_MESSAGE_LABEL_FALLBACK','CHECKER_MESSAGE_GENERIC_RULE','CHECKER_MESSAGE_RENDER_FALLBACK'];

/** Only this rule's finite Locale/depth plans survive the privacy scope. */
function preparePlan(config:CheckerMessageConfiguration,result:CheckResult,rule:string):MessagePlan {
  const project=(text:string)=>checkerTemplateLiteral(result,text);
  const patterns=new Map<Locale,CheckerMessageCatalog>();
  const prepared=Object.fromEntries(locales.map(locale=>[locale,Object.freeze(Object.fromEntries((['one','two','deep'] as const).map(shape=>{
    let selection:MessageSelection|undefined,legacy:readonly LegacyNode[]|undefined,application=false;
    for(const candidate of [locale,'en'] as const){
      selection=config.catalog.override(candidate,rule,shape);if(selection){application=true;break;}
      const text=config.legacy.applicationMessage(candidate,rule);
      if(text!==undefined){
        legacy=Object.freeze(text.split(/(\{(?:location|system|input|input_len)\})/g).map(part=>
          /^\{(?:location|system|input|input_len)\}$/.test(part)?Object.freeze({argument:part.slice(1,-1)}):project(part)));
        break;
      }
      selection=CheckerMessageCatalog.builtin.lookup(candidate,rule,shape);if(selection)break;
    }
    const generic=!selection&&!legacy;
    if(generic)selection=CheckerMessageCatalog.builtin.select(locale,'checker.invalid',shape);
    if(selection&&application)selection=projectMessageSelection(selection,project);
    const effective=selection?.locale??locale;
    if(!patterns.has(effective))patterns.set(effective,config.catalog.projectPatterns(effective,project));
    return [shape,Object.freeze({selection,legacy,catalog:patterns.get(effective)!,generic,application})];
  })))])) as Record<Locale,Readonly<Record<MessageShape,PreparedMessage>>>;
  return Object.freeze({locales:Object.freeze(prepared)});
}
function projectPlan(plan:MessagePlan,project:(literal:string)=>string):MessagePlan {
  if(plan.literal!==undefined)return Object.freeze({literal:project(plan.literal)});
  const prepared:Partial<Record<Locale,Readonly<Record<MessageShape,PreparedMessage>>>>={};
  for(const locale of locales){
    const shapes:Partial<Record<MessageShape,PreparedMessage>>={};
    for(const shape of ['one','two','deep'] as const){
      const item=plan.locales![locale][shape];
      shapes[shape]=Object.freeze({...item,
        selection:item.application&&item.selection?projectMessageSelection(item.selection,project):item.selection,
        legacy:item.legacy&&Object.freeze(item.legacy.map(node=>typeof node==='string'?project(node):node)),
        catalog:item.catalog.projectPatterns(item.selection?.locale??locale,project)});
    }
    prepared[locale]=Object.freeze(shapes as Record<MessageShape,PreparedMessage>);
  }
  return Object.freeze({locales:Object.freeze(prepared as Record<Locale,Readonly<Record<MessageShape,PreparedMessage>>>) });
}
function safeArguments(result:CheckResult,locale:Locale):SafeArguments {
  return Object.freeze({system:scalar(result.systemValue),input:scalar(result.inputValue),input_len:String(checkerInputLength(result)),unit:checkerCountingUnit(locale,'scalar')});
}
function renderPlan(plan:MessagePlan,presentation:CheckerPresentation,result:CheckResult,locale:Locale):MessageOutput {
  if(plan.literal!==undefined)return Object.freeze({message:plan.literal,warnings:Object.freeze([])});
  const item=plan.locales![locale][presentation.shape],args=safeArguments(result,item.selection?.locale??locale);
  if(item.legacy){
    const values={...args,location:result.location.nativePath()};
    return Object.freeze({message:item.legacy.map(node=>typeof node==='string'?node:values[node.argument as keyof typeof values]??'-').join(''),warnings:Object.freeze([])});
  }
  const output=presentation.render(item.catalog,item.selection!,args);
  return item.generic?Object.freeze({...output,warnings:Object.freeze([...output.warnings,'CHECKER_MESSAGE_GENERIC_RULE' as const])}):output;
}

export function renderNaturalCheckerResult(config:CheckerMessageConfiguration,result:CheckResult,
  warnings:Set<CheckerMessageWarning>=new Set(),force?:CheckerValidationOrigin):CheckResult {
  // A safe customer literal is authoritative, even for a known built-in rule.
  if(result.message?.trim()&&!automatic(result))return result;
  const warn=(code:CheckerMessageWarning)=>{
    const known=warningCodes.includes(code)?code:'CHECKER_MESSAGE_RENDER_FALLBACK';
    if(!warnings.has(known)){warnings.add(known);try{config.warning(known);}catch{/* Diagnostics cannot replace validation. */}}
  };
  const previous=binding(result),model=force?.model??previous?.presentation.model??config.model;
  const origin=force?.entity??previous?.presentation.origin;
  let presentation:CheckerPresentation;
  try{presentation=CheckerPresentation.capture(model,origin,result.location);}catch{
    warn('CHECKER_MESSAGE_RENDER_FALLBACK');presentation=CheckerPresentation.capture(CheckerPresentationModel.empty,undefined,ObjectLocation.root());
  }
  const rule=ruleKeys[result.ruleId.toLowerCase()]??`checker.${result.ruleId.toLowerCase()}`;
  const locale=parseLocale(config.locale); // Invalid explicit Locale remains a typed error.
  let plan:MessagePlan|undefined=automatic(result)?previous?.plan:undefined;
  if(plan)plan=projectPlan(plan,literal=>checkerTemplateLiteral(result,literal));
  try{
    let output:MessageOutput;
    if(plan)output=renderPlan(plan,presentation,result,locale);
    else {
      plan=preparePlan(config,result,rule);
      const item=plan.locales![locale][presentation.shape];
      if(config.renderer===standardCheckerMessageRenderer||item.legacy)output=renderPlan(plan,presentation,result,locale);
      else {
        const request:CheckerMessageRequest=Object.freeze({presentation,catalog:item.catalog,selection:item.selection!,arguments:safeArguments(result,item.selection!.locale)});
        const custom=config.renderer(request);
        output=Object.freeze({...custom,message:checkerTemplateLiteral(result,custom.message)});
        plan=Object.freeze({literal:output.message});
      }
    }
    if(!output||typeof output.message!=='string'||!output.message.trim())throw new Error('Empty rendered message');
    for(const warning of output.warnings)warn(warning);
    result.message=output.message;
  }catch{
    warn('CHECKER_MESSAGE_RENDER_FALLBACK');
    const fallback=presentation.render(CheckerMessageCatalog.builtin,CheckerMessageCatalog.builtin.select(locale,'checker.invalid',presentation.shape),{});
    result.message=fallback.message;for(const warning of fallback.warnings)warn(warning);
    plan=Object.freeze({literal:result.message});
  }
  retain(result,presentation,result.message,plan);markCheckerRendering(result);return result;
}
