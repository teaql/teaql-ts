import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { TaskExecutionLog } from '../models/TaskExecutionLog';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class TaskExecutionLogRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("TaskExecutionLog");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "TaskExecutionLog" {
        return "TaskExecutionLog";
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

    purpose(p: string): ExecutableTaskExecutionLogRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableTaskExecutionLogRequest(
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
        this.query.select(["id", "task", "action", "detail", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }


    selectAction(): this {
        this.query.select(["action"]);
        return this;
    }

    selectDetail(): this {
        this.query.select(["detail"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectTaskWith(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.query.select(["task"]);
        this.query.relationQuery(
            "task", request.toQuery(), "task", "id", false,
            { kind: "relation-select", method: "selectTaskWith", relation: "task" });
        return this;
    }

    withTaskMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "task": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutTaskMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "task": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
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

        filterByTask(val: any): this {
            this.filters.push({ "task": { "$eq": val } });
            return this;
        }

        filterByTaskIn(...vals: any[]): this {
            this.filters.push({ "task": { "$in": vals } });
            return this;
        }

        withTaskIsKnown(): this {
            this.filters.push({ "task": { "$isNull": false } });
            return this;
        }

        withTaskIsUnknown(): this {
            this.filters.push({ "task": { "$isNull": true } });
            return this;
        }

        withActionContaining(val: string): this {
            this.filters.push({ "action": { "$contains": val } });
            return this;
        }

        withActionIs(val: string): this {
            this.filters.push({ "action": { "$eq": val } });
            return this;
        }

        withActionIsNot(val: string): this {
            this.filters.push({ "action": { "$ne": val } });
            return this;
        }

        withActionIn(...vals: string[]): this {
            this.filters.push({ "action": { "$in": vals } });
            return this;
        }

        withActionNotIn(...vals: string[]): this {
            this.filters.push({ "action": { "$notIn": vals } });
            return this;
        }

        withActionGreaterThan(val: string): this {
            this.filters.push({ "action": { "$gt": val } });
            return this;
        }

        withActionGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "action": { "$gte": val } });
            return this;
        }

        withActionLessThan(val: string): this {
            this.filters.push({ "action": { "$lt": val } });
            return this;
        }

        withActionLessThanOrEqualTo(val: string): this {
            this.filters.push({ "action": { "$lte": val } });
            return this;
        }

        withActionBetween(lower: string, upper: string): this {
            this.filters.push({ "action": { "$between": [lower, upper] } });
            return this;
        }

        withActionIsKnown(): this {
            this.filters.push({ "action": { "$isNull": false } });
            return this;
        }

        withActionIsUnknown(): this {
            this.filters.push({ "action": { "$isNull": true } });
            return this;
        }
        withActionNotContaining(val: string): this {
            this.filters.push({ "action": { "$notContains": val } });
            return this;
        }

        withActionStartingWith(val: string): this {
            this.filters.push({ "action": { "$startsWith": val } });
            return this;
        }

        withActionNotStartingWith(val: string): this {
            this.filters.push({ "action": { "$notStartsWith": val } });
            return this;
        }

        withActionEndingWith(val: string): this {
            this.filters.push({ "action": { "$endsWith": val } });
            return this;
        }

        withActionNotEndingWith(val: string): this {
            this.filters.push({ "action": { "$notEndsWith": val } });
            return this;
        }

        withActionSoundingLike(val: string): this {
            this.filters.push({ "action": { "$soundLike": val } });
            return this;
        }

        withDetailContaining(val: string): this {
            this.filters.push({ "detail": { "$contains": val } });
            return this;
        }

        withDetailIs(val: string): this {
            this.filters.push({ "detail": { "$eq": val } });
            return this;
        }

        withDetailIsNot(val: string): this {
            this.filters.push({ "detail": { "$ne": val } });
            return this;
        }

        withDetailIn(...vals: string[]): this {
            this.filters.push({ "detail": { "$in": vals } });
            return this;
        }

        withDetailNotIn(...vals: string[]): this {
            this.filters.push({ "detail": { "$notIn": vals } });
            return this;
        }

        withDetailGreaterThan(val: string): this {
            this.filters.push({ "detail": { "$gt": val } });
            return this;
        }

        withDetailGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "detail": { "$gte": val } });
            return this;
        }

        withDetailLessThan(val: string): this {
            this.filters.push({ "detail": { "$lt": val } });
            return this;
        }

        withDetailLessThanOrEqualTo(val: string): this {
            this.filters.push({ "detail": { "$lte": val } });
            return this;
        }

        withDetailBetween(lower: string, upper: string): this {
            this.filters.push({ "detail": { "$between": [lower, upper] } });
            return this;
        }

        withDetailIsKnown(): this {
            this.filters.push({ "detail": { "$isNull": false } });
            return this;
        }

        withDetailIsUnknown(): this {
            this.filters.push({ "detail": { "$isNull": true } });
            return this;
        }
        withDetailNotContaining(val: string): this {
            this.filters.push({ "detail": { "$notContains": val } });
            return this;
        }

        withDetailStartingWith(val: string): this {
            this.filters.push({ "detail": { "$startsWith": val } });
            return this;
        }

        withDetailNotStartingWith(val: string): this {
            this.filters.push({ "detail": { "$notStartsWith": val } });
            return this;
        }

        withDetailEndingWith(val: string): this {
            this.filters.push({ "detail": { "$endsWith": val } });
            return this;
        }

        withDetailNotEndingWith(val: string): this {
            this.filters.push({ "detail": { "$notEndsWith": val } });
            return this;
        }

        withDetailSoundingLike(val: string): this {
            this.filters.push({ "detail": { "$soundLike": val } });
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


    orderByActionAscending(): this {
        this.query.orderBy("action", "asc");
        return this;
    }

    orderByActionDescending(): this {
        this.query.orderBy("action", "desc");
        return this;
    }

    orderByDetailAscending(): this {
        this.query.orderBy("detail", "asc");
        return this;
    }

    orderByDetailDescending(): this {
        this.query.orderBy("detail", "desc");
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
    groupByTask(): this {
        this.query.groupBy("task");
        return this;
    }

    groupByTaskAs(retName: string): this {
        this.query.groupBy("task", retName);
        return this;
    }
    groupByAction(): this {
        this.query.groupBy("action");
        return this;
    }

    groupByActionAs(retName: string): this {
        this.query.groupBy("action", retName);
        return this;
    }
    groupByDetail(): this {
        this.query.groupBy("detail");
        return this;
    }

    groupByDetailAs(retName: string): this {
        this.query.groupBy("detail", retName);
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
    facetByTaskAs(
        facetName: string,
        request: { readonly entityName: "Task"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "task", request, includeAllFacets,
            { kind: "facet", method: "facetByTaskAs", relation: "task", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<TaskExecutionLog>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof TaskExecutionLog
                ? row
                : TaskExecutionLog.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<TaskExecutionLog>(data);
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
    ): Promise<SmartList<TaskExecutionLog>> {
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
            row instanceof TaskExecutionLog
                ? row
                : TaskExecutionLog.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<TaskExecutionLog> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof TaskExecutionLog
                        ? entity
                        : TaskExecutionLog.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableTaskExecutionLogRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<TaskExecutionLog>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<TaskExecutionLog>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<TaskExecutionLog> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        const id = await context.generateInternalId("TaskExecutionLog");
        return TaskExecutionLog.teaqlNewWithId(id);
    }

    executeForList(context: UserContext): Promise<SmartList<TaskExecutionLog>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<TaskExecutionLog> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<TaskExecutionLog | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}