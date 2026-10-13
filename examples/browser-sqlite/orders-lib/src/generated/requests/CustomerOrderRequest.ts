import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { CustomerOrder } from '../models/CustomerOrder';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
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
        this.filters = this.filters.filter(filter => !("version" in filter));
        return this;
    }

    deletedRowsOnly(): this {
        this.withDeletedRows();
        this.filters.push({ version: { "$lte": -1 } });
        return this;
    }

    selectSelfFields(): this {
        this.query.select(["id", "customer", "status", "orderNumber", "orderDate", "totalAmount", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }



    selectOrderNumber(): this {
        this.query.select(["orderNumber"]);
        return this;
    }

    selectOrderDate(): this {
        this.query.select(["orderDate"]);
        return this;
    }

    selectTotalAmount(): this {
        this.query.select(["totalAmount"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectCustomerWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["customer"]);
        this.query.relationQuery(
            "customer", request.toQuery(), "customer", "id", false,
            { kind: "relation-select", method: "selectCustomerWith", relation: "customer" });
        return this;
    }
    selectStatusWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["status"]);
        this.query.relationQuery(
            "status", request.toQuery(), "status", "id", false,
            { kind: "relation-select", method: "selectStatusWith", relation: "status" });
        return this;
    }

    withCustomerMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "customer": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCustomerMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "customer": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withStatusMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "status": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutStatusMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "status": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectOrderItemListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderItemList", request.toQuery(), "id", "customerOrder", true,
            { kind: "relation-select", method: "selectOrderItemListWith", relation: "orderItemList" });
        return this;
    }

    haveOrderItems(): this {
        return this.withOrderItemListMatching({
            toQuery: () => new SelectQuery("OrderItem"),
        });
    }

    haveNoOrderItems(): this {
        return this.withoutOrderItemListMatching({
            toQuery: () => new SelectQuery("OrderItem"),
        });
    }

    withOrderItemListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutOrderItemListMatching(request: { toQuery(): SelectQuery }): this {
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
        this.countOrderItemsWith(alias, { toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderItemsAs", relation: "orderItemList", alias };
        return this;
    }

    countOrderItemsWith(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "relation-count", method: "countOrderItemsWith", relation: "orderItemList", alias });
        return this;
    }

    minQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.minQuantityOfOrderItemsAs(
            "minOfQuantityOfOrderItems", { toQuery: () => query });
    }

    minQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "minQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    maxQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.maxQuantityOfOrderItemsAs(
            "maxOfQuantityOfOrderItems", { toQuery: () => query });
    }

    maxQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "maxQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    sumQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.sumQuantityOfOrderItemsAs(
            "sumOfQuantityOfOrderItems", { toQuery: () => query });
    }

    sumQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "sumQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    avgQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.avgQuantityOfOrderItemsAs(
            "avgOfQuantityOfOrderItems", { toQuery: () => query });
    }

    avgQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "avgQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    standardDeviationQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.standardDeviationQuantityOfOrderItemsAs(
            "standardDeviationOfQuantityOfOrderItems", { toQuery: () => query });
    }

    standardDeviationQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationQuantityOfOrderItemsAs(
            "squareRootOfPopulationStandardDeviationOfQuantityOfOrderItems", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    sampleVarianceQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceQuantityOfOrderItemsAs(
            "sampleVarianceOfQuantityOfOrderItems", { toQuery: () => query });
    }

    sampleVarianceQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    samplePopulationVarianceQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceQuantityOfOrderItemsAs(
            "samplePopulationVarianceOfQuantityOfOrderItems", { toQuery: () => query });
    }

    samplePopulationVarianceQuantityOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "quantity", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceQuantityOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    minUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.minUnitPriceOfOrderItemsAs(
            "minOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    minUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "minUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    maxUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.maxUnitPriceOfOrderItemsAs(
            "maxOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    maxUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "maxUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    sumUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.sumUnitPriceOfOrderItemsAs(
            "sumOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    sumUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "sumUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    avgUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.avgUnitPriceOfOrderItemsAs(
            "avgOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    avgUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "avgUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    standardDeviationUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.standardDeviationUnitPriceOfOrderItemsAs(
            "standardDeviationOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    standardDeviationUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs(
            "squareRootOfPopulationStandardDeviationOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    sampleVarianceUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceUnitPriceOfOrderItemsAs(
            "sampleVarianceOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    sampleVarianceUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    samplePopulationVarianceUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceUnitPriceOfOrderItemsAs(
            "samplePopulationVarianceOfUnitPriceOfOrderItems", { toQuery: () => query });
    }

    samplePopulationVarianceUnitPriceOfOrderItemsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
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

        filterByCustomer(val: any): this {
            this.filters.push({ "customer": { "$eq": val } });
            return this;
        }

        filterByCustomerIn(...vals: any[]): this {
            this.filters.push({ "customer": { "$in": vals } });
            return this;
        }

        withCustomerIsKnown(): this {
            this.filters.push({ "customer": { "$isNull": false } });
            return this;
        }

        withCustomerIsUnknown(): this {
            this.filters.push({ "customer": { "$isNull": true } });
            return this;
        }

        filterByStatus(val: any): this {
            this.filters.push({ "status": { "$eq": val } });
            return this;
        }

        filterByStatusIn(...vals: any[]): this {
            this.filters.push({ "status": { "$in": vals } });
            return this;
        }

        withStatusIsKnown(): this {
            this.filters.push({ "status": { "$isNull": false } });
            return this;
        }

        withStatusIsUnknown(): this {
            this.filters.push({ "status": { "$isNull": true } });
            return this;
        }
        withStatusIsNew(): this {
            this.filters.push({ "status": { "$eq": "1001" } });
            return this;
        }
        withStatusIsPaid(): this {
            this.filters.push({ "status": { "$eq": "1002" } });
            return this;
        }
        withStatusIsCancelled(): this {
            this.filters.push({ "status": { "$eq": "1003" } });
            return this;
        }

        withOrderNumberContaining(val: string): this {
            this.filters.push({ "orderNumber": { "$contains": val } });
            return this;
        }

        withOrderNumberIs(val: string): this {
            this.filters.push({ "orderNumber": { "$eq": val } });
            return this;
        }

        withOrderNumberIsNot(val: any): this {
            this.filters.push({ "orderNumber": { "$ne": val } });
            return this;
        }

        withOrderNumberIn(...vals: any[]): this {
            this.filters.push({ "orderNumber": { "$in": vals } });
            return this;
        }

        withOrderNumberNotIn(...vals: any[]): this {
            this.filters.push({ "orderNumber": { "$notIn": vals } });
            return this;
        }

        withOrderNumberGreaterThan(val: any): this {
            this.filters.push({ "orderNumber": { "$gt": val } });
            return this;
        }

        withOrderNumberGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "orderNumber": { "$gte": val } });
            return this;
        }

        withOrderNumberLessThan(val: any): this {
            this.filters.push({ "orderNumber": { "$lt": val } });
            return this;
        }

        withOrderNumberLessThanOrEqualTo(val: any): this {
            this.filters.push({ "orderNumber": { "$lte": val } });
            return this;
        }

        withOrderNumberBetween(lower: any, upper: any): this {
            this.filters.push({ "orderNumber": { "$between": [lower, upper] } });
            return this;
        }

        withOrderNumberIsKnown(): this {
            this.filters.push({ "orderNumber": { "$isNull": false } });
            return this;
        }

        withOrderNumberIsUnknown(): this {
            this.filters.push({ "orderNumber": { "$isNull": true } });
            return this;
        }
        withOrderNumberNotContaining(val: string): this {
            this.filters.push({ "orderNumber": { "$notContains": val } });
            return this;
        }

        withOrderNumberStartingWith(val: string): this {
            this.filters.push({ "orderNumber": { "$startsWith": val } });
            return this;
        }

        withOrderNumberNotStartingWith(val: string): this {
            this.filters.push({ "orderNumber": { "$notStartsWith": val } });
            return this;
        }

        withOrderNumberEndingWith(val: string): this {
            this.filters.push({ "orderNumber": { "$endsWith": val } });
            return this;
        }

        withOrderNumberNotEndingWith(val: string): this {
            this.filters.push({ "orderNumber": { "$notEndsWith": val } });
            return this;
        }

        withOrderNumberSoundingLike(val: string): this {
            this.filters.push({ "orderNumber": { "$soundLike": val } });
            return this;
        }

        withOrderDateIs(val: any): this {
            this.filters.push({ "orderDate": { "$eq": val } });
            return this;
        }

        withOrderDateIsNot(val: any): this {
            this.filters.push({ "orderDate": { "$ne": val } });
            return this;
        }

        withOrderDateIn(...vals: any[]): this {
            this.filters.push({ "orderDate": { "$in": vals } });
            return this;
        }

        withOrderDateNotIn(...vals: any[]): this {
            this.filters.push({ "orderDate": { "$notIn": vals } });
            return this;
        }

        withOrderDateGreaterThan(val: any): this {
            this.filters.push({ "orderDate": { "$gt": val } });
            return this;
        }

        withOrderDateGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "orderDate": { "$gte": val } });
            return this;
        }

        withOrderDateLessThan(val: any): this {
            this.filters.push({ "orderDate": { "$lt": val } });
            return this;
        }

        withOrderDateLessThanOrEqualTo(val: any): this {
            this.filters.push({ "orderDate": { "$lte": val } });
            return this;
        }

        withOrderDateBetween(lower: any, upper: any): this {
            this.filters.push({ "orderDate": { "$between": [lower, upper] } });
            return this;
        }

        withOrderDateIsKnown(): this {
            this.filters.push({ "orderDate": { "$isNull": false } });
            return this;
        }

        withOrderDateIsUnknown(): this {
            this.filters.push({ "orderDate": { "$isNull": true } });
            return this;
        }

        withTotalAmountIs(val: any): this {
            this.filters.push({ "totalAmount": { "$eq": val } });
            return this;
        }

        withTotalAmountIsNot(val: any): this {
            this.filters.push({ "totalAmount": { "$ne": val } });
            return this;
        }

        withTotalAmountIn(...vals: any[]): this {
            this.filters.push({ "totalAmount": { "$in": vals } });
            return this;
        }

        withTotalAmountNotIn(...vals: any[]): this {
            this.filters.push({ "totalAmount": { "$notIn": vals } });
            return this;
        }

        withTotalAmountGreaterThan(val: any): this {
            this.filters.push({ "totalAmount": { "$gt": val } });
            return this;
        }

        withTotalAmountGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "totalAmount": { "$gte": val } });
            return this;
        }

        withTotalAmountLessThan(val: any): this {
            this.filters.push({ "totalAmount": { "$lt": val } });
            return this;
        }

        withTotalAmountLessThanOrEqualTo(val: any): this {
            this.filters.push({ "totalAmount": { "$lte": val } });
            return this;
        }

        withTotalAmountBetween(lower: any, upper: any): this {
            this.filters.push({ "totalAmount": { "$between": [lower, upper] } });
            return this;
        }

        withTotalAmountIsKnown(): this {
            this.filters.push({ "totalAmount": { "$isNull": false } });
            return this;
        }

        withTotalAmountIsUnknown(): this {
            this.filters.push({ "totalAmount": { "$isNull": true } });
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



    orderByOrderNumberAscending(): this {
        this.query.orderBy("orderNumber", "asc");
        return this;
    }

    orderByOrderNumberDescending(): this {
        this.query.orderBy("orderNumber", "desc");
        return this;
    }

    orderByOrderDateAscending(): this {
        this.query.orderBy("orderDate", "asc");
        return this;
    }

    orderByOrderDateDescending(): this {
        this.query.orderBy("orderDate", "desc");
        return this;
    }

    orderByTotalAmountAscending(): this {
        this.query.orderBy("totalAmount", "asc");
        return this;
    }

    orderByTotalAmountDescending(): this {
        this.query.orderBy("totalAmount", "desc");
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

    minTotalAmount(): this {
        return this.minTotalAmountAs("minOfTotalAmount");
    }

    minTotalAmountAs(retName: string): this {
        this.query.aggregate("min", "totalAmount", retName);
        return this;
    }
    maxTotalAmount(): this {
        return this.maxTotalAmountAs("maxOfTotalAmount");
    }

    maxTotalAmountAs(retName: string): this {
        this.query.aggregate("max", "totalAmount", retName);
        return this;
    }
    sumTotalAmount(): this {
        return this.sumTotalAmountAs("sumOfTotalAmount");
    }

    sumTotalAmountAs(retName: string): this {
        this.query.aggregate("sum", "totalAmount", retName);
        return this;
    }
    avgTotalAmount(): this {
        return this.avgTotalAmountAs("avgOfTotalAmount");
    }

    avgTotalAmountAs(retName: string): this {
        this.query.aggregate("avg", "totalAmount", retName);
        return this;
    }
    standardDeviationTotalAmount(): this {
        return this.standardDeviationTotalAmountAs("standardDeviationOfTotalAmount");
    }

    standardDeviationTotalAmountAs(retName: string): this {
        this.query.aggregate("stddev", "totalAmount", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationTotalAmount(): this {
        return this.squareRootOfPopulationStandardDeviationTotalAmountAs("squareRootOfPopulationStandardDeviationOfTotalAmount");
    }

    squareRootOfPopulationStandardDeviationTotalAmountAs(retName: string): this {
        this.query.aggregate("stddev_pop", "totalAmount", retName);
        return this;
    }
    sampleVarianceTotalAmount(): this {
        return this.sampleVarianceTotalAmountAs("sampleVarianceOfTotalAmount");
    }

    sampleVarianceTotalAmountAs(retName: string): this {
        this.query.aggregate("var_samp", "totalAmount", retName);
        return this;
    }
    samplePopulationVarianceTotalAmount(): this {
        return this.samplePopulationVarianceTotalAmountAs("samplePopulationVarianceOfTotalAmount");
    }

    samplePopulationVarianceTotalAmountAs(retName: string): this {
        this.query.aggregate("var_pop", "totalAmount", retName);
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
    groupByCustomer(): this {
        this.query.groupBy("customer");
        return this;
    }

    groupByCustomerAs(retName: string): this {
        this.query.groupBy("customer"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByStatus(): this {
        this.query.groupBy("status");
        return this;
    }

    groupByStatusAs(retName: string): this {
        this.query.groupBy("status"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByOrderNumber(): this {
        this.query.groupBy("orderNumber");
        return this;
    }

    groupByOrderNumberAs(retName: string): this {
        this.query.groupBy("orderNumber"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByOrderDate(): this {
        this.query.groupBy("orderDate");
        return this;
    }

    groupByOrderDateAs(retName: string): this {
        this.query.groupBy("orderDate"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByTotalAmount(): this {
        this.query.groupBy("totalAmount");
        return this;
    }

    groupByTotalAmountAs(retName: string): this {
        this.query.groupBy("totalAmount"); // In TS we don't alias group by yet natively
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
    facetByCustomerAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "customer", request, includeAllFacets,
            { kind: "facet", method: "facetByCustomerAs", relation: "customer", alias: facetName });
        return this;
    }

    facetByStatusAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "status", request, includeAllFacets,
            { kind: "facet", method: "facetByStatusAs", relation: "status", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<CustomerOrder>> {
        this.ensureIntent();
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
        const data = new SmartList(rows.map((row: unknown) =>
            row instanceof CustomerOrder
                ? row
                : CustomerOrder.fromRecord(row as Record<string, unknown>, new EntityRoot())));
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

    newEntity(context: UserContext): CustomerOrder {
        this.ensureIntent();
        return new CustomerOrder();
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