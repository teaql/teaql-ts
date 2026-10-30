import { CheckResult,I18nCatalog,locales,ObjectLocation,UnsupportedLocaleError,UserContext } from '../src';
test('15 locales x 5 checker rules',()=>{const rules:CheckResult[]=[{ruleId:'required',location:ObjectLocation.property('name')},{ruleId:'min',location:ObjectLocation.property('age'),inputValue:1,systemValue:2},{ruleId:'max',location:ObjectLocation.property('age'),inputValue:3,systemValue:2},{ruleId:'min_length',location:ObjectLocation.property('name'),inputValue:'a',systemValue:2},{ruleId:'max_length',location:ObjectLocation.property('name'),inputValue:'abc',systemValue:2}];let cells=0;for(const locale of locales)for(const source of rules){const result=I18nCatalog.builtin.translate({...source},locale);expect(result.message).toBeTruthy();expect(result.message).not.toMatch(/^checker\./);cells++;}expect(cells).toBe(75);});
test('alias and invalid locale preserve context',()=>{const context=new UserContext().setLocaleCode('ZH_hans');expect(context.locale).toBe('zh-CN');expect(()=>context.setLocaleCode('xx')).toThrow(UnsupportedLocaleError);expect(context.locale).toBe('zh-CN');});

test.each([undefined, '', '  ', 'ReviewedItem'])('translation owns cached Checker snapshots with type %p', entityType => {
  const source: CheckResult = Object.freeze({ruleId: 'required',
    location: ObjectLocation.property('product_name'), entityType,
    sourceInstancePath: '/legacy~1items/2/product~0name', systemValue: 'required'});
  const context = new UserContext();
  const retained: CheckResult[] = [];
  for (const locale of ['en', 'zh-CN', 'en']) {
    context.setLocaleCode(locale);
    const results = [source];
    expect(context.translateCheckResults(results, 'OrderItem')).toBe(results);
    expect(results[0]).not.toBe(source);
    expect(results[0].entityType).toBe(entityType?.trim() ? entityType : 'OrderItem');
    retained.push(results[0]);
  }
  expect(source.message).toBeUndefined();
  expect(source.entityType).toBe(entityType);
  expect(retained[0].message).toBe(retained[2].message);
  expect(retained[0].message).not.toBe(retained[1].message);
  expect(source.location.modelPath()).toBe('product_name');
  expect(source.sourceInstancePath).toBe('/legacy~1items/2/product~0name');
});

test('relocation rerenders every built-in rule in the original locale without changing metadata', () => {
  const rules: CheckResult[] = [
    {ruleId: 'required', location: ObjectLocation.property('product_name')},
    {ruleId: 'min', location: ObjectLocation.property('unit_price'), inputValue: 0, systemValue: 1},
    {ruleId: 'max', location: ObjectLocation.property('unit_price'), inputValue: 3, systemValue: 2},
    {ruleId: 'min_length', location: ObjectLocation.property('product_name'), inputValue: 'a', systemValue: 2},
    {ruleId: 'max_length', location: ObjectLocation.property('product_name'), inputValue: 'abc', systemValue: 2},
  ];
  const prefix = ObjectLocation.property('order_item_list').index(2);
  for (const locale of locales) for (const rule of rules) {
    const context = new UserContext().setLocaleCode(locale);
    const source = {...rule, entityType: 'ReviewedItem', sourceInstancePath: '/old~1items/2/product~0name'};
    const original = context.translateCheckResults([source])[0];
    const relocated = context.translateCheckResults([{...original, location: original.location.prefixedBy(prefix)}])[0];
    const expected = I18nCatalog.builtin.translate({...source, location: source.location.prefixedBy(prefix)}, locale);
    expect(relocated.message).toBe(expected.message);
    expect(relocated.message).toContain(relocated.location.nativePath());
    expect(relocated.entityType).toBe(source.entityType);
    expect(relocated.sourceInstancePath).toBe(source.sourceInstancePath);
    expect(relocated.systemValue).toBe(source.systemValue);
    expect(original.location.modelPath()).toBe(rule.location.modelPath());
    expect(original.message).not.toContain('orderItemList');
  }
});

test('relocation uses the customer catalog and preserves unknown custom diagnostics', () => {
  const context = new UserContext().setLocaleCode('zh-CN').installI18nCatalog(new I18nCatalog({
    schema: 'teaql.i18n/v1', defaultLocale: 'en', locales: {
      en: {messages: {'checker.domain_rule': 'Policy at {location}: {system}'}, vocabulary: {}},
      'zh-CN': {messages: {'checker.domain_rule': '业务规则 {location}: {system}'}, vocabulary: {}},
    },
  }, I18nCatalog.builtin));
  const prefix = ObjectLocation.property('order_item_list').index(2);
  const child = context.translateCheckResults([{ruleId: 'domain_rule', entityType: 'ReviewedItem',
    location: ObjectLocation.property('unit_price'), systemValue: 'approved ceiling'}])[0];
  const relocated = context.translateCheckResults([{...child, location: child.location.prefixedBy(prefix)}])[0];
  expect(relocated.message).toBe('业务规则 orderItemList[2].unitPrice: approved ceiling');
  const opaque: CheckResult = {ruleId: 'opaque_policy', entityType: 'ReviewedItem',
    location: ObjectLocation.property('product_name'), message: 'Customer policy rejected this value'};
  const result = context.translateCheckResults([{...opaque, location: opaque.location.prefixedBy(prefix)}])[0];
  expect(result.message).toBe(opaque.message);
  expect(result.location.modelPath()).toBe('order_item_list[2].product_name');
});
