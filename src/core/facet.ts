import { FacetRequest, SelectQuery } from './ast';
import { SmartList, SmartListRecord } from './smart-list';
import { QueryRequest } from './request-intent';
import { retainQueryDiagnosticOrigin } from './query-snapshot';

export interface FacetAggregate {
  function: string;
  field: string;
  alias: string;
}

export interface FacetQueryService {
  executeQuery(query: SelectQuery): Promise<SmartListRecord[]>;
  executeFacetAggregates?(
    outerQuery: SelectQuery,
    relationName: string,
    aggregates: readonly FacetAggregate[],
  ): Promise<Map<string, SmartListRecord>>;
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

function emptyAggregateValue(aggregate: FacetAggregate): unknown {
  const fn = aggregate.function.toLowerCase();
  return fn === 'count' || fn === 'sum' ? 0 : null;
}

function compareAggregateValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime();
  return String(left).localeCompare(String(right));
}

async function executeFacetAggregatesFallback(
  service: FacetQueryService,
  prepareQuery: (query: SelectQuery) => SelectQuery,
  request: QueryRequest,
  outerQuery: SelectQuery,
  relationName: string,
  aggregates: readonly FacetAggregate[],
): Promise<Map<string, SmartListRecord>> {
  const membershipQuery = outerQuery.clone();
  membershipQuery.facets = [];
  membershipQuery.relations = [];
  membershipQuery.relationAggregates = [];
  membershipQuery.orderItems = [];
  membershipQuery.aggregateItems = [];
  membershipQuery.groupByItems = [];
  membershipQuery.offsetValue = 0;
  membershipQuery.limitValue = 0;
  membershipQuery.selectItems = [...new Set([
    relationName,
    ...aggregates.map(aggregate => aggregate.field),
  ])];
  membershipQuery.comment(`aggregate ${relationName}`);
  retainQueryDiagnosticOrigin(outerQuery, membershipQuery);
  const memberships = await service.executeQuery(
    request.deriveHelper(prepareQuery(membershipQuery), `aggregate ${relationName}`).query,
  );
  const result = new Map<string, SmartListRecord>();
  const averageCounts = new Map<string, Record<string, number>>();

  for (const row of memberships) {
    const id = relationId(row, relationName);
    if (id === undefined || id === null) continue;
    const key = String(id);
    const values = result.get(key) ?? {};
    const counts = averageCounts.get(key) ?? {};
    for (const aggregate of aggregates) {
      const fn = aggregate.function.toLowerCase();
      const raw = row[aggregate.field];
      if (fn === 'count') {
        if (raw !== undefined && raw !== null) {
          values[aggregate.alias] = Number(values[aggregate.alias] ?? 0) + 1;
        }
      } else if (fn === 'sum' || fn === 'avg') {
        if (raw !== undefined && raw !== null) {
          const numeric = Number(raw);
          if (!Number.isFinite(numeric)) {
            throw new Error(`Facet aggregate ${aggregate.alias} requires numeric values`);
          }
          values[aggregate.alias] = Number(values[aggregate.alias] ?? 0) + numeric;
          if (fn === 'avg') counts[aggregate.alias] = (counts[aggregate.alias] ?? 0) + 1;
        }
      } else if (fn === 'min' || fn === 'max') {
        if (raw !== undefined && raw !== null) {
          const current = values[aggregate.alias];
          const comparison = current === undefined || current === null
            ? 0
            : compareAggregateValues(raw, current);
          if (current === undefined || current === null
            || (fn === 'min' && comparison < 0)
            || (fn === 'max' && comparison > 0)) {
            values[aggregate.alias] = raw;
          }
        }
      } else {
        throw new Error(`Unsupported facet aggregate: ${aggregate.function}`);
      }
    }
    result.set(key, values);
    averageCounts.set(key, counts);
  }

  for (const [key, values] of result) {
    const counts = averageCounts.get(key) ?? {};
    for (const aggregate of aggregates) {
      if (aggregate.function.toLowerCase() !== 'avg') continue;
      const count = counts[aggregate.alias] ?? 0;
      values[aggregate.alias] = count ? Number(values[aggregate.alias] ?? 0) / count : null;
    }
  }
  return result;
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
    const nestedRequest = operation.deriveChild(facet.query.clone(), facet.relationName);
    const nestedQuery = nestedRequest.query;
    const nestedFacets = nestedQuery.facets;
    nestedQuery.facets = [];
    const requestedAggregates: FacetAggregate[] = nestedQuery.aggregateItems.map(item => ({
      function: String(item.function),
      field: String(item.field),
      alias: String(item.alias),
    }));
    const executedAggregates = requestedAggregates.length
      ? requestedAggregates
      : [{ function: 'Count', field: 'id', alias: '__teaql_facet_membership_count' }];
    let aggregateValues: Map<string, SmartListRecord>;
    if (service.executeFacetAggregates) {
      aggregateValues = await service.executeFacetAggregates(
        operation.deriveHelper(
          prepareQuery(outerQuery.clone()), `aggregate ${facet.relationName}`,
        ).query,
        facet.relationName,
        executedAggregates,
      );
    } else if (service.executeFacetMembership
      && executedAggregates.every(item => item.function.toLowerCase() === 'count')) {
      const counts = await service.executeFacetMembership(
        operation.deriveHelper(
          prepareQuery(outerQuery.clone()), `aggregate ${facet.relationName}`,
        ).query,
        facet.relationName,
      );
      aggregateValues = new Map([...counts].map(([key, count]) => [
        key,
        Object.fromEntries(executedAggregates.map(item => [item.alias, count])),
      ]));
    } else {
      aggregateValues = await executeFacetAggregatesFallback(
        service, prepareQuery, operation, outerQuery, facet.relationName, executedAggregates,
      );
    }
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
      const membership = { id: { $in: [...aggregateValues.keys()] } };
      nestedQuery.filterCondition = nestedQuery.filterCondition
        ? { $and: [nestedQuery.filterCondition, membership] } : membership;
    }
    retainQueryDiagnosticOrigin(outerQuery, nestedQuery);
    const rows = await service.executeQuery(nestedRequest.withQuery(prepareQuery(nestedQuery)).query);
    const decorated = rows
      .map(row => {
        const key = String(scalarId(row.id ?? row.Id));
        const values = aggregateValues.get(key);
        const copy = { ...row };
        for (const aggregate of requestedAggregates) {
          copy[aggregate.alias] = values?.[aggregate.alias] ?? emptyAggregateValue(aggregate);
        }
        return copy;
      })
      .filter(row => facet.includeAllFacets
        || aggregateValues.has(String(scalarId(row.id ?? row.Id))));
    const list = new SmartList(decorated);
    if (nestedFacets.length) {
      list.facets = await executeRelationFacets(service, prepareQuery,
        nestedRequest.withQuery(nestedQuery).query, nestedFacets);
    }
    result[facet.facetName] = list;
  }
  return result;
}
