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
        this.query.select([CustomerOrder.__teaqlFields.ID_PROPERTY.member, CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member, CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
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

    selectOrderDate(): this {
        this.query.select([CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]);
        return this;
    }

    selectTotalAmount(): this {
        this.query.select([CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]);
        return this;
    }




    selectCreateTime(): this {
        this.query.select([CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select([CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectStatusWith(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectStatusWith", relation: CustomerOrder.__teaqlFields.STATUS_PROPERTY.member });
        return this;
    }
    selectCustomerWith(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCustomerWith", relation: CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member });
        return this;
    }
    selectCommercePlatformWith(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCommercePlatformWith", relation: CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member });
        return this;
    }

    withStatusMatching(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutStatusMatching(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withCustomerMatching(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCustomerMatching(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectOrderLineListWith(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderLineList", request.toQuery(), "id", "customerOrder", true,
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
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutOrderLineListMatching(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "customerOrder",
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

        withOrderDateIs(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withOrderDateIsNot(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withOrderDateIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withOrderDateNotIn(...vals: string[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withOrderDateGreaterThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withOrderDateGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withOrderDateLessThan(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withOrderDateLessThanOrEqualTo(val: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withOrderDateBetween(lower: string, upper: string): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withOrderDateIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withOrderDateIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withTotalAmountIs(val: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withTotalAmountIsNot(val: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withTotalAmountIn(...vals: Decimal[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withTotalAmountNotIn(...vals: Decimal[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withTotalAmountGreaterThan(val: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withTotalAmountGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withTotalAmountLessThan(val: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withTotalAmountLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withTotalAmountBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withTotalAmountIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withTotalAmountIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByStatus(val: any): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByStatusIn(...vals: any[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withStatusIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withStatusIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withStatusIsPending(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$eq": "1001" } });
            return this;
        }
        withStatusIsConfirmed(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$eq": "1002" } });
            return this;
        }

        filterByCustomer(val: any): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByCustomerIn(...vals: any[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCustomerIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCustomerIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByCommercePlatform(val: any): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByCommercePlatformIn(...vals: any[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCommercePlatformIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCommercePlatformIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": true } });
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

    orderByOrderDateAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member, "asc");
        return this;
    }

    orderByOrderDateDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member, "desc");
        return this;
    }

    orderByTotalAmountAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, "asc");
        return this;
    }

    orderByTotalAmountDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, "desc");
        return this;
    }




    orderByCreateTimeAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy(CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, "desc");
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

    minTotalAmount(): this {
        return this.minTotalAmountAs("minOfTotalAmount");
    }

    minTotalAmountAs(retName: string): this {
        this.query.aggregate("min", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    maxTotalAmount(): this {
        return this.maxTotalAmountAs("maxOfTotalAmount");
    }

    maxTotalAmountAs(retName: string): this {
        this.query.aggregate("max", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    sumTotalAmount(): this {
        return this.sumTotalAmountAs("sumOfTotalAmount");
    }

    sumTotalAmountAs(retName: string): this {
        this.query.aggregate("sum", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    avgTotalAmount(): this {
        return this.avgTotalAmountAs("avgOfTotalAmount");
    }

    avgTotalAmountAs(retName: string): this {
        this.query.aggregate("avg", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    standardDeviationTotalAmount(): this {
        return this.standardDeviationTotalAmountAs("standardDeviationOfTotalAmount");
    }

    standardDeviationTotalAmountAs(retName: string): this {
        this.query.aggregate("stddev", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationTotalAmount(): this {
        return this.squareRootOfPopulationStandardDeviationTotalAmountAs("squareRootOfPopulationStandardDeviationOfTotalAmount");
    }

    squareRootOfPopulationStandardDeviationTotalAmountAs(retName: string): this {
        this.query.aggregate("stddev_pop", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    sampleVarianceTotalAmount(): this {
        return this.sampleVarianceTotalAmountAs("sampleVarianceOfTotalAmount");
    }

    sampleVarianceTotalAmountAs(retName: string): this {
        this.query.aggregate("var_samp", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVarianceTotalAmount(): this {
        return this.samplePopulationVarianceTotalAmountAs("samplePopulationVarianceOfTotalAmount");
    }

    samplePopulationVarianceTotalAmountAs(retName: string): this {
        this.query.aggregate("var_pop", CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
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
    groupByOrderNumber(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member);
        return this;
    }

    groupByOrderNumberAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, retName);
        return this;
    }
    groupByOrderDate(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member);
        return this;
    }

    groupByOrderDateAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member, retName);
        return this;
    }
    groupByTotalAmount(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member);
        return this;
    }

    groupByTotalAmountAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, retName);
        return this;
    }
    groupByStatus(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.STATUS_PROPERTY.member);
        return this;
    }

    groupByStatusAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, retName);
        return this;
    }
    groupByCustomer(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member);
        return this;
    }

    groupByCustomerAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, retName);
        return this;
    }
    groupByCommercePlatform(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member);
        return this;
    }

    groupByCommercePlatformAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member);
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, retName);
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
    facetByStatusAs(
        facetName: string,
        request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByStatusAs", relation: CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, alias: facetName });
        return this;
    }

    facetByCustomerAs(
        facetName: string,
        request: { readonly entityName: "Customer"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByCustomerAs", relation: CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, alias: facetName });
        return this;
    }

    facetByCommercePlatformAs(
        facetName: string,
        request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByCommercePlatformAs", relation: CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, alias: facetName });
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