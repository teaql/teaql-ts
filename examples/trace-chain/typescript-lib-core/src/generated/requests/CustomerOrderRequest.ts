import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { CustomerOrder } from '../models/CustomerOrder';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class CustomerOrderRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("CustomerOrder");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "CustomerOrder" {
        return "CustomerOrder";
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

    purpose(p: string): ExecutableCustomerOrderRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableCustomerOrderRequest(
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
        this.query.select([CustomerOrder.__teaqlFields.ID_PROPERTY.member, CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member, CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member, CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([CustomerOrder.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }


    selectOrderNumber(): this {
        this.query.select([CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]);
        return this;
    }

    selectDescription(): this {
        this.query.select([CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPlatformWith(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member });
        return this;
    }

    withPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectOrderItemListWith(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderItemList", request.toQuery(), "id", "customerOrder", true,
            { kind: "relation-select", method: "selectOrderItemListWith", relation: "orderItemList" });
        return this;
    }
    selectPaymentListWith(request: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "paymentList", request.toQuery(), "id", "customerOrder", true,
            { kind: "relation-select", method: "selectPaymentListWith", relation: "paymentList" });
        return this;
    }
    selectShipmentListWith(request: { readonly entityName: "Shipment"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "shipmentList", request.toQuery(), "id", "customerOrder", true,
            { kind: "relation-select", method: "selectShipmentListWith", relation: "shipmentList" });
        return this;
    }

    haveOrderItems(): this {
        return this.withOrderItemListMatching({
            entityName: "OrderItem",
            toQuery: () => new SelectQuery("OrderItem"),
        });
    }

    haveNoOrderItems(): this {
        return this.withoutOrderItemListMatching({
            entityName: "OrderItem",
            toQuery: () => new SelectQuery("OrderItem"),
        });
    }

    withOrderItemListMatching(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutOrderItemListMatching(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }
    havePayments(): this {
        return this.withPaymentListMatching({
            entityName: "Payment",
            toQuery: () => new SelectQuery("Payment"),
        });
    }

    haveNoPayments(): this {
        return this.withoutPaymentListMatching({
            entityName: "Payment",
            toQuery: () => new SelectQuery("Payment"),
        });
    }

    withPaymentListMatching(request: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutPaymentListMatching(request: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }
    haveShipments(): this {
        return this.withShipmentListMatching({
            entityName: "Shipment",
            toQuery: () => new SelectQuery("Shipment"),
        });
    }

    haveNoShipments(): this {
        return this.withoutShipmentListMatching({
            entityName: "Shipment",
            toQuery: () => new SelectQuery("Shipment"),
        });
    }

    withShipmentListMatching(request: { readonly entityName: "Shipment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutShipmentListMatching(request: { readonly entityName: "Shipment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    countOrderItems(): this {
        return this.countOrderItemsAs("countOrderItems");
    }

    countOrderItemsAs(alias: string): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        this.countOrderItemsWith(alias, { entityName: "OrderItem", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderItemsAs", relation: "orderItemList", alias };
        return this;
    }

    countOrderItemsWith(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "relation-count", method: "countOrderItemsWith", relation: "orderItemList", alias });
        return this;
    }


    countPayments(): this {
        return this.countPaymentsAs("countPayments");
    }

    countPaymentsAs(alias: string): this {
        const query = new SelectQuery("Payment").filter({ version: { "$gte": 1 } });
        this.countPaymentsWith(alias, { entityName: "Payment", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countPaymentsAs", relation: "paymentList", alias };
        return this;
    }

    countPaymentsWith(alias: string, child: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("paymentList", alias, query, true,
            { kind: "relation-count", method: "countPaymentsWith", relation: "paymentList", alias });
        return this;
    }


    countShipments(): this {
        return this.countShipmentsAs("countShipments");
    }

    countShipmentsAs(alias: string): this {
        const query = new SelectQuery("Shipment").filter({ version: { "$gte": 1 } });
        this.countShipmentsWith(alias, { entityName: "Shipment", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countShipmentsAs", relation: "shipmentList", alias };
        return this;
    }

    countShipmentsWith(alias: string, child: { readonly entityName: "Shipment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("shipmentList", alias, query, true,
            { kind: "relation-count", method: "countShipmentsWith", relation: "shipmentList", alias });
        return this;
    }



        withIdIs(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByPlatform(val: any): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPlatformIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPlatformIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withOrderNumberContaining(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withOrderNumberIs(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withOrderNumberIsNot(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withOrderNumberIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withOrderNumberNotIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withOrderNumberGreaterThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withOrderNumberGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withOrderNumberLessThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withOrderNumberLessThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withOrderNumberBetween(lower: string, upper: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withOrderNumberIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withOrderNumberIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withOrderNumberNotContaining(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withOrderNumberStartingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withOrderNumberNotStartingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withOrderNumberEndingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withOrderNumberNotEndingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withOrderNumberSoundingLike(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withDescriptionContaining(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withDescriptionIs(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withDescriptionIsNot(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withDescriptionIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withDescriptionNotIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withDescriptionGreaterThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withDescriptionGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withDescriptionLessThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withDescriptionLessThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withDescriptionBetween(lower: string, upper: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withDescriptionIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withDescriptionIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withDescriptionNotContaining(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withDescriptionStartingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withDescriptionNotStartingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withDescriptionEndingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withDescriptionNotEndingWith(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withDescriptionSoundingLike(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }


    orderByOrderNumberAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, "asc");
        return this;
    }

    orderByOrderNumberDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, "desc");
        return this;
    }

    orderByDescriptionAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member, "asc");
        return this;
    }

    orderByDescriptionDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(CustomerOrder.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByPlatform(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member);
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupByOrderNumber(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member);
        return this;
    }

    groupByOrderNumberAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, retName);
        return this;
    }
    groupByDescription(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member);
        return this;
    }

    groupByDescriptionAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.DESCRIPTION_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPlatformAs(
        facetName: string,
        request: { readonly entityName: "Platform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: CustomerOrder.__teaqlFields.PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<CustomerOrder>> {
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
            row instanceof CustomerOrder
                ? row
                : CustomerOrder.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<CustomerOrder>(data);
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
    ): Promise<SmartList<CustomerOrder>> {
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
        const data = new SmartList<CustomerOrder>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof CustomerOrder
                ? row
                : CustomerOrder.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<CustomerOrder> {
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
                    yield entity instanceof CustomerOrder
                        ? entity
                        : CustomerOrder.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableCustomerOrderRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<CustomerOrder>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<CustomerOrder>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<CustomerOrder> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return CustomerOrder.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<CustomerOrder>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<CustomerOrder> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<CustomerOrder | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}