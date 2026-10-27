import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { OrderItem } from '../models/OrderItem';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class OrderItemRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("OrderItem");
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

    purpose(p: string): ExecutableOrderItemRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableOrderItemRequest(
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
        this.query.select(["id", "purchaseOrder", "tenant", "productName", "unitPrice", "createTime", "updateTime", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }



    selectProductName(): this {
        this.query.select(["productName"]);
        return this;
    }

    selectUnitPrice(): this {
        this.query.select(["unitPrice"]);
        return this;
    }

    selectCreateTime(): this {
        this.query.select(["createTime"]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select(["updateTime"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectPurchaseOrderWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["purchaseOrder"]);
        this.query.relationQuery(
            "purchaseOrder", request.toQuery(), "purchaseOrder", "id", false,
            { kind: "relation-select", method: "selectPurchaseOrderWith", relation: "purchaseOrder" });
        return this;
    }
    selectTenantWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["tenant"]);
        this.query.relationQuery(
            "tenant", request.toQuery(), "tenant", "id", false,
            { kind: "relation-select", method: "selectTenantWith", relation: "tenant" });
        return this;
    }

    withPurchaseOrderMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "purchaseOrder": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPurchaseOrderMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "purchaseOrder": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withTenantMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "tenant": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutTenantMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "tenant": {
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

        filterByPurchaseOrder(val: any): this {
            this.filters.push({ "purchaseOrder": { "$eq": val } });
            return this;
        }

        filterByPurchaseOrderIn(...vals: any[]): this {
            this.filters.push({ "purchaseOrder": { "$in": vals } });
            return this;
        }

        withPurchaseOrderIsKnown(): this {
            this.filters.push({ "purchaseOrder": { "$isNull": false } });
            return this;
        }

        withPurchaseOrderIsUnknown(): this {
            this.filters.push({ "purchaseOrder": { "$isNull": true } });
            return this;
        }

        filterByTenant(val: any): this {
            this.filters.push({ "tenant": { "$eq": val } });
            return this;
        }

        filterByTenantIn(...vals: any[]): this {
            this.filters.push({ "tenant": { "$in": vals } });
            return this;
        }

        withTenantIsKnown(): this {
            this.filters.push({ "tenant": { "$isNull": false } });
            return this;
        }

        withTenantIsUnknown(): this {
            this.filters.push({ "tenant": { "$isNull": true } });
            return this;
        }

        withProductNameContaining(val: string): this {
            this.filters.push({ "productName": { "$contains": val } });
            return this;
        }

        withProductNameIs(val: string): this {
            this.filters.push({ "productName": { "$eq": val } });
            return this;
        }

        withProductNameIsNot(val: any): this {
            this.filters.push({ "productName": { "$ne": val } });
            return this;
        }

        withProductNameIn(...vals: any[]): this {
            this.filters.push({ "productName": { "$in": vals } });
            return this;
        }

        withProductNameNotIn(...vals: any[]): this {
            this.filters.push({ "productName": { "$notIn": vals } });
            return this;
        }

        withProductNameGreaterThan(val: any): this {
            this.filters.push({ "productName": { "$gt": val } });
            return this;
        }

        withProductNameGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "productName": { "$gte": val } });
            return this;
        }

        withProductNameLessThan(val: any): this {
            this.filters.push({ "productName": { "$lt": val } });
            return this;
        }

        withProductNameLessThanOrEqualTo(val: any): this {
            this.filters.push({ "productName": { "$lte": val } });
            return this;
        }

        withProductNameBetween(lower: any, upper: any): this {
            this.filters.push({ "productName": { "$between": [lower, upper] } });
            return this;
        }

        withProductNameIsKnown(): this {
            this.filters.push({ "productName": { "$isNull": false } });
            return this;
        }

        withProductNameIsUnknown(): this {
            this.filters.push({ "productName": { "$isNull": true } });
            return this;
        }
        withProductNameNotContaining(val: string): this {
            this.filters.push({ "productName": { "$notContains": val } });
            return this;
        }

        withProductNameStartingWith(val: string): this {
            this.filters.push({ "productName": { "$startsWith": val } });
            return this;
        }

        withProductNameNotStartingWith(val: string): this {
            this.filters.push({ "productName": { "$notStartsWith": val } });
            return this;
        }

        withProductNameEndingWith(val: string): this {
            this.filters.push({ "productName": { "$endsWith": val } });
            return this;
        }

        withProductNameNotEndingWith(val: string): this {
            this.filters.push({ "productName": { "$notEndsWith": val } });
            return this;
        }

        withProductNameSoundingLike(val: string): this {
            this.filters.push({ "productName": { "$soundLike": val } });
            return this;
        }

        withUnitPriceIs(val: Decimal): this {
            this.filters.push({ "unitPrice": { "$eq": val } });
            return this;
        }

        withUnitPriceIsNot(val: Decimal): this {
            this.filters.push({ "unitPrice": { "$ne": val } });
            return this;
        }

        withUnitPriceIn(...vals: Decimal[]): this {
            this.filters.push({ "unitPrice": { "$in": vals } });
            return this;
        }

        withUnitPriceNotIn(...vals: Decimal[]): this {
            this.filters.push({ "unitPrice": { "$notIn": vals } });
            return this;
        }

        withUnitPriceGreaterThan(val: Decimal): this {
            this.filters.push({ "unitPrice": { "$gt": val } });
            return this;
        }

        withUnitPriceGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "unitPrice": { "$gte": val } });
            return this;
        }

        withUnitPriceLessThan(val: Decimal): this {
            this.filters.push({ "unitPrice": { "$lt": val } });
            return this;
        }

        withUnitPriceLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "unitPrice": { "$lte": val } });
            return this;
        }

        withUnitPriceBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ "unitPrice": { "$between": [lower, upper] } });
            return this;
        }

        withUnitPriceIsKnown(): this {
            this.filters.push({ "unitPrice": { "$isNull": false } });
            return this;
        }

        withUnitPriceIsUnknown(): this {
            this.filters.push({ "unitPrice": { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: any): this {
            this.filters.push({ "createTime": { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: any): this {
            this.filters.push({ "createTime": { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: any[]): this {
            this.filters.push({ "createTime": { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: any[]): this {
            this.filters.push({ "createTime": { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: any): this {
            this.filters.push({ "createTime": { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "createTime": { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: any): this {
            this.filters.push({ "createTime": { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: any): this {
            this.filters.push({ "createTime": { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: any, upper: any): this {
            this.filters.push({ "createTime": { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ "createTime": { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ "createTime": { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: any): this {
            this.filters.push({ "updateTime": { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: any): this {
            this.filters.push({ "updateTime": { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: any[]): this {
            this.filters.push({ "updateTime": { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: any[]): this {
            this.filters.push({ "updateTime": { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: any): this {
            this.filters.push({ "updateTime": { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "updateTime": { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: any): this {
            this.filters.push({ "updateTime": { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: any): this {
            this.filters.push({ "updateTime": { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: any, upper: any): this {
            this.filters.push({ "updateTime": { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ "updateTime": { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ "updateTime": { "$isNull": true } });
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



    orderByProductNameAscending(): this {
        this.query.orderBy("productName", "asc");
        return this;
    }

    orderByProductNameDescending(): this {
        this.query.orderBy("productName", "desc");
        return this;
    }

    orderByUnitPriceAscending(): this {
        this.query.orderBy("unitPrice", "asc");
        return this;
    }

    orderByUnitPriceDescending(): this {
        this.query.orderBy("unitPrice", "desc");
        return this;
    }

    orderByCreateTimeAscending(): this {
        this.query.orderBy("createTime", "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy("createTime", "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy("updateTime", "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy("updateTime", "desc");
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

    minUnitPrice(): this {
        return this.minUnitPriceAs("minOfUnitPrice");
    }

    minUnitPriceAs(retName: string): this {
        this.query.aggregate("min", "unitPrice", retName);
        return this;
    }
    maxUnitPrice(): this {
        return this.maxUnitPriceAs("maxOfUnitPrice");
    }

    maxUnitPriceAs(retName: string): this {
        this.query.aggregate("max", "unitPrice", retName);
        return this;
    }
    sumUnitPrice(): this {
        return this.sumUnitPriceAs("sumOfUnitPrice");
    }

    sumUnitPriceAs(retName: string): this {
        this.query.aggregate("sum", "unitPrice", retName);
        return this;
    }
    avgUnitPrice(): this {
        return this.avgUnitPriceAs("avgOfUnitPrice");
    }

    avgUnitPriceAs(retName: string): this {
        this.query.aggregate("avg", "unitPrice", retName);
        return this;
    }
    standardDeviationUnitPrice(): this {
        return this.standardDeviationUnitPriceAs("standardDeviationOfUnitPrice");
    }

    standardDeviationUnitPriceAs(retName: string): this {
        this.query.aggregate("stddev", "unitPrice", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationUnitPrice(): this {
        return this.squareRootOfPopulationStandardDeviationUnitPriceAs("squareRootOfPopulationStandardDeviationOfUnitPrice");
    }

    squareRootOfPopulationStandardDeviationUnitPriceAs(retName: string): this {
        this.query.aggregate("stddev_pop", "unitPrice", retName);
        return this;
    }
    sampleVarianceUnitPrice(): this {
        return this.sampleVarianceUnitPriceAs("sampleVarianceOfUnitPrice");
    }

    sampleVarianceUnitPriceAs(retName: string): this {
        this.query.aggregate("var_samp", "unitPrice", retName);
        return this;
    }
    samplePopulationVarianceUnitPrice(): this {
        return this.samplePopulationVarianceUnitPriceAs("samplePopulationVarianceOfUnitPrice");
    }

    samplePopulationVarianceUnitPriceAs(retName: string): this {
        this.query.aggregate("var_pop", "unitPrice", retName);
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
    groupByPurchaseOrder(): this {
        this.query.groupBy("purchaseOrder");
        return this;
    }

    groupByPurchaseOrderAs(retName: string): this {
        this.query.groupBy("purchaseOrder"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByTenant(): this {
        this.query.groupBy("tenant");
        return this;
    }

    groupByTenantAs(retName: string): this {
        this.query.groupBy("tenant"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByProductName(): this {
        this.query.groupBy("productName");
        return this;
    }

    groupByProductNameAs(retName: string): this {
        this.query.groupBy("productName"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByUnitPrice(): this {
        this.query.groupBy("unitPrice");
        return this;
    }

    groupByUnitPriceAs(retName: string): this {
        this.query.groupBy("unitPrice"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy("createTime");
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy("createTime"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy("updateTime");
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy("updateTime"); // In TS we don't alias group by yet natively
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
    facetByPurchaseOrderAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "purchaseOrder", request, includeAllFacets,
            { kind: "facet", method: "facetByPurchaseOrderAs", relation: "purchaseOrder", alias: facetName });
        return this;
    }

    facetByTenantAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "tenant", request, includeAllFacets,
            { kind: "facet", method: "facetByTenantAs", relation: "tenant", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<OrderItem>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof OrderItem
                ? row
                : OrderItem.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<OrderItem>(data);
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
    ): Promise<SmartList<OrderItem>> {
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
            row instanceof OrderItem
                ? row
                : OrderItem.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<OrderItem> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof OrderItem
                        ? entity
                        : OrderItem.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableOrderItemRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<OrderItem>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<OrderItem>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): OrderItem {
        this.ensureIntent();
        return new OrderItem();
    }

    executeForList(context: UserContext): Promise<SmartList<OrderItem>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<OrderItem> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<OrderItem | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}