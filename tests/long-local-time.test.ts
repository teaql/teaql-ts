import { compareLongs, localTime, long, longOrderKey } from '../src';

describe('portable Long and LocalTime boundaries', () => {
  test('Long is exact through JSON and rejects JS numbers and overflow', () => {
    const max = long('9223372036854775807');
    expect(max).toBe('9223372036854775807');
    expect(JSON.parse(JSON.stringify({ value: max }))).toEqual({ value: max });
    expect(long(-9223372036854775808n)).toBe('-9223372036854775808');
    expect(() => long(9007199254740993 as any)).toThrow(TypeError);
    expect(() => long('9223372036854775808')).toThrow(RangeError);
    expect(() => long('-9223372036854775809')).toThrow(RangeError);
    expect(() => long('01')).toThrow(TypeError);
    expect(compareLongs('9007199254740993', '9007199254740992')).toBe(1);
    expect(['10', '-2', '2', '-10'].sort((a, b) => longOrderKey(a) < longOrderKey(b) ? -1
      : longOrderKey(a) > longOrderKey(b) ? 1 : 0))
      .toEqual(['-10', '-2', '2', '10']);
  });

  test('LocalTime preserves portable microsecond precision without date or zone', () => {
    expect(localTime('00:00:00')).toBe('00:00:00');
    expect(localTime('23:59:59.123456')).toBe('23:59:59.123456');
    expect(localTime('12:00:00.1')).toBe('12:00:00.100000');
    expect(localTime('12:00:00.100000')).toBe(localTime('12:00:00.1'));
    expect(localTime('12:00:00.000')).toBe('12:00:00');
    for (const invalid of ['24:00:00', '12:60:00', '12:00:60', '1:02:03',
      '12:00', '12:00:00.1234567', '2026-10-18T12:00:00', '12:00:00Z']) {
      expect(() => localTime(invalid)).toThrow(TypeError);
    }
  });
});
