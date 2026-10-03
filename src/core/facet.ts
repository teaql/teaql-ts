import { FacetRequest, SelectQuery } from './ast';
import { SmartList, SmartListRecord } from './smart-list';
import { QueryRequest } from './request-intent';
import { retainQueryDiagnosticOrigin } from './query-snapshot';

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
  const request = new QueryRequest(outerQuery);
  outerQuery = request.query;
  const result: Record<string, SmartList<SmartListRecord>> = {};
  for (const facet of facets) {
    let counts: Map<string, number>;
    if (service.executeFacetMembership) {
      counts = await service.executeFacetMembership(
        request.withQuery(prepareQuery(outerQuery.clone())).query, facet.relationName);
    } else {
      const membershipQuery = outerQuery.clone();
      retainQueryDiagnosticOrigin(outerQuery, membershipQuery);
      membershipQuery.facets = [];
      membershipQuery.relations = [];
      membershipQuery.relationAggregates = [];
      membershipQuery.orderItems = [];
      membershipQuery.aggregateItems = [];
      membershipQuery.groupByItems = [];
      membershipQuery.offsetValue = 0;
      membershipQuery.limitValue = 0;
      membershipQuery.selectItems = [facet.relationName];
      const memberships = await service.executeQuery(request.withQuery(prepareQuery(membershipQuery)).query);
      counts = new Map<string, number>();
      for (const row of memberships) {
        const id = relationId(row, facet.relationName);
        if (id === undefined || id === null) continue;
        const key = String(id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const nestedRequest = request.derive(facet.query.clone(), facet.relationName);
    const nestedQuery = nestedRequest.query;
    const nestedFacets = nestedQuery.facets;
    nestedQuery.facets = [];
    const countAliases = nestedQuery.aggregateItems
      .filter(item => String(item.function).toLowerCase() === 'count')
      .map(item => String(item.alias));
    nestedQuery.aggregateItems = [];
    nestedQuery.groupByItems = [];
    // Restrict before pagination and before evaluating child facets. Filtering
    // only the returned rows makes child counts include unrelated entities.
    if (!facet.includeAllFacets) {
      const membership = { id: { $in: [...counts.keys()] } };
      nestedQuery.filterCondition = nestedQuery.filterCondition
        ? { $and: [nestedQuery.filterCondition, membership] } : membership;
    }
    retainQueryDiagnosticOrigin(outerQuery, nestedQuery);
    const rows = await service.executeQuery(nestedRequest.withQuery(prepareQuery(nestedQuery)).query);
    const decorated = rows
      .map(row => {
        const count = counts.get(String(scalarId(row.id ?? row.Id))) ?? 0;
        const copy = { ...row };
        for (const alias of countAliases) copy[alias] = count;
        return copy;
      })
      .filter(row => facet.includeAllFacets || counts.has(String(scalarId(row.id ?? row.Id))));
    const list = new SmartList(decorated);
    if (nestedFacets.length) {
      list.facets = await executeRelationFacets(service, prepareQuery,
        nestedRequest.withQuery(nestedQuery).query, nestedFacets);
    }
    result[facet.facetName] = list;
  }
  return result;
}
