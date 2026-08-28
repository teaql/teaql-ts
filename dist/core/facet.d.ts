import { FacetRequest, SelectQuery } from './ast';
import { SmartList, SmartListRecord } from './smart-list';
export interface FacetQueryService {
    executeQuery(query: SelectQuery): Promise<SmartListRecord[]>;
    executeFacetMembership?(outerQuery: SelectQuery, relationName: string): Promise<Map<string, number>>;
}
/**
 * Execute relation facets without crossing entity boundaries with the outer
 * filter. The outer query determines relation membership; the nested query
 * determines which facet entities and fields are returned.
 */
export declare function executeRelationFacets(service: FacetQueryService, prepareQuery: (query: SelectQuery) => SelectQuery, outerQuery: SelectQuery, facets: readonly FacetRequest[]): Promise<Record<string, SmartList<SmartListRecord>>>;
//# sourceMappingURL=facet.d.ts.map