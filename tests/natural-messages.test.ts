import {CheckException, CheckResult, CheckerMessageCatalog, CheckerMessageRequest, CheckerPresentation,
  CheckerPresentationModel, EntityRoot, I18nCatalog, ObjectLocation, RuntimeModule, UserContext,
  checkResultToWire, locales, ordinal} from '../src';
import {AbstractSQLTeaQLClient, TeaQLSqlDriver} from '../src/sql/core';
import fixture from './fixtures/natural-messages/cases-v1.json';
import roots from './fixtures/natural-messages/root-cases-v1.json';

function model(data:unknown=fixture):CheckerPresentationModel {
  const source=data as typeof fixture;
  return CheckerPresentationModel.fromJson(JSON.stringify({schema:'teaql.checker-model/v1',revision:source.revision,entities:source.entities,currentObject:source.currentObject}));
}
function context():UserContext{return new UserContext().installCheckerPresentationModel(model()).installCheckerMessageWarning(()=>{});}
const location=(steps:readonly (string|number)[])=>steps.reduce<ObjectLocation>((path,step)=>typeof step==='string'?path.property(step):path.index(step),ObjectLocation.root());
const catalog=(data:unknown)=>JSON.stringify({schema:'teaql.checker-messages/v1',defaultLocale:'en',locales:data});

test('shared 24 model-aware golden cases and root supplement',()=>{
  const cases=[...fixture.cases,...roots.cases];expect(cases).toHaveLength(24);
  for(const value of cases){
    const item=value as {name:string;origin?:string|null;path:(string|number)[];rule:string;locale:string;shape:string;expected:string;arguments?:Record<string,unknown>;instancePath?:string};
    const origin=Object.prototype.hasOwnProperty.call(item,'origin')?item.origin??undefined:'Catalog';
    const path=location(item.path),presentation=CheckerPresentation.capture(model(),origin,path);
    expect(presentation.shape.toUpperCase()).toBe(item.shape);
    const selection=CheckerMessageCatalog.builtin.select(new UserContext().setLocaleCode(item.locale).locale,item.rule,presentation.shape);
    const args=Object.fromEntries(Object.entries(item.arguments??{}).map(([key,value])=>[key,String(value)]));
    expect(presentation.render(CheckerMessageCatalog.builtin,selection,args).message).toBe(item.expected);
    if(item.instancePath)expect(path.instancePath()).toBe(item.instancePath);
    process.stdout.write(`TS_NATURAL_GOLDEN=${item.name}\n`);
  }
});

test('fifteen locales contain all 270 rule/depth cells',()=>{
  let count=0;
  for(const locale of locales)for(const rule of ['checker.required','checker.min','checker.max','checker.minLength','checker.maxLength','checker.invalid'])for(const shape of ['one','two','deep'] as const){
    const selection=CheckerMessageCatalog.builtin.lookup(locale,rule,shape);expect(selection).toBeDefined();
    const message=selection!.render({field:'F',object:'O',objectPath:'P',system:'8',input_len:'9',unit:'U'});
    expect(message).toContain('F');expect(message).not.toContain('{');if(shape==='two')expect(message).toContain('O');if(shape==='deep')expect(message).toContain('P');count++;
  }
  expect(count).toBe(270);
});

test('catalog rejects malformed resources atomically including duplicate JSON and normalized locales',()=>{
  const ctx=context().installCheckerMessageCatalog(catalog({en:{rules:{'checker.required':{one:'Need {field}.'}}}}));
  const bad=[
    catalog({en:{rules:{'checker.required':{one:'Need {input} {field}'}}}}),
    catalog({en:{rules:{'checker.maxLength':{one:'{field} {system} {unit} {input_len} {input}'}}}}),
    catalog({en:{rules:{'checker.max':{one:'{field}'}}}}),
    catalog({en:{rules:{'checker.required':{one:'{field',two:'{field}'}}}}),
    catalog({en:{rules:{'checker.required':{deep:'{field} {object}'}}}}),
    catalog({en:{rules:{'checker.required':{four:'{field}',one:''}}}}),
    catalog({en:{},'en-US':{}}),
    catalog({en:{locationPatterns:{reference:'{relation}',item:'{relation}',separator:' → '}}}),
    catalog({en:{locationPatterns:{reference:'{relation}',item:'{ordinal} {relation}',separator:'{input}'}}}),
    '{"schema":"teaql.checker-messages/v1","defaultLocale":"en","locales":{"en":{"rules":{"checker.required":{"one":"{field}","one":"{field}"}}}}}',
    catalog({}).replace('teaql.checker-messages/v1','teaql.i18n/v1'),catalog({})+' {}',
  ];
  for(const value of bad)expect(()=>ctx.installCheckerMessageCatalog(value)).toThrow();
  const result=ctx.translateCheckResultsFrom('Catalog',[{ruleId:'required',location:location(['name'])}])[0];
  expect(result.message).toBe('Need name.');
});

