import { SmartList, SmartListRecord } from '../src/core/smart-list';
import { Values } from '../src/core/value';
import vectors from './fixtures/smart-list-semantics.json';

const sourceList = () => new SmartList(vectors.transform.rows, {
  totalCount: vectors.transform.total, aggregations: vectors.metadata.aggregations,
  summary: vectors.metadata.summary,
  facets: Object.fromEntries(Object.entries(vectors.metadata.facets).map(([name, rows]) =>
    [name, new SmartList<SmartListRecord>(rows)])),
});

describe('shared SmartList semantics', () => {
  test.each(vectors.states)('$name', state => {
    const list = state.loaded ? new SmartList(state.rows, { totalCount: state.total ?? undefined }) : SmartList.empty<number>();
    expect(Array.from(list)).toEqual(state.rows);
    expect(list.isLoaded).toBe(state.loaded); expect(list.totalCount).toBe(state.total ?? undefined);
    expect(list.totalCountOrLength()).toBe(state.total ?? state.rows.length);
    expect(list.totalCount).toBe(state.total ?? undefined);
  });

  test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects inexact count %s', count => {
    expect(() => new SmartList([], { totalCount: count })).toThrow(RangeError);
    expect(() => new SmartList().withTotalCount(count)).toThrow(RangeError);
  });

  test('single numeric row and long numeric arrays are actual data', () => {
    expect(Array.from(new SmartList([7]))).toEqual([7]);
    expect(new SmartList(Array.from({ length: 150000 }, (_, index) => index)).last()).toBe(149999);
  });

  test('map preserves types and recursively isolates nested metadata and facet records', () => {
    const source = sourceList();
    source.aggregations.decimal = Values.Decimal(vectors.metadata.decimal.value);
    const mapped = source.mapSmart(value => value * 10);
    expect(Array.from(mapped)).toEqual(vectors.transform.mapTimesTen);
    expect(mapped.totalCount).toBe(source.totalCount); expect(mapped.isLoaded).toBe(true);
    expect(mapped.aggregations).toEqual(source.aggregations);
    expect(mapped.summary).toEqual(source.summary); expect(mapped.facets).toEqual(source.facets);
    expect(mapped.aggregations.nullable).toBeNull(); expect('missing' in mapped.aggregations).toBe(false);
    (mapped.aggregations.nested as { values: number[] }).values.push(99);
    (mapped.summary.nested as { values: number[] }).values.push(99);
    mapped.facets.status[0].count = 99;
    mapped.removeFacet('empty');
    expect(source.aggregations.nested).toEqual({ values: [1, 2] });
    expect(source.summary.nested).toEqual({ values: [3] }); expect(source.facets.status[0].count).toBe(3);
    expect(source.facet('empty')).toBeInstanceOf(SmartList);
    expect(mapped.aggregations.decimal).toEqual(Values.Decimal(vectors.metadata.decimal.value));
  });

  test('constructor metadata ownership and native array positions are independent', () => {
    const metadata = { nested: [1] }, facet = new SmartList([{ values: [2] }]);
    const source = new SmartList([1, 2], { aggregations: metadata, facets: { a: facet } });
    metadata.nested.push(3); facet[0].values.push(4);
    const native = Array.from(source); native[0] = 99;
    expect(source.aggregations).toEqual({ nested: [1] });
    expect(source.facets.a[0]).toEqual({ values: [2] }); expect(source.first()).toBe(1);
    expect(source.map(value => value)).not.toBeInstanceOf(SmartList);
  });

  test('derived filtering and expansion clear statistics even when all rows survive', () => {
    const source = sourceList();
    const filtered = source.filterSmart(value => value % 2 === 1);
    const expanded = source.flatMapSmart(value => [value, value]);
    expect(Array.from(filtered)).toEqual(vectors.transform.filterOdd);
    expect(Array.from(expanded)).toEqual(vectors.transform.flatMapTwice);
    for (const result of [filtered, expanded, source.filterSmart(() => true)]) {
      expect(result.totalCount).toBeUndefined(); expect(result.isLoaded).toBe(true);
      expect(result.aggregations).toEqual({}); expect(result.summary).toEqual({}); expect(result.facets).toEqual({});
    }
    expect(SmartList.empty().mapSmart(value => value).isLoaded).toBe(false);
    expect(SmartList.empty().filterSmart(() => true).isLoaded).toBe(false);
    expect(SmartList.empty().flatMapSmart(value => [value]).isLoaded).toBe(false);
  });

  test('duplicate merge order, safe access, indexing and grouping match the vectors', () => {
    const source = new SmartList(vectors.merge.target, { totalCount: 9 });
    source.mergeBy(vectors.merge.incoming, row => row.key);
    expect(Array.from(source)).toEqual(vectors.merge.expected); expect(source.totalCount).toBe(9);
    expect(source.identityMap(row => row.key).get('a')).toEqual({ key: 'a', value: 4 });
    expect(source.groupBy(row => row.key).get('a')).toEqual(vectors.merge.expected.slice(0, 2));
    for (const index of [-1, source.length, 100]) {
      expect(source.get(index)).toBeUndefined(); expect(source.set(index, { key: 'x', value: 0 })).toBe(false);
    }
    expect(SmartList.empty().first()).toBeUndefined(); expect(SmartList.empty().last()).toBeUndefined();
  });

  test('ID types, missing IDs, versions and facet transfer retain their meaning', () => {
    const source = new SmartList(vectors.identity.rows);
    expect(source.ids()).toEqual(vectors.identity.ids); expect(source.versions()).toEqual(vectors.identity.versions);
    const indexed = source.mapById(); expect(indexed.has(null)).toBe(false); expect(indexed.size).toBe(4);
    expect([0, 1, '1', ''].map(key => indexed.get(key))).toEqual(vectors.identity.indexedPositions.map(index => source[index]));
    const list = sourceList(); expect(list.facet('absent')).toBeUndefined(); expect(list.facet('empty')?.length).toBe(0);
    expect(list.removeFacet('absent')).toBeUndefined(); expect(list.takeFacets().status).toBeInstanceOf(SmartList);
    expect(list.facets).toEqual({});
  });
});
