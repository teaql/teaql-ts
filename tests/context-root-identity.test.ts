import { ContextRootError, UserContext } from '../src/core/context';

const invalid: Array<[string, unknown]> = [
  ['number-zero', 0], ['negative-zero', -0], ['bigint-zero', 0n], ['string-zero', '0'],
  ['negative-number', -1], ['negative-bigint', -1n], ['negative-string', '-1'],
  ['fraction', 1.5], ['unsafe-number', Number.MAX_SAFE_INTEGER + 1],
  ['nan', NaN], ['positive-infinity', Infinity], ['negative-infinity', -Infinity],
  ['empty-string', ''], ['blank-string', ' '], ['fraction-string', '1.5'],
  ['exponent-string', '1e3'], ['hex-string', '0x1'], ['plus-string', '+1'],
  ['leading-zero', '01'], ['nan-string', 'NaN'], ['private-string', 'PRIVATE_TS_ROOT_ID'],
  ['boolean', true], ['null-id', null], ['undefined-id', undefined],
  ['object-id', {id: 1}], ['array-id', [1]], ['boxed-number', new Number(1)],
];
const valid: Array<[string, string | number | bigint]> = [
  ['number', 42], ['safe-number-maximum', Number.MAX_SAFE_INTEGER], ['bigint', 42n],
  ['unsigned-bigint-maximum', (1n << 64n) - 1n], ['string', '42'],
  ['signed-string-maximum', '9223372036854775807'], ['unsigned-string-maximum', '18446744073709551615'],
];

describe('typed active-root identity admission', () => {
  test.each(invalid)('rejects %s before the root is consumed', (name, id) => {
    // Resource injection is public too; validation must be at the common read
    // boundary, not only the fluent setter. Never coerce a string to a number.
    const context = new UserContext().insertResource('activeRoot', {entity: 'Tenant', id});
    let failure: unknown;
    try { context.requireActiveRoot('Tenant'); } catch (error) { failure = error; }
    process.stdout.write('CORE_TS_ROOT_NATIVE_CASE=' + JSON.stringify({case: name,
      rejected: failure instanceof ContextRootError, reason: (failure as ContextRootError | undefined)?.reason}) + '\n');
    expect(failure).toBeInstanceOf(ContextRootError);
    expect((failure as ContextRootError).reason).toBe('invalid_id');
    expect((failure as ContextRootError).message).toBe('context root invalid_id: expected Tenant');
    expect((failure as ContextRootError).message).not.toContain('PRIVATE_TS_ROOT_ID');
  });

  test.each(valid)('preserves the exact %s representation', (_name, id) => {
    const context = new UserContext().withActiveRoot({entity: 'Tenant', id});
    const root = context.requireActiveRoot('Tenant');
    expect(root.id).toBe(id); expect(Object.isFrozen(root)).toBe(true);
  });

  test('the fluent setter cannot turn zero into a usable root', () => {
    const context = new UserContext().withActiveRoot({entity: 'Tenant', id: 0});
    expect(() => context.requireActiveRoot('Tenant')).toThrow(ContextRootError);
  });

  test('missing root and wrong type keep their existing classifications', () => {
    expect(() => new UserContext().requireActiveRoot('Tenant')).toThrow('context root missing: expected Tenant');
    const context = new UserContext().insertResource('activeRoot', {entity: 'UnrelatedRoot', id: 0});
    expect(() => context.requireActiveRoot('Tenant')).toThrow('context root type_mismatch: expected Tenant');
  });
});