test('literal braces never execute and inserted text is not reinterpolated',()=>{
  const data=JSON.parse(JSON.stringify(fixture));data.entities.Catalog.fields[0].labels.en='name\nLocation: forged\u202e{system}';
  const ctx=context().installCheckerPresentationModel(model(data)).installCheckerMessageCatalog(catalog({en:{rules:{'checker.required':{one:'{{literal}} {field}'}}}}));
  expect(ctx.translateCheckResultsFrom('Catalog',[{ruleId:'required',location:location(['name'])}])[0].message).toBe('{literal} name Location: forged {system}');
});

test('model metadata rejects ambiguous aliases and conflicting modules without replacing prior metadata',()=>{
  const data=JSON.parse(JSON.stringify(fixture));data.entities.Catalog.fields[0].aliases=['entryList'];expect(()=>model(data)).toThrow();
  const base=model();expect(base.merge(base)).toBe(base);
  const conflict=JSON.parse(JSON.stringify(fixture));conflict.entities.Catalog.labels.en='other catalog';
  expect(()=>base.merge(model(conflict))).toThrow();
  const module=new RuntimeModule().withCheckerPresentation(base).and(new RuntimeModule().withCheckerPresentation(base));expect(module.checkerPresentationModel).toBe(base);
});

test('English ordinals and machine indices are independent including safe-integer boundary',()=>{
  for(const [n,expected] of [[1n,'1st'],[2n,'2nd'],[3n,'3rd'],[11n,'11th'],[12n,'12th'],[13n,'13th'],[21n,'21st']] as const)expect(ordinal(n)).toBe(expected);
  const path=location(['entry_list',Number.MAX_SAFE_INTEGER,'name']);
  const value=context().translateCheckResultsFrom('Catalog',[{ruleId:'required',location:path}])[0];
  expect(value.message).toContain('9007199254740992');expect(value.location.instancePath()).toContain('9007199254740991');
});

