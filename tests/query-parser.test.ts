import {QueryParser} from '../src/parser/dsl';

function queryApi() {
  const calls: Array<[string, ...unknown[]]> = [];
  const request = {
    selectName() { calls.push(['selectName']); return this; },
    withNameIn(...values: string[]) { calls.push(['withNameIn', ...values]); return this; },
    selectCatalogWith(value: unknown) { calls.push(['selectCatalogWith', value]); return this; },
    limit(value: number) { calls.push(['limit', value]); return this; },
  };
  const nested = {
    selectName() { calls.push(['nested.selectName']); return this; },
  };
  return {
    calls,
    entryPoint: {
      releasesWithMinimalFields: () => request,
      catalogsWithMinimalFields: () => nested,
    },
    request,
    nested,
  };
}

describe('QueryParser controlled grammar', () => {
  test('parses generated query chains, scalar arguments, and nested requests', () => {
    const api = queryApi();
    const result = QueryParser.parse(`
      Q.releasesWithMinimalFields()
        .selectName()
        .withNameIn("Blue", 'Green')
        .selectCatalogWith(Q.catalogsWithMinimalFields().selectName())
        .limit(10)
    `, api.entryPoint);

    expect(result).toBe(api.request);
    expect(api.calls).toEqual([
      ['selectName'],
      ['withNameIn', 'Blue', 'Green'],
      ['nested.selectName'],
      ['selectCatalogWith', api.nested],
      ['limit', 10],
    ]);
  });

  test.each([
    'Q.releasesWithMinimalFields(); globalThis.alert(1)',
    'Q["releasesWithMinimalFields"]()',
    'Q.releasesWithMinimalFields().constructor("return globalThis")',
    'Q.releasesWithMinimalFields().unknownMethod()',
    'Other.releasesWithMinimalFields()',
  ])('rejects source outside the controlled query grammar: %s', source => {
    expect(() => QueryParser.parse(source, queryApi().entryPoint)).toThrow();
  });
});
