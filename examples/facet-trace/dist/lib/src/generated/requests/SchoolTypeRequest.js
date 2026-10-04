"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutableSchoolTypeRequest = exports.SchoolTypeRequest = void 0;
const teaql_ts_1 = require("../../teaql-ts");
const SchoolType_1 = require("../models/SchoolType");
class SchoolTypeRequest {
    query;
    filters = [];
    _purpose;
    _comment;
    constructor(minimal = false) {
        this.query = new teaql_ts_1.SelectQuery("SchoolType");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else
            this.selectSelfFields();
    }
    comment(c) {
        this.query.comment(c);
        this._comment = c;
        return this;
    }
    purpose(p) {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableSchoolTypeRequest((context) => this.executeForListInternal(context), (context) => this.executeForRowsInternal(context), (context, offset, limit) => this.executeForPageInternal(context, offset, limit), (context, chunkSize) => this.executeForStreamInternal(context, chunkSize), () => this.limit(1), (c) => this.comment(c), () => this.ensureIntent());
    }
    optimizeForContinuousPageFetch() {
        this.query.optimizeForContinuousPageFetch();
        return this;
    }
    optimizeForContinuousPageFetchWith(namespace, ttlSeconds) {
        this.query.optimizeForContinuousPageFetchWith(namespace, ttlSeconds);
        return this;
    }
    optimizePaginationWithIdSet() {
        this.query.optimizePaginationWithIdSet();
        return this;
    }
    optimizePaginationWithIdSetConfig(namespace, ttlSeconds, maxIds) {
        this.query.optimizePaginationWithIdSetConfig(namespace, ttlSeconds, maxIds);
        return this;
    }
    topNProbeParentThreshold(threshold) {
        this.query.topNProbeParentThreshold(threshold);
        return this;
    }
    limit(n) {
        this.query.limit(n);
        return this;
    }
    offset(n) {
        this.query.offset(n);
        return this;
    }
    toQuery() {
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }
        return this.query;
    }
    withDeletedRows() {
        this.filters = this.filters.filter(filter => !("version" in filter));
        return this;
    }
    deletedRowsOnly() {
        this.withDeletedRows();
        this.filters.push({ version: { "$lte": -1 } });
        return this;
    }
    selectSelfFields() {
        this.query.select(["platform", "id", "name", "code", "displayOrder", "version"]);
        return this;
    }
    selectId() {
        this.query.select(["id"]);
        return this;
    }
    selectName() {
        this.query.select(["name"]);
        return this;
    }
    selectCode() {
        this.query.select(["code"]);
        return this;
    }
    selectDisplayOrder() {
        this.query.select(["displayOrder"]);
        return this;
    }
    selectVersion() {
        this.query.select(["version"]);
        return this;
    }
    selectPlatformWith(request) {
        this.query.select(["platform"]);
        this.query.relationQuery("platform", request.toQuery(), "platform", "id", false);
        return this;
    }
    withPlatformMatching(request) {
        this.filters.push({
            "platform": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withoutPlatformMatching(request) {
        this.filters.push({
            "platform": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    selectSchoolListWith(request) {
        this.query.relationQuery("schoolList", request.toQuery(), "id", "schoolType", true);
        return this;
    }
    haveSchools() {
        return this.withSchoolListMatching({
            toQuery: () => new teaql_ts_1.SelectQuery("School"),
        });
    }
    haveNoSchools() {
        return this.withoutSchoolListMatching({
            toQuery: () => new teaql_ts_1.SelectQuery("School"),
        });
    }
    withSchoolListMatching(request) {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "schoolType",
                },
            },
        });
        return this;
    }
    withoutSchoolListMatching(request) {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "schoolType",
                },
            },
        });
        return this;
    }
    countSchools() {
        return this.countSchoolsAs("countSchools");
    }
    countSchoolsAs(alias) {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.countSchoolsWith(alias, { toQuery: () => query });
    }
    countSchoolsWith(alias, child) {
        child.toQuery().aggregate("Count", "id", alias);
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    minStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.minStudentCapacityOfSchoolsAs("minOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    minStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("min", "studentCapacity", "min_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    maxStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.maxStudentCapacityOfSchoolsAs("maxOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    maxStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("max", "studentCapacity", "max_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    sumStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.sumStudentCapacityOfSchoolsAs("sumOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    sumStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("sum", "studentCapacity", "sum_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    avgStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.avgStudentCapacityOfSchoolsAs("avgOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    avgStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("avg", "studentCapacity", "avg_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    standardDeviationStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.standardDeviationStudentCapacityOfSchoolsAs("standardDeviationOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    standardDeviationStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("stddev", "studentCapacity", "standardDeviation_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    squareRootOfPopulationStandardDeviationStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs("squareRootOfPopulationStandardDeviationOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    squareRootOfPopulationStandardDeviationStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("stddev_pop", "studentCapacity", "squareRootOfPopulationStandardDeviation_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    sampleVarianceStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceStudentCapacityOfSchoolsAs("sampleVarianceOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    sampleVarianceStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("var_samp", "studentCapacity", "sampleVariance_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    samplePopulationVarianceStudentCapacityOfSchools() {
        const query = new teaql_ts_1.SelectQuery("School").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceStudentCapacityOfSchoolsAs("samplePopulationVarianceOfStudentCapacityOfSchools", { toQuery: () => query });
    }
    samplePopulationVarianceStudentCapacityOfSchoolsAs(alias, child) {
        child.toQuery().aggregate("var_pop", "studentCapacity", "samplePopulationVariance_studentCapacity");
        this.query.relationAggregate("schoolList", alias, child.toQuery(), true);
        return this;
    }
    filterByPlatform(val) {
        this.filters.push({ "platform": { "$eq": val } });
        return this;
    }
    filterByPlatformIn(...vals) {
        this.filters.push({ "platform": { "$in": vals } });
        return this;
    }
    withPlatformIsKnown() {
        this.filters.push({ "platform": { "$isNull": false } });
        return this;
    }
    withPlatformIsUnknown() {
        this.filters.push({ "platform": { "$isNull": true } });
        return this;
    }
    withIdIs(val) {
        this.filters.push({ "id": { "$eq": val } });
        return this;
    }
    withIdIsNot(val) {
        this.filters.push({ "id": { "$ne": val } });
        return this;
    }
    withIdIn(...vals) {
        this.filters.push({ "id": { "$in": vals } });
        return this;
    }
    withIdNotIn(...vals) {
        this.filters.push({ "id": { "$notIn": vals } });
        return this;
    }
    withIdGreaterThan(val) {
        this.filters.push({ "id": { "$gt": val } });
        return this;
    }
    withIdGreaterThanOrEqualTo(val) {
        this.filters.push({ "id": { "$gte": val } });
        return this;
    }
    withIdLessThan(val) {
        this.filters.push({ "id": { "$lt": val } });
        return this;
    }
    withIdLessThanOrEqualTo(val) {
        this.filters.push({ "id": { "$lte": val } });
        return this;
    }
    withIdBetween(lower, upper) {
        this.filters.push({ "id": { "$between": [lower, upper] } });
        return this;
    }
    withIdIsKnown() {
        this.filters.push({ "id": { "$isNull": false } });
        return this;
    }
    withIdIsUnknown() {
        this.filters.push({ "id": { "$isNull": true } });
        return this;
    }
    withNameContaining(val) {
        this.filters.push({ "name": { "$contains": val } });
        return this;
    }
    withNameIs(val) {
        this.filters.push({ "name": { "$eq": val } });
        return this;
    }
    withNameIsNot(val) {
        this.filters.push({ "name": { "$ne": val } });
        return this;
    }
    withNameIn(...vals) {
        this.filters.push({ "name": { "$in": vals } });
        return this;
    }
    withNameNotIn(...vals) {
        this.filters.push({ "name": { "$notIn": vals } });
        return this;
    }
    withNameGreaterThan(val) {
        this.filters.push({ "name": { "$gt": val } });
        return this;
    }
    withNameGreaterThanOrEqualTo(val) {
        this.filters.push({ "name": { "$gte": val } });
        return this;
    }
    withNameLessThan(val) {
        this.filters.push({ "name": { "$lt": val } });
        return this;
    }
    withNameLessThanOrEqualTo(val) {
        this.filters.push({ "name": { "$lte": val } });
        return this;
    }
    withNameBetween(lower, upper) {
        this.filters.push({ "name": { "$between": [lower, upper] } });
        return this;
    }
    withNameIsKnown() {
        this.filters.push({ "name": { "$isNull": false } });
        return this;
    }
    withNameIsUnknown() {
        this.filters.push({ "name": { "$isNull": true } });
        return this;
    }
    withNameNotContaining(val) {
        this.filters.push({ "name": { "$notContains": val } });
        return this;
    }
    withNameStartingWith(val) {
        this.filters.push({ "name": { "$startsWith": val } });
        return this;
    }
    withNameNotStartingWith(val) {
        this.filters.push({ "name": { "$notStartsWith": val } });
        return this;
    }
    withNameEndingWith(val) {
        this.filters.push({ "name": { "$endsWith": val } });
        return this;
    }
    withNameNotEndingWith(val) {
        this.filters.push({ "name": { "$notEndsWith": val } });
        return this;
    }
    withNameSoundingLike(val) {
        this.filters.push({ "name": { "$soundLike": val } });
        return this;
    }
    withCodeContaining(val) {
        this.filters.push({ "code": { "$contains": val } });
        return this;
    }
    withCodeIs(val) {
        this.filters.push({ "code": { "$eq": val } });
        return this;
    }
    withCodeIsNot(val) {
        this.filters.push({ "code": { "$ne": val } });
        return this;
    }
    withCodeIn(...vals) {
        this.filters.push({ "code": { "$in": vals } });
        return this;
    }
    withCodeNotIn(...vals) {
        this.filters.push({ "code": { "$notIn": vals } });
        return this;
    }
    withCodeGreaterThan(val) {
        this.filters.push({ "code": { "$gt": val } });
        return this;
    }
    withCodeGreaterThanOrEqualTo(val) {
        this.filters.push({ "code": { "$gte": val } });
        return this;
    }
    withCodeLessThan(val) {
        this.filters.push({ "code": { "$lt": val } });
        return this;
    }
    withCodeLessThanOrEqualTo(val) {
        this.filters.push({ "code": { "$lte": val } });
        return this;
    }
    withCodeBetween(lower, upper) {
        this.filters.push({ "code": { "$between": [lower, upper] } });
        return this;
    }
    withCodeIsKnown() {
        this.filters.push({ "code": { "$isNull": false } });
        return this;
    }
    withCodeIsUnknown() {
        this.filters.push({ "code": { "$isNull": true } });
        return this;
    }
    withCodeNotContaining(val) {
        this.filters.push({ "code": { "$notContains": val } });
        return this;
    }
    withCodeStartingWith(val) {
        this.filters.push({ "code": { "$startsWith": val } });
        return this;
    }
    withCodeNotStartingWith(val) {
        this.filters.push({ "code": { "$notStartsWith": val } });
        return this;
    }
    withCodeEndingWith(val) {
        this.filters.push({ "code": { "$endsWith": val } });
        return this;
    }
    withCodeNotEndingWith(val) {
        this.filters.push({ "code": { "$notEndsWith": val } });
        return this;
    }
    withCodeSoundingLike(val) {
        this.filters.push({ "code": { "$soundLike": val } });
        return this;
    }
    withDisplayOrderIs(val) {
        this.filters.push({ "displayOrder": { "$eq": val } });
        return this;
    }
    withDisplayOrderIsNot(val) {
        this.filters.push({ "displayOrder": { "$ne": val } });
        return this;
    }
    withDisplayOrderIn(...vals) {
        this.filters.push({ "displayOrder": { "$in": vals } });
        return this;
    }
    withDisplayOrderNotIn(...vals) {
        this.filters.push({ "displayOrder": { "$notIn": vals } });
        return this;
    }
    withDisplayOrderGreaterThan(val) {
        this.filters.push({ "displayOrder": { "$gt": val } });
        return this;
    }
    withDisplayOrderGreaterThanOrEqualTo(val) {
        this.filters.push({ "displayOrder": { "$gte": val } });
        return this;
    }
    withDisplayOrderLessThan(val) {
        this.filters.push({ "displayOrder": { "$lt": val } });
        return this;
    }
    withDisplayOrderLessThanOrEqualTo(val) {
        this.filters.push({ "displayOrder": { "$lte": val } });
        return this;
    }
    withDisplayOrderBetween(lower, upper) {
        this.filters.push({ "displayOrder": { "$between": [lower, upper] } });
        return this;
    }
    withDisplayOrderIsKnown() {
        this.filters.push({ "displayOrder": { "$isNull": false } });
        return this;
    }
    withDisplayOrderIsUnknown() {
        this.filters.push({ "displayOrder": { "$isNull": true } });
        return this;
    }
    withVersionIs(val) {
        this.filters.push({ "version": { "$eq": val } });
        return this;
    }
    withVersionIsNot(val) {
        this.filters.push({ "version": { "$ne": val } });
        return this;
    }
    withVersionIn(...vals) {
        this.filters.push({ "version": { "$in": vals } });
        return this;
    }
    withVersionNotIn(...vals) {
        this.filters.push({ "version": { "$notIn": vals } });
        return this;
    }
    withVersionGreaterThan(val) {
        this.filters.push({ "version": { "$gt": val } });
        return this;
    }
    withVersionGreaterThanOrEqualTo(val) {
        this.filters.push({ "version": { "$gte": val } });
        return this;
    }
    withVersionLessThan(val) {
        this.filters.push({ "version": { "$lt": val } });
        return this;
    }
    withVersionLessThanOrEqualTo(val) {
        this.filters.push({ "version": { "$lte": val } });
        return this;
    }
    withVersionBetween(lower, upper) {
        this.filters.push({ "version": { "$between": [lower, upper] } });
        return this;
    }
    withVersionIsKnown() {
        this.filters.push({ "version": { "$isNull": false } });
        return this;
    }
    withVersionIsUnknown() {
        this.filters.push({ "version": { "$isNull": true } });
        return this;
    }
    orderByIdAscending() {
        this.query.orderBy("id", "asc");
        return this;
    }
    orderByIdDescending() {
        this.query.orderBy("id", "desc");
        return this;
    }
    orderByNameAscending() {
        this.query.orderBy("name", "asc");
        return this;
    }
    orderByNameDescending() {
        this.query.orderBy("name", "desc");
        return this;
    }
    orderByCodeAscending() {
        this.query.orderBy("code", "asc");
        return this;
    }
    orderByCodeDescending() {
        this.query.orderBy("code", "desc");
        return this;
    }
    orderByDisplayOrderAscending() {
        this.query.orderBy("displayOrder", "asc");
        return this;
    }
    orderByDisplayOrderDescending() {
        this.query.orderBy("displayOrder", "desc");
        return this;
    }
    orderByVersionAscending() {
        this.query.orderBy("version", "asc");
        return this;
    }
    orderByVersionDescending() {
        this.query.orderBy("version", "desc");
        return this;
    }
    // --- Aggregations ---
    count() {
        this.query.aggregate("Count", "id", "count");
        return this;
    }
    countAs(retName) {
        this.query.aggregate("Count", "id", retName);
        return this;
    }
    minDisplayOrder() {
        return this.minDisplayOrderAs("minOfDisplayOrder");
    }
    minDisplayOrderAs(retName) {
        this.query.aggregate("min", "displayOrder", retName);
        return this;
    }
    maxDisplayOrder() {
        return this.maxDisplayOrderAs("maxOfDisplayOrder");
    }
    maxDisplayOrderAs(retName) {
        this.query.aggregate("max", "displayOrder", retName);
        return this;
    }
    sumDisplayOrder() {
        return this.sumDisplayOrderAs("sumOfDisplayOrder");
    }
    sumDisplayOrderAs(retName) {
        this.query.aggregate("sum", "displayOrder", retName);
        return this;
    }
    avgDisplayOrder() {
        return this.avgDisplayOrderAs("avgOfDisplayOrder");
    }
    avgDisplayOrderAs(retName) {
        this.query.aggregate("avg", "displayOrder", retName);
        return this;
    }
    standardDeviationDisplayOrder() {
        return this.standardDeviationDisplayOrderAs("standardDeviationOfDisplayOrder");
    }
    standardDeviationDisplayOrderAs(retName) {
        this.query.aggregate("stddev", "displayOrder", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrder() {
        return this.squareRootOfPopulationStandardDeviationDisplayOrderAs("squareRootOfPopulationStandardDeviationOfDisplayOrder");
    }
    squareRootOfPopulationStandardDeviationDisplayOrderAs(retName) {
        this.query.aggregate("stddev_pop", "displayOrder", retName);
        return this;
    }
    sampleVarianceDisplayOrder() {
        return this.sampleVarianceDisplayOrderAs("sampleVarianceOfDisplayOrder");
    }
    sampleVarianceDisplayOrderAs(retName) {
        this.query.aggregate("var_samp", "displayOrder", retName);
        return this;
    }
    samplePopulationVarianceDisplayOrder() {
        return this.samplePopulationVarianceDisplayOrderAs("samplePopulationVarianceOfDisplayOrder");
    }
    samplePopulationVarianceDisplayOrderAs(retName) {
        this.query.aggregate("var_pop", "displayOrder", retName);
        return this;
    }
    // --- Group By ---
    groupByPlatform() {
        this.query.groupBy("platform");
        return this;
    }
    groupByPlatformAs(retName) {
        this.query.groupBy("platform"); // In TS we don't alias group by yet natively
        return this;
    }
    groupById() {
        this.query.groupBy("id");
        return this;
    }
    groupByIdAs(retName) {
        this.query.groupBy("id"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByName() {
        this.query.groupBy("name");
        return this;
    }
    groupByNameAs(retName) {
        this.query.groupBy("name"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCode() {
        this.query.groupBy("code");
        return this;
    }
    groupByCodeAs(retName) {
        this.query.groupBy("code"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByDisplayOrder() {
        this.query.groupBy("displayOrder");
        return this;
    }
    groupByDisplayOrderAs(retName) {
        this.query.groupBy("displayOrder"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByVersion() {
        this.query.groupBy("version");
        return this;
    }
    groupByVersionAs(retName) {
        this.query.groupBy("version"); // In TS we don't alias group by yet natively
        return this;
    }
    // --- Facets ---
    facetByPlatformAs(facetName, request, includeAllFacets = true) {
        this.query.facetBy(facetName, "platform", request, includeAllFacets);
        return this;
    }
    async executeForListInternal(context) {
        this.ensureIntent();
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }
        const service = context.requireResource("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row) => row instanceof SchoolType_1.SchoolType
            ? row
            : SchoolType_1.SchoolType.fromRecord(row, new teaql_ts_1.EntityRoot()));
        const result = new teaql_ts_1.SmartList(data);
        if (aggregateOnly && rows[0])
            Object.assign(result.aggregations, rows[0]);
        if (this.query.facets.length > 0) {
            result.facets = await (0, teaql_ts_1.executeRelationFacets)(service, (query) => context.prepareQuery(query), this.query, this.query.facets);
        }
        return result;
    }
    async executeForRowsInternal(context) {
        this.ensureIntent();
        if (this.filters.length > 0)
            this.query.filter({ "$and": this.filters });
        const service = context.requireResource("dataService");
        return new teaql_ts_1.SmartList(await service.executeQuery(context.prepareQuery(this.query)));
    }
    async executeForPageInternal(context, offset, limit) {
        this.ensureIntent();
        const candidate = this.query.clone().offset(offset).limit(limit);
        if (this.filters.length > 0)
            candidate.filter({ "$and": this.filters });
        const service = context.requireResource("dataService");
        const query = context.prepareQuery(candidate);
        const useIdSet = query.localIdSetPaginationOptions() !== undefined;
        const totalCountBeforeRows = useIdSet ? undefined : await service.executeCount(query);
        const rows = await service.executeQuery(query);
        const totalCount = useIdSet && context.idSetPaginationCountAccuracy === "EXACT"
            ? context.idSetPaginationCount
            : (totalCountBeforeRows ?? await service.executeCount(query));
        const data = new teaql_ts_1.SmartList(rows.map((row) => row instanceof SchoolType_1.SchoolType
            ? row
            : SchoolType_1.SchoolType.fromRecord(row, new teaql_ts_1.EntityRoot())));
        data.totalCount = totalCount;
        return { data, totalCount, offset, limit };
    }
    executeForStreamInternal(context, chunkSize) {
        this.ensureIntent();
        if (this.filters.length > 0)
            this.query.filter({ "$and": this.filters });
        const service = context.requireResource("dataService");
        const query = context.prepareQuery(this.query.clone());
        const chunks = service.executeForStream(query, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof SchoolType_1.SchoolType
                        ? entity
                        : SchoolType_1.SchoolType.fromRecord(entity, new teaql_ts_1.EntityRoot());
                }
            }
        })();
    }
    ensureIntent() {
        new teaql_ts_1.QueryIntent(this._comment, this._purpose);
    }
}
exports.SchoolTypeRequest = SchoolTypeRequest;
class ExecutableSchoolTypeRequest {
    execute;
    executeRows;
    page;
    stream;
    limitOne;
    addComment;
    ensureIntent;
    constructor(execute, executeRows, page, stream, limitOne, addComment, ensureIntent) {
        this.execute = execute;
        this.executeRows = executeRows;
        this.page = page;
        this.stream = stream;
        this.limitOne = limitOne;
        this.addComment = addComment;
        this.ensureIntent = ensureIntent;
    }
    comment(c) {
        this.addComment(c);
        return this;
    }
    newEntity(context) {
        this.ensureIntent();
        return new SchoolType_1.SchoolType();
    }
    executeForList(context) {
        this.ensureIntent();
        return this.execute(context);
    }
    executeForRows(context) {
        this.ensureIntent();
        return this.executeRows(context);
    }
    executeForPage(context, offset, limit) {
        this.ensureIntent();
        return this.page(context, offset, limit);
    }
    executeForStream(context, chunkSize = 1000) {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }
    async executeForOne(context) {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}
exports.ExecutableSchoolTypeRequest = ExecutableSchoolTypeRequest;
