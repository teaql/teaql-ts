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
        this.query.select([TaskExecutionLog.__teaqlFields.ID_PROPERTY.member, TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member, TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member, TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member, TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }


    selectAction(): this {
        this.query.select([TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]);
        return this;
    }

    selectDetail(): this {
        this.query.select([TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectTaskWith(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.query.select([TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]);
        this.query.relationQuery(
            TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member, request.toQuery(), TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectTaskWith", relation: TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member });
        return this;
    }

    withTaskMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutTaskMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByTask(val: any): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByTaskIn(...vals: any[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withTaskIsKnown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withTaskIsUnknown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withActionContaining(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withActionIs(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withActionIsNot(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withActionIn(...vals: string[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withActionNotIn(...vals: string[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withActionGreaterThan(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withActionGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withActionLessThan(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withActionLessThanOrEqualTo(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withActionBetween(lower: string, upper: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withActionIsKnown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withActionIsUnknown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withActionNotContaining(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withActionStartingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withActionNotStartingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withActionEndingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withActionNotEndingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withActionSoundingLike(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withDetailContaining(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withDetailIs(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withDetailIsNot(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withDetailIn(...vals: string[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withDetailNotIn(...vals: string[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withDetailGreaterThan(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withDetailGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withDetailLessThan(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withDetailLessThanOrEqualTo(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withDetailBetween(lower: string, upper: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withDetailIsKnown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withDetailIsUnknown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withDetailNotContaining(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withDetailStartingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withDetailNotStartingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withDetailEndingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withDetailNotEndingWith(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withDetailSoundingLike(val: string): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }


    orderByActionAscending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member, "asc");
        return this;
    }

    orderByActionDescending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member, "desc");
        return this;
    }

    orderByDetailAscending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member, "asc");
        return this;
    }

    orderByDetailDescending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(TaskExecutionLog.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByTask(): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member);
        return this;
    }

    groupByTaskAs(retName: string): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member, retName);
        return this;
    }
    groupByAction(): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member);
        return this;
    }

    groupByActionAs(retName: string): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.ACTION_PROPERTY.member, retName);
        return this;
    }
    groupByDetail(): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member);
        return this;
    }

    groupByDetailAs(retName: string): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.DETAIL_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(TaskExecutionLog.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByTaskAs(
        facetName: string,
        request: { readonly entityName: "Task"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByTaskAs", relation: TaskExecutionLog.__teaqlFields.TASK_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<TaskExecutionLog>> {
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
        const aggregateOnly = pageQuery.aggregateItems.length > 0;
        const data = new SmartList<TaskExecutionLog>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof TaskExecutionLog
                ? row
                : TaskExecutionLog.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
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
        if (preparedQuery.aggregateItems.length > 0 || preparedQuery.groupByItems.length > 0) {
            throw new Error("Entity streams require entity rows; use a record or aggregation query");
        }
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
        return TaskExecutionLog.teaqlCreate(context);
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