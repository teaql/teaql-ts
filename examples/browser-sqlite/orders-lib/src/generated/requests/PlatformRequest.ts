import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Platform } from '../models/Platform';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class PlatformRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Platform");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
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

    purpose(p: string): ExecutablePlatformRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutablePlatformRequest(
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
        this.filters = this.filters.filter(filter => !("version" in filter));
        return this;
    }

    deletedRowsOnly(): this {
        this.withDeletedRows();
        this.filters.push({ version: { "$lte": -1 } });
        return this;
    }

    selectSelfFields(): this {
        this.query.select(["id", "name", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }

    selectName(): this {
        this.query.select(["name"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }




    selectOrderStatusListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderStatusList", request.toQuery(), "id", "platform", true,
            { kind: "relation-select", method: "selectOrderStatusListWith", relation: "orderStatusList" });
        return this;
    }
    selectCustomerListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "customerList", request.toQuery(), "id", "platform", true,
            { kind: "relation-select", method: "selectCustomerListWith", relation: "customerList" });
        return this;
    }

    haveOrderStatuses(): this {
        return this.withOrderStatusListMatching({
            toQuery: () => new SelectQuery("OrderStatus"),
        });
    }

    haveNoOrderStatuses(): this {
        return this.withoutOrderStatusListMatching({
            toQuery: () => new SelectQuery("OrderStatus"),
        });
    }

    withOrderStatusListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    withoutOrderStatusListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }
    haveCustomers(): this {
        return this.withCustomerListMatching({
            toQuery: () => new SelectQuery("Customer"),
        });
    }

    haveNoCustomers(): this {
        return this.withoutCustomerListMatching({
            toQuery: () => new SelectQuery("Customer"),
        });
    }

    withCustomerListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    withoutCustomerListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    countOrderStatuses(): this {
        return this.countOrderStatusesAs("countOrderStatuses");
    }

    countOrderStatusesAs(alias: string): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        this.countOrderStatusesWith(alias, { toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderStatusesAs", relation: "orderStatusList", alias };
        return this;
    }

    countOrderStatusesWith(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "relation-count", method: "countOrderStatusesWith", relation: "orderStatusList", alias });
        return this;
    }

    minDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.minDisplayOrderOfOrderStatusesAs(
            "minOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    minDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "minDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    maxDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.maxDisplayOrderOfOrderStatusesAs(
            "maxOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    maxDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "maxDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    sumDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.sumDisplayOrderOfOrderStatusesAs(
            "sumOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    sumDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "sumDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    avgDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.avgDisplayOrderOfOrderStatusesAs(
            "avgOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    avgDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "avgDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    standardDeviationDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.standardDeviationDisplayOrderOfOrderStatusesAs(
            "standardDeviationOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    standardDeviationDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationDisplayOrderOfOrderStatusesAs(
            "squareRootOfPopulationStandardDeviationOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    sampleVarianceDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceDisplayOrderOfOrderStatusesAs(
            "sampleVarianceOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    sampleVarianceDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    samplePopulationVarianceDisplayOrderOfOrderStatuses(): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceDisplayOrderOfOrderStatusesAs(
            "samplePopulationVarianceOfDisplayOrderOfOrderStatuses", { toQuery: () => query });
    }

    samplePopulationVarianceDisplayOrderOfOrderStatusesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    countCustomers(): this {
        return this.countCustomersAs("countCustomers");
    }

    countCustomersAs(alias: string): this {
        const query = new SelectQuery("Customer").filter({ version: { "$gte": 1 } });
        this.countCustomersWith(alias, { toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countCustomersAs", relation: "customerList", alias };
        return this;
    }

    countCustomersWith(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("customerList", alias, query, true,
            { kind: "relation-count", method: "countCustomersWith", relation: "customerList", alias });
        return this;
    }



        withIdIs(val: any): this {
            this.filters.push({ "id": { "$eq": val } });
            return this;
        }

        withIdIsNot(val: any): this {
            this.filters.push({ "id": { "$ne": val } });
            return this;
        }

        withIdIn(...vals: any[]): this {
            this.filters.push({ "id": { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: any[]): this {
            this.filters.push({ "id": { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: any): this {
            this.filters.push({ "id": { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$gte": val } });
            return this;
        }

        withIdLessThan(val: any): this {
            this.filters.push({ "id": { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$lte": val } });
            return this;
        }

        withIdBetween(lower: any, upper: any): this {
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

        withNameContaining(val: string): this {
            this.filters.push({ "name": { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ "name": { "$eq": val } });
            return this;
        }

        withNameIsNot(val: any): this {
            this.filters.push({ "name": { "$ne": val } });
            return this;
        }

        withNameIn(...vals: any[]): this {
            this.filters.push({ "name": { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: any[]): this {
            this.filters.push({ "name": { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: any): this {
            this.filters.push({ "name": { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "name": { "$gte": val } });
            return this;
        }

        withNameLessThan(val: any): this {
            this.filters.push({ "name": { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: any): this {
            this.filters.push({ "name": { "$lte": val } });
            return this;
        }

        withNameBetween(lower: any, upper: any): this {
            this.filters.push({ "name": { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ "name": { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ "name": { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ "name": { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ "name": { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ "name": { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ "name": { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ "name": { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ "name": { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: any): this {
            this.filters.push({ "version": { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: any): this {
            this.filters.push({ "version": { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: any[]): this {
            this.filters.push({ "version": { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: any[]): this {
            this.filters.push({ "version": { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: any): this {
            this.filters.push({ "version": { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: any): this {
            this.filters.push({ "version": { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: any, upper: any): this {
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

    orderByNameAscending(): this {
        this.query.orderBy("name", "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy("name", "desc");
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
        this.query.groupBy("id"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByName(): this {
        this.query.groupBy("name");
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy("name"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy("version");
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy("version"); // In TS we don't alias group by yet natively
        return this;
    }

    // --- Facets ---

    private async executeForListInternal(context: UserContext): Promise<SmartList<Platform>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Platform
                ? row
                : Platform.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Platform>(data);
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
    ): Promise<SmartList<Platform>> {
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
        const data = new SmartList(rows.map((row: unknown) =>
            row instanceof Platform
                ? row
                : Platform.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Platform> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof Platform
                        ? entity
                        : Platform.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutablePlatformRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Platform>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Platform>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): Platform {
        this.ensureIntent();
        return new Platform();
    }

    executeForList(context: UserContext): Promise<SmartList<Platform>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Platform> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Platform | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}