import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, TeaQLPage, UserContext, executeRelationFacets } from '../../teaql-ts';
import { SchoolType } from '../models/SchoolType';



export class SchoolTypeRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor(minimal = false) {
        this.query = new SelectQuery("SchoolType");
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

    purpose(p: string): ExecutableSchoolTypeRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableSchoolTypeRequest(
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
        this.query.select(["platform", "id", "name", "code", "displayOrder", "version"]);
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

    selectDisplayOrder(): this {
        this.query.select(["displayOrder"]);
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

    selectSchoolListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "schoolList", request.toQuery(), "id", "schoolType", true);
        return this;
    }

    haveSchools(): this {
        return this.withSchoolListMatching({
            toQuery: () => new SelectQuery("School"),
        });
    }

    haveNoSchools(): this {
        return this.withoutSchoolListMatching({
            toQuery: () => new SelectQuery("School"),
        });
    }

    withSchoolListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "schoolType",
                },
            },
        });
        return this;
    }

    withoutSchoolListMatching(request: { toQuery(): SelectQuery }): this {
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
        return this.countSchoolsWith(alias, { toQuery: () => query });
    }

    countSchoolsWith(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("Count", "id", alias);
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }

    minStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.minStudentCapacityOfSchoolsAs(
            "minOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    minStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("min", "studentCapacity", "min_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    maxStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.maxStudentCapacityOfSchoolsAs(
            "maxOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    maxStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("max", "studentCapacity", "max_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    sumStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.sumStudentCapacityOfSchoolsAs(
            "sumOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    sumStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("sum", "studentCapacity", "sum_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    avgStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.avgStudentCapacityOfSchoolsAs(
            "avgOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    avgStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("avg", "studentCapacity", "avg_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    standardDeviationStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.standardDeviationStudentCapacityOfSchoolsAs(
            "standardDeviationOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    standardDeviationStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("stddev", "studentCapacity", "standardDeviation_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    squareRootOfPopulationStandardDeviationStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs(
            "squareRootOfPopulationStandardDeviationOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("stddev_pop", "studentCapacity", "squareRootOfPopulationStandardDeviation_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    sampleVarianceStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceStudentCapacityOfSchoolsAs(
            "sampleVarianceOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    sampleVarianceStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("var_samp", "studentCapacity", "sampleVariance_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    samplePopulationVarianceStudentCapacityOfSchools(): this {
        const query = new SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceStudentCapacityOfSchoolsAs(
            "samplePopulationVarianceOfStudentCapacityOfSchools", { toQuery: () => query });
    }

    samplePopulationVarianceStudentCapacityOfSchoolsAs(alias: string, child: { toQuery(): SelectQuery }): this {
        child.toQuery().aggregate("var_pop", "studentCapacity", "samplePopulationVariance_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
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

        withNameContaining(val: string): this {
            this.filters.push({ "name": { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ "name": { "$eq": val } });
            return this;
        }

        withNameIsNot(val: any): this {
            this.filters.push({ "name": { "$ne": val } });
            return this;
        }

        withNameIn(...vals: any[]): this {
            this.filters.push({ "name": { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: any[]): this {
            this.filters.push({ "name": { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: any): this {
            this.filters.push({ "name": { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "name": { "$gte": val } });
            return this;
        }

        withNameLessThan(val: any): this {
            this.filters.push({ "name": { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: any): this {
            this.filters.push({ "name": { "$lte": val } });
            return this;
        }

        withNameBetween(lower: any, upper: any): this {
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

        withCodeIsNot(val: any): this {
            this.filters.push({ "code": { "$ne": val } });
            return this;
        }

        withCodeIn(...vals: any[]): this {
            this.filters.push({ "code": { "$in": vals } });
            return this;
        }

        withCodeNotIn(...vals: any[]): this {
            this.filters.push({ "code": { "$notIn": vals } });
            return this;
        }

        withCodeGreaterThan(val: any): this {
            this.filters.push({ "code": { "$gt": val } });
            return this;
        }

        withCodeGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "code": { "$gte": val } });
            return this;
        }

        withCodeLessThan(val: any): this {
            this.filters.push({ "code": { "$lt": val } });
            return this;
        }

        withCodeLessThanOrEqualTo(val: any): this {
            this.filters.push({ "code": { "$lte": val } });
            return this;
        }

        withCodeBetween(lower: any, upper: any): this {
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

        withDisplayOrderIs(val: any): this {
            this.filters.push({ "displayOrder": { "$eq": val } });
            return this;
        }

        withDisplayOrderIsNot(val: any): this {
            this.filters.push({ "displayOrder": { "$ne": val } });
            return this;
        }

        withDisplayOrderIn(...vals: any[]): this {
            this.filters.push({ "displayOrder": { "$in": vals } });
            return this;
        }

        withDisplayOrderNotIn(...vals: any[]): this {
            this.filters.push({ "displayOrder": { "$notIn": vals } });
            return this;
        }

        withDisplayOrderGreaterThan(val: any): this {
            this.filters.push({ "displayOrder": { "$gt": val } });
            return this;
        }

        withDisplayOrderGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "displayOrder": { "$gte": val } });
            return this;
        }

        withDisplayOrderLessThan(val: any): this {
            this.filters.push({ "displayOrder": { "$lt": val } });
            return this;
        }

        withDisplayOrderLessThanOrEqualTo(val: any): this {
            this.filters.push({ "displayOrder": { "$lte": val } });
            return this;
        }

        withDisplayOrderBetween(lower: any, upper: any): this {
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

    orderByDisplayOrderAscending(): this {
        this.query.orderBy("displayOrder", "asc");
        return this;
    }

    orderByDisplayOrderDescending(): this {
        this.query.orderBy("displayOrder", "desc");
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

    // --- Group By ---
    groupByPlatform(): this {
        this.query.groupBy("platform");
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy("platform"); // In TS we don't alias group by yet natively
        return this;
    }
    groupById(): this {
        this.query.groupBy("id");
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy("id"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByName(): this {
        this.query.groupBy("name");
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy("name"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCode(): this {
        this.query.groupBy("code");
        return this;
    }

    groupByCodeAs(retName: string): this {
        this.query.groupBy("code"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByDisplayOrder(): this {
        this.query.groupBy("displayOrder");
        return this;
    }

    groupByDisplayOrderAs(retName: string): this {
        this.query.groupBy("displayOrder"); // In TS we don't alias group by yet natively
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


    private async executeForListInternal(context: UserContext): Promise<SmartList<SchoolType>> {
        this.ensureIntent();
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const queryRoot = new EntityRoot();
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof SchoolType
                ? row
                : SchoolType.fromRecord(row as Record<string, unknown>, queryRoot));
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

    private async executeForPageInternal(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<SchoolType>> {
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
            row instanceof SchoolType
                ? row
                : SchoolType.fromRecord(row as Record<string, unknown>, queryRoot)));
        data.totalCount = totalCount;
        return { data, totalCount, offset, limit };
    }

    private async *executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<SchoolType> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const queryRoot = new EntityRoot();
        for await (const chunk of service.executeForStream(this.query, chunkSize)) {
            for (const entity of chunk) {
                yield entity instanceof SchoolType
                    ? entity
                    : SchoolType.fromRecord(entity as Record<string, unknown>, queryRoot);
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

export class ExecutableSchoolTypeRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<SchoolType>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly page: (
            context: UserContext, offset: number, limit: number,
        ) => Promise<TeaQLPage<SchoolType>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<SchoolType>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): SchoolType {
        this.ensureIntent();
        return new SchoolType();
    }

    executeForList(context: UserContext): Promise<SmartList<SchoolType>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForPage(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<SchoolType>> {
        this.ensureIntent();
        return this.page(context, offset, limit);
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