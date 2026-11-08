import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { TaskStatus } from '../models/TaskStatus';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class TaskStatusRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("TaskStatus");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "TaskStatus" {
        return "TaskStatus";
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

    purpose(p: string): ExecutableTaskStatusRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableTaskStatusRequest(
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
        this.query.select(["id", "name", "code", "color", "displayOrder", "progress", "platform", "version"]);
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

    selectCode(): this {
        this.query.select(["code"]);
        return this;
    }

    selectColor(): this {
        this.query.select(["color"]);
        return this;
    }

    selectDisplayOrder(): this {
        this.query.select(["displayOrder"]);
        return this;
    }

    selectProgress(): this {
        this.query.select(["progress"]);
        return this;
    }


    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectPlatformWith(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.query.select(["platform"]);
        this.query.relationQuery(
            "platform", request.toQuery(), "platform", "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: "platform" });
        return this;
    }

    withPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "platform": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "platform": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectTaskListWith(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "taskList", request.toQuery(), "id", "status", true,
            { kind: "relation-select", method: "selectTaskListWith", relation: "taskList" });
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
                    query: request.toQuery(), field: "status",
                },
            },
        });
        return this;
    }

    withoutTaskListMatching(request: { readonly entityName: "Task"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "status",
                },
            },
        });
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

        withCodeContaining(val: string): this {
            this.filters.push({ "code": { "$contains": val } });
            return this;
        }

        withCodeIs(val: string): this {
            this.filters.push({ "code": { "$eq": val } });
            return this;
        }

        withCodeIsNot(val: string): this {
            this.filters.push({ "code": { "$ne": val } });
            return this;
        }

        withCodeIn(...vals: string[]): this {
            this.filters.push({ "code": { "$in": vals } });
            return this;
        }

        withCodeNotIn(...vals: string[]): this {
            this.filters.push({ "code": { "$notIn": vals } });
            return this;
        }

        withCodeGreaterThan(val: string): this {
            this.filters.push({ "code": { "$gt": val } });
            return this;
        }

        withCodeGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "code": { "$gte": val } });
            return this;
        }

        withCodeLessThan(val: string): this {
            this.filters.push({ "code": { "$lt": val } });
            return this;
        }

        withCodeLessThanOrEqualTo(val: string): this {
            this.filters.push({ "code": { "$lte": val } });
            return this;
        }

        withCodeBetween(lower: string, upper: string): this {
            this.filters.push({ "code": { "$between": [lower, upper] } });
            return this;
        }

        withCodeIsKnown(): this {
            this.filters.push({ "code": { "$isNull": false } });
            return this;
        }

        withCodeIsUnknown(): this {
            this.filters.push({ "code": { "$isNull": true } });
            return this;
        }
        withCodeNotContaining(val: string): this {
            this.filters.push({ "code": { "$notContains": val } });
            return this;
        }

        withCodeStartingWith(val: string): this {
            this.filters.push({ "code": { "$startsWith": val } });
            return this;
        }

        withCodeNotStartingWith(val: string): this {
            this.filters.push({ "code": { "$notStartsWith": val } });
            return this;
        }

        withCodeEndingWith(val: string): this {
            this.filters.push({ "code": { "$endsWith": val } });
            return this;
        }

        withCodeNotEndingWith(val: string): this {
            this.filters.push({ "code": { "$notEndsWith": val } });
            return this;
        }

        withCodeSoundingLike(val: string): this {
            this.filters.push({ "code": { "$soundLike": val } });
            return this;
        }

        withColorContaining(val: string): this {
            this.filters.push({ "color": { "$contains": val } });
            return this;
        }

        withColorIs(val: string): this {
            this.filters.push({ "color": { "$eq": val } });
            return this;
        }

        withColorIsNot(val: string): this {
            this.filters.push({ "color": { "$ne": val } });
            return this;
        }

        withColorIn(...vals: string[]): this {
            this.filters.push({ "color": { "$in": vals } });
            return this;
        }

        withColorNotIn(...vals: string[]): this {
            this.filters.push({ "color": { "$notIn": vals } });
            return this;
        }

        withColorGreaterThan(val: string): this {
            this.filters.push({ "color": { "$gt": val } });
            return this;
        }

        withColorGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "color": { "$gte": val } });
            return this;
        }

        withColorLessThan(val: string): this {
            this.filters.push({ "color": { "$lt": val } });
            return this;
        }

        withColorLessThanOrEqualTo(val: string): this {
            this.filters.push({ "color": { "$lte": val } });
            return this;
        }

        withColorBetween(lower: string, upper: string): this {
            this.filters.push({ "color": { "$between": [lower, upper] } });
            return this;
        }

        withColorIsKnown(): this {
            this.filters.push({ "color": { "$isNull": false } });
            return this;
        }

        withColorIsUnknown(): this {
            this.filters.push({ "color": { "$isNull": true } });
            return this;
        }
        withColorNotContaining(val: string): this {
            this.filters.push({ "color": { "$notContains": val } });
            return this;
        }

        withColorStartingWith(val: string): this {
            this.filters.push({ "color": { "$startsWith": val } });
            return this;
        }

        withColorNotStartingWith(val: string): this {
            this.filters.push({ "color": { "$notStartsWith": val } });
            return this;
        }

        withColorEndingWith(val: string): this {
            this.filters.push({ "color": { "$endsWith": val } });
            return this;
        }

        withColorNotEndingWith(val: string): this {
            this.filters.push({ "color": { "$notEndsWith": val } });
            return this;
        }

        withColorSoundingLike(val: string): this {
            this.filters.push({ "color": { "$soundLike": val } });
            return this;
        }

        withDisplayOrderIs(val: Decimal): this {
            this.filters.push({ "displayOrder": { "$eq": val } });
            return this;
        }

        withDisplayOrderIsNot(val: Decimal): this {
            this.filters.push({ "displayOrder": { "$ne": val } });
            return this;
        }

        withDisplayOrderIn(...vals: Decimal[]): this {
            this.filters.push({ "displayOrder": { "$in": vals } });
            return this;
        }

        withDisplayOrderNotIn(...vals: Decimal[]): this {
            this.filters.push({ "displayOrder": { "$notIn": vals } });
            return this;
        }

        withDisplayOrderGreaterThan(val: Decimal): this {
            this.filters.push({ "displayOrder": { "$gt": val } });
            return this;
        }

        withDisplayOrderGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "displayOrder": { "$gte": val } });
            return this;
        }

        withDisplayOrderLessThan(val: Decimal): this {
            this.filters.push({ "displayOrder": { "$lt": val } });
            return this;
        }

        withDisplayOrderLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "displayOrder": { "$lte": val } });
            return this;
        }

        withDisplayOrderBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ "displayOrder": { "$between": [lower, upper] } });
            return this;
        }

        withDisplayOrderIsKnown(): this {
            this.filters.push({ "displayOrder": { "$isNull": false } });
            return this;
        }

        withDisplayOrderIsUnknown(): this {
            this.filters.push({ "displayOrder": { "$isNull": true } });
            return this;
        }

        withProgressIs(val: Decimal): this {
            this.filters.push({ "progress": { "$eq": val } });
            return this;
        }

        withProgressIsNot(val: Decimal): this {
            this.filters.push({ "progress": { "$ne": val } });
            return this;
        }

        withProgressIn(...vals: Decimal[]): this {
            this.filters.push({ "progress": { "$in": vals } });
            return this;
        }

        withProgressNotIn(...vals: Decimal[]): this {
            this.filters.push({ "progress": { "$notIn": vals } });
            return this;
        }

        withProgressGreaterThan(val: Decimal): this {
            this.filters.push({ "progress": { "$gt": val } });
            return this;
        }

        withProgressGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "progress": { "$gte": val } });
            return this;
        }

        withProgressLessThan(val: Decimal): this {
            this.filters.push({ "progress": { "$lt": val } });
            return this;
        }

        withProgressLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "progress": { "$lte": val } });
            return this;
        }

        withProgressBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ "progress": { "$between": [lower, upper] } });
            return this;
        }

        withProgressIsKnown(): this {
            this.filters.push({ "progress": { "$isNull": false } });
            return this;
        }

        withProgressIsUnknown(): this {
            this.filters.push({ "progress": { "$isNull": true } });
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

    orderByCodeAscending(): this {
        this.query.orderBy("code", "asc");
        return this;
    }

    orderByCodeDescending(): this {
        this.query.orderBy("code", "desc");
        return this;
    }

    orderByColorAscending(): this {
        this.query.orderBy("color", "asc");
        return this;
    }

    orderByColorDescending(): this {
        this.query.orderBy("color", "desc");
        return this;
    }

    orderByDisplayOrderAscending(): this {
        this.query.orderBy("displayOrder", "asc");
        return this;
    }

    orderByDisplayOrderDescending(): this {
        this.query.orderBy("displayOrder", "desc");
        return this;
    }

    orderByProgressAscending(): this {
        this.query.orderBy("progress", "asc");
        return this;
    }

    orderByProgressDescending(): this {
        this.query.orderBy("progress", "desc");
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

    minDisplayOrder(): this {
        return this.minDisplayOrderAs("minOfDisplayOrder");
    }

    minDisplayOrderAs(retName: string): this {
        this.query.aggregate("min", "displayOrder", retName);
        return this;
    }
    maxDisplayOrder(): this {
        return this.maxDisplayOrderAs("maxOfDisplayOrder");
    }

    maxDisplayOrderAs(retName: string): this {
        this.query.aggregate("max", "displayOrder", retName);
        return this;
    }
    sumDisplayOrder(): this {
        return this.sumDisplayOrderAs("sumOfDisplayOrder");
    }

    sumDisplayOrderAs(retName: string): this {
        this.query.aggregate("sum", "displayOrder", retName);
        return this;
    }
    avgDisplayOrder(): this {
        return this.avgDisplayOrderAs("avgOfDisplayOrder");
    }

    avgDisplayOrderAs(retName: string): this {
        this.query.aggregate("avg", "displayOrder", retName);
        return this;
    }
    standardDeviationDisplayOrder(): this {
        return this.standardDeviationDisplayOrderAs("standardDeviationOfDisplayOrder");
    }

    standardDeviationDisplayOrderAs(retName: string): this {
        this.query.aggregate("stddev", "displayOrder", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrder(): this {
        return this.squareRootOfPopulationStandardDeviationDisplayOrderAs("squareRootOfPopulationStandardDeviationOfDisplayOrder");
    }

    squareRootOfPopulationStandardDeviationDisplayOrderAs(retName: string): this {
        this.query.aggregate("stddev_pop", "displayOrder", retName);
        return this;
    }
    sampleVarianceDisplayOrder(): this {
        return this.sampleVarianceDisplayOrderAs("sampleVarianceOfDisplayOrder");
    }

    sampleVarianceDisplayOrderAs(retName: string): this {
        this.query.aggregate("var_samp", "displayOrder", retName);
        return this;
    }
    samplePopulationVarianceDisplayOrder(): this {
        return this.samplePopulationVarianceDisplayOrderAs("samplePopulationVarianceOfDisplayOrder");
    }

    samplePopulationVarianceDisplayOrderAs(retName: string): this {
        this.query.aggregate("var_pop", "displayOrder", retName);
        return this;
    }
    minProgress(): this {
        return this.minProgressAs("minOfProgress");
    }

    minProgressAs(retName: string): this {
        this.query.aggregate("min", "progress", retName);
        return this;
    }
    maxProgress(): this {
        return this.maxProgressAs("maxOfProgress");
    }

    maxProgressAs(retName: string): this {
        this.query.aggregate("max", "progress", retName);
        return this;
    }
    sumProgress(): this {
        return this.sumProgressAs("sumOfProgress");
    }

    sumProgressAs(retName: string): this {
        this.query.aggregate("sum", "progress", retName);
        return this;
    }
    avgProgress(): this {
        return this.avgProgressAs("avgOfProgress");
    }

    avgProgressAs(retName: string): this {
        this.query.aggregate("avg", "progress", retName);
        return this;
    }
    standardDeviationProgress(): this {
        return this.standardDeviationProgressAs("standardDeviationOfProgress");
    }

    standardDeviationProgressAs(retName: string): this {
        this.query.aggregate("stddev", "progress", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationProgress(): this {
        return this.squareRootOfPopulationStandardDeviationProgressAs("squareRootOfPopulationStandardDeviationOfProgress");
    }

    squareRootOfPopulationStandardDeviationProgressAs(retName: string): this {
        this.query.aggregate("stddev_pop", "progress", retName);
        return this;
    }
    sampleVarianceProgress(): this {
        return this.sampleVarianceProgressAs("sampleVarianceOfProgress");
    }

    sampleVarianceProgressAs(retName: string): this {
        this.query.aggregate("var_samp", "progress", retName);
        return this;
    }
    samplePopulationVarianceProgress(): this {
        return this.samplePopulationVarianceProgressAs("samplePopulationVarianceOfProgress");
    }

    samplePopulationVarianceProgressAs(retName: string): this {
        this.query.aggregate("var_pop", "progress", retName);
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
    groupByCode(): this {
        this.query.groupBy("code");
        return this;
    }

    groupByCodeAs(retName: string): this {
        this.query.groupBy("code", retName);
        return this;
    }
    groupByColor(): this {
        this.query.groupBy("color");
        return this;
    }

    groupByColorAs(retName: string): this {
        this.query.groupBy("color", retName);
        return this;
    }
    groupByDisplayOrder(): this {
        this.query.groupBy("displayOrder");
        return this;
    }

    groupByDisplayOrderAs(retName: string): this {
        this.query.groupBy("displayOrder", retName);
        return this;
    }
    groupByProgress(): this {
        this.query.groupBy("progress");
        return this;
    }

    groupByProgressAs(retName: string): this {
        this.query.groupBy("progress", retName);
        return this;
    }
    groupByPlatform(): this {
        this.query.groupBy("platform");
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy("platform", retName);
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
    facetByPlatformAs(
        facetName: string,
        request: { readonly entityName: "Platform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "platform", request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: "platform", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<TaskStatus>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof TaskStatus
                ? row
                : TaskStatus.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<TaskStatus>(data);
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
    ): Promise<SmartList<TaskStatus>> {
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
            row instanceof TaskStatus
                ? row
                : TaskStatus.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<TaskStatus> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof TaskStatus
                        ? entity
                        : TaskStatus.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableTaskStatusRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<TaskStatus>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<TaskStatus>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<TaskStatus> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return TaskStatus.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<TaskStatus>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<TaskStatus> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<TaskStatus | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}