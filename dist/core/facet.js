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
        let counts;
        if (service.executeFacetMembership) {
            counts = await service.executeFacetMembership(request.withQuery(prepareQuery(outerQuery.clone())).query, facet.relationName);
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
            const memberships = await service.executeQuery(request.withQuery(prepareQuery(membershipQuery)).query);
            counts = new Map();
            for (const row of memberships) {
                const id = relationId(row, facet.relationName);
                if (id === undefined || id === null)
                    continue;
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