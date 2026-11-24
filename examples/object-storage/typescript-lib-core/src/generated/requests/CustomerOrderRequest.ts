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
        this.query.select([CustomerOrder.__teaqlFields.ID_PROPERTY.member, CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
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


    selectVersion(): this {
        this.query.select([CustomerOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectCommercePlatformWith(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.query.select([CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request.toQuery(), CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCommercePlatformWith", relation: CustomerOrder.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member });
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

    selectOrderAttachmentListWith(request: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderAttachmentList", request.toQuery(), "id", "customerOrder", true,
            { kind: "relation-select", method: "selectOrderAttachmentListWith", relation: "orderAttachmentList" });
        return this;
    }

    haveOrderAttachments(): this {
        return this.withOrderAttachmentListMatching({
            entityName: "OrderAttachment",
            toQuery: () => new SelectQuery("OrderAttachment"),
        });
    }

    haveNoOrderAttachments(): this {
        return this.withoutOrderAttachmentListMatching({
            entityName: "OrderAttachment",
            toQuery: () => new SelectQuery("OrderAttachment"),
        });
    }

    withOrderAttachmentListMatching(request: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutOrderAttachmentListMatching(request: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    countOrderAttachments(): this {
        return this.countOrderAttachmentsAs("countOrderAttachments");
    }

    countOrderAttachmentsAs(alias: string): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        this.countOrderAttachmentsWith(alias, { entityName: "OrderAttachment", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderAttachmentsAs", relation: "orderAttachmentList", alias };
        return this;
    }

    countOrderAttachmentsWith(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "relation-count", method: "countOrderAttachmentsWith", relation: "orderAttachmentList", alias });
        return this;
    }

    minContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.minContentLengthOfOrderAttachmentsAs(
            "minOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    minContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "minContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    maxContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.maxContentLengthOfOrderAttachmentsAs(
            "maxOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    maxContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "maxContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    sumContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.sumContentLengthOfOrderAttachmentsAs(
            "sumOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    sumContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "sumContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    avgContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.avgContentLengthOfOrderAttachmentsAs(
            "avgOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    avgContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "avgContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    standardDeviationContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.standardDeviationContentLengthOfOrderAttachmentsAs(
            "standardDeviationOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    standardDeviationContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationContentLengthOfOrderAttachmentsAs(
            "squareRootOfPopulationStandardDeviationOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    sampleVarianceContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceContentLengthOfOrderAttachmentsAs(
            "sampleVarianceOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    sampleVarianceContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
        return this;
    }
    samplePopulationVarianceContentLengthOfOrderAttachments(): this {
        const query = new SelectQuery("OrderAttachment").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceContentLengthOfOrderAttachmentsAs(
            "samplePopulationVarianceOfContentLengthOfOrderAttachments", { entityName: "OrderAttachment", toQuery: () => query });
    }

    samplePopulationVarianceContentLengthOfOrderAttachmentsAs(alias: string, child: { readonly entityName: "OrderAttachment"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "contentLength", alias);
        this.query.relationAggregate("orderAttachmentList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceContentLengthOfOrderAttachmentsAs", relation: "orderAttachmentList", alias });
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
    groupByOrderNumber(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member);
        return this;
    }

    groupByOrderNumberAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.ORDER_NUMBER_PROPERTY.member, retName);
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
    groupByVersion(): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(CustomerOrder.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
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