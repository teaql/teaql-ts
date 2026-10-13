"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRelationFacets = void 0;
const smart_list_1 = require("./smart-list");
const request_intent_1 = require("./request-intent");
const query_snapshot_1 = require("./query-snapshot");
function snakeCase(value) {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
function scalarId(value) {
    if (value && typeof value === 'object') {
        const record = value;
        return record.id ?? record.Id;
    }
    return value;
}
function relationId(row, relationName) {
    const snake = snakeCase(relationName);
    for (const key of [relationName, `${relationName}Id`, snake, `${snake}_id`]) {
        const value = scalarId(row[key]);
        if (value !== undefined && value !== null)
            return value;
    }
    return undefined;
}
/**
 * Execute relation facets without crossing entity boundaries with the outer
 * filter. The outer query determines relation membership; the nested query
 * determines which facet entities and fields are returned.
 */
async function executeRelationFacets(service, prepareQuery, outerQuery, facets) {
    const request = new request_intent_1.QueryRequest(outerQuery);
    outerQuery = request.query;
    const result = {};
    for (const facet of facets) {
        const operation = request.deriveOperation(outerQuery, facet.operation ?? {
            kind: 'facet', relation: facet.relationName, alias: facet.facetName,
        });
        const countAliases = facet.query.aggregateItems
            .filter(item => String(item.function).toLowerCase() === 'count')
            .map(item => String(item.alias));
        let counts;
        if (service.executeFacetMembership) {
            counts = await service.executeFacetMembership(operation.deriveHelper(prepareQuery(outerQuery.clone()), 'aggregate ' + facet.relationName).query, facet.relationName, countAliases);
        }
        else {
            const membershipQuery = outerQuery.clone();
            (0, query_snapshot_1.retainQueryDiagnosticOrigin)(outerQuery, membershipQuery);
            membershipQuery.facets = [];
            membershipQuery.relations = [];
            membershipQuery.relationAggregates = [];
            membershipQuery.orderItems = [];
            membershipQuery.aggregateItems = [];
            membershipQuery.groupByItems = [];
            membershipQuery.offsetValue = 0;
            membershipQuery.limitValue = 0;
            membershipQuery.selectItems = [facet.relationName];
            const memberships = await service.executeQuery(operation.deriveHelper(prepareQuery(membershipQuery), 'aggregate ' + facet.relationName).query);
            counts = new Map();
            for (const row of memberships) {
                const id = relationId(row, facet.relationName);
                if (id === undefined || id === null)
                    continue;
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
            if (aggregate.query.entity !== outerQuery.entity)
                continue;
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
            (0, query_snapshot_1.retainQueryDiagnosticOrigin)(outerQuery, aggregate.query);
        }
        // Restrict before pagination and before evaluating child facets. Filtering
        // only the returned rows makes child counts include unrelated entities.
        if (!facet.includeAllFacets) {
            const membership = { id: { $in: [...counts.keys()] } };
            nestedQuery.filterCondition = nestedQuery.filterCondition
                ? { $and: [nestedQuery.filterCondition, membership] } : membership;
        }
        (0, query_snapshot_1.retainQueryDiagnosticOrigin)(outerQuery, nestedQuery);
        const rows = await service.executeQuery(nestedRequest.withQuery(prepareQuery(nestedQuery)).query);
        const decorated = rows
            .map(row => {
            const count = counts.get(String(scalarId(row.id ?? row.Id))) ?? 0;
            const copy = { ...row };
            for (const alias of countAliases)
                copy[alias] = count;
            return copy;
        })
            .filter(row => facet.includeAllFacets || counts.has(String(scalarId(row.id ?? row.Id))));
        const list = new smart_list_1.SmartList(decorated);
        if (nestedFacets.length) {
            list.facets = await executeRelationFacets(service, prepareQuery, nestedRequest.withQuery(nestedQuery).query, nestedFacets);
        }
        result[facet.facetName] = list;
    }
    return result;
}
exports.executeRelationFacets = executeRelationFacets;
//# sourceMappingURL=facet.js.map