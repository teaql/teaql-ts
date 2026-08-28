import { executeRelationFacets, SelectQuery } from '../src';

describe('relation facets', () => {
  const rowsByEntity: Record<string, Record<string, unknown>[]> = {
    School: [
      { id: 1, name: 'Riverside', schoolType: 1001 },
      { id: 2, name: 'Riverside Annex', schoolType: 1001 },
      { id: 3, name: 'Other', schoolType: 1002 },
    ],
    SchoolType: [
      { id: 1001, code: 'PRIMARY' },
      { id: 1002, code: 'SECONDARY' },
      { id: 1003, code: 'VOCATIONAL' },
    ],
  };

  function service() {
    return {
      async executeQuery(query: SelectQuery): Promise<Record<string, unknown>[]> {
        let rows = [...rowsByEntity[query.entity]];
        const filters = query.filterCondition?.$and ?? [];
        for (const filter of filters) {
          if (filter.name?.$contains) {
            rows = rows.filter(row => String(row.name).includes(filter.name.$contains));
          }
        }
        return rows;
      },
    };
  }

  it('merges the outer filter into counts and preserves all facet values by default', async () => {
    const outer = new SelectQuery('School').filter({ $and: [{ name: { $contains: 'Riverside' } }] });
    const nested = new SelectQuery('SchoolType').aggregate('Count', 'id', 'schoolCount');
    const request = { toQuery: () => nested };
    outer.facetBy('types', 'schoolType', request);

    const facets = await executeRelationFacets(service(), query => query, outer, outer.facets);
    expect(facets.types.map(row => [row.code, row.schoolCount])).toEqual([
      ['PRIMARY', 2], ['SECONDARY', 0], ['VOCATIONAL', 0],
    ]);
  });

  it('can restrict facet values to the filtered outer result', async () => {
    const outer = new SelectQuery('School').filter({ $and: [{ name: { $contains: 'Riverside' } }] });
    const nested = new SelectQuery('SchoolType').aggregate('Count', 'id', 'schoolCount');
    outer.facetBy('types', 'schoolType', { toQuery: () => nested }, false);

    const facets = await executeRelationFacets(service(), query => query, outer, outer.facets);
    expect(facets.types.map(row => [row.code, row.schoolCount])).toEqual([['PRIMARY', 2]]);
  });
});
