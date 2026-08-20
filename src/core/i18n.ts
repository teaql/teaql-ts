import builtinJson from './builtin-messages-v1.json';

export const locales = ['en','zh-CN','zh-TW','ja','ko','de','fr','es','pt','ar','th','id','fil','uk','vi'] as const;
export type Locale = typeof locales[number];
export class UnsupportedLocaleError extends Error { constructor(public readonly localeCode: unknown){super(`Unsupported locale: ${localeCode}`);} }
const aliases:Record<string,Locale>={'en-us':'en','en-gb':'en','zh':'zh-CN','zh-hans':'zh-CN','zh-sg':'zh-CN','cn':'zh-CN','zh-hant':'zh-TW','zh-hk':'zh-TW','zh-mo':'zh-TW','tw':'zh-TW','ja-jp':'ja','ko-kr':'ko','de-de':'de','fr-fr':'fr','es-mx':'es','pt-br':'pt','pt-pt':'pt','ar-sa':'ar','th-th':'th','id-id':'id','tl':'fil','fil-ph':'fil','uk-ua':'uk','vi-vn':'vi'};
export function parseLocale(code:unknown):Locale{if(typeof code!=='string'||!code.trim())throw new UnsupportedLocaleError(code);const normalized=code.trim().replace(/_/g,'-').toLowerCase();const canonical=locales.find(v=>v.toLowerCase()===normalized);if(canonical)return canonical;const alias=aliases[normalized];if(!alias)throw new UnsupportedLocaleError(code);return alias;}
type LocaleData={messages:Record<string,string>;vocabulary:Record<string,string>};
export type CatalogData={schema:string;defaultLocale:string;locales:Record<string,LocaleData>};
export interface CheckResult{ruleId:string;location:string;inputValue?:unknown;systemValue?:unknown;message?:string}
export class I18nCatalog{
 static readonly builtin=new I18nCatalog(builtinJson as CatalogData);
 constructor(private readonly data:CatalogData,private readonly fallback?:I18nCatalog){if(data.schema!=='teaql.i18n/v1')throw new Error('Unsupported i18n schema');Object.keys(data.locales).forEach(parseLocale);}
 message(locale:Locale,key:string):string{return this.data.locales[locale]?.messages[key]??this.fallback?.data.locales[locale]?.messages[key]??this.data.locales.en?.messages[key]??this.fallback?.data.locales.en?.messages[key]??key;}
 translate(result:CheckResult,locale:Locale):CheckResult{const keys:Record<string,string>={required:'checker.required',min:'checker.min',max:'checker.max',min_str_len:'checker.minLength',min_length:'checker.minLength',max_str_len:'checker.maxLength',max_length:'checker.maxLength'};const key=keys[result.ruleId.toLowerCase()]??`checker.${result.ruleId.toLowerCase()}`;const input=String(result.inputValue);const length=typeof result.inputValue==='string'?[...result.inputValue].length:0;result.message=this.message(locale,key).split('{location}').join(result.location).split('{system}').join(String(result.systemValue)).split('{input}').join(input).split('{input_len}').join(String(length));return result;}
}
