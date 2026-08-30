import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, TeaQLPage, UserContext } from '../../teaql-ts';
import { WorkItem } from '../models/WorkItem';



export class WorkItemRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor(minimal = false) {
        this.query = new SelectQuery("WorkItem");
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

    purpose(p: string): ExecutableWorkItemRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableWorkItemRequest(
            (context) => this.executeForListInternal(context),
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

    limit(n: number): this {
        this.query.limit(n);
        return this;
    }

    offset(n: number): this {
        this.query.offset(n);
        return this;
    }

    toQuery(): SelectQuery {
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
        this.query.select(["id", "title", "description", "platform", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }

    selectTitle(): this {
        this.query.select(["title"]);
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


        withIdIs(val: any): this {
            this.filters.push({ "id": { "$eq": val } });
            return this;
        }

        withIdIn(...vals: any[]): this {
            this.filters.push({ "id": { "$in": vals } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$gte": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$lte": val } });
            return this;
        }

        withTitleContaining(val: string): this {
            this.filters.push({ "title": { "$contains": val } });
            return this;
        }

        withTitleIs(val: string): this {
            this.filters.push({ "title": { "$eq": val } });
            return this;
        }

        withTitleIn(...vals: string[]): this {
            this.filters.push({ "title": { "$in": vals } });
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

        withDescriptionIn(...vals: string[]): this {
            this.filters.push({ "description": { "$in": vals } });
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

        withVersionIs(val: any): this {
            this.filters.push({ "version": { "$eq": val } });
            return this;
        }

        withVersionIn(...vals: any[]): this {
            this.filters.push({ "version": { "$in": vals } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$gte": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$lte": val } });
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

    orderByTitleAscending(): this {
        this.query.orderBy("title", "asc");
        return this;
    }

    orderByTitleDescending(): this {
        this.query.orderBy("title", "desc");
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
    groupByTitle(): this {
        this.query.groupBy("title");
        return this;
    }

    groupByTitleAs(retName: string): this {
        this.query.groupBy("title"); // In TS we don't alias group by yet natively
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
    groupByPlatform(): this {
        this.query.groupBy("platform");
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy("platform"); // In TS we don't alias group by yet natively
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
    facetByPlatformAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "PLATFORM_PROPERTY", request);
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<WorkItem>> {
        this.ensureIntent();
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const queryRoot = new EntityRoot();
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof WorkItem
                ? row
                : WorkItem.fromRecord(row as Record<string, unknown>, queryRoot));
        const result = new SmartList<WorkItem>(data);
        if (aggregateOnly && rows[0]) Object.assign(result.aggregations, rows[0]);

        if (this.query.facets && this.query.facets.length > 0) {
            for (const f of this.query.facets) {
                if (this.filters.length > 0) {
                    f.query.filter({ "$and": this.filters });
                }
                result.facets[f.facetName] = new SmartList(
                    await service.executeQuery(context.prepareQuery(f.query)));
            }
        }

        return result;
    }

    private async executeForPageInternal(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<WorkItem>> {
        this.ensureIntent();
        this.query.offset(offset).limit(limit);
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const totalCount = await service.executeCount(this.query);
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const queryRoot = new EntityRoot();
        const data = new SmartList(rows.map((row: unknown) =>
            row instanceof WorkItem
                ? row
                : WorkItem.fromRecord(row as Record<string, unknown>, queryRoot)));
        data.totalCount = totalCount;
        return { data, totalCount, offset, limit };
    }

    private async *executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<WorkItem> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const queryRoot = new EntityRoot();
        for await (const chunk of service.executeForStream(this.query, chunkSize)) {
            for (const entity of chunk) {
                yield entity instanceof WorkItem
                    ? entity
                    : WorkItem.fromRecord(entity as Record<string, unknown>, queryRoot);
            }
        }
    }

    private ensureIntent(): void {
        if (!this._comment?.trim()) {
            throw new Error("Security audit failure: non-empty comment() is required before execution");
        }
        if (!this._purpose?.trim()) {
            throw new Error("Security audit failure: non-empty purpose() is required before execution");
        }
    }

}

export class ExecutableWorkItemRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<WorkItem>>,
        private readonly page: (
            context: UserContext, offset: number, limit: number,
        ) => Promise<TeaQLPage<WorkItem>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<WorkItem>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): WorkItem {
        this.ensureIntent();
        return new WorkItem();
    }

    executeForList(context: UserContext): Promise<SmartList<WorkItem>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForPage(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<WorkItem>> {
        this.ensureIntent();
        return this.page(context, offset, limit);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<WorkItem> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<WorkItem | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}