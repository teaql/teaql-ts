import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { WorkItem } from '../models/WorkItem';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
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

    get entityName(): "WorkItem" {
        return "WorkItem";
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
        this.query.select([WorkItem.__teaqlFields.ID_PROPERTY.member, WorkItem.__teaqlFields.TITLE_PROPERTY.member, WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member, WorkItem.__teaqlFields.PLATFORM_PROPERTY.member, WorkItem.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([WorkItem.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }

    selectTitle(): this {
        this.query.select([WorkItem.__teaqlFields.TITLE_PROPERTY.member]);
        return this;
    }

    selectDescription(): this {
        this.query.select([WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]);
        return this;
    }


    selectVersion(): this {
        this.query.select([WorkItem.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPlatformWith(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.query.select([WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            WorkItem.__teaqlFields.PLATFORM_PROPERTY.member, request.toQuery(), WorkItem.__teaqlFields.PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: WorkItem.__teaqlFields.PLATFORM_PROPERTY.member });
        return this;
    }

    withPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withTitleContaining(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withTitleIs(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withTitleIsNot(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withTitleIn(...vals: string[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withTitleNotIn(...vals: string[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withTitleGreaterThan(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withTitleGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withTitleLessThan(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withTitleLessThanOrEqualTo(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withTitleBetween(lower: string, upper: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withTitleIsKnown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withTitleIsUnknown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withTitleNotContaining(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withTitleStartingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withTitleNotStartingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withTitleEndingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withTitleNotEndingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withTitleSoundingLike(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.TITLE_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withDescriptionContaining(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withDescriptionIs(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withDescriptionIsNot(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withDescriptionIn(...vals: string[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withDescriptionNotIn(...vals: string[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withDescriptionGreaterThan(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withDescriptionGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withDescriptionLessThan(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withDescriptionLessThanOrEqualTo(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withDescriptionBetween(lower: string, upper: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withDescriptionIsKnown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withDescriptionIsUnknown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withDescriptionNotContaining(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withDescriptionStartingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withDescriptionNotStartingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withDescriptionEndingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withDescriptionNotEndingWith(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withDescriptionSoundingLike(val: string): this {
            this.filters.push({ [WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        filterByPlatform(val: any): this {
            this.filters.push({ [WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPlatformIsKnown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPlatformIsUnknown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [WorkItem.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }

    orderByTitleAscending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.TITLE_PROPERTY.member, "asc");
        return this;
    }

    orderByTitleDescending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.TITLE_PROPERTY.member, "desc");
        return this;
    }

    orderByDescriptionAscending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member, "asc");
        return this;
    }

    orderByDescriptionDescending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member, "desc");
        return this;
    }


    orderByVersionAscending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(WorkItem.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(WorkItem.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(WorkItem.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByTitle(): this {
        this.query.groupBy(WorkItem.__teaqlFields.TITLE_PROPERTY.member);
        return this;
    }

    groupByTitleAs(retName: string): this {
        this.query.groupBy(WorkItem.__teaqlFields.TITLE_PROPERTY.member, retName);
        return this;
    }
    groupByDescription(): this {
        this.query.groupBy(WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member);
        return this;
    }

    groupByDescriptionAs(retName: string): this {
        this.query.groupBy(WorkItem.__teaqlFields.DESCRIPTION_PROPERTY.member, retName);
        return this;
    }
    groupByPlatform(): this {
        this.query.groupBy(WorkItem.__teaqlFields.PLATFORM_PROPERTY.member);
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy(WorkItem.__teaqlFields.PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(WorkItem.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(WorkItem.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPlatformAs(
        facetName: string,
        request: { readonly entityName: "Platform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, WorkItem.__teaqlFields.PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: WorkItem.__teaqlFields.PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<WorkItem>> {
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
        const aggregateOnly = pageQuery.aggregateItems.length > 0;
        const data = new SmartList<WorkItem>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof WorkItem
                ? row
                : WorkItem.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
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
        if (preparedQuery.aggregateItems.length > 0 || preparedQuery.groupByItems.length > 0) {
            throw new Error("Entity streams require entity rows; use a record or aggregation query");
        }
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

    async newEntity(context: UserContext): Promise<WorkItem> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return WorkItem.teaqlCreate(context);
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