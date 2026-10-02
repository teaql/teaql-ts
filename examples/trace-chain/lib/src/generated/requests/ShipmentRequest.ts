import { EntityRoot, QueryIntent, SelectQuery, SmartList, TeaQLDataService, TeaQLPage, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Shipment } from '../models/Shipment';



export class ShipmentRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor(minimal = false) {
        this.query = new SelectQuery("Shipment");
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

    purpose(p: string): ExecutableShipmentRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableShipmentRequest(
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
        this.query.select(["id", "customerOrder", "referenceCode", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }


    selectReferenceCode(): this {
        this.query.select(["referenceCode"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectCustomerOrderWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["customerOrder"]);
        this.query.relationQuery(
            "customerOrder", request.toQuery(), "customerOrder", "id", false);
        return this;
    }

    withCustomerOrderMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "customerOrder": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCustomerOrderMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "customerOrder": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
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

        filterByCustomerOrder(val: any): this {
            this.filters.push({ "customerOrder": { "$eq": val } });
            return this;
        }

        filterByCustomerOrderIn(...vals: any[]): this {
            this.filters.push({ "customerOrder": { "$in": vals } });
            return this;
        }

        withCustomerOrderIsKnown(): this {
            this.filters.push({ "customerOrder": { "$isNull": false } });
            return this;
        }

        withCustomerOrderIsUnknown(): this {
            this.filters.push({ "customerOrder": { "$isNull": true } });
            return this;
        }

        withReferenceCodeContaining(val: string): this {
            this.filters.push({ "referenceCode": { "$contains": val } });
            return this;
        }

        withReferenceCodeIs(val: string): this {
            this.filters.push({ "referenceCode": { "$eq": val } });
            return this;
        }

        withReferenceCodeIsNot(val: any): this {
            this.filters.push({ "referenceCode": { "$ne": val } });
            return this;
        }

        withReferenceCodeIn(...vals: any[]): this {
            this.filters.push({ "referenceCode": { "$in": vals } });
            return this;
        }

        withReferenceCodeNotIn(...vals: any[]): this {
            this.filters.push({ "referenceCode": { "$notIn": vals } });
            return this;
        }

        withReferenceCodeGreaterThan(val: any): this {
            this.filters.push({ "referenceCode": { "$gt": val } });
            return this;
        }

        withReferenceCodeGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "referenceCode": { "$gte": val } });
            return this;
        }

        withReferenceCodeLessThan(val: any): this {
            this.filters.push({ "referenceCode": { "$lt": val } });
            return this;
        }

        withReferenceCodeLessThanOrEqualTo(val: any): this {
            this.filters.push({ "referenceCode": { "$lte": val } });
            return this;
        }

        withReferenceCodeBetween(lower: any, upper: any): this {
            this.filters.push({ "referenceCode": { "$between": [lower, upper] } });
            return this;
        }

        withReferenceCodeIsKnown(): this {
            this.filters.push({ "referenceCode": { "$isNull": false } });
            return this;
        }

        withReferenceCodeIsUnknown(): this {
            this.filters.push({ "referenceCode": { "$isNull": true } });
            return this;
        }
        withReferenceCodeNotContaining(val: string): this {
            this.filters.push({ "referenceCode": { "$notContains": val } });
            return this;
        }

        withReferenceCodeStartingWith(val: string): this {
            this.filters.push({ "referenceCode": { "$startsWith": val } });
            return this;
        }

        withReferenceCodeNotStartingWith(val: string): this {
            this.filters.push({ "referenceCode": { "$notStartsWith": val } });
            return this;
        }

        withReferenceCodeEndingWith(val: string): this {
            this.filters.push({ "referenceCode": { "$endsWith": val } });
            return this;
        }

        withReferenceCodeNotEndingWith(val: string): this {
            this.filters.push({ "referenceCode": { "$notEndsWith": val } });
            return this;
        }

        withReferenceCodeSoundingLike(val: string): this {
            this.filters.push({ "referenceCode": { "$soundLike": val } });
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


    orderByReferenceCodeAscending(): this {
        this.query.orderBy("referenceCode", "asc");
        return this;
    }

    orderByReferenceCodeDescending(): this {
        this.query.orderBy("referenceCode", "desc");
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
    groupByCustomerOrder(): this {
        this.query.groupBy("customerOrder");
        return this;
    }

    groupByCustomerOrderAs(retName: string): this {
        this.query.groupBy("customerOrder"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByReferenceCode(): this {
        this.query.groupBy("referenceCode");
        return this;
    }

    groupByReferenceCodeAs(retName: string): this {
        this.query.groupBy("referenceCode"); // In TS we don't alias group by yet natively
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
    facetByCustomerOrderAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "customerOrder", request, includeAllFacets);
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<Shipment>> {
        this.ensureIntent();
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const queryRoot = new EntityRoot();
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Shipment
                ? row
                : Shipment.fromRecord(row as Record<string, unknown>, queryRoot));
        const result = new SmartList<Shipment>(data);
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
    ): Promise<TeaQLPage<Shipment>> {
        this.ensureIntent();
        this.query.offset(offset).limit(limit);
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const useIdSet = this.query.localIdSetPaginationOptions() !== undefined;
        const totalCountBeforeRows = useIdSet ? undefined : await service.executeCount(this.query);
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const totalCount = useIdSet && context.idSetPaginationCountAccuracy === "EXACT"
            ? context.idSetPaginationCount!
            : (totalCountBeforeRows ?? await service.executeCount(this.query));
        const queryRoot = new EntityRoot();
        const data = new SmartList(rows.map((row: unknown) =>
            row instanceof Shipment
                ? row
                : Shipment.fromRecord(row as Record<string, unknown>, queryRoot)));
        data.totalCount = totalCount;
        return { data, totalCount, offset, limit };
    }

    private async *executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Shipment> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const queryRoot = new EntityRoot();
        for await (const chunk of service.executeForStream(this.query, chunkSize)) {
            for (const entity of chunk) {
                yield entity instanceof Shipment
                    ? entity
                    : Shipment.fromRecord(entity as Record<string, unknown>, queryRoot);
            }
        }
    }

    private ensureIntent(): void {
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableShipmentRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Shipment>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly page: (
            context: UserContext, offset: number, limit: number,
        ) => Promise<TeaQLPage<Shipment>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Shipment>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): Shipment {
        this.ensureIntent();
        return new Shipment();
    }

    executeForList(context: UserContext): Promise<SmartList<Shipment>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForPage(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<Shipment>> {
        this.ensureIntent();
        return this.page(context, offset, limit);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Shipment> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Shipment | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}