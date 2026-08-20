import { SmartList } from '../src';

describe('SmartList', () => {
  it('keeps array ergonomics and TeaQL query metadata', () => {
    const rows = new SmartList([{ id: 1 }, { id: 2 }]).withTotalCount(7);
    const facet = new SmartList<Record<string, unknown>>([{ status: 'OPEN' }]);
    rows.withFacet('status', facet);

    expect(rows).toBeInstanceOf(Array);
    expect(rows.map(row => row.id)).toEqual([1, 2]);
    expect(rows.data).toBe(rows);
    expect(rows.totalCountOrLength()).toBe(7);
    expect(rows.facet('status')).toBe(facet);
    expect(SmartList.empty().isLoaded).toBe(false);
  });
});
