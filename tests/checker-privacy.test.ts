import {
  CheckException, CheckResult, checkResultToWire, I18nCatalog, ObjectLocation,
  RuntimeModule, UserContext,
} from '../src';
import { AbstractSQLTeaQLClient, TeaQLSqlDriver } from '../src/sql/core';
import { maskAuditValue, PLAINTEXT_LOG_ACK, PLAINTEXT_LOG_ENV } from '../src/core/log-privacy';

const SECRET = 'private-contact-314159';
class Driver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  statements: string[] = [];
  transactions = 0;
  query = async (sql: string) => { this.statements.push(sql); return { rows: [], rowCount: 0 }; };
  stream = async function* () {};
  identifier = (value: string) => `"${value}"`;
  placeholder = () => '?';
  encode = (value: unknown) => value;
  contains = () => '';
  aggregateFunction = (name: string) => name;
  ensureSchema = async () => {};
  transaction = async <T>(work: (session: any) => Promise<T>) => { this.transactions++; return work(this); };
  nextId = async () => '1';
  ensureIdFloor = async () => {};
  close = async () => {};
}
class Client extends AbstractSQLTeaQLClient { constructor(driver: Driver) { super(driver, {}); } }
function violation(field: string, inputValue: unknown = SECRET): CheckResult {
  return { ruleId: 'invalid_type', location: ObjectLocation.property(field), inputValue };
}
async function rejected(results: readonly CheckResult[], context = new UserContext(), masks: readonly string[] = ['contact_phone']) {
  const driver = new Driver();
  const client = new Client(driver).setUserContext(context).install(new RuntimeModule({
    OrderItem: { table: 'order_item', auditMaskFields: masks, columns: {
      contactPhone: { columnName: 'contact_phone', modelName: 'contact_phone', logicalType: 'text', decode: 'native' },
    } },
  }, { OrderItem: { checkAndFix: (_ctx, _mutation, output) => { output.push(...results); } } }));
  const payload = { contact_phone: SECRET };
  let failure: CheckException | undefined;
  try { await client.executeMutation({ entity: 'OrderItem', action: 'Create', payload, comment: 'Verify safe Checker diagnostics' }); }
  catch (error) { if (!(error instanceof CheckException)) throw error; failure = error; }
  expect(failure).toBeInstanceOf(CheckException);
  expect(driver.transactions).toBe(0); expect(driver.statements).toEqual([]);
  expect(payload.contact_phone).toBe(SECRET);
  expect(context.getResource('fixTime')).toBeUndefined();
  return failure!;
}

