import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Customer } from '../models/Customer';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class CustomerRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Customer");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "Customer" {
        return "Customer";
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

    purpose(p: string): ExecutableCustomerRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableCustomerRequest(
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
        this.query.select(["id", "name", "email", "commercePlatform", "createTime", "updateTime", "version"]);
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

    selectEmail(): this {
        this.query.select(["email"]);
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


    selectCommercePlatformWith(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.query.select(["commercePlatform"]);
        this.query.relationQuery(
            "commercePlatform", request.toQuery(), "commercePlatform", "id", false,
            { kind: "relation-select", method: "selectCommercePlatformWith", relation: "commercePlatform" });
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

    selectCustomerOrderListWith(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "customerOrderList", request.toQuery(), "id", "customer", true,
            { kind: "relation-select", method: "selectCustomerOrderListWith", relation: "customerOrderList" });
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
                    query: request.toQuery(), field: "customer",
                },
            },
        });
        return this;
    }

    withoutCustomerOrderListMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "customer",
                },
            },
        });
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

        withEmailContaining(val: string): this {
            this.filters.push({ "email": { "$contains": val } });
            return this;
        }

        withEmailIs(val: string): this {
            this.filters.push({ "email": { "$eq": val } });
            return this;
        }

        withEmailIsNot(val: string): this {
            this.filters.push({ "email": { "$ne": val } });
            return this;
        }

        withEmailIn(...vals: string[]): this {
            this.filters.push({ "email": { "$in": vals } });
            return this;
        }

        withEmailNotIn(...vals: string[]): this {
            this.filters.push({ "email": { "$notIn": vals } });
            return this;
        }

        withEmailGreaterThan(val: string): this {
            this.filters.push({ "email": { "$gt": val } });
            return this;
        }

        withEmailGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "email": { "$gte": val } });
            return this;
        }

        withEmailLessThan(val: string): this {
            this.filters.push({ "email": { "$lt": val } });
            return this;
        }

        withEmailLessThanOrEqualTo(val: string): this {
            this.filters.push({ "email": { "$lte": val } });
            return this;
        }

        withEmailBetween(lower: string, upper: string): this {
            this.filters.push({ "email": { "$between": [lower, upper] } });
            return this;
        }

        withEmailIsKnown(): this {
            this.filters.push({ "email": { "$isNull": false } });
            return this;
        }

        withEmailIsUnknown(): this {
            this.filters.push({ "email": { "$isNull": true } });
            return this;
        }
        withEmailNotContaining(val: string): this {
            this.filters.push({ "email": { "$notContains": val } });
            return this;
        }

        withEmailStartingWith(val: string): this {
            this.filters.push({ "email": { "$startsWith": val } });
            return this;
        }

        withEmailNotStartingWith(val: string): this {
            this.filters.push({ "email": { "$notStartsWith": val } });
            return this;
        }

        withEmailEndingWith(val: string): this {
            this.filters.push({ "email": { "$endsWith": val } });
            return this;
        }

        withEmailNotEndingWith(val: string): this {
            this.filters.push({ "email": { "$notEndsWith": val } });
            return this;
        }

        withEmailSoundingLike(val: string): this {
            this.filters.push({ "email": { "$soundLike": val } });
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

    orderByEmailAscending(): this {
        this.query.orderBy("email", "asc");
        return this;
    }

    orderByEmailDescending(): this {
        this.query.orderBy("email", "desc");
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
    groupByEmail(): this {
        this.query.groupBy("email");
        return this;
    }

    groupByEmailAs(retName: string): this {
        this.query.groupBy("email", retName);
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
    facetByCommercePlatformAs(
        facetName: string,
        request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "commercePlatform", request, includeAllFacets,
            { kind: "facet", method: "facetByCommercePlatformAs", relation: "commercePlatform", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<Customer>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Customer
                ? row
                : Customer.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Customer>(data);
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
    ): Promise<SmartList<Customer>> {
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
            row instanceof Customer
                ? row
                : Customer.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Customer> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof Customer
                        ? entity
                        : Customer.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableCustomerRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Customer>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Customer>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<Customer> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return Customer.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<Customer>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Customer> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Customer | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}