import { FixedBusinessClock, UserContext } from '../src';

test('business time and UTC date use the configured provider without sharing mutable Dates', () => {
  const value = new Date('2032-02-29T10:15:30.000Z');
  const expected = value.getTime();
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(value));
  value.setUTCFullYear(2040);
  expect(context.businessTime().getTime()).toBe(expected);
  expect(context.businessDate()).toBe('2032-02-29');
  context.businessTime().setUTCFullYear(2050);
  expect(context.businessTime().getTime()).toBe(expected);
});

test('clock selection is context-local and invalid clocks are rejected', () => {
  expect(() => new FixedBusinessClock(new Date(NaN))).toThrow(TypeError);
  expect(() => new UserContext().withBusinessClock(undefined as any)).toThrow(TypeError);
  const first = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-01-01T00:00:00Z')));
  const second = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2040-01-01T00:00:00Z')));
  expect(first.businessDate()).toBe('2032-01-01');
  expect(second.businessDate()).toBe('2040-01-01');
});
