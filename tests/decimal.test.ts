import { addDecimals, compareDecimals, decimal, decimalOrderKey, Values } from '../src';

describe('exact Decimal input boundary', () => {
  test('preserves precision and scale through Value and JSON', () => {
    const precise = decimal('123456789012.3456789');
    expect(precise).toBe('123456789012.3456789');
    expect(JSON.parse(JSON.stringify(Values.Decimal(precise)))).toEqual({
      type: 'Decimal', value: '123456789012.3456789',
    });
    expect(decimal('3.50')).toBe('3.50');
  });

  test('rejects imprecise numeric input and malformed text', () => {
    expect(() => decimal(123456789012.3456789 as unknown as string)).toThrow(TypeError);
    for (const text of ['NaN', 'Infinity', '1e3', ' 3.50', '3.50 ', '', '1.']) {
      expect(() => decimal(text)).toThrow(TypeError);
    }
    expect(() => decimal('1'.repeat(1025))).toThrow(TypeError);
    expect(() => Values.Decimal(3.5 as any)).toThrow(TypeError);
  });

  test('orders and adds exact values without floating-point conversion', () => {
    const ordered = ['-10', '-2', '-0.11', '-0.1', '0', '0.1', '0.11', '2', '10'];
    expect([...ordered].sort((a, b) => decimalOrderKey(a) < decimalOrderKey(b) ? -1
      : decimalOrderKey(a) > decimalOrderKey(b) ? 1 : 0)).toEqual(ordered);
    expect(compareDecimals('3.50', '3.5')).toBe(0);
    expect(compareDecimals('-0.11', '-0.1')).toBe(-1);
    expect(addDecimals('123456789012.3456789', '0.0000001')).toBe('123456789012.3456790');
    expect(addDecimals('3.50', '-1.20')).toBe('2.30');
  });
});
