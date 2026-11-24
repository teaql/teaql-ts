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
        this.query.select([CustomerOrder.__teaqlFields.ID_PROPERTY.member, CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, CustomerOrder.__teaqlFields.ORDER_DATE_PROPERTY.member, CustomerOrder.__teaqlFields.TOTAL_AMOUNT_PROPERTY.member, CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
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

    selectVersion(): this {
        this.query.select([CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectCustomerWith(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCustomerWith", relation: CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member });
        return this;
    }
    selectStatusWith(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectStatusWith", relation: CustomerOrder.__teaqlFields.STATUS_PROPERTY.member });
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

    selectOrderItemListWith(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderItemList", request.toQuery(), "id", "customerOrder", true,
            { kind: "relation-select", method: "selectOrderItemListWith", relation: "orderItemList" });
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

    minQuantityOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.minQuantityOfOrderItemsAs(
            "minOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    minQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "maxOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    maxQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "sumOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    sumQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "avgOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    avgQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "standardDeviationOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    standardDeviationQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "squareRootOfPopulationStandardDeviationOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "sampleVarianceOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    sampleVarianceQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "samplePopulationVarianceOfQuantityOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    samplePopulationVarianceQuantityOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "minOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    minUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "maxOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    maxUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "sumOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    sumUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "avgOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    avgUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "standardDeviationOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    standardDeviationUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "squareRootOfPopulationStandardDeviationOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "sampleVarianceOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    sampleVarianceUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
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
            "samplePopulationVarianceOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    samplePopulationVarianceUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
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
        withStatusIsNew(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$eq": "1001" } });
            return this;
        }
        withStatusIsPaid(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$eq": "1002" } });
            return this;
        }
        withStatusIsCancelled(): this {
            this.filters.push({ [CustomerOrder.__teaqlFields.STATUS_PROPERTY.member]: { "$eq": "1003" } });
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
    groupByCustomer(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member);
        return this;
    }

    groupByCustomerAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, retName);
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
    groupByVersion(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByCustomerAs(
        facetName: string,
        request: { readonly entityName: "Customer"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByCustomerAs", relation: CustomerOrder.__teaqlFields.CUSTOMER_PROPERTY.member, alias: facetName });
        return this;
    }

    facetByStatusAs(
        facetName: string,
        request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByStatusAs", relation: CustomerOrder.__teaqlFields.STATUS_PROPERTY.member, alias: facetName });
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