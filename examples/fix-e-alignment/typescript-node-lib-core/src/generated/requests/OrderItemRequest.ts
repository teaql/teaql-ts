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

    get entityName(): "OrderItem" {
        return "OrderItem";
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
        this.query.select([OrderItem.__teaqlFields.ID_PROPERTY.member, OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member, OrderItem.__teaqlFields.TENANT_PROPERTY.member, OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member, OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member, OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member, OrderItem.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([OrderItem.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }



    selectProductName(): this {
        this.query.select([OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]);
        return this;
    }

    selectUnitPrice(): this {
        this.query.select([OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]);
        return this;
    }

    selectCreateTime(): this {
        this.query.select([OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select([OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([OrderItem.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPurchaseOrderWith(request: { readonly entityName: "PurchaseOrder"; toQuery(): SelectQuery }): this {
        this.query.select([OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]);
        this.query.relationQuery(
            OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member, request.toQuery(), OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPurchaseOrderWith", relation: OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member });
        return this;
    }
    selectTenantWith(request: { readonly entityName: "Tenant"; toQuery(): SelectQuery }): this {
        this.query.select([OrderItem.__teaqlFields.TENANT_PROPERTY.member]);
        this.query.relationQuery(
            OrderItem.__teaqlFields.TENANT_PROPERTY.member, request.toQuery(), OrderItem.__teaqlFields.TENANT_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectTenantWith", relation: OrderItem.__teaqlFields.TENANT_PROPERTY.member });
        return this;
    }

    withPurchaseOrderMatching(request: { readonly entityName: "PurchaseOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPurchaseOrderMatching(request: { readonly entityName: "PurchaseOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withTenantMatching(request: { readonly entityName: "Tenant"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [OrderItem.__teaqlFields.TENANT_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutTenantMatching(request: { readonly entityName: "Tenant"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [OrderItem.__teaqlFields.TENANT_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByPurchaseOrder(val: any): this {
            this.filters.push({ [OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPurchaseOrderIn(...vals: any[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPurchaseOrderIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPurchaseOrderIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByTenant(val: any): this {
            this.filters.push({ [OrderItem.__teaqlFields.TENANT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByTenantIn(...vals: any[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.TENANT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withTenantIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.TENANT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withTenantIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.TENANT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withProductNameContaining(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withProductNameIs(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withProductNameIsNot(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withProductNameIn(...vals: string[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withProductNameNotIn(...vals: string[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withProductNameGreaterThan(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withProductNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withProductNameLessThan(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withProductNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withProductNameBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withProductNameIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withProductNameIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withProductNameNotContaining(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withProductNameStartingWith(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withProductNameNotStartingWith(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withProductNameEndingWith(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withProductNameNotEndingWith(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withProductNameSoundingLike(val: string): this {
            this.filters.push({ [OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withUnitPriceIs(val: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUnitPriceIsNot(val: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUnitPriceIn(...vals: Decimal[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUnitPriceNotIn(...vals: Decimal[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUnitPriceGreaterThan(val: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUnitPriceGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUnitPriceLessThan(val: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUnitPriceLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUnitPriceBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUnitPriceIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUnitPriceIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [OrderItem.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }



    orderByProductNameAscending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByProductNameDescending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member, "desc");
        return this;
    }

    orderByUnitPriceAscending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, "asc");
        return this;
    }

    orderByUnitPriceDescending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, "desc");
        return this;
    }

    orderByCreateTimeAscending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(OrderItem.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.aggregate("min", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    maxUnitPrice(): this {
        return this.maxUnitPriceAs("maxOfUnitPrice");
    }

    maxUnitPriceAs(retName: string): this {
        this.query.aggregate("max", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    sumUnitPrice(): this {
        return this.sumUnitPriceAs("sumOfUnitPrice");
    }

    sumUnitPriceAs(retName: string): this {
        this.query.aggregate("sum", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    avgUnitPrice(): this {
        return this.avgUnitPriceAs("avgOfUnitPrice");
    }

    avgUnitPriceAs(retName: string): this {
        this.query.aggregate("avg", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    standardDeviationUnitPrice(): this {
        return this.standardDeviationUnitPriceAs("standardDeviationOfUnitPrice");
    }

    standardDeviationUnitPriceAs(retName: string): this {
        this.query.aggregate("stddev", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationUnitPrice(): this {
        return this.squareRootOfPopulationStandardDeviationUnitPriceAs("squareRootOfPopulationStandardDeviationOfUnitPrice");
    }

    squareRootOfPopulationStandardDeviationUnitPriceAs(retName: string): this {
        this.query.aggregate("stddev_pop", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    sampleVarianceUnitPrice(): this {
        return this.sampleVarianceUnitPriceAs("sampleVarianceOfUnitPrice");
    }

    sampleVarianceUnitPriceAs(retName: string): this {
        this.query.aggregate("var_samp", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVarianceUnitPrice(): this {
        return this.samplePopulationVarianceUnitPriceAs("samplePopulationVarianceOfUnitPrice");
    }

    samplePopulationVarianceUnitPriceAs(retName: string): this {
        this.query.aggregate("var_pop", OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }

    // --- Group By ---
    groupById(): this {
        this.query.groupBy(OrderItem.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByPurchaseOrder(): this {
        this.query.groupBy(OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member);
        return this;
    }

    groupByPurchaseOrderAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member, retName);
        return this;
    }
    groupByTenant(): this {
        this.query.groupBy(OrderItem.__teaqlFields.TENANT_PROPERTY.member);
        return this;
    }

    groupByTenantAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.TENANT_PROPERTY.member, retName);
        return this;
    }
    groupByProductName(): this {
        this.query.groupBy(OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member);
        return this;
    }

    groupByProductNameAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.PRODUCT_NAME_PROPERTY.member, retName);
        return this;
    }
    groupByUnitPrice(): this {
        this.query.groupBy(OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member);
        return this;
    }

    groupByUnitPriceAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.UNIT_PRICE_PROPERTY.member, retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy(OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member);
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.CREATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy(OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.UPDATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(OrderItem.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(OrderItem.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPurchaseOrderAs(
        facetName: string,
        request: { readonly entityName: "PurchaseOrder"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPurchaseOrderAs", relation: OrderItem.__teaqlFields.PURCHASE_ORDER_PROPERTY.member, alias: facetName });
        return this;
    }

    facetByTenantAs(
        facetName: string,
        request: { readonly entityName: "Tenant"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, OrderItem.__teaqlFields.TENANT_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByTenantAs", relation: OrderItem.__teaqlFields.TENANT_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<OrderItem>> {
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
        const aggregateOnly = pageQuery.aggregateItems.length > 0;
        const data = new SmartList<OrderItem>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof OrderItem
                ? row
                : OrderItem.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
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
        if (preparedQuery.aggregateItems.length > 0 || preparedQuery.groupByItems.length > 0) {
            throw new Error("Entity streams require entity rows; use a record or aggregation query");
        }
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

    async newEntity(context: UserContext): Promise<OrderItem> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return OrderItem.teaqlCreate(context);
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