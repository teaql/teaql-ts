import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';

type ClockContext = {withBusinessClock(clock: {now(): Date}): unknown; businessTime(): Date};
type Cache = {put(key: string, value: unknown, ttl?: number): void; get(key: string): unknown};

/** Inject real runtime instances; no alternate cache or private-state adapter. */
export async function verifyOperationalClock(context: ClockContext, cache: Cache) {
  let calls = 0, unreadable = false;
  let business = new Date('2099-12-31T23:59:59Z');
  context.withBusinessClock({now: () => {
    calls++;
    if (unreadable) throw new Error('BUSINESS_CLOCK_UNAVAILABLE_FOR_OPERATIONAL_WORK');
    return new Date(business);
  }});
  assert.equal(context.businessTime().toISOString(), business.toISOString());
  unreadable = true;
  assert.throws(() => context.businessTime(), /BUSINESS_CLOCK_UNAVAILABLE/);
  const calibrationCalls = calls;
  cache.put('permanent-zero', 0, 0); cache.put('permanent-false', false);
  cache.put('permanent-empty', ''); cache.put('permanent-null', null);
  cache.put('real-expiry', 'live', 0.2);
  assert.equal(cache.get('real-expiry'), 'live');
  business = new Date('2199-01-01T00:00:00Z');
  assert.equal(cache.get('real-expiry'), 'live', 'business-calendar changes cannot expire a live entry');
  const deadline = performance.now() + 2_000;
  while (cache.get('real-expiry') !== undefined && performance.now() < deadline) await delay(10);
  assert.equal(cache.get('real-expiry'), undefined, 'operational TTL must expire with an unreadable Business Clock');
  business = new Date('1900-01-01T00:00:00Z');
  assert.equal(cache.get('real-expiry'), undefined, 'business time cannot revive a discarded entry');
  assert.equal(cache.get('permanent-zero'), 0); assert.equal(cache.get('permanent-false'), false);
  assert.equal(cache.get('permanent-empty'), ''); assert.equal(cache.get('permanent-null'), null);
  assert.equal(calls, calibrationCalls, 'operational cache must not consume Business Clock');
  return {passed: true, calibrationCalls, additionalBusinessReads: calls - calibrationCalls,
    facts: {realExpiry: true, unavailableBusinessCalibrated: true, forwardCannotExpire: true, backwardCannotRevive: true,
      zeroTtlRemains: true, zeroFalseEmptyNullRemainValues: true}};
}