test('model mask protects wire, exception and serialized diagnostic output before any SQL', async () => {
  const source = Object.freeze(violation('contact_phone'));
  const error = await rejected([source]);
  expect(error.violations[0].inputValue).toBe(maskAuditValue(SECRET));
  expect(source.inputValue).toBe(SECRET);
  for (const text of [String(error), JSON.stringify(error), JSON.stringify(checkResultToWire(error.violations[0]))]) expect(text).not.toContain(SECRET);
  expect(error.violations[0].entityType).toBe('OrderItem');
});
test('credentials and credential constraints are always redacted without model metadata', () => {
  const result = new UserContext().translateCheckResults([{ ...violation('password'), systemValue: 'private-expected-credential' }])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(result.systemValue).toBe('[REDACTED]');
});
test('credential length keeps its original Unicode-scalar length and numeric bound', () => {
  for (const [locale, phrase] of [['en', 'is 6'], ['zh-CN', '实际长度为 6']]) {
    const result = new UserContext().setLocaleCode(locale).translateCheckResults([
      { ruleId: 'min_length', location: ObjectLocation.property('password'), inputValue: '密钥🔑abc', systemValue: 12 },
    ])[0];
    expect(result.inputValue).toBe('[REDACTED]'); expect(result.systemValue).toBe(12); expect(result.message).toContain(phrase);
  }
});
test('nested model masks preserve canonical locations, source aliases and all wire profiles', async () => {
  const location = ObjectLocation.property('order_item_list').index(2).property('contact_phone');
  const source = { ...violation('contact_phone'), location, sourceInstancePath: '/old~1items/2/phone~0' };
  const result = (await rejected([source])).violations[0]; expect(result.inputValue).toBe(maskAuditValue(SECRET));
  expect(result.location).toBe(location); expect(result.sourceInstancePath).toBe(source.sourceInstancePath);
  for (const [profile, path] of [['camelCase', '/orderItemList/2/contactPhone'], ['snake_case', '/order_item_list/2/contact_phone'], ['PascalCase', '/OrderItemList/2/ContactPhone']] as const)
    expect(checkResultToWire(result, profile).instancePath).toBe(path);
});
test('ordinary inputs, expected bounds and customer-owned explanations remain intact', () => {
  const result = new UserContext().translateCheckResults([
    { ruleId: 'min', location: ObjectLocation.property('quantity'), inputValue: 1, systemValue: 2 },
    { ...violation('name', 'ordinary'), ruleId: 'opaque_policy', message: 'Customer-owned explanation' },
  ]);
  expect(result[0].inputValue).toBe(1); expect(result[0].systemValue).toBe(2);
  expect(result[1].inputValue).toBe('ordinary'); expect(result[1].message).toBe('Customer-owned explanation');
});
test.each([['12345', '*****'], ['密钥🔑abc', '******'], ['short', '*****'], [null, null]])('model mask follows the existing audit algorithm for %p', async (input, expected) => {
  const result = (await rejected([violation('contact_phone', input)])).violations[0]; expect(result.inputValue).toBe(expected);
});
test('batch messages cannot echo earlier or later sensitive fields', async () => {
  for (const reverse of [false, true]) {
    const sources = [{ ...violation('name', 'ordinary'), ruleId: 'opaque_policy', message: `Please fix ${SECRET} first` }, violation('contact_phone')];
    const error = await rejected(reverse ? sources.reverse() : sources);
    for (const result of error.violations) expect(result.message).not.toContain(SECRET);
    expect(error.message).not.toContain(SECRET);
  }
});
test('frozen cached errors remain raw for the checker but returned snapshots stay safe across locale changes', async () => {
  const source = Object.freeze({ ...violation('contact_phone'), ruleId: 'min_length', systemValue: 25 });
  const context = new UserContext(), first = await rejected([source], context);
  context.setLocaleCode('zh-CN'); const second = await rejected([source], context);
  expect(source.inputValue).toBe(SECRET); expect(source.message).toBeUndefined();
  expect(first.violations[0].inputValue).toBe(maskAuditValue(SECRET)); expect(second.violations[0].inputValue).toBe(maskAuditValue(SECRET));
  expect(first.violations[0].message).not.toBe(second.violations[0].message);
});
test('native metadata aliases do not bypass model masks', async () => {
  const result = (await rejected([violation('contact_phone')], new UserContext(), ['contactPhone'])).violations[0];
  expect(result.inputValue).toBe(maskAuditValue(SECRET)); expect(result.location.modelPath()).toBe('contact_phone');
});
test('dynamic field diagnostics are safe without changing their identity', () => {
  const result = new UserContext().translateCheckResults([violation('#external_reference')])[0];
  expect(result.inputValue).toBe(maskAuditValue(SECRET)); expect(result.location.modelPath()).toContain('#external_reference');
});
test('nested structured credentials are redacted while input objects remain untouched', () => {
  const input = { nested: [{ access_token: SECRET }] };
  const result = new UserContext().translateCheckResults([violation('profile', input)])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(input.nested[0].access_token).toBe(SECRET);
});
test('customer localization hooks cannot restore credential output', () => {
  class CustomCatalog extends I18nCatalog {
    constructor() { super({ schema: 'teaql.i18n/v1', defaultLocale: 'en', locales: { en: { messages: {}, vocabulary: {} } } }, I18nCatalog.builtin); }
    override translate(result: CheckResult): CheckResult { return { ...result, message: `Custom locale ${SECRET}` }; }
  }
  const context = new UserContext().installI18nCatalog(new CustomCatalog());
  const result = context.translateCheckResults([violation('password')])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(result.message).toBe('Custom locale [REDACTED]');
});
test('retranslated safe errors preserve original length through spread, relocation and language changes', () => {
  const context = new UserContext(), original = context.translateCheckResults([
    { ruleId: 'min_length', location: ObjectLocation.property('password'), inputValue: '密钥🔑abc', systemValue: 12 },
  ])[0];
  const relocated = context.setLocaleCode('zh-CN').translateCheckResults([
    { ...original, location: original.location.prefixedBy(ObjectLocation.property('order_item_list').index(2)) },
  ])[0];
  expect(relocated.inputValue).toBe('[REDACTED]'); expect(relocated.message).toContain('实际长度为 6');
  expect(relocated.message).toContain('orderItemList[2].password'); expect(relocated.systemValue).toBe(12);
});
test('a short credential cannot corrupt generated expected bounds or validation lengths', () => {
  const result = new UserContext().translateCheckResults([
    { ruleId: 'min_length', location: ObjectLocation.property('password'), inputValue: '1', systemValue: 12 },
  ])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(result.message).toContain('12'); expect(result.message).toContain('is 1');
});
test('clients sharing one context do not borrow each other\'s model privacy metadata', async () => {
  const context = new UserContext(), raw = Object.freeze(violation('contact_phone'));
  const masked = (await rejected([raw], context)).violations[0];
  const ordinary = (await rejected([raw], context, [])).violations[0];
  expect(masked.inputValue).toBe(maskAuditValue(SECRET)); expect(ordinary.inputValue).toBe(SECRET);
});
test('credential ancestors retain their full structured path', () => {
  const location = ObjectLocation.property('api_key').property('label');
  const result = new UserContext().translateCheckResults([{ ...violation('label'), location }])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(result.location).toBe(location);
});
test('escaped sensitive strings cannot escape through opaque JSON messages', () => {
  const input = 'private"contact\\314159';
  const result = new UserContext().translateCheckResults([{ ...violation('password', input), ruleId: 'opaque_policy', message: JSON.stringify({ password: input }) }])[0];
  expect(result.message).not.toContain(JSON.stringify(input).slice(1, -1)); expect(result.inputValue).toBe('[REDACTED]');
});
test.each([undefined, 'true', PLAINTEXT_LOG_ACK])('debug opt-in %p never exposes credentials', async value => {
  const original = process.env[PLAINTEXT_LOG_ENV];
  try {
    if (value === undefined) delete process.env[PLAINTEXT_LOG_ENV]; else process.env[PLAINTEXT_LOG_ENV] = value;
    const results = (await rejected([violation('contact_phone'), violation('password')])).violations;
    expect(results[0].inputValue).toBe(value === PLAINTEXT_LOG_ACK ? SECRET : maskAuditValue(SECRET));
    expect(results[1].inputValue).toBe('[REDACTED]');
  } finally { if (original === undefined) delete process.env[PLAINTEXT_LOG_ENV]; else process.env[PLAINTEXT_LOG_ENV] = original; }
});

