"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutablePlatformRequest = exports.PlatformRequest = void 0;
const teaql_ts_1 = require("../../teaql-ts");
const Platform_1 = require("../models/Platform");
class PlatformRequest {
    query;
    filters = [];
    _purpose;
    _comment;
    constructor(minimal = false) {
        this.query = new teaql_ts_1.SelectQuery("Platform");
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
        return new ExecutablePlatformRequest((context) => this.executeForListInternal(context), (context) => this.executeForRowsInternal(context), (context, offset, limit) => this.executeForPageInternal(context, offset, limit), (context, chunkSize) => this.executeForStreamInternal(context, chunkSize), () => this.limit(1), (c) => this.comment(c), () => this.ensureIntent());
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
        this.query.select(["id", "name", "baseUrl", "createTime", "updateTime", "version"]);
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
    selectBaseUrl() {
        this.query.select(["baseUrl"]);
        return this;
    }
    selectCreateTime() {
        this.query.select(["createTime"]);
        return this;
    }
    selectUpdateTime() {
        this.query.select(["updateTime"]);
        return this;
    }
    selectVersion() {
        this.query.select(["version"]);
        return this;
    }
    selectSchoolTypeListWith(request) {
        this.query.relationQuery("schoolTypeList", request.toQuery(), "id", "platform", true);
        return this;
    }
    selectSchoolListWith(request) {
        this.query.relationQuery("schoolList", request.toQuery(), "id", "platform", true);
        return this;
    }
    haveSchoolTypes() {
        return this.withSchoolTypeListMatching({
            toQuery: () => new teaql_ts_1.SelectQuery("SchoolType"),
        });
    }
    haveNoSchoolTypes() {
        return this.withoutSchoolTypeListMatching({
            toQuery: () => new teaql_ts_1.SelectQuery("SchoolType"),
        });
    }
    withSchoolTypeListMatching(request) {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }
    withoutSchoolTypeListMatching(request) {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
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
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }
    withoutSchoolListMatching(request) {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }
    countSchoolTypes() {
        return this.countSchoolTypesAs("countSchoolTypes");
    }
    countSchoolTypesAs(alias) {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.countSchoolTypesWith(alias, { toQuery: () => query });
    }
    countSchoolTypesWith(alias, child) {
        child.toQuery().aggregate("Count", "id", alias);
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    minDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.minDisplayOrderOfSchoolTypesAs("minOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    minDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("min", "displayOrder", "min_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    maxDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.maxDisplayOrderOfSchoolTypesAs("maxOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    maxDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("max", "displayOrder", "max_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    sumDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.sumDisplayOrderOfSchoolTypesAs("sumOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    sumDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("sum", "displayOrder", "sum_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    avgDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.avgDisplayOrderOfSchoolTypesAs("avgOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    avgDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("avg", "displayOrder", "avg_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    standardDeviationDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.standardDeviationDisplayOrderOfSchoolTypesAs("standardDeviationOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    standardDeviationDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("stddev", "displayOrder", "standardDeviation_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationDisplayOrderOfSchoolTypesAs("squareRootOfPopulationStandardDeviationOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    squareRootOfPopulationStandardDeviationDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("stddev_pop", "displayOrder", "squareRootOfPopulationStandardDeviation_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    sampleVarianceDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceDisplayOrderOfSchoolTypesAs("sampleVarianceOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    sampleVarianceDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("var_samp", "displayOrder", "sampleVariance_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
        return this;
    }
    samplePopulationVarianceDisplayOrderOfSchoolTypes() {
        const query = new teaql_ts_1.SelectQuery("SchoolType").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceDisplayOrderOfSchoolTypesAs("samplePopulationVarianceOfDisplayOrderOfSchoolTypes", { toQuery: () => query });
    }
    samplePopulationVarianceDisplayOrderOfSchoolTypesAs(alias, child) {
        child.toQuery().aggregate("var_pop", "displayOrder", "samplePopulationVariance_displayOrder");
        this.query.relationAggregate("schoolTypeList", alias, child.toQuery(), true);
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
    withBaseUrlContaining(val) {
        this.filters.push({ "baseUrl": { "$contains": val } });
        return this;
    }
    withBaseUrlIs(val) {
        this.filters.push({ "baseUrl": { "$eq": val } });
        return this;
    }
    withBaseUrlIsNot(val) {
        this.filters.push({ "baseUrl": { "$ne": val } });
        return this;
    }
    withBaseUrlIn(...vals) {
        this.filters.push({ "baseUrl": { "$in": vals } });
        return this;
    }
    withBaseUrlNotIn(...vals) {
        this.filters.push({ "baseUrl": { "$notIn": vals } });
        return this;
    }
    withBaseUrlGreaterThan(val) {
        this.filters.push({ "baseUrl": { "$gt": val } });
        return this;
    }
    withBaseUrlGreaterThanOrEqualTo(val) {
        this.filters.push({ "baseUrl": { "$gte": val } });
        return this;
    }
    withBaseUrlLessThan(val) {
        this.filters.push({ "baseUrl": { "$lt": val } });
        return this;
    }
    withBaseUrlLessThanOrEqualTo(val) {
        this.filters.push({ "baseUrl": { "$lte": val } });
        return this;
    }
    withBaseUrlBetween(lower, upper) {
        this.filters.push({ "baseUrl": { "$between": [lower, upper] } });
        return this;
    }
    withBaseUrlIsKnown() {
        this.filters.push({ "baseUrl": { "$isNull": false } });
        return this;
    }
    withBaseUrlIsUnknown() {
        this.filters.push({ "baseUrl": { "$isNull": true } });
        return this;
    }
    withBaseUrlNotContaining(val) {
        this.filters.push({ "baseUrl": { "$notContains": val } });
        return this;
    }
    withBaseUrlStartingWith(val) {
        this.filters.push({ "baseUrl": { "$startsWith": val } });
        return this;
    }
    withBaseUrlNotStartingWith(val) {
        this.filters.push({ "baseUrl": { "$notStartsWith": val } });
        return this;
    }
    withBaseUrlEndingWith(val) {
        this.filters.push({ "baseUrl": { "$endsWith": val } });
        return this;
    }
    withBaseUrlNotEndingWith(val) {
        this.filters.push({ "baseUrl": { "$notEndsWith": val } });
        return this;
    }
    withBaseUrlSoundingLike(val) {
        this.filters.push({ "baseUrl": { "$soundLike": val } });
        return this;
    }
    withCreateTimeIs(val) {
        this.filters.push({ "createTime": { "$eq": val } });
        return this;
    }
    withCreateTimeIsNot(val) {
        this.filters.push({ "createTime": { "$ne": val } });
        return this;
    }
    withCreateTimeIn(...vals) {
        this.filters.push({ "createTime": { "$in": vals } });
        return this;
    }
    withCreateTimeNotIn(...vals) {
        this.filters.push({ "createTime": { "$notIn": vals } });
        return this;
    }
    withCreateTimeGreaterThan(val) {
        this.filters.push({ "createTime": { "$gt": val } });
        return this;
    }
    withCreateTimeGreaterThanOrEqualTo(val) {
        this.filters.push({ "createTime": { "$gte": val } });
        return this;
    }
    withCreateTimeLessThan(val) {
        this.filters.push({ "createTime": { "$lt": val } });
        return this;
    }
    withCreateTimeLessThanOrEqualTo(val) {
        this.filters.push({ "createTime": { "$lte": val } });
        return this;
    }
    withCreateTimeBetween(lower, upper) {
        this.filters.push({ "createTime": { "$between": [lower, upper] } });
        return this;
    }
    withCreateTimeIsKnown() {
        this.filters.push({ "createTime": { "$isNull": false } });
        return this;
    }
    withCreateTimeIsUnknown() {
        this.filters.push({ "createTime": { "$isNull": true } });
        return this;
    }
    withUpdateTimeIs(val) {
        this.filters.push({ "updateTime": { "$eq": val } });
        return this;
    }
    withUpdateTimeIsNot(val) {
        this.filters.push({ "updateTime": { "$ne": val } });
        return this;
    }
    withUpdateTimeIn(...vals) {
        this.filters.push({ "updateTime": { "$in": vals } });
        return this;
    }
    withUpdateTimeNotIn(...vals) {
        this.filters.push({ "updateTime": { "$notIn": vals } });
        return this;
    }
    withUpdateTimeGreaterThan(val) {
        this.filters.push({ "updateTime": { "$gt": val } });
        return this;
    }
    withUpdateTimeGreaterThanOrEqualTo(val) {
        this.filters.push({ "updateTime": { "$gte": val } });
        return this;
    }
    withUpdateTimeLessThan(val) {
        this.filters.push({ "updateTime": { "$lt": val } });
        return this;
    }
    withUpdateTimeLessThanOrEqualTo(val) {
        this.filters.push({ "updateTime": { "$lte": val } });
        return this;
    }
    withUpdateTimeBetween(lower, upper) {
        this.filters.push({ "updateTime": { "$between": [lower, upper] } });
        return this;
    }
    withUpdateTimeIsKnown() {
        this.filters.push({ "updateTime": { "$isNull": false } });
        return this;
    }
    withUpdateTimeIsUnknown() {
        this.filters.push({ "updateTime": { "$isNull": true } });
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
    orderByBaseUrlAscending() {
        this.query.orderBy("baseUrl", "asc");
        return this;
    }
    orderByBaseUrlDescending() {
        this.query.orderBy("baseUrl", "desc");
        return this;
    }
    orderByCreateTimeAscending() {
        this.query.orderBy("createTime", "asc");
        return this;
    }
    orderByCreateTimeDescending() {
        this.query.orderBy("createTime", "desc");
        return this;
    }
    orderByUpdateTimeAscending() {
        this.query.orderBy("updateTime", "asc");
        return this;
    }
    orderByUpdateTimeDescending() {
        this.query.orderBy("updateTime", "desc");
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
    // --- Group By ---
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
    groupByBaseUrl() {
        this.query.groupBy("baseUrl");
        return this;
    }
    groupByBaseUrlAs(retName) {
        this.query.groupBy("baseUrl"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCreateTime() {
        this.query.groupBy("createTime");
        return this;
    }
    groupByCreateTimeAs(retName) {
        this.query.groupBy("createTime"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByUpdateTime() {
        this.query.groupBy("updateTime");
        return this;
    }
    groupByUpdateTimeAs(retName) {
        this.query.groupBy("updateTime"); // In TS we don't alias group by yet natively
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
    async executeForListInternal(context) {
        this.ensureIntent();
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }
        const service = context.requireResource("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row) => row instanceof Platform_1.Platform
            ? row
            : Platform_1.Platform.fromRecord(row, new teaql_ts_1.EntityRoot()));
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
        const data = new teaql_ts_1.SmartList(rows.map((row) => row instanceof Platform_1.Platform
            ? row
            : Platform_1.Platform.fromRecord(row, new teaql_ts_1.EntityRoot())));
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
                    yield entity instanceof Platform_1.Platform
                        ? entity
                        : Platform_1.Platform.fromRecord(entity, new teaql_ts_1.EntityRoot());
                }
            }
        })();
    }
    ensureIntent() {
        new teaql_ts_1.QueryIntent(this._comment, this._purpose);
    }
}
exports.PlatformRequest = PlatformRequest;
class ExecutablePlatformRequest {
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
        return new Platform_1.Platform();
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
exports.ExecutablePlatformRequest = ExecutablePlatformRequest;
