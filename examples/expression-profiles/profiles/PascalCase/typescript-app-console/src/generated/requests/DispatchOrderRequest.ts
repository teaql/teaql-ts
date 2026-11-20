import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { DispatchOrder } from '../models/DispatchOrder';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class DispatchOrderRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("DispatchOrder");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "DispatchOrder" {
        return "DispatchOrder";
    }

    comment(c: string): this {
        this.query.comment(c);
        this._comment = c;
        return this;
    }

    filterByJson(source: unknown, warn?: (warning: DynamicSearchWarning) => void): this {
        const base = this.query.clone();
        if (this.filters.length > 0) base.filter({ "$and": this.filters });
        const merged = mergeGeneratedScalarSearch(base, source, GENERATED_SEARCH_MODELS, warn);
        this.query = merged.query as SelectQuery;
        this.filters = this.query.filterCondition ? [this.query.filterCondition] : [];
        this._dynamicSearchWarnings.push(...merged.warnings);
        return this;
    }

    get dynamicSearchWarnings(): readonly DynamicSearchWarning[] {
        return this._dynamicSearchWarnings.map(warning => ({ ...warning }));
    }

    purpose(p: string): ExecutableDispatchOrderRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableDispatchOrderRequest(
            (context) => context.withQueryRequest(this.query, () => this.executeForListInternal(context)),
            (context) => context.withQueryRequest(this.query, () => this.executeForRowsInternal(context)),
            (context, chunkSize) => this.executeForStreamInternal(context, chunkSize),
            () => this.limit(1),
            (c) => this.comment(c),
            () => this.ensureIntent());
    }

    optimizeForContinuousPageFetch(): this {
        this.query.optimizeForContinuousPageFetch();
        return this;
    }

    optimizeForContinuousPageFetchWith(namespace: string, ttlSeconds: number): this {
        this.query.optimizeForContinuousPageFetchWith(namespace, ttlSeconds);
        return this;
    }

    optimizePaginationWithIdSet(): this {
        this.query.optimizePaginationWithIdSet();
        return this;
    }

    optimizePaginationWithIdSetConfig(namespace: string, ttlSeconds: number, maxIds: number): this {
        this.query.optimizePaginationWithIdSetConfig(namespace, ttlSeconds, maxIds);
        return this;
    }

    topNProbeParentThreshold(threshold: number): this {
        this.query.topNProbeParentThreshold(threshold);
        return this;
    }

    limit(n: number): this {
        this.query.limit(n);
        return this;
    }

    offset(n: number): this {
        this.query.offset(n);
        return this;
    }

    toQuery(): SelectQuery {
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }
        return this.query;
    }

    withDeletedRows(): this {
        this.query.withDeletedRows();
        this.filters = this.filters.filter(filter => !("version" in filter));
        return this;
    }

    deletedRowsOnly(): this {
        this.withDeletedRows();
        this.query.deletedRowsOnly();
        this.filters.push({ version: { "$lte": -1 } });
        return this;
    }

    selectSelfFields(): this {
        this.query.select(["id", "distributionCenter", "orderReference", "handlingNote", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }


    selectOrderReference(): this {
        this.query.select(["orderReference"]);
        return this;
    }

    selectHandlingNote(): this {
        this.query.select(["handlingNote"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectDistributionCenterWith(request: { readonly entityName: "DistributionCenter"; toQuery(): SelectQuery }): this {
        this.query.select(["distributionCenter"]);
        this.query.relationQuery(
            "distributionCenter", request.toQuery(), "distributionCenter", "id", false,
            { kind: "relation-select", method: "selectDistributionCenterWith", relation: "distributionCenter" });
        return this;
    }

    withDistributionCenterMatching(request: { readonly entityName: "DistributionCenter"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "distributionCenter": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutDistributionCenterMatching(request: { readonly entityName: "DistributionCenter"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "distributionCenter": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ "id": { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ "id": { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ "id": { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ "id": { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ "id": { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "id": { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ "id": { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ "id": { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ "id": { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ "id": { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ "id": { "$isNull": true } });
            return this;
        }

        filterByDistributionCenter(val: any): this {
            this.filters.push({ "distributionCenter": { "$eq": val } });
            return this;
        }

        filterByDistributionCenterIn(...vals: any[]): this {
            this.filters.push({ "distributionCenter": { "$in": vals } });
            return this;
        }

        withDistributionCenterIsKnown(): this {
            this.filters.push({ "distributionCenter": { "$isNull": false } });
            return this;
        }

        withDistributionCenterIsUnknown(): this {
            this.filters.push({ "distributionCenter": { "$isNull": true } });
            return this;
        }

        withOrderReferenceContaining(val: string): this {
            this.filters.push({ "orderReference": { "$contains": val } });
            return this;
        }

        withOrderReferenceIs(val: string): this {
            this.filters.push({ "orderReference": { "$eq": val } });
            return this;
        }

        withOrderReferenceIsNot(val: string): this {
            this.filters.push({ "orderReference": { "$ne": val } });
            return this;
        }

        withOrderReferenceIn(...vals: string[]): this {
            this.filters.push({ "orderReference": { "$in": vals } });
            return this;
        }

        withOrderReferenceNotIn(...vals: string[]): this {
            this.filters.push({ "orderReference": { "$notIn": vals } });
            return this;
        }

        withOrderReferenceGreaterThan(val: string): this {
            this.filters.push({ "orderReference": { "$gt": val } });
            return this;
        }

        withOrderReferenceGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "orderReference": { "$gte": val } });
            return this;
        }

        withOrderReferenceLessThan(val: string): this {
            this.filters.push({ "orderReference": { "$lt": val } });
            return this;
        }

        withOrderReferenceLessThanOrEqualTo(val: string): this {
            this.filters.push({ "orderReference": { "$lte": val } });
            return this;
        }

        withOrderReferenceBetween(lower: string, upper: string): this {
            this.filters.push({ "orderReference": { "$between": [lower, upper] } });
            return this;
        }

        withOrderReferenceIsKnown(): this {
            this.filters.push({ "orderReference": { "$isNull": false } });
            return this;
        }

        withOrderReferenceIsUnknown(): this {
            this.filters.push({ "orderReference": { "$isNull": true } });
            return this;
        }
        withOrderReferenceNotContaining(val: string): this {
            this.filters.push({ "orderReference": { "$notContains": val } });
            return this;
        }

        withOrderReferenceStartingWith(val: string): this {
            this.filters.push({ "orderReference": { "$startsWith": val } });
            return this;
        }

        withOrderReferenceNotStartingWith(val: string): this {
            this.filters.push({ "orderReference": { "$notStartsWith": val } });
            return this;
        }

        withOrderReferenceEndingWith(val: string): this {
            this.filters.push({ "orderReference": { "$endsWith": val } });
            return this;
        }

        withOrderReferenceNotEndingWith(val: string): this {
            this.filters.push({ "orderReference": { "$notEndsWith": val } });
            return this;
        }

        withOrderReferenceSoundingLike(val: string): this {
            this.filters.push({ "orderReference": { "$soundLike": val } });
            return this;
        }

        withHandlingNoteContaining(val: string): this {
            this.filters.push({ "handlingNote": { "$contains": val } });
            return this;
        }

        withHandlingNoteIs(val: string): this {
            this.filters.push({ "handlingNote": { "$eq": val } });
            return this;
        }

        withHandlingNoteIsNot(val: string): this {
            this.filters.push({ "handlingNote": { "$ne": val } });
            return this;
        }

        withHandlingNoteIn(...vals: string[]): this {
            this.filters.push({ "handlingNote": { "$in": vals } });
            return this;
        }

        withHandlingNoteNotIn(...vals: string[]): this {
            this.filters.push({ "handlingNote": { "$notIn": vals } });
            return this;
        }

        withHandlingNoteGreaterThan(val: string): this {
            this.filters.push({ "handlingNote": { "$gt": val } });
            return this;
        }

        withHandlingNoteGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "handlingNote": { "$gte": val } });
            return this;
        }

        withHandlingNoteLessThan(val: string): this {
            this.filters.push({ "handlingNote": { "$lt": val } });
            return this;
        }

        withHandlingNoteLessThanOrEqualTo(val: string): this {
            this.filters.push({ "handlingNote": { "$lte": val } });
            return this;
        }

        withHandlingNoteBetween(lower: string, upper: string): this {
            this.filters.push({ "handlingNote": { "$between": [lower, upper] } });
            return this;
        }

        withHandlingNoteIsKnown(): this {
            this.filters.push({ "handlingNote": { "$isNull": false } });
            return this;
        }

        withHandlingNoteIsUnknown(): this {
            this.filters.push({ "handlingNote": { "$isNull": true } });
            return this;
        }
        withHandlingNoteNotContaining(val: string): this {
            this.filters.push({ "handlingNote": { "$notContains": val } });
            return this;
        }

        withHandlingNoteStartingWith(val: string): this {
            this.filters.push({ "handlingNote": { "$startsWith": val } });
            return this;
        }

        withHandlingNoteNotStartingWith(val: string): this {
            this.filters.push({ "handlingNote": { "$notStartsWith": val } });
            return this;
        }

        withHandlingNoteEndingWith(val: string): this {
            this.filters.push({ "handlingNote": { "$endsWith": val } });
            return this;
        }

        withHandlingNoteNotEndingWith(val: string): this {
            this.filters.push({ "handlingNote": { "$notEndsWith": val } });
            return this;
        }

        withHandlingNoteSoundingLike(val: string): this {
            this.filters.push({ "handlingNote": { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ "version": { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ "version": { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ "version": { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ "version": { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ "version": { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ "version": { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ "version": { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ "version": { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ "version": { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ "version": { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ "version": { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy("id", "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy("id", "desc");
        return this;
    }


    orderByOrderReferenceAscending(): this {
        this.query.orderBy("orderReference", "asc");
        return this;
    }

    orderByOrderReferenceDescending(): this {
        this.query.orderBy("orderReference", "desc");
        return this;
    }

    orderByHandlingNoteAscending(): this {
        this.query.orderBy("handlingNote", "asc");
        return this;
    }

    orderByHandlingNoteDescending(): this {
        this.query.orderBy("handlingNote", "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy("version", "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy("version", "desc");
        return this;
    }


    // --- Aggregations ---
    count(): this {
        this.query.aggregate("Count", "id", "count");
        this._pageCountAlias = "count";
        this._pageCountMethod = "count";
        return this;
    }

    countAs(retName: string): this {
        this.query.aggregate("Count", "id", retName);
        this._pageCountAlias = retName;
        this._pageCountMethod = "countAs";
        return this;
    }


    // --- Group By ---
    groupById(): this {
        this.query.groupBy("id");
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy("id", retName);
        return this;
    }
    groupByDistributionCenter(): this {
        this.query.groupBy("distributionCenter");
        return this;
    }

    groupByDistributionCenterAs(retName: string): this {
        this.query.groupBy("distributionCenter", retName);
        return this;
    }
    groupByOrderReference(): this {
        this.query.groupBy("orderReference");
        return this;
    }

    groupByOrderReferenceAs(retName: string): this {
        this.query.groupBy("orderReference", retName);
        return this;
    }
    groupByHandlingNote(): this {
        this.query.groupBy("handlingNote");
        return this;
    }

    groupByHandlingNoteAs(retName: string): this {
        this.query.groupBy("handlingNote", retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy("version");
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy("version", retName);
        return this;
    }

    // --- Facets ---
    facetByDistributionCenterAs(
        facetName: string,
        request: { readonly entityName: "DistributionCenter"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "distributionCenter", request, includeAllFacets,
            { kind: "facet", method: "facetByDistributionCenterAs", relation: "distributionCenter", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<DispatchOrder>> {
        this.ensureIntent();
        if (this.query.groupByItems.length > 0) throw new Error("Grouped projections require executeForRows");
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof DispatchOrder
                ? row
                : DispatchOrder.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<DispatchOrder>(data);
        if (aggregateOnly && rows[0]) Object.assign(result.aggregations, rows[0]);

        if (this.query.facets.length > 0) {
            result.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), this.query, this.query.facets);
        }

        return result;
    }

    private async executeForRowsInternal(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        return new SmartList<Record<string, unknown>>(
            await service.executeQuery(context.prepareQuery(this.query)) as Record<string, unknown>[]);
    }

    private async executeCountedListInternal(
        context: UserContext,
    ): Promise<SmartList<DispatchOrder>> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        const useIdSet = preparedQuery.localIdSetPaginationOptions() !== undefined;
        const countOperation = { kind: "named-count" as const,
            method: this._pageCountMethod ?? "count",
            ...(this._pageCountMethod === "countAs" ? { alias: this._pageCountAlias } : {}) };
        const totalCountBeforeRows = useIdSet ? undefined : await service.executeCount(
            preparedQuery, this._pageCountAlias, countOperation);
        const pageQuery = preparedQuery.clone();
        // A page count describes the full filtered set, not an aggregate-only page row.
        pageQuery.aggregateItems = pageQuery.aggregateItems.filter(item =>
            !(String(item.function).toLowerCase() === "count" && item.alias === this._pageCountAlias));
        const rows = await service.executeQuery(pageQuery);
        const totalCount = useIdSet && context.idSetPaginationCountAccuracy === "EXACT"
            ? context.idSetPaginationCount!
            : (totalCountBeforeRows ?? await service.executeCount(preparedQuery, this._pageCountAlias, countOperation));
        const aggregateOnly = pageQuery.aggregateItems.length > 0;
        const data = new SmartList<DispatchOrder>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof DispatchOrder
                ? row
                : DispatchOrder.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<DispatchOrder> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        if (preparedQuery.aggregateItems.length > 0 || preparedQuery.groupByItems.length > 0) {
            throw new Error("Entity streams require entity rows; use a record or aggregation query");
        }
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof DispatchOrder
                        ? entity
                        : DispatchOrder.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableDispatchOrderRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<DispatchOrder>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<DispatchOrder>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<DispatchOrder> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return DispatchOrder.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<DispatchOrder>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<DispatchOrder> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<DispatchOrder | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}