test('root message-only failures scrub checked values without inventing an input or field path', async () => {
  const source: CheckResult = { ruleId: 'opaque_policy', location: ObjectLocation.root(), message: `Cannot accept ${SECRET}` };
  const result = (await rejected([source])).violations[0];
  expect(result.message).toBe('Cannot accept [REDACTED]');
  expect(result.location).toBe(source.location);
  expect(Object.prototype.hasOwnProperty.call(result, 'inputValue')).toBe(false);
  expect(source.message).toBe(`Cannot accept ${SECRET}`);
});
test('a cached public explanation is rechecked against the next sensitive batch', () => {
  const context = new UserContext();
  const cached = context.translateCheckResults([{ ...violation('name', 'ordinary'), ruleId: 'opaque_policy', message: `Please fix ${SECRET}` }])[0];
  const current = context.translateCheckResults([cached, violation('password')]);
  expect(cached.message).toBe(`Please fix ${SECRET}`);
  expect(current[0].message).toBe('Please fix [REDACTED]');
});
test('built-in rule vocabulary is public even if a credential has the same spelling', () => {
  const result = new UserContext().translateCheckResults([
    { ruleId: 'required', location: ObjectLocation.property('password'), inputValue: 'required', systemValue: 'required' },
  ])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(result.systemValue).toBe('[REDACTED]');
  expect(result.message).toBe('The password is required');
});
test('custom template literals are scrubbed without rewriting numeric substitutions', () => {
  const context = new UserContext().installI18nCatalog(new I18nCatalog({ schema: 'teaql.i18n/v1', defaultLocale: 'en',
    locales: { en: { messages: { 'checker.minLength': `Private ${SECRET}: {location} expects {system}; got {input_len}` }, vocabulary: {} } },
  }, I18nCatalog.builtin));
  const result = context.translateCheckResults([{ ...violation('password'), ruleId: 'min_length', systemValue: 12 }])[0];
  expect(result.message).toBe(`Private [REDACTED]: password expects 12; got ${SECRET.length}`);
});
test('a customer Context override cannot restore model-masked input or messages', async () => {
  class CustomContext extends UserContext {
    override translateCheckResults(results: CheckResult[]): CheckResult[] {
      return results.map(result => ({ ...result, inputValue: SECRET, message: `Custom ${SECRET}` }));
    }
  }
  const result = (await rejected([violation('contact_phone')], new CustomContext())).violations[0];
  expect(result.inputValue).toBe(maskAuditValue(SECRET)); expect(result.message).toBe('Custom [REDACTED]');
});
test('masked collections and cyclic credential inputs are safe and do not mutate caller values', async () => {
  const input: unknown[] = [SECRET, ['short', '1234']];
  const first = (await rejected([violation('contact_phone', input)])).violations[0];
  const second = (await rejected([first])).violations[0];
  expect(first.inputValue).toEqual([maskAuditValue(SECRET), ['*****', '****']]);
  expect(second.inputValue).toEqual(first.inputValue); expect(input).toEqual([SECRET, ['short', '1234']]);
  const cyclic: { self?: unknown; access_token: string } = { access_token: SECRET }; cyclic.self = cyclic;
  const result = new UserContext().translateCheckResults([violation('profile', cyclic)])[0];
  expect(result.inputValue).toBe('[REDACTED]'); expect(cyclic.access_token).toBe(SECRET); expect(cyclic.self).toBe(cyclic);
});
