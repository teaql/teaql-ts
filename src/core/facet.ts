import { FacetRequest, SelectQuery } from './ast';
import { SmartList, SmartListRecord } from './smart-list';

export interface FacetQueryService {
  executeQuery(query: SelectQuery): Promise<SmartListRecord[]>;
  executeFacetMembership?(
    outerQuery: SelectQuery, relationName: string,
  ): Promise<Map<string, number>>;
}

function snakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function scalarId(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return record.id ?? record.Id;
  }
  return value;
}

function relationId(row: SmartListRecord, relationName: string): unknown {
  const snake = snakeCase(relationName);
  for (const key of [relationName, `${relationName}Id`, snake, `${snake}_id`]) {
    const value = scalarId(row[key]);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/**
 * Execute relation facets without crossing entity boundaries with the outer
 * filter. The outer query determines relation membership; the nested query
 * determines which facet entities and fields are returned.
 */
export async function executeRelationFacets(
  service: FacetQueryService,
  prepareQuery: (query: SelectQuery) => SelectQuery,
  outerQuery: SelectQuery,
  facets: readonly FacetRequest[],
): Promise<Record<string, SmartList<SmartListRecord>>> {
  const result: Record<string, SmartList<SmartListRecord>> = {};
  for (const facet of facets) {
    let counts: Map<string, number>;
    if (service.executeFacetMembership) {
      counts = await service.executeFacetMembership(
        prepareQuery(outerQuery.clone()), facet.relationName);
    } else {
      const membershipQuery = outerQuery.clone();
      membershipQuery.facets = [];
      membershipQuery.relations = [];
      membershipQuery.orderItems = [];
      membershipQuery.aggregateItems = [];
      membershipQuery.groupByItems = [];
      membershipQuery.offsetValue = 0;
      membershipQuery.limitValue = 0;
      membershipQuery.selectItems = [facet.relationName];
      const memberships = await service.executeQuery(prepareQuery(membershipQuery));
      counts = new Map<string, number>();
      for (const row of memberships) {
        const id = relationId(row, facet.relationName);
        if (id === undefined || id === null) continue;
        const key = String(id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const nestedQuery = facet.query.clone();
    nestedQuery.facets = [];
    const countAliases = nestedQuery.aggregateItems
      .filter(item => String(item.function).toLowerCase() === 'count')
      .map(item => String(item.alias));
    nestedQuery.aggregateItems = [];
    nestedQuery.groupByItems = [];
    const rows = await service.executeQuery(prepareQuery(nestedQuery));
    const decorated = rows
      .map(row => {
        const count = counts.get(String(scalarId(row.id ?? row.Id))) ?? 0;
        const copy = { ...row };
        for (const alias of countAliases) copy[alias] = count;
        return copy;
      })
      .filter(row => facet.includeAllFacets || counts.has(String(scalarId(row.id ?? row.Id))));
    result[facet.facetName] = new SmartList(decorated);
  }
  return result;
}
