import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Platform } from '../models/Platform';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class PlatformRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Platform");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "Platform" {
        return "Platform";
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

    purpose(p: string): ExecutablePlatformRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutablePlatformRequest(
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
        this.query.select(["id", "name", "founded", "userEmail", "version"]);
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

    selectFounded(): this {
        this.query.select(["founded"]);
        return this;
    }

    selectUserEmail(): this {
        this.query.select(["userEmail"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }




    selectTaskStatusListWith(request: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "taskStatusList", request.toQuery(), "id", "platform", true,
            { kind: "relation-select", method: "selectTaskStatusListWith", relation: "taskStatusList" });
        return this;
    }
    selectTaskListWith(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "taskList", request.toQuery(), "id", "platform", true,
            { kind: "relation-select", method: "selectTaskListWith", relation: "taskList" });
        return this;
    }

    haveTaskStatuses(): this {
        return this.withTaskStatusListMatching({
            entityName: "TaskStatus",
            toQuery: () => new SelectQuery("TaskStatus"),
        });
    }

    haveNoTaskStatuses(): this {
        return this.withoutTaskStatusListMatching({
            entityName: "TaskStatus",
            toQuery: () => new SelectQuery("TaskStatus"),
        });
    }

    withTaskStatusListMatching(request: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    withoutTaskStatusListMatching(request: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }
    haveTasks(): this {
        return this.withTaskListMatching({
            entityName: "Task",
            toQuery: () => new SelectQuery("Task"),
        });
    }

    haveNoTasks(): this {
        return this.withoutTaskListMatching({
            entityName: "Task",
            toQuery: () => new SelectQuery("Task"),
        });
    }

    withTaskListMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    withoutTaskListMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    countTaskStatuses(): this {
        return this.countTaskStatusesAs("countTaskStatuses");
    }

    countTaskStatusesAs(alias: string): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        this.countTaskStatusesWith(alias, { entityName: "TaskStatus", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countTaskStatusesAs", relation: "taskStatusList", alias };
        return this;
    }

    countTaskStatusesWith(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "relation-count", method: "countTaskStatusesWith", relation: "taskStatusList", alias });
        return this;
    }

    minDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.minDisplayOrderOfTaskStatusesAs(
            "minOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    minDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "minDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    maxDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.maxDisplayOrderOfTaskStatusesAs(
            "maxOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    maxDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "maxDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    sumDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.sumDisplayOrderOfTaskStatusesAs(
            "sumOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    sumDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "sumDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    avgDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.avgDisplayOrderOfTaskStatusesAs(
            "avgOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    avgDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "avgDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    standardDeviationDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.standardDeviationDisplayOrderOfTaskStatusesAs(
            "standardDeviationOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    standardDeviationDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationDisplayOrderOfTaskStatusesAs(
            "squareRootOfPopulationStandardDeviationOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    sampleVarianceDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceDisplayOrderOfTaskStatusesAs(
            "sampleVarianceOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    sampleVarianceDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    samplePopulationVarianceDisplayOrderOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceDisplayOrderOfTaskStatusesAs(
            "samplePopulationVarianceOfDisplayOrderOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    samplePopulationVarianceDisplayOrderOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "displayOrder", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceDisplayOrderOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    minProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.minProgressOfTaskStatusesAs(
            "minOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    minProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "minProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    maxProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.maxProgressOfTaskStatusesAs(
            "maxOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    maxProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "maxProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    sumProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.sumProgressOfTaskStatusesAs(
            "sumOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    sumProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "sumProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    avgProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.avgProgressOfTaskStatusesAs(
            "avgOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    avgProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "avgProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    standardDeviationProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.standardDeviationProgressOfTaskStatusesAs(
            "standardDeviationOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    standardDeviationProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationProgressOfTaskStatusesAs(
            "squareRootOfPopulationStandardDeviationOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    sampleVarianceProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceProgressOfTaskStatusesAs(
            "sampleVarianceOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    sampleVarianceProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    samplePopulationVarianceProgressOfTaskStatuses(): this {
        const query = new SelectQuery("TaskStatus").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceProgressOfTaskStatusesAs(
            "samplePopulationVarianceOfProgressOfTaskStatuses", { entityName: "TaskStatus", toQuery: () => query });
    }

    samplePopulationVarianceProgressOfTaskStatusesAs(alias: string, child: { readonly entityName: "TaskStatus"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "progress", alias);
        this.query.relationAggregate("taskStatusList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceProgressOfTaskStatusesAs", relation: "taskStatusList", alias });
        return this;
    }
    countTasks(): this {
        return this.countTasksAs("countTasks");
    }

    countTasksAs(alias: string): this {
        const query = new SelectQuery("Task").filter({ version: { "$gte": 1 } });
        this.countTasksWith(alias, { entityName: "Task", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countTasksAs", relation: "taskList", alias };
        return this;
    }

    countTasksWith(alias: string, child: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("taskList", alias, query, true,
            { kind: "relation-count", method: "countTasksWith", relation: "taskList", alias });
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

        withFoundedIs(val: unknown): this {
            this.filters.push({ "founded": { "$eq": val } });
            return this;
        }

        withFoundedIsNot(val: unknown): this {
            this.filters.push({ "founded": { "$ne": val } });
            return this;
        }

        withFoundedIn(...vals: unknown[]): this {
            this.filters.push({ "founded": { "$in": vals } });
            return this;
        }

        withFoundedNotIn(...vals: unknown[]): this {
            this.filters.push({ "founded": { "$notIn": vals } });
            return this;
        }

        withFoundedGreaterThan(val: unknown): this {
            this.filters.push({ "founded": { "$gt": val } });
            return this;
        }

        withFoundedGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ "founded": { "$gte": val } });
            return this;
        }

        withFoundedLessThan(val: unknown): this {
            this.filters.push({ "founded": { "$lt": val } });
            return this;
        }

        withFoundedLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ "founded": { "$lte": val } });
            return this;
        }

        withFoundedBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ "founded": { "$between": [lower, upper] } });
            return this;
        }

        withFoundedIsKnown(): this {
            this.filters.push({ "founded": { "$isNull": false } });
            return this;
        }

        withFoundedIsUnknown(): this {
            this.filters.push({ "founded": { "$isNull": true } });
            return this;
        }

        withUserEmailContaining(val: string): this {
            this.filters.push({ "userEmail": { "$contains": val } });
            return this;
        }

        withUserEmailIs(val: string): this {
            this.filters.push({ "userEmail": { "$eq": val } });
            return this;
        }

        withUserEmailIsNot(val: string): this {
            this.filters.push({ "userEmail": { "$ne": val } });
            return this;
        }

        withUserEmailIn(...vals: string[]): this {
            this.filters.push({ "userEmail": { "$in": vals } });
            return this;
        }

        withUserEmailNotIn(...vals: string[]): this {
            this.filters.push({ "userEmail": { "$notIn": vals } });
            return this;
        }

        withUserEmailGreaterThan(val: string): this {
            this.filters.push({ "userEmail": { "$gt": val } });
            return this;
        }

        withUserEmailGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "userEmail": { "$gte": val } });
            return this;
        }

        withUserEmailLessThan(val: string): this {
            this.filters.push({ "userEmail": { "$lt": val } });
            return this;
        }

        withUserEmailLessThanOrEqualTo(val: string): this {
            this.filters.push({ "userEmail": { "$lte": val } });
            return this;
        }

        withUserEmailBetween(lower: string, upper: string): this {
            this.filters.push({ "userEmail": { "$between": [lower, upper] } });
            return this;
        }

        withUserEmailIsKnown(): this {
            this.filters.push({ "userEmail": { "$isNull": false } });
            return this;
        }

        withUserEmailIsUnknown(): this {
            this.filters.push({ "userEmail": { "$isNull": true } });
            return this;
        }
        withUserEmailNotContaining(val: string): this {
            this.filters.push({ "userEmail": { "$notContains": val } });
            return this;
        }

        withUserEmailStartingWith(val: string): this {
            this.filters.push({ "userEmail": { "$startsWith": val } });
            return this;
        }

        withUserEmailNotStartingWith(val: string): this {
            this.filters.push({ "userEmail": { "$notStartsWith": val } });
            return this;
        }

        withUserEmailEndingWith(val: string): this {
            this.filters.push({ "userEmail": { "$endsWith": val } });
            return this;
        }

        withUserEmailNotEndingWith(val: string): this {
            this.filters.push({ "userEmail": { "$notEndsWith": val } });
            return this;
        }

        withUserEmailSoundingLike(val: string): this {
            this.filters.push({ "userEmail": { "$soundLike": val } });
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

    orderByFoundedAscending(): this {
        this.query.orderBy("founded", "asc");
        return this;
    }

    orderByFoundedDescending(): this {
        this.query.orderBy("founded", "desc");
        return this;
    }

    orderByUserEmailAscending(): this {
        this.query.orderBy("userEmail", "asc");
        return this;
    }

    orderByUserEmailDescending(): this {
        this.query.orderBy("userEmail", "desc");
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
    groupByFounded(): this {
        this.query.groupBy("founded");
        return this;
    }

    groupByFoundedAs(retName: string): this {
        this.query.groupBy("founded", retName);
        return this;
    }
    groupByUserEmail(): this {
        this.query.groupBy("userEmail");
        return this;
    }

    groupByUserEmailAs(retName: string): this {
        this.query.groupBy("userEmail", retName);
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

    private async executeForListInternal(context: UserContext): Promise<SmartList<Platform>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Platform
                ? row
                : Platform.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Platform>(data);
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
    ): Promise<SmartList<Platform>> {
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
            row instanceof Platform
                ? row
                : Platform.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Platform> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof Platform
                        ? entity
                        : Platform.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutablePlatformRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Platform>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Platform>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): Platform {
        this.ensureIntent();
        return new Platform();
    }

    executeForList(context: UserContext): Promise<SmartList<Platform>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Platform> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Platform | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}