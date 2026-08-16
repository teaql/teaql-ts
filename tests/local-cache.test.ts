import { LocalCache } from '../src/core/local-cache';

describe('LocalCache', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shares values, removes entries, and expires TTL entries', () => {
    const cache = new LocalCache();
    cache.put('persistent', { id: 7 });
    expect(cache.get<{ id: number }>('persistent')).toEqual({ id: 7 });
    cache.remove('persistent');
    expect(cache.get('persistent')).toBeUndefined();

    cache.put('temporary', 'value', 1);
    jest.advanceTimersByTime(1_000);
    expect(cache.get('temporary')).toBeUndefined();
  });
});
