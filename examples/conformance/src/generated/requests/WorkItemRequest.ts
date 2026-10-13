import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { WorkItem } from '../models/WorkItem';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class WorkItemRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

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

    purpose(p: string): ExecutableWorkItemRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableWorkItemRequest(
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
            "platform", request.toQuery(), "platform", "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: "platform" });
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

        withTitleContaining(val: string): this {
            this.filters.push({ "title": { "$contains": val } });
            return this;
        }

        withTitleIs(val: string): this {
            this.filters.push({ "title": { "$eq": val } });
            return this;
        }

        withTitleIsNot(val: any): this {
            this.filters.push({ "title": { "$ne": val } });
            return this;
        }

        withTitleIn(...vals: any[]): this {
            this.filters.push({ "title": { "$in": vals } });
            return this;
        }

        withTitleNotIn(...vals: any[]): this {
            this.filters.push({ "title": { "$notIn": vals } });
            return this;
        }

        withTitleGreaterThan(val: any): this {
            this.filters.push({ "title": { "$gt": val } });
            return this;
        }

        withTitleGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "title": { "$gte": val } });
            return this;
        }

        withTitleLessThan(val: any): this {
            this.filters.push({ "title": { "$lt": val } });
            return this;
        }

        withTitleLessThanOrEqualTo(val: any): this {
            this.filters.push({ "title": { "$lte": val } });
            return this;
        }

        withTitleBetween(lower: any, upper: any): this {
            this.filters.push({ "title": { "$between": [lower, upper] } });
            return this;
        }

        withTitleIsKnown(): this {
            this.filters.push({ "title": { "$isNull": false } });
            return this;
        }

        withTitleIsUnknown(): this {
            this.filters.push({ "title": { "$isNull": true } });
            return this;
        }
        withTitleNotContaining(val: string): this {
            this.filters.push({ "title": { "$notContains": val } });
            return this;
        }

        withTitleStartingWith(val: string): this {
            this.filters.push({ "title": { "$startsWith": val } });
            return this;
        }

        withTitleNotStartingWith(val: string): this {
            this.filters.push({ "title": { "$notStartsWith": val } });
            return this;
        }

        withTitleEndingWith(val: string): this {
            this.filters.push({ "title": { "$endsWith": val } });
            return this;
        }

        withTitleNotEndingWith(val: string): this {
            this.filters.push({ "title": { "$notEndsWith": val } });
            return this;
        }

        withTitleSoundingLike(val: string): this {
            this.filters.push({ "title": { "$soundLike": val } });
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
    facetByPlatformAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "platform", request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: "platform", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<WorkItem>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof WorkItem
                ? row
                : WorkItem.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<WorkItem>(data);
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
    ): Promise<SmartList<WorkItem>> {
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
            row instanceof WorkItem
                ? row
                : WorkItem.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<WorkItem> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof WorkItem
                        ? entity
                        : WorkItem.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableWorkItemRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<WorkItem>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
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

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
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