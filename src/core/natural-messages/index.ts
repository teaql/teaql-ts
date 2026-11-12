import {CheckResult, I18nCatalog, Locale, parseLocale} from '../i18n';
import {ObjectLocation} from '../object-location';
import {checkerInputLength, checkerRenderingWasAutomatic, checkerTemplateLiteral, markCheckerRendering} from '../checker-privacy';
import {CheckerMessageCatalog, MessageSelection, SafeArguments} from './catalog';
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
const bindings=new WeakMap<object,Readonly<{presentation:CheckerPresentation;automaticMessage?:string}>>();
type Bound=CheckResult&{[token]?:object};
const binding=(result:CheckResult)=>{const key=(result as Bound)[token];return key&&bindings.get(key);};
function retain(result:CheckResult,presentation:CheckerPresentation,automaticMessage?:string):void {
  const key=Object.freeze({});bindings.set(key,Object.freeze({presentation,automaticMessage}));
  Object.defineProperty(result,token,{value:key,enumerable:true,configurable:true});
}
function automatic(result:CheckResult):boolean {
  const state=binding(result);return state?.automaticMessage!==undefined&&state.automaticMessage===result.message||checkerRenderingWasAutomatic(result);
}
/** Runtime Checker admission supplies the actual local origin, never a type guessed from an error. */
export function bindCheckerOrigin(results:readonly CheckResult[],origin:CheckerValidationOrigin):CheckResult[] {
  return results.map(result=>{
    const copy={...result},auto=automatic(result);retain(copy,CheckerPresentation.capture(origin.model,origin.entity,result.location),auto?result.message:undefined);return copy;
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
  try{
    let selection:MessageSelection|undefined,application=false;
    for(const candidate of [locale,'en'] as const){
      selection=config.catalog.override(candidate,rule,presentation.shape);if(selection){application=true;break;}
      const legacy=config.legacy.applicationMessage(candidate,rule);
      if(legacy!==undefined){
        const args:Record<string,string>={location:result.location.nativePath(),system:scalar(result.systemValue),input:scalar(result.inputValue),input_len:String(checkerInputLength(result))};
        result.message=legacy.split(/(\{(?:location|system|input|input_len)\})/g).map(part=>part.startsWith('{')&&Object.prototype.hasOwnProperty.call(args,part.slice(1,-1))?args[part.slice(1,-1)]:checkerTemplateLiteral(result,part)).join('');
        retain(result,presentation,result.message);markCheckerRendering(result);return result;
      }
      selection=CheckerMessageCatalog.builtin.lookup(candidate,rule,presentation.shape);if(selection)break;
    }
    if(!selection){warn('CHECKER_MESSAGE_GENERIC_RULE');selection=CheckerMessageCatalog.builtin.select(locale,'checker.invalid',presentation.shape);}
    const selected=selection;
    const projectedSelection:MessageSelection=Object.freeze({locale:selected.locale,render:(args:SafeArguments)=>selected.render(args,application?literal=>checkerTemplateLiteral(result,literal):undefined)});
    // Do not give a customer renderer a callback closing over the active result.
    // Preproject only literal nodes; the selection is a pure finite template.
    const publicSelection=config.renderer===standardCheckerMessageRenderer?projectedSelection:selected;
    const request:CheckerMessageRequest=Object.freeze({presentation,catalog:config.catalog,selection:publicSelection,
      arguments:Object.freeze({system:scalar(result.systemValue),input:scalar(result.inputValue),input_len:String(checkerInputLength(result)),unit:checkerCountingUnit(selected.locale,'scalar')})});
    const output=config.renderer(request);
    if(!output||typeof output.message!=='string'||!output.message.trim())throw new Error('Empty rendered message');
    for(const warning of output.warnings)warn(warning);
    result.message=config.renderer===standardCheckerMessageRenderer?output.message:checkerTemplateLiteral(result,output.message);
  }catch{
    warn('CHECKER_MESSAGE_RENDER_FALLBACK');
    const fallback=presentation.render(CheckerMessageCatalog.builtin,CheckerMessageCatalog.builtin.select(locale,'checker.invalid',presentation.shape),{});
    result.message=fallback.message;for(const warning of fallback.warnings)warn(warning);
  }
  retain(result,presentation,result.message);markCheckerRendering(result);return result;
}
