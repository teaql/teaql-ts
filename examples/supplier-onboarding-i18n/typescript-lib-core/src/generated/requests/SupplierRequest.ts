import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Supplier } from '../models/Supplier';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class SupplierRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Supplier");
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

    purpose(p: string): ExecutableSupplierRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableSupplierRequest(
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
        this.query.select(["id", "warehouse", "name", "minimumOrderQuantity", "version"]);
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

    selectMinimumOrderQuantity(): this {
        this.query.select(["minimumOrderQuantity"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectWarehouseWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["warehouse"]);
        this.query.relationQuery(
            "warehouse", request.toQuery(), "warehouse", "id", false,
            { kind: "relation-select", method: "selectWarehouseWith", relation: "warehouse" });
        return this;
    }

    withWarehouseMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "warehouse": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutWarehouseMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "warehouse": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
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

        filterByWarehouse(val: any): this {
            this.filters.push({ "warehouse": { "$eq": val } });
            return this;
        }

        filterByWarehouseIn(...vals: any[]): this {
            this.filters.push({ "warehouse": { "$in": vals } });
            return this;
        }

        withWarehouseIsKnown(): this {
            this.filters.push({ "warehouse": { "$isNull": false } });
            return this;
        }

        withWarehouseIsUnknown(): this {
            this.filters.push({ "warehouse": { "$isNull": true } });
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

        withMinimumOrderQuantityIs(val: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$eq": val } });
            return this;
        }

        withMinimumOrderQuantityIsNot(val: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$ne": val } });
            return this;
        }

        withMinimumOrderQuantityIn(...vals: any[]): this {
            this.filters.push({ "minimumOrderQuantity": { "$in": vals } });
            return this;
        }

        withMinimumOrderQuantityNotIn(...vals: any[]): this {
            this.filters.push({ "minimumOrderQuantity": { "$notIn": vals } });
            return this;
        }

        withMinimumOrderQuantityGreaterThan(val: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$gt": val } });
            return this;
        }

        withMinimumOrderQuantityGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$gte": val } });
            return this;
        }

        withMinimumOrderQuantityLessThan(val: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$lt": val } });
            return this;
        }

        withMinimumOrderQuantityLessThanOrEqualTo(val: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$lte": val } });
            return this;
        }

        withMinimumOrderQuantityBetween(lower: any, upper: any): this {
            this.filters.push({ "minimumOrderQuantity": { "$between": [lower, upper] } });
            return this;
        }

        withMinimumOrderQuantityIsKnown(): this {
            this.filters.push({ "minimumOrderQuantity": { "$isNull": false } });
            return this;
        }

        withMinimumOrderQuantityIsUnknown(): this {
            this.filters.push({ "minimumOrderQuantity": { "$isNull": true } });
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

    orderByMinimumOrderQuantityAscending(): this {
        this.query.orderBy("minimumOrderQuantity", "asc");
        return this;
    }

    orderByMinimumOrderQuantityDescending(): this {
        this.query.orderBy("minimumOrderQuantity", "desc");
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

    minMinimumOrderQuantity(): this {
        return this.minMinimumOrderQuantityAs("minOfMinimumOrderQuantity");
    }

    minMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("min", "minimumOrderQuantity", retName);
        return this;
    }
    maxMinimumOrderQuantity(): this {
        return this.maxMinimumOrderQuantityAs("maxOfMinimumOrderQuantity");
    }

    maxMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("max", "minimumOrderQuantity", retName);
        return this;
    }
    sumMinimumOrderQuantity(): this {
        return this.sumMinimumOrderQuantityAs("sumOfMinimumOrderQuantity");
    }

    sumMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("sum", "minimumOrderQuantity", retName);
        return this;
    }
    avgMinimumOrderQuantity(): this {
        return this.avgMinimumOrderQuantityAs("avgOfMinimumOrderQuantity");
    }

    avgMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("avg", "minimumOrderQuantity", retName);
        return this;
    }
    standardDeviationMinimumOrderQuantity(): this {
        return this.standardDeviationMinimumOrderQuantityAs("standardDeviationOfMinimumOrderQuantity");
    }

    standardDeviationMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("stddev", "minimumOrderQuantity", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationMinimumOrderQuantity(): this {
        return this.squareRootOfPopulationStandardDeviationMinimumOrderQuantityAs("squareRootOfPopulationStandardDeviationOfMinimumOrderQuantity");
    }

    squareRootOfPopulationStandardDeviationMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("stddev_pop", "minimumOrderQuantity", retName);
        return this;
    }
    sampleVarianceMinimumOrderQuantity(): this {
        return this.sampleVarianceMinimumOrderQuantityAs("sampleVarianceOfMinimumOrderQuantity");
    }

    sampleVarianceMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("var_samp", "minimumOrderQuantity", retName);
        return this;
    }
    samplePopulationVarianceMinimumOrderQuantity(): this {
        return this.samplePopulationVarianceMinimumOrderQuantityAs("samplePopulationVarianceOfMinimumOrderQuantity");
    }

    samplePopulationVarianceMinimumOrderQuantityAs(retName: string): this {
        this.query.aggregate("var_pop", "minimumOrderQuantity", retName);
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
    groupByWarehouse(): this {
        this.query.groupBy("warehouse");
        return this;
    }

    groupByWarehouseAs(retName: string): this {
        this.query.groupBy("warehouse"); // In TS we don't alias group by yet natively
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
    groupByMinimumOrderQuantity(): this {
        this.query.groupBy("minimumOrderQuantity");
        return this;
    }

    groupByMinimumOrderQuantityAs(retName: string): this {
        this.query.groupBy("minimumOrderQuantity"); // In TS we don't alias group by yet natively
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
    facetByWarehouseAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "warehouse", request, includeAllFacets,
            { kind: "facet", method: "facetByWarehouseAs", relation: "warehouse", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<Supplier>> {
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
            row instanceof Supplier
                ? row
                : Supplier.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Supplier>(data);
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
    ): Promise<SmartList<Supplier>> {
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
        const data = new SmartList<Supplier>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Supplier
                ? row
                : Supplier.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Supplier> {
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
                    yield entity instanceof Supplier
                        ? entity
                        : Supplier.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableSupplierRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Supplier>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Supplier>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): Supplier {
        this.ensureIntent();
        return new Supplier();
    }

    executeForList(context: UserContext): Promise<SmartList<Supplier>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Supplier> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Supplier | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}