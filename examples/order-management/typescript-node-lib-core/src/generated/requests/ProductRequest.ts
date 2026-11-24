import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Product } from '../models/Product';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class ProductRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Product");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "Product" {
        return "Product";
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

    purpose(p: string): ExecutableProductRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableProductRequest(
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
        this.query.select([Product.__teaqlFields.ID_PROPERTY.member, Product.__teaqlFields.NAME_PROPERTY.member, Product.__teaqlFields.SKU_PROPERTY.member, Product.__teaqlFields.IMAGE_URL_PROPERTY.member, Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, Product.__teaqlFields.CREATE_TIME_PROPERTY.member, Product.__teaqlFields.UPDATE_TIME_PROPERTY.member, Product.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([Product.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }

    selectName(): this {
        this.query.select([Product.__teaqlFields.NAME_PROPERTY.member]);
        return this;
    }

    selectSku(): this {
        this.query.select([Product.__teaqlFields.SKU_PROPERTY.member]);
        return this;
    }

    selectImageUrl(): this {
        this.query.select([Product.__teaqlFields.IMAGE_URL_PROPERTY.member]);
        return this;
    }


    selectCreateTime(): this {
        this.query.select([Product.__teaqlFields.CREATE_TIME_PROPERTY.member]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select([Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([Product.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectCommercePlatformWith(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.query.select([Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request.toQuery(), Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCommercePlatformWith", relation: Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member });
        return this;
    }

    withCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectOrderLineListWith(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderLineList", request.toQuery(), "id", "product", true,
            { kind: "relation-select", method: "selectOrderLineListWith", relation: "orderLineList" });
        return this;
    }

    haveOrderLines(): this {
        return this.withOrderLineListMatching({
            entityName: "OrderLine",
            toQuery: () => new SelectQuery("OrderLine"),
        });
    }

    haveNoOrderLines(): this {
        return this.withoutOrderLineListMatching({
            entityName: "OrderLine",
            toQuery: () => new SelectQuery("OrderLine"),
        });
    }

    withOrderLineListMatching(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "product",
                },
            },
        });
        return this;
    }

    withoutOrderLineListMatching(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "product",
                },
            },
        });
        return this;
    }

    countOrderLines(): this {
        return this.countOrderLinesAs("countOrderLines");
    }

    countOrderLinesAs(alias: string): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        this.countOrderLinesWith(alias, { entityName: "OrderLine", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderLinesAs", relation: "orderLineList", alias };
        return this;
    }

    countOrderLinesWith(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "relation-count", method: "countOrderLinesWith", relation: "orderLineList", alias });
        return this;
    }

    minQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.minQuantityOfOrderLinesAs(
            "minOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    minQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "minQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    maxQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.maxQuantityOfOrderLinesAs(
            "maxOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    maxQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "maxQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    sumQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.sumQuantityOfOrderLinesAs(
            "sumOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    sumQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "sumQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    avgQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.avgQuantityOfOrderLinesAs(
            "avgOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    avgQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "avgQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    standardDeviationQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.standardDeviationQuantityOfOrderLinesAs(
            "standardDeviationOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    standardDeviationQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationQuantityOfOrderLinesAs(
            "squareRootOfPopulationStandardDeviationOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    sampleVarianceQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceQuantityOfOrderLinesAs(
            "sampleVarianceOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    sampleVarianceQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }
    samplePopulationVarianceQuantityOfOrderLines(): this {
        const query = new SelectQuery("OrderLine").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceQuantityOfOrderLinesAs(
            "samplePopulationVarianceOfQuantityOfOrderLines", { entityName: "OrderLine", toQuery: () => query });
    }

    samplePopulationVarianceQuantityOfOrderLinesAs(alias: string, child: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "quantity", alias);
        this.query.relationAggregate("orderLineList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceQuantityOfOrderLinesAs", relation: "orderLineList", alias });
        return this;
    }

        withIdIs(val: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withNameContaining(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ [Product.__teaqlFields.NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withSkuContaining(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withSkuIs(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withSkuIsNot(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withSkuIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withSkuNotIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withSkuGreaterThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withSkuGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withSkuLessThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withSkuLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withSkuBetween(lower: string, upper: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withSkuIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withSkuIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withSkuNotContaining(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withSkuStartingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withSkuNotStartingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withSkuEndingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withSkuNotEndingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withSkuSoundingLike(val: string): this {
            this.filters.push({ [Product.__teaqlFields.SKU_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withImageUrlContaining(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withImageUrlIs(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withImageUrlIsNot(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withImageUrlIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withImageUrlNotIn(...vals: string[]): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withImageUrlGreaterThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withImageUrlGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withImageUrlLessThan(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withImageUrlLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withImageUrlBetween(lower: string, upper: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withImageUrlIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withImageUrlIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withImageUrlNotContaining(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withImageUrlStartingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withImageUrlNotStartingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withImageUrlEndingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withImageUrlNotEndingWith(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withImageUrlSoundingLike(val: string): this {
            this.filters.push({ [Product.__teaqlFields.IMAGE_URL_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        filterByCommercePlatform(val: any): this {
            this.filters.push({ [Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByCommercePlatformIn(...vals: any[]): this {
            this.filters.push({ [Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCommercePlatformIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCommercePlatformIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [Product.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(Product.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(Product.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }

    orderByNameAscending(): this {
        this.query.orderBy(Product.__teaqlFields.NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy(Product.__teaqlFields.NAME_PROPERTY.member, "desc");
        return this;
    }

    orderBySkuAscending(): this {
        this.query.orderBy(Product.__teaqlFields.SKU_PROPERTY.member, "asc");
        return this;
    }

    orderBySkuDescending(): this {
        this.query.orderBy(Product.__teaqlFields.SKU_PROPERTY.member, "desc");
        return this;
    }

    orderByImageUrlAscending(): this {
        this.query.orderBy(Product.__teaqlFields.IMAGE_URL_PROPERTY.member, "asc");
        return this;
    }

    orderByImageUrlDescending(): this {
        this.query.orderBy(Product.__teaqlFields.IMAGE_URL_PROPERTY.member, "desc");
        return this;
    }


    orderByCreateTimeAscending(): this {
        this.query.orderBy(Product.__teaqlFields.CREATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy(Product.__teaqlFields.CREATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy(Product.__teaqlFields.UPDATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy(Product.__teaqlFields.UPDATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(Product.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(Product.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(Product.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy(Product.__teaqlFields.NAME_PROPERTY.member);
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.NAME_PROPERTY.member, retName);
        return this;
    }
    groupBySku(): this {
        this.query.groupBy(Product.__teaqlFields.SKU_PROPERTY.member);
        return this;
    }

    groupBySkuAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.SKU_PROPERTY.member, retName);
        return this;
    }
    groupByImageUrl(): this {
        this.query.groupBy(Product.__teaqlFields.IMAGE_URL_PROPERTY.member);
        return this;
    }

    groupByImageUrlAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.IMAGE_URL_PROPERTY.member, retName);
        return this;
    }
    groupByCommercePlatform(): this {
        this.query.groupBy(Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member);
        return this;
    }

    groupByCommercePlatformAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy(Product.__teaqlFields.CREATE_TIME_PROPERTY.member);
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.CREATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy(Product.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.UPDATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(Product.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(Product.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByCommercePlatformAs(
        facetName: string,
        request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByCommercePlatformAs", relation: Product.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<Product>> {
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
            row instanceof Product
                ? row
                : Product.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Product>(data);
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
    ): Promise<SmartList<Product>> {
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
        const data = new SmartList<Product>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Product
                ? row
                : Product.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Product> {
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
                    yield entity instanceof Product
                        ? entity
                        : Product.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableProductRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Product>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Product>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<Product> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return Product.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<Product>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Product> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Product | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}