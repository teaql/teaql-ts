import {LocalCache, SelectQuery, UserContext} from '../src';
import {ExportHealth, lifecycleDeadline} from '../src/telemetry/export-health';
import {verifyOperationalClock} from '../examples/conformance/src/operational-clock-verification';

const SYSTEM = Date.parse('2030-01-01T00:00:00Z');
function fixture(unreadable = false) {
  let calls = 0, value = new Date('2099-12-31T23:59:59Z');
  const context = new UserContext().withBusinessClock({now: () => {
    calls++; if (unreadable) throw new Error('BUSINESS_CLOCK_UNAVAILABLE'); return new Date(value);
  }});
  if (unreadable) expect(() => context.businessTime()).toThrow('BUSINESS_CLOCK_UNAVAILABLE');
  else expect(context.businessTime().toISOString()).toBe(value.toISOString());
  expect(calls).toBe(1);
  return {context, move: (date: string) => {value = new Date(date);}, reads: () => calls};
}
function emit(name: string, clock: ReturnType<typeof fixture>, facts: Record<string, boolean>, realTime = false) {
  expect(clock.reads()).toBe(1); expect(Object.values(facts).every(value => value === true)).toBe(true);
  process.stdout.write('TYPESCRIPT_OPERATIONAL_CLOCK_CASE=' + JSON.stringify({case: name, passed: true,
    calibrationCalls: 1, additionalBusinessReads: clock.reads() - 1, realTime, facts}) + '\n');
}
function prepared(context: UserContext) {
  return context.prepareQuery(new SelectQuery('ClockProbe').limit(1)
    .comment('Prepare bounded local clock-state verification').purpose('Separate operational expiry from Business Clock'));
}
afterEach(() => {jest.restoreAllMocks(); jest.useRealTimers();});

