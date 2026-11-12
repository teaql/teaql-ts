import builtinJson from './builtin-messages-v1.json';
import { JsonFieldNamingProfile, ObjectLocation, ObjectLocationSegment } from './object-location';
import { checkerInputLength, checkerTemplateLiteral, markCheckerRendering } from './checker-privacy';

export const locales = ['en','zh-CN','zh-TW','ja','ko','de','fr','es','pt','ar','th','id','fil','uk','vi'] as const;
export type Locale = typeof locales[number];
export class UnsupportedLocaleError extends Error { constructor(public readonly localeCode: unknown){super(`Unsupported locale: ${localeCode}`);} }
const aliases:Record<string,Locale>={'en-us':'en','en-gb':'en','zh':'zh-CN','zh-hans':'zh-CN','zh-sg':'zh-CN','cn':'zh-CN','zh-hant':'zh-TW','zh-hk':'zh-TW','zh-mo':'zh-TW','tw':'zh-TW','ja-jp':'ja','ko-kr':'ko','de-de':'de','fr-fr':'fr','es-mx':'es','pt-br':'pt','pt-pt':'pt','ar-sa':'ar','th-th':'th','id-id':'id','tl':'fil','fil-ph':'fil','uk-ua':'uk','vi-vn':'vi'};
export function parseLocale(code:unknown):Locale{if(typeof code!=='string'||!code.trim())throw new UnsupportedLocaleError(code);const normalized=code.trim().replace(/_/g,'-').toLowerCase();const canonical=locales.find(v=>v.toLowerCase()===normalized);if(canonical)return canonical;const alias=aliases[normalized];if(!alias)throw new UnsupportedLocaleError(code);return alias;}
type LocaleData={messages:Record<string,string>;vocabulary:Record<string,string>};
export type CatalogData={schema:string;defaultLocale:string;locales:Record<string,LocaleData>};
export interface CheckResult{ruleId:string;entityType?:string;location:ObjectLocation;sourceInstancePath?:string;inputValue?:unknown;systemValue?:unknown;message?:string}
export interface WireCheckResult{ruleId:string;entityType?:string;location:readonly ObjectLocationSegment[];instancePath:string;sourceInstancePath?:string;inputValue?:unknown;systemValue?:unknown;message?:string}
export function checkResultToWire(result:CheckResult,profile:JsonFieldNamingProfile='camelCase'):WireCheckResult{return {ruleId:result.ruleId,entityType:result.entityType,location:result.location.segments,instancePath:result.location.instancePath(profile),sourceInstancePath:result.sourceInstancePath,inputValue:result.inputValue,systemValue:result.systemValue,message:result.message};}
export class I18nCatalog{
 static readonly builtin=new I18nCatalog(builtinJson as CatalogData);
 constructor(private readonly data:CatalogData,private readonly fallback?:I18nCatalog){if(data.schema!=='teaql.i18n/v1')throw new Error('Unsupported i18n schema');Object.keys(data.locales).forEach(parseLocale);}
 message(locale:Locale,key:string):string{return this.data.locales[locale]?.messages[key]??this.fallback?.data.locales[locale]?.messages[key]??this.data.locales.en?.messages[key]??this.fallback?.data.locales.en?.messages[key]??key;}
 applicationMessage(locale:Locale,key:string):string|undefined{return this===I18nCatalog.builtin?undefined:this.data.locales[locale]?.messages[key];}
 translate(result:CheckResult,locale:Locale):CheckResult{
  const keys:Record<string,string>={required:'checker.required',min:'checker.min',max:'checker.max',min_str_len:'checker.minLength',min_length:'checker.minLength',max_str_len:'checker.maxLength',max_length:'checker.maxLength'};
  const key=keys[result.ruleId.toLowerCase()]??`checker.${result.ruleId.toLowerCase()}`;
  const template=this.message(locale,key);
  // An opaque customer diagnostic has no template to rerender. Keep its text
  // while the canonical location still carries the full relocated path.
  if(template===key&&result.message?.trim())return result;
  const input=String(result.inputValue);
  const values:Record<string,string>={'{location}':result.location.nativePath(),'{system}':String(result.systemValue),
   '{input}':input,'{input_len}':String(checkerInputLength(result))};
  const publicTemplate=template===I18nCatalog.builtin.message(locale,key);
  // Scrub literal/customer template text separately from typed substitutions.
  // A credential such as "1" must not rewrite the numeric bound 12 or a true
  // validation length merely because the same digit appears there.
  result.message=template.split(/(\{(?:location|system|input|input_len)\})/g)
   .map(part=>Object.prototype.hasOwnProperty.call(values,part)?values[part]:publicTemplate?part:checkerTemplateLiteral(result,part)).join('');
  markCheckerRendering(result);
  return result;
 }
}
