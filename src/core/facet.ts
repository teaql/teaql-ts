import { FacetRequest, SelectQuery } from './ast';
import { SmartList, SmartListRecord } from './smart-list';
import { QueryRequest } from './request-intent';
import { retainQueryDiagnosticOrigin } from './query-snapshot';

export interface FacetQueryService {
  executeQuery(query: SelectQuery): Promise<SmartListRecord[]>;
  executeFacetMembership?(
    outerQuery: SelectQuery, relationName: string, countAliases?: readonly string[],
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
    const operation = request.deriveOperation(outerQuery, facet.operation ?? {
      kind: 'facet', relation: facet.relationName, alias: facet.facetName,
    });
    const countAliases = facet.query.aggregateItems
      .filter(item => String(item.function).toLowerCase() === 'count')
      .map(item => String(item.alias));
    let counts: Map<string, number>;
    if (service.executeFacetMembership) {
      counts = await service.executeFacetMembership(
        operation.deriveHelper(prepareQuery(outerQuery.clone()), 'aggregate ' + facet.relationName).query,
        facet.relationName, countAliases);
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
      const memberships = await service.executeQuery(operation.deriveHelper(
        prepareQuery(membershipQuery), 'aggregate ' + facet.relationName).query);
      counts = new Map<string, number>();
      for (const row of memberships) {
        const id = relationId(row, facet.relationName);
        if (id === undefined || id === null) continue;
        const key = String(id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const nestedRequest = operation.deriveChild(facet.query.clone(), facet.relationName);
    const nestedQuery = nestedRequest.query;
    const nestedFacets = nestedQuery.facets;
    nestedQuery.facets = [];
    nestedQuery.aggregateItems = [];
    nestedQuery.groupByItems = [];
    for (const aggregate of nestedQuery.relationAggregates) {
      if (aggregate.query.entity !== outerQuery.entity) continue;
      // Reverse facet sums share the complete source membership, not the
      // returned page or all source rows pointing at the same facet value.
      const membership = outerQuery.clone();
      membership.selectItems = ['id'];
      membership.properties = [];
      membership.relations = [];
      membership.relationAggregates = [];
      membership.facets = [];
      membership.aggregateItems = [];
      membership.groupByItems = [];
      membership.orderItems = [];
      membership.offsetValue = 0;
      membership.limitValue = 0;
      const filter = { id: { $inSubquery: { query: membership, field: 'id' } } };
      aggregate.query.filterCondition = aggregate.query.filterCondition
        ? { $and: [aggregate.query.filterCondition, filter] } : filter;
      retainQueryDiagnosticOrigin(outerQuery, aggregate.query);
    }
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
