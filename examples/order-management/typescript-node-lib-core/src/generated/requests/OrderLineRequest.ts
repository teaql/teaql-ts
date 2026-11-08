import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { OrderLine } from '../models/OrderLine';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class OrderLineRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("OrderLine");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "OrderLine" {
        return "OrderLine";
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

    purpose(p: string): ExecutableOrderLineRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableOrderLineRequest(
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
        this.query.select(["id", "customerOrder", "product", "productName", "sku", "quantity", "commercePlatform", "createTime", "version"]);
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

    selectSku(): this {
        this.query.select(["sku"]);
        return this;
    }

    selectQuantity(): this {
        this.query.select(["quantity"]);
        return this;
    }


    selectCreateTime(): this {
        this.query.select(["createTime"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectCustomerOrderWith(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.query.select(["customerOrder"]);
        this.query.relationQuery(
            "customerOrder", request.toQuery(), "customerOrder", "id", false,
            { kind: "relation-select", method: "selectCustomerOrderWith", relation: "customerOrder" });
        return this;
    }
    selectProductWith(request: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        this.query.select(["product"]);
        this.query.relationQuery(
            "product", request.toQuery(), "product", "id", false,
            { kind: "relation-select", method: "selectProductWith", relation: "product" });
        return this;
    }
    selectCommercePlatformWith(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.query.select(["commercePlatform"]);
        this.query.relationQuery(
            "commercePlatform", request.toQuery(), "commercePlatform", "id", false,
            { kind: "relation-select", method: "selectCommercePlatformWith", relation: "commercePlatform" });
        return this;
    }

    withCustomerOrderMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "customerOrder": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCustomerOrderMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "customerOrder": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withProductMatching(request: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "product": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutProductMatching(request: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "product": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "commercePlatform": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "commercePlatform": {
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

        filterByCustomerOrder(val: any): this {
            this.filters.push({ "customerOrder": { "$eq": val } });
            return this;
        }

        filterByCustomerOrderIn(...vals: any[]): this {
            this.filters.push({ "customerOrder": { "$in": vals } });
            return this;
        }

        withCustomerOrderIsKnown(): this {
            this.filters.push({ "customerOrder": { "$isNull": false } });
            return this;
        }

        withCustomerOrderIsUnknown(): this {
            this.filters.push({ "customerOrder": { "$isNull": true } });
            return this;
        }

        filterByProduct(val: any): this {
            this.filters.push({ "product": { "$eq": val } });
            return this;
        }

        filterByProductIn(...vals: any[]): this {
            this.filters.push({ "product": { "$in": vals } });
            return this;
        }

        withProductIsKnown(): this {
            this.filters.push({ "product": { "$isNull": false } });
            return this;
        }

        withProductIsUnknown(): this {
            this.filters.push({ "product": { "$isNull": true } });
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

        withProductNameIsNot(val: string): this {
            this.filters.push({ "productName": { "$ne": val } });
            return this;
        }

        withProductNameIn(...vals: string[]): this {
            this.filters.push({ "productName": { "$in": vals } });
            return this;
        }

        withProductNameNotIn(...vals: string[]): this {
            this.filters.push({ "productName": { "$notIn": vals } });
            return this;
        }

        withProductNameGreaterThan(val: string): this {
            this.filters.push({ "productName": { "$gt": val } });
            return this;
        }

        withProductNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "productName": { "$gte": val } });
            return this;
        }

        withProductNameLessThan(val: string): this {
            this.filters.push({ "productName": { "$lt": val } });
            return this;
        }

        withProductNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ "productName": { "$lte": val } });
            return this;
        }

        withProductNameBetween(lower: string, upper: string): this {
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

        withSkuContaining(val: string): this {
            this.filters.push({ "sku": { "$contains": val } });
            return this;
        }

        withSkuIs(val: string): this {
            this.filters.push({ "sku": { "$eq": val } });
            return this;
        }

        withSkuIsNot(val: string): this {
            this.filters.push({ "sku": { "$ne": val } });
            return this;
        }

        withSkuIn(...vals: string[]): this {
            this.filters.push({ "sku": { "$in": vals } });
            return this;
        }

        withSkuNotIn(...vals: string[]): this {
            this.filters.push({ "sku": { "$notIn": vals } });
            return this;
        }

        withSkuGreaterThan(val: string): this {
            this.filters.push({ "sku": { "$gt": val } });
            return this;
        }

        withSkuGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "sku": { "$gte": val } });
            return this;
        }

        withSkuLessThan(val: string): this {
            this.filters.push({ "sku": { "$lt": val } });
            return this;
        }

        withSkuLessThanOrEqualTo(val: string): this {
            this.filters.push({ "sku": { "$lte": val } });
            return this;
        }

        withSkuBetween(lower: string, upper: string): this {
            this.filters.push({ "sku": { "$between": [lower, upper] } });
            return this;
        }

        withSkuIsKnown(): this {
            this.filters.push({ "sku": { "$isNull": false } });
            return this;
        }

        withSkuIsUnknown(): this {
            this.filters.push({ "sku": { "$isNull": true } });
            return this;
        }
        withSkuNotContaining(val: string): this {
            this.filters.push({ "sku": { "$notContains": val } });
            return this;
        }

        withSkuStartingWith(val: string): this {
            this.filters.push({ "sku": { "$startsWith": val } });
            return this;
        }

        withSkuNotStartingWith(val: string): this {
            this.filters.push({ "sku": { "$notStartsWith": val } });
            return this;
        }

        withSkuEndingWith(val: string): this {
            this.filters.push({ "sku": { "$endsWith": val } });
            return this;
        }

        withSkuNotEndingWith(val: string): this {
            this.filters.push({ "sku": { "$notEndsWith": val } });
            return this;
        }

        withSkuSoundingLike(val: string): this {
            this.filters.push({ "sku": { "$soundLike": val } });
            return this;
        }

        withQuantityIs(val: number): this {
            this.filters.push({ "quantity": { "$eq": val } });
            return this;
        }

        withQuantityIsNot(val: number): this {
            this.filters.push({ "quantity": { "$ne": val } });
            return this;
        }

        withQuantityIn(...vals: number[]): this {
            this.filters.push({ "quantity": { "$in": vals } });
            return this;
        }

        withQuantityNotIn(...vals: number[]): this {
            this.filters.push({ "quantity": { "$notIn": vals } });
            return this;
        }

        withQuantityGreaterThan(val: number): this {
            this.filters.push({ "quantity": { "$gt": val } });
            return this;
        }

        withQuantityGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "quantity": { "$gte": val } });
            return this;
        }

        withQuantityLessThan(val: number): this {
            this.filters.push({ "quantity": { "$lt": val } });
            return this;
        }

        withQuantityLessThanOrEqualTo(val: number): this {
            this.filters.push({ "quantity": { "$lte": val } });
            return this;
        }

        withQuantityBetween(lower: number, upper: number): this {
            this.filters.push({ "quantity": { "$between": [lower, upper] } });
            return this;
        }

        withQuantityIsKnown(): this {
            this.filters.push({ "quantity": { "$isNull": false } });
            return this;
        }

        withQuantityIsUnknown(): this {
            this.filters.push({ "quantity": { "$isNull": true } });
            return this;
        }

        filterByCommercePlatform(val: any): this {
            this.filters.push({ "commercePlatform": { "$eq": val } });
            return this;
        }

        filterByCommercePlatformIn(...vals: any[]): this {
            this.filters.push({ "commercePlatform": { "$in": vals } });
            return this;
        }

        withCommercePlatformIsKnown(): this {
            this.filters.push({ "commercePlatform": { "$isNull": false } });
            return this;
        }

        withCommercePlatformIsUnknown(): this {
            this.filters.push({ "commercePlatform": { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ "createTime": { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ "createTime": { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ "createTime": { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ "createTime": { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ "createTime": { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ "createTime": { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ "createTime": { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ "createTime": { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
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



    orderByProductNameAscending(): this {
        this.query.orderBy("productName", "asc");
        return this;
    }

    orderByProductNameDescending(): this {
        this.query.orderBy("productName", "desc");
        return this;
    }

    orderBySkuAscending(): this {
        this.query.orderBy("sku", "asc");
        return this;
    }

    orderBySkuDescending(): this {
        this.query.orderBy("sku", "desc");
        return this;
    }

    orderByQuantityAscending(): this {
        this.query.orderBy("quantity", "asc");
        return this;
    }

    orderByQuantityDescending(): this {
        this.query.orderBy("quantity", "desc");
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

    minQuantity(): this {
        return this.minQuantityAs("minOfQuantity");
    }

    minQuantityAs(retName: string): this {
        this.query.aggregate("min", "quantity", retName);
        return this;
    }
    maxQuantity(): this {
        return this.maxQuantityAs("maxOfQuantity");
    }

    maxQuantityAs(retName: string): this {
        this.query.aggregate("max", "quantity", retName);
        return this;
    }
    sumQuantity(): this {
        return this.sumQuantityAs("sumOfQuantity");
    }

    sumQuantityAs(retName: string): this {
        this.query.aggregate("sum", "quantity", retName);
        return this;
    }
    avgQuantity(): this {
        return this.avgQuantityAs("avgOfQuantity");
    }

    avgQuantityAs(retName: string): this {
        this.query.aggregate("avg", "quantity", retName);
        return this;
    }
    standardDeviationQuantity(): this {
        return this.standardDeviationQuantityAs("standardDeviationOfQuantity");
    }

    standardDeviationQuantityAs(retName: string): this {
        this.query.aggregate("stddev", "quantity", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationQuantity(): this {
        return this.squareRootOfPopulationStandardDeviationQuantityAs("squareRootOfPopulationStandardDeviationOfQuantity");
    }

    squareRootOfPopulationStandardDeviationQuantityAs(retName: string): this {
        this.query.aggregate("stddev_pop", "quantity", retName);
        return this;
    }
    sampleVarianceQuantity(): this {
        return this.sampleVarianceQuantityAs("sampleVarianceOfQuantity");
    }

    sampleVarianceQuantityAs(retName: string): this {
        this.query.aggregate("var_samp", "quantity", retName);
        return this;
    }
    samplePopulationVarianceQuantity(): this {
        return this.samplePopulationVarianceQuantityAs("samplePopulationVarianceOfQuantity");
    }

    samplePopulationVarianceQuantityAs(retName: string): this {
        this.query.aggregate("var_pop", "quantity", retName);
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
    groupByCustomerOrder(): this {
        this.query.groupBy("customerOrder");
        return this;
    }

    groupByCustomerOrderAs(retName: string): this {
        this.query.groupBy("customerOrder", retName);
        return this;
    }
    groupByProduct(): this {
        this.query.groupBy("product");
        return this;
    }

    groupByProductAs(retName: string): this {
        this.query.groupBy("product", retName);
        return this;
    }
    groupByProductName(): this {
        this.query.groupBy("productName");
        return this;
    }

    groupByProductNameAs(retName: string): this {
        this.query.groupBy("productName", retName);
        return this;
    }
    groupBySku(): this {
        this.query.groupBy("sku");
        return this;
    }

    groupBySkuAs(retName: string): this {
        this.query.groupBy("sku", retName);
        return this;
    }
    groupByQuantity(): this {
        this.query.groupBy("quantity");
        return this;
    }

    groupByQuantityAs(retName: string): this {
        this.query.groupBy("quantity", retName);
        return this;
    }
    groupByCommercePlatform(): this {
        this.query.groupBy("commercePlatform");
        return this;
    }

    groupByCommercePlatformAs(retName: string): this {
        this.query.groupBy("commercePlatform", retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy("createTime");
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy("createTime", retName);
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
    facetByCustomerOrderAs(
        facetName: string,
        request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "customerOrder", request, includeAllFacets,
            { kind: "facet", method: "facetByCustomerOrderAs", relation: "customerOrder", alias: facetName });
        return this;
    }

    facetByProductAs(
        facetName: string,
        request: { readonly entityName: "Product"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "product", request, includeAllFacets,
            { kind: "facet", method: "facetByProductAs", relation: "product", alias: facetName });
        return this;
    }

    facetByCommercePlatformAs(
        facetName: string,
        request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "commercePlatform", request, includeAllFacets,
            { kind: "facet", method: "facetByCommercePlatformAs", relation: "commercePlatform", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<OrderLine>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof OrderLine
                ? row
                : OrderLine.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<OrderLine>(data);
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
    ): Promise<SmartList<OrderLine>> {
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
            row instanceof OrderLine
                ? row
                : OrderLine.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<OrderLine> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof OrderLine
                        ? entity
                        : OrderLine.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableOrderLineRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<OrderLine>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<OrderLine>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<OrderLine> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return OrderLine.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<OrderLine>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<OrderLine> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<OrderLine | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}