test('default Locale is English and all five actual rules render in every Locale with original scalar count',()=>{
  const ctx=context();expect(ctx.locale).toBe('en');
  for(const locale of locales){
    ctx.setLocaleCode(locale);
    const owner=location(['entry_list',1]);
    const results:CheckResult[]=[{ruleId:'required',entityType:'Entry',location:owner.property('name')},
      {ruleId:'min',entityType:'Entry',location:owner.property('amount'),inputValue:-1,systemValue:0},
      {ruleId:'max',entityType:'Entry',location:owner.property('amount'),inputValue:10,systemValue:9},
      {ruleId:'min_length',entityType:'Entry',location:owner.property('password'),inputValue:'密钥🔑abc',systemValue:8},
      {ruleId:'max_length',entityType:'Entry',location:owner.property('password'),inputValue:'密钥🔑abc',systemValue:4}];
    const output=ctx.translateCheckResultsFrom('Catalog',results);
    expect(JSON.stringify(output.map(r=>checkResultToWire(r)))).not.toContain('密钥🔑abc');
    for(const result of output){expect(result.entityType).toBe('Entry');expect(result.location.instancePath()).toMatch(/^\/entryList\/1\//);expect(result.message).toBeTruthy();}
    if(locale==='en'){expect(output[0].message).toBe('The name of the 2nd entry is required.');expect(output[4].message).toContain('current length is 6.');expect(output[4].message).toContain('Unicode scalar values');}
    if(locale==='zh-CN')expect(output[0].message).toBe('请填写第2条明细的名称。');
  }
  expect(()=>ctx.setLocaleCode('xx')).toThrow();
});

test('legacy overrides, customer literals, natural shapes and selected-Locale builtins retain priority',()=>{
  const ctx=context().installI18nCatalog(new I18nCatalog({schema:'teaql.i18n/v1',defaultLocale:'en',locales:{en:{messages:{'checker.required':'Legacy {location}: {input}'},vocabulary:{}}}},I18nCatalog.builtin));
  const error=()=>({ruleId:'required',location:location(['name'])});
  expect(ctx.translateCheckResultsFrom('Catalog',[error()])[0].message).toBe('Legacy name: undefined');
  ctx.installCheckerMessageCatalog(catalog({en:{rules:{'checker.required':{one:'New {field}'}}}}));
  expect(ctx.translateCheckResultsFrom('Catalog',[error()])[0].message).toBe('New name');
  expect(ctx.translateCheckResultsFrom('Catalog',[{...error(),message:'Literal {field}'}])[0].message).toBe('Literal {field}');
  ctx.setLocaleCode('zh-CN');expect(ctx.translateCheckResultsFrom('Catalog',[error()])[0].message).toBe('请填写名称。');
});

test('retained immutable origins survive spread relocation and independent Context reuse',async()=>{
  const ctx=context();
  const source=ctx.translateCheckResultsFrom('Catalog',[{ruleId:'required',entityType:'Entry',location:location(['name'])}])[0];
  ctx.installCheckerPresentationModel(CheckerPresentationModel.empty);
  const relocated=ctx.translateCheckResults([{...source,location:location(['payer','name'])}])[0];
  expect(relocated.message).toBe('The name of the payer is required.');
  expect(source.message).toBe('The name is required.');
  ctx.installCheckerPresentationModel(model());
  await Promise.all(['Catalog','Person'].map(async origin=>{
    const result=ctx.translateCheckResultsFrom(origin,[{ruleId:'required',location:ObjectLocation.root()}])[0];
    await Promise.resolve();expect(result.message).toContain(origin==='Catalog'?'catalog':'person');
  }));
});

test('renderer SPI sees only safe finite data and failures preserve located generic errors',()=>{
  const ctx=context();let retained:CheckerMessageRequest|undefined;
  ctx.installCheckerMessageRenderer(request=>{retained=request;throw new Error('PRIVATE_PROVIDER_CAUSE');});
  const result=ctx.translateCheckResultsFrom('Catalog',[{ruleId:'required',location:location(['entry_list',1,'name'])}])[0];
  expect(result.message).toBe('The name of the 2nd entry is invalid.');expect(JSON.stringify(result)).not.toContain('PRIVATE_PROVIDER_CAUSE');
  expect(retained?.presentation.origin).toBe('Catalog');expect(Object.keys(retained!)).toEqual(['presentation','catalog','selection','arguments']);
});

test('custom renderer inputs and returned text cannot restore a credential',()=>{
  const ctx=context().installCheckerMessageRenderer(request=>{
    expect(request.arguments.input).toBe('[REDACTED]');
    expect(request.arguments.system).toBe('12');expect(request.arguments.input_len).toBe('1');
    return {message:'Custom provider echoed 1',warnings:[]};
  });
  const result=ctx.translateCheckResultsFrom('Catalog',[{ruleId:'min_length',location:location(['password']),inputValue:'1',systemValue:12}])[0];
  expect(result.inputValue).toBe('[REDACTED]');expect(result.message).toBe('Custom provider echoed [REDACTED]');
});

class Driver implements TeaQLSqlDriver {
  readonly databaseKind='sqlite' as const;transactions=0;statements:string[]=[];
  query=async(sql:string)=>{this.statements.push(sql);return {rows:[],rowCount:0};};stream=async function*(){};
  identifier=(name:string)=>`"${name}"`;placeholder=()=>'?';encode=(value:unknown)=>value;contains=()=>'';
  aggregateFunction=(name:string)=>name;ensureSchema=async()=>{};nextId=async()=>'1';ensureIdFloor=async()=>{};close=async()=>{};
  transaction=async<T>(work:(session:any)=>Promise<T>)=>{this.transactions++;return work(this);};
}
class Client extends AbstractSQLTeaQLClient {constructor(readonly observed:Driver){super(observed,{});}}
test('actual SQL Checker entry resolves its local origin and never reaches a transaction on failure',async()=>{
  const driver=new Driver(),ctx=context(),client=new Client(driver).setUserContext(ctx).install(new RuntimeModule({Catalog:{table:'catalog',columns:{}}},
    {Catalog:{checkAndFix(_context,_mutation,errors){errors.push({ruleId:'required',entityType:'Entry',location:location(['entry_list',1,'name'])});}}}).withCheckerPresentation(model()));
  await expect(client.executeMutation({entity:'Catalog',action:'Create',payload:{},comment:'Verify actual Checker origin'})).rejects.toMatchObject({violations:[{entityType:'Entry',message:'The name of the 2nd entry is required.'}]});
  expect(driver.statements).toEqual([]);expect(driver.transactions).toBe(0);
});

test('two clients sharing a Context retain their own immutable model vocabulary',async()=>{
  const ctx=new UserContext().installCheckerMessageWarning(()=>{}),values:string[]=[];
  for(const label of ['alpha name','beta name','alpha name']){
    const data=JSON.parse(JSON.stringify(fixture));data.entities.Catalog.fields[0].labels.en=label;
    const client=new Client(new Driver()).setUserContext(ctx).install(new RuntimeModule({Catalog:{table:'catalog',columns:{}}},
      {Catalog:{checkAndFix(_context,_mutation,errors){errors.push({ruleId:'required',location:location(['name'])});}}}).withCheckerPresentation(model(data)));
    try{await client.executeMutation({entity:'Catalog',action:'Create',payload:{},comment:'Isolate model vocabulary'});}catch(error){
      expect(error).toBeInstanceOf(CheckException);values.push((error as CheckException).violations[0].message!);
    }
  }
  expect(values).toEqual(['The alpha name is required.','The beta name is required.','The alpha name is required.']);
  expect(ctx.checkerPresentationModel).toBe(CheckerPresentationModel.empty);
});

test('graph boundary rerenders an automatically relocated error without changing its identity',()=>{
  const ctx=context(),original=ctx.translateCheckResultsFrom('Entry',[{ruleId:'required',entityType:'Entry',location:location(['name'])}])[0];
  const error=new CheckException([{...original,location:location(['entry_list',1,'name'])}]);
  const config=ctx.captureCheckerMessages(),snapshot=Object.freeze({entity:'Catalog',model:config.model});
  ctx.installCheckerPresentationModel(CheckerPresentationModel.empty);
  error.refreshPresentation(ctx.renderCheckerGraphResults(error.violations,config,snapshot));
  expect(error).toBeInstanceOf(CheckException);expect(error.violations[0].message).toBe('The name of the 2nd entry is required.');
  expect(error.message).toContain('2nd entry');expect(checkResultToWire(error.violations[0]).instancePath).toBe('/entryList/1/name');
});

test('graph relocation cannot invoke a custom renderer again without its original redactions',()=>{
  const secret='graph-provider-private';let calls=0;
  const ctx=context().installCheckerMessageRenderer(()=>{calls++;return {message:'Provider echoed '+secret,warnings:[]};});
  const source=ctx.translateCheckResultsFrom('Entry',[{ruleId:'min_length',location:location(['password']),inputValue:secret,systemValue:50}])[0];
  expect(source.message).not.toContain(secret);
  const config=ctx.captureCheckerMessages(),moved={...source,location:location(['entry_list',1,'password'])};
  const final=ctx.renderCheckerGraphResults([moved],config,Object.freeze({model:config.model,entity:'Catalog'}))[0];
  expect(final.message).not.toContain(secret);expect(calls).toBe(1);expect(final.location.instancePath()).toBe('/entryList/1/password');
});

test('a later graph depth uses a preprojected application template, not raw catalog text',()=>{
  const secret='graph-template-private';
  const ctx=context().installCheckerMessageCatalog(catalog({en:{rules:{'checker.minLength':{two:`The {field} of {object} needs {system} {unit}; got {input_len}. Private ${secret}`}}}}));
  const source=ctx.translateCheckResultsFrom('Entry',[{ruleId:'min_length',location:location(['password']),inputValue:secret,systemValue:50}])[0];
  const config=ctx.captureCheckerMessages(),moved={...source,location:location(['entry_list',1,'password'])};
  const final=ctx.renderCheckerGraphResults([moved],config,Object.freeze({model:config.model,entity:'Catalog'}))[0];
  expect(final.message).not.toContain(secret);expect(final.message).toContain('Private [REDACTED]');
  expect(final.message).toContain('2nd entry');expect(final.message).toContain(String(secret.length));
});

test('a retained error changes Locale using already projected application plans',()=>{
  const secret='later-locale-private';
  const ctx=context().installCheckerMessageCatalog(catalog({'zh-CN':{rules:{'checker.minLength':{
    two:`{object}的{field}至少{system}{unit}，当前{input_len}；${secret}`}}}}));
  const source=ctx.translateCheckResultsFrom('Entry',[{ruleId:'min_length',location:location(['password']),inputValue:secret,systemValue:50}])[0];
  ctx.setLocaleCode('zh-CN');
  const config=ctx.captureCheckerMessages(),final=ctx.renderCheckerGraphResults([{...source,location:location(['entry_list',1,'password'])}],config,
    Object.freeze({model:config.model,entity:'Catalog'}))[0];
  expect(final.message).toContain('第2条明细');expect(final.message).toContain('[REDACTED]');
  expect(final.message).not.toContain(secret);expect(final.message).toContain(String(secret.length));
});

test('later owner patterns project literals without corrupting numeric arguments',()=>{
  const ctx=context().installCheckerMessageCatalog(catalog({en:{locationPatterns:{
    reference:'Private 1 {relation}',item:'Private 1 the {ordinal} {relation}',separator:' → '}}}));
  const source=ctx.translateCheckResultsFrom('Entry',[{ruleId:'min_length',location:location(['password']),inputValue:'1',systemValue:12}])[0];
  const config=ctx.captureCheckerMessages(),final=ctx.renderCheckerGraphResults([{...source,location:location(['entry_list',1,'password'])}],config,
    Object.freeze({model:config.model,entity:'Catalog'}))[0];
  expect(final.message).toContain('Private [REDACTED] the 2nd entry');
  expect(final.message).toContain('12 Unicode scalar values');expect(final.message).toContain('current length is 1.');
});

test('renderer-retained template selections contain projected nodes after the invocation closes',()=>{
  const secret='retained-selection-private';let retained:CheckerMessageRequest|undefined;
  const ctx=context().installCheckerMessageCatalog(catalog({en:{rules:{'checker.required':{one:`Private ${secret} {field}`}}}}))
    .installCheckerMessageRenderer(request=>{retained=request;return request.presentation.render(request.catalog,request.selection,request.arguments);});
  const source=ctx.translateCheckResultsFrom('Entry',[{ruleId:'required',location:location(['password']),inputValue:secret}])[0];
  expect(source.message).toBe('Private [REDACTED] password');
  expect(retained!.selection.render({field:'password'})).toBe('Private [REDACTED] password');
});

test('legacy projected literals survive relocation and explicit customer replacement wins',()=>{
  const secret='legacy-plan-private';
  const ctx=context().installI18nCatalog(new I18nCatalog({schema:'teaql.i18n/v1',defaultLocale:'en',locales:{en:{
    messages:{'checker.minLength':`Private ${secret}: {location} expects {system}; got {input_len}`},vocabulary:{}}}},I18nCatalog.builtin));
  const source=ctx.translateCheckResultsFrom('Entry',[{ruleId:'min_length',location:location(['password']),inputValue:secret,systemValue:50}])[0];
  const config=ctx.captureCheckerMessages(),moved={...source,location:location(['entry_list',1,'password'])};
  const final=ctx.renderCheckerGraphResults([moved],config,Object.freeze({model:config.model,entity:'Catalog'}))[0];
  expect(final.message).toBe(`Private [REDACTED]: entryList[1].password expects 50; got ${secret.length}`);
  const replaced=ctx.translateCheckResults([{...final,message:'Customer replacement'}])[0];expect(replaced.message).toBe('Customer replacement');
});
