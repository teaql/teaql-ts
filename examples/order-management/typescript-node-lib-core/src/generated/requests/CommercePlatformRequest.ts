import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { CommercePlatform } from '../models/CommercePlatform';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class CommercePlatformRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("CommercePlatform");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "CommercePlatform" {
        return "CommercePlatform";
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

    purpose(p: string): ExecutableCommercePlatformRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableCommercePlatformRequest(
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
        this.query.select(["id", "name", "createTime", "updateTime", "version"]);
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




    selectCustomerListWith(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "customerList", request.toQuery(), "id", "commercePlatform", true,
            { kind: "relation-select", method: "selectCustomerListWith", relation: "customerList" });
        return this;
    }
    selectOrderStatusListWith(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderStatusList", request.toQuery(), "id", "commercePlatform", true,
            { kind: "relation-select", method: "selectOrderStatusListWith", relation: "orderStatusList" });
        return this;
    }
    selectCustomerOrderListWith(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "customerOrderList", request.toQuery(), "id", "commercePlatform", true,
            { kind: "relation-select", method: "selectCustomerOrderListWith", relation: "customerOrderList" });
        return this;
    }
    selectProductListWith(request: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "productList", request.toQuery(), "id", "commercePlatform", true,
            { kind: "relation-select", method: "selectProductListWith", relation: "productList" });
        return this;
    }
    selectOrderLineListWith(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderLineList", request.toQuery(), "id", "commercePlatform", true,
            { kind: "relation-select", method: "selectOrderLineListWith", relation: "orderLineList" });
        return this;
    }
    selectOrderSearchPresetListWith(request: { readonly entityName: "OrderSearchPreset"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderSearchPresetList", request.toQuery(), "id", "commercePlatform", true,
            { kind: "relation-select", method: "selectOrderSearchPresetListWith", relation: "orderSearchPresetList" });
        return this;
    }

    haveCustomers(): this {
        return this.withCustomerListMatching({
            entityName: "Customer",
            toQuery: () => new SelectQuery("Customer"),
        });
    }

    haveNoCustomers(): this {
        return this.withoutCustomerListMatching({
            entityName: "Customer",
            toQuery: () => new SelectQuery("Customer"),
        });
    }

    withCustomerListMatching(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    withoutCustomerListMatching(request: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }
    haveOrderStatuses(): this {
        return this.withOrderStatusListMatching({
            entityName: "OrderStatus",
            toQuery: () => new SelectQuery("OrderStatus"),
        });
    }

    haveNoOrderStatuses(): this {
        return this.withoutOrderStatusListMatching({
            entityName: "OrderStatus",
            toQuery: () => new SelectQuery("OrderStatus"),
        });
    }

    withOrderStatusListMatching(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    withoutOrderStatusListMatching(request: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }
    haveCustomerOrders(): this {
        return this.withCustomerOrderListMatching({
            entityName: "CustomerOrder",
            toQuery: () => new SelectQuery("CustomerOrder"),
        });
    }

    haveNoCustomerOrders(): this {
        return this.withoutCustomerOrderListMatching({
            entityName: "CustomerOrder",
            toQuery: () => new SelectQuery("CustomerOrder"),
        });
    }

    withCustomerOrderListMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    withoutCustomerOrderListMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }
    haveProducts(): this {
        return this.withProductListMatching({
            entityName: "Product",
            toQuery: () => new SelectQuery("Product"),
        });
    }

    haveNoProducts(): this {
        return this.withoutProductListMatching({
            entityName: "Product",
            toQuery: () => new SelectQuery("Product"),
        });
    }

    withProductListMatching(request: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    withoutProductListMatching(request: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
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
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    withoutOrderLineListMatching(request: { readonly entityName: "OrderLine"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }
    haveOrderSearchPresets(): this {
        return this.withOrderSearchPresetListMatching({
            entityName: "OrderSearchPreset",
            toQuery: () => new SelectQuery("OrderSearchPreset"),
        });
    }

    haveNoOrderSearchPresets(): this {
        return this.withoutOrderSearchPresetListMatching({
            entityName: "OrderSearchPreset",
            toQuery: () => new SelectQuery("OrderSearchPreset"),
        });
    }

    withOrderSearchPresetListMatching(request: { readonly entityName: "OrderSearchPreset"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    withoutOrderSearchPresetListMatching(request: { readonly entityName: "OrderSearchPreset"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "commercePlatform",
                },
            },
        });
        return this;
    }

    countCustomers(): this {
        return this.countCustomersAs("countCustomers");
    }

    countCustomersAs(alias: string): this {
        const query = new SelectQuery("Customer").filter({ version: { "$gte": 1 } });
        this.countCustomersWith(alias, { entityName: "Customer", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countCustomersAs", relation: "customerList", alias };
        return this;
    }

    countCustomersWith(alias: string, child: { readonly entityName: "Customer"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("customerList", alias, query, true,
            { kind: "relation-count", method: "countCustomersWith", relation: "customerList", alias });
        return this;
    }


    countOrderStatuses(): this {
        return this.countOrderStatusesAs("countOrderStatuses");
    }

    countOrderStatusesAs(alias: string): this {
        const query = new SelectQuery("OrderStatus").filter({ version: { "$gte": 1 } });
        this.countOrderStatusesWith(alias, { entityName: "OrderStatus", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderStatusesAs", relation: "orderStatusList", alias };
        return this;
    }

    countOrderStatusesWith(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "minOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    minDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "maxOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    maxDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "sumOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    sumDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "avgOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    avgDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "standardDeviationOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    standardDeviationDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "squareRootOfPopulationStandardDeviationOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "sampleVarianceOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    sampleVarianceDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
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
            "samplePopulationVarianceOfDisplayOrderOfOrderStatuses", { entityName: "OrderStatus", toQuery: () => query });
    }

    samplePopulationVarianceDisplayOrderOfOrderStatusesAs(alias: string, child: { readonly entityName: "OrderStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "displayOrder", alias);
        this.query.relationAggregate("orderStatusList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceDisplayOrderOfOrderStatusesAs", relation: "orderStatusList", alias });
        return this;
    }
    countCustomerOrders(): this {
        return this.countCustomerOrdersAs("countCustomerOrders");
    }

    countCustomerOrdersAs(alias: string): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        this.countCustomerOrdersWith(alias, { entityName: "CustomerOrder", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countCustomerOrdersAs", relation: "customerOrderList", alias };
        return this;
    }

    countCustomerOrdersWith(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "relation-count", method: "countCustomerOrdersWith", relation: "customerOrderList", alias });
        return this;
    }

    minTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.minTotalAmountOfCustomerOrdersAs(
            "minOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    minTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "minTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    maxTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.maxTotalAmountOfCustomerOrdersAs(
            "maxOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    maxTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "maxTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    sumTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.sumTotalAmountOfCustomerOrdersAs(
            "sumOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    sumTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "sumTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    avgTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.avgTotalAmountOfCustomerOrdersAs(
            "avgOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    avgTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "avgTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    standardDeviationTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.standardDeviationTotalAmountOfCustomerOrdersAs(
            "standardDeviationOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    standardDeviationTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationTotalAmountOfCustomerOrdersAs(
            "squareRootOfPopulationStandardDeviationOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    sampleVarianceTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceTotalAmountOfCustomerOrdersAs(
            "sampleVarianceOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    sampleVarianceTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    samplePopulationVarianceTotalAmountOfCustomerOrders(): this {
        const query = new SelectQuery("CustomerOrder").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceTotalAmountOfCustomerOrdersAs(
            "samplePopulationVarianceOfTotalAmountOfCustomerOrders", { entityName: "CustomerOrder", toQuery: () => query });
    }

    samplePopulationVarianceTotalAmountOfCustomerOrdersAs(alias: string, child: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "totalAmount", alias);
        this.query.relationAggregate("customerOrderList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceTotalAmountOfCustomerOrdersAs", relation: "customerOrderList", alias });
        return this;
    }
    countProducts(): this {
        return this.countProductsAs("countProducts");
    }

    countProductsAs(alias: string): this {
        const query = new SelectQuery("Product").filter({ version: { "$gte": 1 } });
        this.countProductsWith(alias, { entityName: "Product", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countProductsAs", relation: "productList", alias };
        return this;
    }

    countProductsWith(alias: string, child: { readonly entityName: "Product"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("productList", alias, query, true,
            { kind: "relation-count", method: "countProductsWith", relation: "productList", alias });
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
    countOrderSearchPresets(): this {
        return this.countOrderSearchPresetsAs("countOrderSearchPresets");
    }

    countOrderSearchPresetsAs(alias: string): this {
        const query = new SelectQuery("OrderSearchPreset").filter({ version: { "$gte": 1 } });
        this.countOrderSearchPresetsWith(alias, { entityName: "OrderSearchPreset", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderSearchPresetsAs", relation: "orderSearchPresetList", alias };
        return this;
    }

    countOrderSearchPresetsWith(alias: string, child: { readonly entityName: "OrderSearchPreset"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderSearchPresetList", alias, query, true,
            { kind: "relation-count", method: "countOrderSearchPresetsWith", relation: "orderSearchPresetList", alias });
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

        withNameContaining(val: string): this {
            this.filters.push({ "name": { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ "name": { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ "name": { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ "name": { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ "name": { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ "name": { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "name": { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ "name": { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ "name": { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
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

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ "updateTime": { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ "updateTime": { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ "updateTime": { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ "updateTime": { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ "updateTime": { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ "updateTime": { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ "updateTime": { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ "updateTime": { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
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

    orderByNameAscending(): this {
        this.query.orderBy("name", "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy("name", "desc");
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


    // --- Group By ---
    groupById(): this {
        this.query.groupBy("id");
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy("id", retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy("name");
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy("name", retName);
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
    groupByUpdateTime(): this {
        this.query.groupBy("updateTime");
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy("updateTime", retName);
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

    private async executeForListInternal(context: UserContext): Promise<SmartList<CommercePlatform>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof CommercePlatform
                ? row
                : CommercePlatform.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<CommercePlatform>(data);
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
    ): Promise<SmartList<CommercePlatform>> {
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
            row instanceof CommercePlatform
                ? row
                : CommercePlatform.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<CommercePlatform> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof CommercePlatform
                        ? entity
                        : CommercePlatform.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableCommercePlatformRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<CommercePlatform>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<CommercePlatform>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<CommercePlatform> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return CommercePlatform.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<CommercePlatform>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<CommercePlatform> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<CommercePlatform | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}