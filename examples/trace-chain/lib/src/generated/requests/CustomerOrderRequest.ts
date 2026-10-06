import { EntityRoot, QueryIntent, SelectQuery, SmartList, TeaQLDataService, TeaQLPage, UserContext, executeRelationFacets } from '../../teaql-ts';
import { CustomerOrder } from '../models/CustomerOrder';



export class CustomerOrderRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

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

    purpose(p: string): ExecutableCustomerOrderRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableCustomerOrderRequest(
            (context) => this.executeForListInternal(context),
            (context) => this.executeForRowsInternal(context),
            (context, offset, limit) => this.executeForPageInternal(context, offset, limit),
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
        this.query.select(["id", "platform", "orderNumber", "description", "version"]);
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

    selectDescription(): this {
        this.query.select(["description"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectPlatformWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["platform"]);
        this.query.relationQuery(
            "platform", request.toQuery(), "platform", "id", false);
        return this;
    }

    withPlatformMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "platform": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "platform": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectOrderItemListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderItemList", request.toQuery(), "id", "customerOrder", true);
        return this;
    }
    selectPaymentListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "paymentList", request.toQuery(), "id", "customerOrder", true);
        return this;
    }
    selectShipmentListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "shipmentList", request.toQuery(), "id", "customerOrder", true);
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
    havePayments(): this {
        return this.withPaymentListMatching({
            toQuery: () => new SelectQuery("Payment"),
        });
    }

    haveNoPayments(): this {
        return this.withoutPaymentListMatching({
            toQuery: () => new SelectQuery("Payment"),
        });
    }

    withPaymentListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutPaymentListMatching(request: { toQuery(): SelectQuery }): this {
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
            toQuery: () => new SelectQuery("Shipment"),
        });
    }

    haveNoShipments(): this {
        return this.withoutShipmentListMatching({
            toQuery: () => new SelectQuery("Shipment"),
        });
    }

    withShipmentListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "customerOrder",
                },
            },
        });
        return this;
    }

    withoutShipmentListMatching(request: { toQuery(): SelectQuery }): this {
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
        return this.countOrderItemsWith(alias, { toQuery: () => query });
    }

    countOrderItemsWith(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("Count", "id", alias);
        this.query.relationAggregate("orderItemList", alias, child.toQuery(), true);
        return this;
    }


    countPayments(): this {
        return this.countPaymentsAs("countPayments");
    }

    countPaymentsAs(alias: string): this {
        const query = new SelectQuery("Payment").filter({ version: { "$gte": 1 } });
        return this.countPaymentsWith(alias, { toQuery: () => query });
    }

    countPaymentsWith(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("Count", "id", alias);
        this.query.relationAggregate("paymentList", alias, child.toQuery(), true);
        return this;
    }


    countShipments(): this {
        return this.countShipmentsAs("countShipments");
    }

    countShipmentsAs(alias: string): this {
        const query = new SelectQuery("Shipment").filter({ version: { "$gte": 1 } });
        return this.countShipmentsWith(alias, { toQuery: () => query });
    }

    countShipmentsWith(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("Count", "id", alias);
        this.query.relationAggregate("shipmentList", alias, child.toQuery(), true);
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

        filterByPlatform(val: any): this {
            this.filters.push({ "platform": { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ "platform": { "$in": vals } });
            return this;
        }

        withPlatformIsKnown(): this {
            this.filters.push({ "platform": { "$isNull": false } });
            return this;
        }

        withPlatformIsUnknown(): this {
            this.filters.push({ "platform": { "$isNull": true } });
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

        withDescriptionContaining(val: string): this {
            this.filters.push({ "description": { "$contains": val } });
            return this;
        }

        withDescriptionIs(val: string): this {
            this.filters.push({ "description": { "$eq": val } });
            return this;
        }

        withDescriptionIsNot(val: any): this {
            this.filters.push({ "description": { "$ne": val } });
            return this;
        }

        withDescriptionIn(...vals: any[]): this {
            this.filters.push({ "description": { "$in": vals } });
            return this;
        }

        withDescriptionNotIn(...vals: any[]): this {
            this.filters.push({ "description": { "$notIn": vals } });
            return this;
        }

        withDescriptionGreaterThan(val: any): this {
            this.filters.push({ "description": { "$gt": val } });
            return this;
        }

        withDescriptionGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "description": { "$gte": val } });
            return this;
        }

        withDescriptionLessThan(val: any): this {
            this.filters.push({ "description": { "$lt": val } });
            return this;
        }

        withDescriptionLessThanOrEqualTo(val: any): this {
            this.filters.push({ "description": { "$lte": val } });
            return this;
        }

        withDescriptionBetween(lower: any, upper: any): this {
            this.filters.push({ "description": { "$between": [lower, upper] } });
            return this;
        }

        withDescriptionIsKnown(): this {
            this.filters.push({ "description": { "$isNull": false } });
            return this;
        }

        withDescriptionIsUnknown(): this {
            this.filters.push({ "description": { "$isNull": true } });
            return this;
        }
        withDescriptionNotContaining(val: string): this {
            this.filters.push({ "description": { "$notContains": val } });
            return this;
        }

        withDescriptionStartingWith(val: string): this {
            this.filters.push({ "description": { "$startsWith": val } });
            return this;
        }

        withDescriptionNotStartingWith(val: string): this {
            this.filters.push({ "description": { "$notStartsWith": val } });
            return this;
        }

        withDescriptionEndingWith(val: string): this {
            this.filters.push({ "description": { "$endsWith": val } });
            return this;
        }

        withDescriptionNotEndingWith(val: string): this {
            this.filters.push({ "description": { "$notEndsWith": val } });
            return this;
        }

        withDescriptionSoundingLike(val: string): this {
            this.filters.push({ "description": { "$soundLike": val } });
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

    orderByDescriptionAscending(): this {
        this.query.orderBy("description", "asc");
        return this;
    }

    orderByDescriptionDescending(): this {
        this.query.orderBy("description", "desc");
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
        return this;
    }

    countAs(retName: string): this {
        this.query.aggregate("Count", "id", retName);
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
    groupByPlatform(): this {
        this.query.groupBy("platform");
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy("platform"); // In TS we don't alias group by yet natively
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
    groupByDescription(): this {
        this.query.groupBy("description");
        return this;
    }

    groupByDescriptionAs(retName: string): this {
        this.query.groupBy("description"); // In TS we don't alias group by yet natively
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
    facetByPlatformAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "platform", request, includeAllFacets);
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<CustomerOrder>> {
        this.ensureIntent();
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

    private async executeForPageInternal(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<CustomerOrder>> {
        this.ensureIntent();
        const candidate = this.query.clone().offset(offset).limit(limit);
        if (this.filters.length > 0) candidate.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const query = context.prepareQuery(candidate);
        const useIdSet = query.localIdSetPaginationOptions() !== undefined;
        const totalCountBeforeRows = useIdSet ? undefined : await service.executeCount(query);
        const rows = await service.executeQuery(query);
        const totalCount = useIdSet && context.idSetPaginationCountAccuracy === "EXACT"
            ? context.idSetPaginationCount!
            : (totalCountBeforeRows ?? await service.executeCount(query));
        const data = new SmartList(rows.map((row: unknown) =>
            row instanceof CustomerOrder
                ? row
                : CustomerOrder.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        return { data, totalCount, offset, limit };
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<CustomerOrder> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const query = context.prepareQuery(this.query.clone());
        const chunks = service.executeForStream(query, chunkSize);
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
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableCustomerOrderRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<CustomerOrder>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly page: (
            context: UserContext, offset: number, limit: number,
        ) => Promise<TeaQLPage<CustomerOrder>>,
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

    executeForPage(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<CustomerOrder>> {
        this.ensureIntent();
        return this.page(context, offset, limit);
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