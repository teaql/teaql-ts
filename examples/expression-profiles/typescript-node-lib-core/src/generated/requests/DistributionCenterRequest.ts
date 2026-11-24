import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { DistributionCenter } from '../models/DistributionCenter';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class DistributionCenterRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("DistributionCenter");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "DistributionCenter" {
        return "DistributionCenter";
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

    purpose(p: string): ExecutableDistributionCenterRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableDistributionCenterRequest(
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
        this.query.select([DistributionCenter.__teaqlFields.ID_PROPERTY.member, DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member, DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([DistributionCenter.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }

    selectDockName(): this {
        this.query.select([DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }




    selectDispatchOrderListWith(request: { readonly entityName: "DispatchOrder"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "dispatchOrderList", request.toQuery(), "id", "distributionCenter", true,
            { kind: "relation-select", method: "selectDispatchOrderListWith", relation: "dispatchOrderList" });
        return this;
    }

    haveDispatchOrders(): this {
        return this.withDispatchOrderListMatching({
            entityName: "DispatchOrder",
            toQuery: () => new SelectQuery("DispatchOrder"),
        });
    }

    haveNoDispatchOrders(): this {
        return this.withoutDispatchOrderListMatching({
            entityName: "DispatchOrder",
            toQuery: () => new SelectQuery("DispatchOrder"),
        });
    }

    withDispatchOrderListMatching(request: { readonly entityName: "DispatchOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "distributionCenter",
                },
            },
        });
        return this;
    }

    withoutDispatchOrderListMatching(request: { readonly entityName: "DispatchOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "distributionCenter",
                },
            },
        });
        return this;
    }

    countDispatchOrders(): this {
        return this.countDispatchOrdersAs("countDispatchOrders");
    }

    countDispatchOrdersAs(alias: string): this {
        const query = new SelectQuery("DispatchOrder").filter({ version: { "$gte": 1 } });
        this.countDispatchOrdersWith(alias, { entityName: "DispatchOrder", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countDispatchOrdersAs", relation: "dispatchOrderList", alias };
        return this;
    }

    countDispatchOrdersWith(alias: string, child: { readonly entityName: "DispatchOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("dispatchOrderList", alias, query, true,
            { kind: "relation-count", method: "countDispatchOrdersWith", relation: "dispatchOrderList", alias });
        return this;
    }



        withIdIs(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withDockNameContaining(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withDockNameIs(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withDockNameIsNot(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withDockNameIn(...vals: string[]): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withDockNameNotIn(...vals: string[]): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withDockNameGreaterThan(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withDockNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withDockNameLessThan(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withDockNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withDockNameBetween(lower: string, upper: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withDockNameIsKnown(): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withDockNameIsUnknown(): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withDockNameNotContaining(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withDockNameStartingWith(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withDockNameNotStartingWith(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withDockNameEndingWith(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withDockNameNotEndingWith(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withDockNameSoundingLike(val: string): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [DistributionCenter.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(DistributionCenter.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(DistributionCenter.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }

    orderByDockNameAscending(): this {
        this.query.orderBy(DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByDockNameDescending(): this {
        this.query.orderBy(DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(DistributionCenter.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(DistributionCenter.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(DistributionCenter.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(DistributionCenter.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByDockName(): this {
        this.query.groupBy(DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member);
        return this;
    }

    groupByDockNameAs(retName: string): this {
        this.query.groupBy(DistributionCenter.__teaqlFields.DOCK_NAME_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(DistributionCenter.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(DistributionCenter.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---

    private async executeForListInternal(context: UserContext): Promise<SmartList<DistributionCenter>> {
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
            row instanceof DistributionCenter
                ? row
                : DistributionCenter.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<DistributionCenter>(data);
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
    ): Promise<SmartList<DistributionCenter>> {
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
        const data = new SmartList<DistributionCenter>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof DistributionCenter
                ? row
                : DistributionCenter.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<DistributionCenter> {
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
                    yield entity instanceof DistributionCenter
                        ? entity
                        : DistributionCenter.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableDistributionCenterRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<DistributionCenter>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<DistributionCenter>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<DistributionCenter> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return DistributionCenter.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<DistributionCenter>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<DistributionCenter> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<DistributionCenter | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}