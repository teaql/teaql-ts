import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { SchoolType } from '../models/SchoolType';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class SchoolTypeRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("SchoolType");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "SchoolType" {
        return "SchoolType";
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

    purpose(p: string): ExecutableSchoolTypeRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableSchoolTypeRequest(
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
        this.query.select([SchoolType.__teaqlFields.PLATFORM_PROPERTY.member, SchoolType.__teaqlFields.ID_PROPERTY.member, SchoolType.__teaqlFields.NAME_PROPERTY.member, SchoolType.__teaqlFields.CODE_PROPERTY.member, SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, SchoolType.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([SchoolType.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }

    selectName(): this {
        this.query.select([SchoolType.__teaqlFields.NAME_PROPERTY.member]);
        return this;
    }

    selectCode(): this {
        this.query.select([SchoolType.__teaqlFields.CODE_PROPERTY.member]);
        return this;
    }

    selectDisplayOrder(): this {
        this.query.select([SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([SchoolType.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPlatformWith(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.query.select([SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            SchoolType.__teaqlFields.PLATFORM_PROPERTY.member, request.toQuery(), SchoolType.__teaqlFields.PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: SchoolType.__teaqlFields.PLATFORM_PROPERTY.member });
        return this;
    }

    withPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectSchoolListWith(request: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "schoolList", request.toQuery(), "id", "schoolType", true,
            { kind: "relation-select", method: "selectSchoolListWith", relation: "schoolList" });
        return this;
    }

    haveSchools(): this {
        return this.withSchoolListMatching({
            entityName: "School",
            toQuery: () => new SelectQuery("School"),
        });
    }

    haveNoSchools(): this {
        return this.withoutSchoolListMatching({
            entityName: "School",
            toQuery: () => new SelectQuery("School"),
        });
    }

    withSchoolListMatching(request: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "schoolType",
                },
            },
        });
        return this;
    }

    withoutSchoolListMatching(request: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "schoolType",
                },
            },
        });
        return this;
    }

    countSchools(): this {
        return this.countSchoolsAs("countSchools");
    }

    countSchoolsAs(alias: string): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        this.countSchoolsWith(alias, { entityName: "School", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countSchoolsAs", relation: "schoolList", alias };
        return this;
    }

    countSchoolsWith(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "relation-count", method: "countSchoolsWith", relation: "schoolList", alias });
        return this;
    }

    minStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.minStudentCapacityOfSchoolsAs(
            "minOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    minStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "minStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    maxStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.maxStudentCapacityOfSchoolsAs(
            "maxOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    maxStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "maxStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    sumStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.sumStudentCapacityOfSchoolsAs(
            "sumOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    sumStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "sumStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    avgStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.avgStudentCapacityOfSchoolsAs(
            "avgOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    avgStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "avgStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    standardDeviationStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.standardDeviationStudentCapacityOfSchoolsAs(
            "standardDeviationOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    standardDeviationStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs(
            "squareRootOfPopulationStandardDeviationOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    sampleVarianceStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceStudentCapacityOfSchoolsAs(
            "sampleVarianceOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    sampleVarianceStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }
    samplePopulationVarianceStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceStudentCapacityOfSchoolsAs(
            "samplePopulationVarianceOfStudentCapacityOfSchools", { entityName: "School", toQuery: () => query });
    }

    samplePopulationVarianceStudentCapacityOfSchoolsAs(alias: string, child: { readonly entityName: "School"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "studentCapacity", alias);
        this.query.relationAggregate("schoolList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceStudentCapacityOfSchoolsAs", relation: "schoolList", alias });
        return this;
    }

        filterByPlatform(val: any): this {
            this.filters.push({ [SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPlatformIsKnown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPlatformIsUnknown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withIdIs(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withNameContaining(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withCodeContaining(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withCodeIs(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCodeIsNot(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCodeIn(...vals: string[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCodeNotIn(...vals: string[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCodeGreaterThan(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCodeGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCodeLessThan(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCodeLessThanOrEqualTo(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCodeBetween(lower: string, upper: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCodeIsKnown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCodeIsUnknown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withCodeNotContaining(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withCodeStartingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withCodeNotStartingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withCodeEndingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withCodeNotEndingWith(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withCodeSoundingLike(val: string): this {
            this.filters.push({ [SchoolType.__teaqlFields.CODE_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withDisplayOrderIs(val: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withDisplayOrderIsNot(val: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withDisplayOrderIn(...vals: Decimal[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withDisplayOrderNotIn(...vals: Decimal[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withDisplayOrderGreaterThan(val: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withDisplayOrderGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withDisplayOrderLessThan(val: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withDisplayOrderLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withDisplayOrderBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withDisplayOrderIsKnown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withDisplayOrderIsUnknown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [SchoolType.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }

    orderByNameAscending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.NAME_PROPERTY.member, "desc");
        return this;
    }

    orderByCodeAscending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.CODE_PROPERTY.member, "asc");
        return this;
    }

    orderByCodeDescending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.CODE_PROPERTY.member, "desc");
        return this;
    }

    orderByDisplayOrderAscending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, "asc");
        return this;
    }

    orderByDisplayOrderDescending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(SchoolType.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.aggregate("min", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    maxDisplayOrder(): this {
        return this.maxDisplayOrderAs("maxOfDisplayOrder");
    }

    maxDisplayOrderAs(retName: string): this {
        this.query.aggregate("max", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    sumDisplayOrder(): this {
        return this.sumDisplayOrderAs("sumOfDisplayOrder");
    }

    sumDisplayOrderAs(retName: string): this {
        this.query.aggregate("sum", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    avgDisplayOrder(): this {
        return this.avgDisplayOrderAs("avgOfDisplayOrder");
    }

    avgDisplayOrderAs(retName: string): this {
        this.query.aggregate("avg", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    standardDeviationDisplayOrder(): this {
        return this.standardDeviationDisplayOrderAs("standardDeviationOfDisplayOrder");
    }

    standardDeviationDisplayOrderAs(retName: string): this {
        this.query.aggregate("stddev", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrder(): this {
        return this.squareRootOfPopulationStandardDeviationDisplayOrderAs("squareRootOfPopulationStandardDeviationOfDisplayOrder");
    }

    squareRootOfPopulationStandardDeviationDisplayOrderAs(retName: string): this {
        this.query.aggregate("stddev_pop", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    sampleVarianceDisplayOrder(): this {
        return this.sampleVarianceDisplayOrderAs("sampleVarianceOfDisplayOrder");
    }

    sampleVarianceDisplayOrderAs(retName: string): this {
        this.query.aggregate("var_samp", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVarianceDisplayOrder(): this {
        return this.samplePopulationVarianceDisplayOrderAs("samplePopulationVarianceOfDisplayOrder");
    }

    samplePopulationVarianceDisplayOrderAs(retName: string): this {
        this.query.aggregate("var_pop", SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }

    // --- Group By ---
    groupByPlatform(): this {
        this.query.groupBy(SchoolType.__teaqlFields.PLATFORM_PROPERTY.member);
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy(SchoolType.__teaqlFields.PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupById(): this {
        this.query.groupBy(SchoolType.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(SchoolType.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy(SchoolType.__teaqlFields.NAME_PROPERTY.member);
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy(SchoolType.__teaqlFields.NAME_PROPERTY.member, retName);
        return this;
    }
    groupByCode(): this {
        this.query.groupBy(SchoolType.__teaqlFields.CODE_PROPERTY.member);
        return this;
    }

    groupByCodeAs(retName: string): this {
        this.query.groupBy(SchoolType.__teaqlFields.CODE_PROPERTY.member, retName);
        return this;
    }
    groupByDisplayOrder(): this {
        this.query.groupBy(SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member);
        return this;
    }

    groupByDisplayOrderAs(retName: string): this {
        this.query.groupBy(SchoolType.__teaqlFields.DISPLAY_ORDER_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(SchoolType.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(SchoolType.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPlatformAs(
        facetName: string,
        request: { readonly entityName: "Platform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, SchoolType.__teaqlFields.PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: SchoolType.__teaqlFields.PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<SchoolType>> {
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
            row instanceof SchoolType
                ? row
                : SchoolType.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<SchoolType>(data);
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
    ): Promise<SmartList<SchoolType>> {
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
        const data = new SmartList<SchoolType>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof SchoolType
                ? row
                : SchoolType.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<SchoolType> {
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
                    yield entity instanceof SchoolType
                        ? entity
                        : SchoolType.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableSchoolTypeRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<SchoolType>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<SchoolType>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<SchoolType> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return SchoolType.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<SchoolType>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<SchoolType> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<SchoolType | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}