test('operational local cache uses wall-clock expiry and cannot revive deleted entries', () => {
  const clock = fixture(), cache = new LocalCache(); let now = SYSTEM;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  cache.put('entry', 'live', 1); expect(cache.get('entry')).toBe('live');
  clock.move('2199-01-01T00:00:00Z'); expect(cache.get('entry')).toBe('live');
  now += 999; expect(cache.get('entry')).toBe('live'); now++; expect(cache.get('entry')).toBeUndefined();
  clock.move('1900-01-01T00:00:00Z'); now = SYSTEM; expect(cache.get('entry')).toBeUndefined();
  emit('local-cache-wall-clock', clock, {liveBeforeExpiry: true, futureBusinessDoesNotExpire: true, inclusiveExpiry: true, discardedEntryCannotRevive: true});
});
test('operational cache preserves zero false empty null and no-expiry semantics', () => {
  const clock = fixture(true), cache = new LocalCache(); let now = SYSTEM;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  cache.put('zero', 0, 0); cache.put('false', false); cache.put('empty', ''); cache.put('null', null); cache.put('finite', 'live', 1);
  now += 1_000; expect(cache.get('finite')).toBeUndefined();
  expect([cache.get('zero'), cache.get('false'), cache.get('empty'), cache.get('null')]).toEqual([0, false, '', null]);
  cache.remove('false'); expect(cache.get('false')).toBeUndefined(); cache.clear(); expect(cache.get('zero')).toBeUndefined();
  emit('local-cache-values', clock, {unreadableBusinessCalibrated: true, finiteEntryExpires: true,
    noExpiryPreserved: true, zeroFalseEmptyNullRemainValues: true, removeAndClearPreserved: true});
});
test('operational real TTL expires with an unreadable Business Clock in the runtime example', async () => {
  const result = await verifyOperationalClock(new UserContext(), new LocalCache());
  expect(result.calibrationCalls).toBe(2); expect(result.additionalBusinessReads).toBe(0);
  expect(result.facts).toEqual({realExpiry: true, unavailableBusinessCalibrated: true, forwardCannotExpire: true,
    backwardCannotRevive: true, zeroTtlRemains: true, zeroFalseEmptyNullRemainValues: true});
  process.stdout.write('TYPESCRIPT_OPERATIONAL_CLOCK_CASE=' + JSON.stringify({case: 'local-cache-real-example', passed: true,
    calibrationCalls: 2, additionalBusinessReads: 0, realTime: true, facts: result.facts}) + '\n');
});
test('operational continuous-page state expires independently of the business calendar', () => {
  const clock = fixture(); let now = SYSTEM; jest.spyOn(Date, 'now').mockImplementation(() => now);
  const runtime = prepared(clock.context).localContinuousPageRuntime();
  const cursor = {cursorId: 'clock-cursor', boundary: '9007199254740993', expiresAt: SYSTEM + 1_000};
  runtime.put('clock-query', 1, cursor); expect(runtime.get('clock-query', 1)).toEqual(cursor); expect(runtime.get('clock-query', 2)).toBeUndefined();
  clock.move('2199-01-01T00:00:00Z'); expect(runtime.get('clock-query', 1)).toEqual(cursor);
  now += 1_000; expect(runtime.get('clock-query', 1)).toBeUndefined();
  clock.move('1900-01-01T00:00:00Z'); now = SYSTEM; expect(runtime.get('clock-query', 1)).toBeUndefined();
  emit('continuous-page-expiry', clock, {offsetIsolation: true, futureBusinessDoesNotExpire: true, inclusiveExpiry: true, discardedCursorCannotRevive: true});
});
test('operational ID Set state preserves wide IDs and expires without Business Clock reads', () => {
  const clock = fixture(); let now = SYSTEM; jest.spyOn(Date, 'now').mockImplementation(() => now);
  const runtime = prepared(clock.context).localIdSetPaginationRuntime();
  runtime.put('clock-query', {ids: new BigUint64Array([9007199254740993n]), expiresAt: SYSTEM + 1_000});
  expect(Array.from(runtime.get('clock-query').ids)).toEqual([9007199254740993n]);
  clock.move('2199-01-01T00:00:00Z'); expect(runtime.get('clock-query').ids.length).toBe(1);
  now += 999; expect(runtime.get('clock-query').ids.length).toBe(1); now++; expect(runtime.get('clock-query')).toBeUndefined();
  clock.move('1900-01-01T00:00:00Z'); now = SYSTEM; expect(runtime.get('clock-query')).toBeUndefined();
  emit('id-set-expiry', clock, {wideIdentityPreserved: true, futureBusinessDoesNotExpire: true, inclusiveExpiry: true, discardedIdSetCannotRevive: true});
});
test('operational empty ID Set is a live exact snapshot until its own expiry', () => {
  const clock = fixture(true); let now = SYSTEM; jest.spyOn(Date, 'now').mockImplementation(() => now);
  const runtime = prepared(clock.context).localIdSetPaginationRuntime();
  runtime.put('empty-query', {ids: new BigUint64Array(), expiresAt: SYSTEM + 1_000});
  expect(runtime.get('empty-query')).toBeDefined(); expect(runtime.get('empty-query').ids.length).toBe(0);
  now += 1_000; expect(runtime.get('empty-query')).toBeUndefined();
  emit('id-set-empty-presence', clock, {unreadableBusinessCalibrated: true, emptyIsHitNotMissing: true, finiteEntryExpires: true});
});
test('operational pagination and cache remain available when Business Clock throws', () => {
  const clock = fixture(true), query = prepared(clock.context), cache = new LocalCache(), expiry = Date.now() + 60_000;
  query.localContinuousPageRuntime().put('live', 0, {cursorId: 'live', boundary: '1', expiresAt: expiry});
  query.localIdSetPaginationRuntime().put('live', {ids: new BigUint64Array([1n]), expiresAt: expiry}); cache.put('live', 'value', 60);
  expect(query.localContinuousPageRuntime().get('live', 0).cursorId).toBe('live');
  expect(Array.from(query.localIdSetPaginationRuntime().get('live').ids)).toEqual([1n]); expect(cache.get('live')).toBe('value');
  emit('unreadable-business-paging', clock, {unreadableBusinessCalibrated: true, cursorAvailable: true, idSetAvailable: true, cacheAvailable: true}, true);
});
test('operational telemetry lifecycle deadline still fires with a frozen Business Clock', async () => {
  jest.useFakeTimers(); const clock = fixture();
  const result = lifecycleDeadline(new Promise<never>(() => {}), 30).then(() => 'unexpected', error => error.message);
  clock.move('1900-01-01T00:00:00Z'); await jest.advanceTimersByTimeAsync(30);
  expect(await result).toBe('TeaQL telemetry lifecycle timed out'); expect(jest.getTimerCount()).toBe(0);
  emit('telemetry-lifecycle-timeout', clock, {businessBackwardDoesNotStopDeadline: true, finiteDeadlineFired: true, noTimerRetained: true});
});
test('operational settled lifecycle promises clear their timers with an unreadable Business Clock', async () => {
  jest.useFakeTimers(); const clock = fixture(true);
  await expect(lifecycleDeadline(Promise.resolve('done'), 30)).resolves.toBe('done');
  await expect(lifecycleDeadline(Promise.reject(new Error('expected failure')), 30)).rejects.toThrow('expected failure');
  expect(jest.getTimerCount()).toBe(0);
  emit('telemetry-lifecycle-settled', clock, {unreadableBusinessCalibrated: true, successPreserved: true, failurePreserved: true, noTimerRetained: true});
});
test('operational export drain times out without consuming records or Business Clock', async () => {
  jest.useFakeTimers(); const clock = fixture(true), health = new ExportHealth('logs', 2, () => {});
  expect(health.admit()).toBe(true);
  const result = health.waitForIdle(30).then(() => 'unexpected', error => error.message);
  clock.move('2199-01-01T00:00:00Z'); await jest.advanceTimersByTimeAsync(30);
  expect(await result).toBe('TeaQL telemetry drain timed out'); expect(health.pendingRecords).toBe(1);
  health.complete(1, false); await health.waitForIdle(30); expect(health.pendingRecords).toBe(0); expect(jest.getTimerCount()).toBe(0);
  emit('telemetry-drain-timeout', clock, {unreadableBusinessCalibrated: true, finiteDeadlineFired: true,
    timeoutDoesNotDropAdmittedRecord: true, completionPreserved: true, noTimerRetained: true});
});
