"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutableSchoolRequest = exports.SchoolRequest = void 0;
const teaql_ts_1 = require("../../teaql-ts");
const School_1 = require("../models/School");
class SchoolRequest {
    query;
    filters = [];
    _purpose;
    _comment;
    constructor(minimal = false) {
        this.query = new teaql_ts_1.SelectQuery("School");
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
        return new ExecutableSchoolRequest((context) => this.executeForListInternal(context), (context) => this.executeForRowsInternal(context), (context, offset, limit) => this.executeForPageInternal(context, offset, limit), (context, chunkSize) => this.executeForStreamInternal(context, chunkSize), () => this.limit(1), (c) => this.comment(c), () => this.ensureIntent());
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
        this.query.select(["id", "platform", "schoolType", "name", "address", "establishedDate", "studentCapacity", "active", "createTime", "updateTime", "version"]);
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
    selectAddress() {
        this.query.select(["address"]);
        return this;
    }
    selectEstablishedDate() {
        this.query.select(["establishedDate"]);
        return this;
    }
    selectStudentCapacity() {
        this.query.select(["studentCapacity"]);
        return this;
    }
    selectActive() {
        this.query.select(["active"]);
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
    selectPlatformWith(request) {
        this.query.select(["platform"]);
        this.query.relationQuery("platform", request.toQuery(), "platform", "id", false);
        return this;
    }
    selectSchoolTypeWith(request) {
        this.query.select(["schoolType"]);
        this.query.relationQuery("schoolType", request.toQuery(), "schoolType", "id", false);
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
    withSchoolTypeMatching(request) {
        this.filters.push({
            "schoolType": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withoutSchoolTypeMatching(request) {
        this.filters.push({
            "schoolType": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
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
    filterBySchoolType(val) {
        this.filters.push({ "schoolType": { "$eq": val } });
        return this;
    }
    filterBySchoolTypeIn(...vals) {
        this.filters.push({ "schoolType": { "$in": vals } });
        return this;
    }
    withSchoolTypeIsKnown() {
        this.filters.push({ "schoolType": { "$isNull": false } });
        return this;
    }
    withSchoolTypeIsUnknown() {
        this.filters.push({ "schoolType": { "$isNull": true } });
        return this;
    }
    withSchoolTypeIsPrimary() {
        this.filters.push({ "schoolType": { "$eq": "1001" } });
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
    withAddressContaining(val) {
        this.filters.push({ "address": { "$contains": val } });
        return this;
    }
    withAddressIs(val) {
        this.filters.push({ "address": { "$eq": val } });
        return this;
    }
    withAddressIsNot(val) {
        this.filters.push({ "address": { "$ne": val } });
        return this;
    }
    withAddressIn(...vals) {
        this.filters.push({ "address": { "$in": vals } });
        return this;
    }
    withAddressNotIn(...vals) {
        this.filters.push({ "address": { "$notIn": vals } });
        return this;
    }
    withAddressGreaterThan(val) {
        this.filters.push({ "address": { "$gt": val } });
        return this;
    }
    withAddressGreaterThanOrEqualTo(val) {
        this.filters.push({ "address": { "$gte": val } });
        return this;
    }
    withAddressLessThan(val) {
        this.filters.push({ "address": { "$lt": val } });
        return this;
    }
    withAddressLessThanOrEqualTo(val) {
        this.filters.push({ "address": { "$lte": val } });
        return this;
    }
    withAddressBetween(lower, upper) {
        this.filters.push({ "address": { "$between": [lower, upper] } });
        return this;
    }
    withAddressIsKnown() {
        this.filters.push({ "address": { "$isNull": false } });
        return this;
    }
    withAddressIsUnknown() {
        this.filters.push({ "address": { "$isNull": true } });
        return this;
    }
    withAddressNotContaining(val) {
        this.filters.push({ "address": { "$notContains": val } });
        return this;
    }
    withAddressStartingWith(val) {
        this.filters.push({ "address": { "$startsWith": val } });
        return this;
    }
    withAddressNotStartingWith(val) {
        this.filters.push({ "address": { "$notStartsWith": val } });
        return this;
    }
    withAddressEndingWith(val) {
        this.filters.push({ "address": { "$endsWith": val } });
        return this;
    }
    withAddressNotEndingWith(val) {
        this.filters.push({ "address": { "$notEndsWith": val } });
        return this;
    }
    withAddressSoundingLike(val) {
        this.filters.push({ "address": { "$soundLike": val } });
        return this;
    }
    withEstablishedDateIs(val) {
        this.filters.push({ "establishedDate": { "$eq": val } });
        return this;
    }
    withEstablishedDateIsNot(val) {
        this.filters.push({ "establishedDate": { "$ne": val } });
        return this;
    }
    withEstablishedDateIn(...vals) {
        this.filters.push({ "establishedDate": { "$in": vals } });
        return this;
    }
    withEstablishedDateNotIn(...vals) {
        this.filters.push({ "establishedDate": { "$notIn": vals } });
        return this;
    }
    withEstablishedDateGreaterThan(val) {
        this.filters.push({ "establishedDate": { "$gt": val } });
        return this;
    }
    withEstablishedDateGreaterThanOrEqualTo(val) {
        this.filters.push({ "establishedDate": { "$gte": val } });
        return this;
    }
    withEstablishedDateLessThan(val) {
        this.filters.push({ "establishedDate": { "$lt": val } });
        return this;
    }
    withEstablishedDateLessThanOrEqualTo(val) {
        this.filters.push({ "establishedDate": { "$lte": val } });
        return this;
    }
    withEstablishedDateBetween(lower, upper) {
        this.filters.push({ "establishedDate": { "$between": [lower, upper] } });
        return this;
    }
    withEstablishedDateIsKnown() {
        this.filters.push({ "establishedDate": { "$isNull": false } });
        return this;
    }
    withEstablishedDateIsUnknown() {
        this.filters.push({ "establishedDate": { "$isNull": true } });
        return this;
    }
    withStudentCapacityIs(val) {
        this.filters.push({ "studentCapacity": { "$eq": val } });
        return this;
    }
    withStudentCapacityIsNot(val) {
        this.filters.push({ "studentCapacity": { "$ne": val } });
        return this;
    }
    withStudentCapacityIn(...vals) {
        this.filters.push({ "studentCapacity": { "$in": vals } });
        return this;
    }
    withStudentCapacityNotIn(...vals) {
        this.filters.push({ "studentCapacity": { "$notIn": vals } });
        return this;
    }
    withStudentCapacityGreaterThan(val) {
        this.filters.push({ "studentCapacity": { "$gt": val } });
        return this;
    }
    withStudentCapacityGreaterThanOrEqualTo(val) {
        this.filters.push({ "studentCapacity": { "$gte": val } });
        return this;
    }
    withStudentCapacityLessThan(val) {
        this.filters.push({ "studentCapacity": { "$lt": val } });
        return this;
    }
    withStudentCapacityLessThanOrEqualTo(val) {
        this.filters.push({ "studentCapacity": { "$lte": val } });
        return this;
    }
    withStudentCapacityBetween(lower, upper) {
        this.filters.push({ "studentCapacity": { "$between": [lower, upper] } });
        return this;
    }
    withStudentCapacityIsKnown() {
        this.filters.push({ "studentCapacity": { "$isNull": false } });
        return this;
    }
    withStudentCapacityIsUnknown() {
        this.filters.push({ "studentCapacity": { "$isNull": true } });
        return this;
    }
    whichAreActive() {
        this.filters.push({ "active": { "$eq": true } });
        return this;
    }
    whichAreNotActive() {
        this.filters.push({ "active": { "$eq": false } });
        return this;
    }
    withActiveIsNot(val) {
        this.filters.push({ "active": { "$ne": val } });
        return this;
    }
    withActiveIn(...vals) {
        this.filters.push({ "active": { "$in": vals } });
        return this;
    }
    withActiveNotIn(...vals) {
        this.filters.push({ "active": { "$notIn": vals } });
        return this;
    }
    withActiveGreaterThan(val) {
        this.filters.push({ "active": { "$gt": val } });
        return this;
    }
    withActiveGreaterThanOrEqualTo(val) {
        this.filters.push({ "active": { "$gte": val } });
        return this;
    }
    withActiveLessThan(val) {
        this.filters.push({ "active": { "$lt": val } });
        return this;
    }
    withActiveLessThanOrEqualTo(val) {
        this.filters.push({ "active": { "$lte": val } });
        return this;
    }
    withActiveBetween(lower, upper) {
        this.filters.push({ "active": { "$between": [lower, upper] } });
        return this;
    }
    withActiveIsKnown() {
        this.filters.push({ "active": { "$isNull": false } });
        return this;
    }
    withActiveIsUnknown() {
        this.filters.push({ "active": { "$isNull": true } });
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
    orderByAddressAscending() {
        this.query.orderBy("address", "asc");
        return this;
    }
    orderByAddressDescending() {
        this.query.orderBy("address", "desc");
        return this;
    }
    orderByEstablishedDateAscending() {
        this.query.orderBy("establishedDate", "asc");
        return this;
    }
    orderByEstablishedDateDescending() {
        this.query.orderBy("establishedDate", "desc");
        return this;
    }
    orderByStudentCapacityAscending() {
        this.query.orderBy("studentCapacity", "asc");
        return this;
    }
    orderByStudentCapacityDescending() {
        this.query.orderBy("studentCapacity", "desc");
        return this;
    }
    orderByActiveAscending() {
        this.query.orderBy("active", "asc");
        return this;
    }
    orderByActiveDescending() {
        this.query.orderBy("active", "desc");
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
    minStudentCapacity() {
        return this.minStudentCapacityAs("minOfStudentCapacity");
    }
    minStudentCapacityAs(retName) {
        this.query.aggregate("min", "studentCapacity", retName);
        return this;
    }
    maxStudentCapacity() {
        return this.maxStudentCapacityAs("maxOfStudentCapacity");
    }
    maxStudentCapacityAs(retName) {
        this.query.aggregate("max", "studentCapacity", retName);
        return this;
    }
    sumStudentCapacity() {
        return this.sumStudentCapacityAs("sumOfStudentCapacity");
    }
    sumStudentCapacityAs(retName) {
        this.query.aggregate("sum", "studentCapacity", retName);
        return this;
    }
    avgStudentCapacity() {
        return this.avgStudentCapacityAs("avgOfStudentCapacity");
    }
    avgStudentCapacityAs(retName) {
        this.query.aggregate("avg", "studentCapacity", retName);
        return this;
    }
    standardDeviationStudentCapacity() {
        return this.standardDeviationStudentCapacityAs("standardDeviationOfStudentCapacity");
    }
    standardDeviationStudentCapacityAs(retName) {
        this.query.aggregate("stddev", "studentCapacity", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationStudentCapacity() {
        return this.squareRootOfPopulationStandardDeviationStudentCapacityAs("squareRootOfPopulationStandardDeviationOfStudentCapacity");
    }
    squareRootOfPopulationStandardDeviationStudentCapacityAs(retName) {
        this.query.aggregate("stddev_pop", "studentCapacity", retName);
        return this;
    }
    sampleVarianceStudentCapacity() {
        return this.sampleVarianceStudentCapacityAs("sampleVarianceOfStudentCapacity");
    }
    sampleVarianceStudentCapacityAs(retName) {
        this.query.aggregate("var_samp", "studentCapacity", retName);
        return this;
    }
    samplePopulationVarianceStudentCapacity() {
        return this.samplePopulationVarianceStudentCapacityAs("samplePopulationVarianceOfStudentCapacity");
    }
    samplePopulationVarianceStudentCapacityAs(retName) {
        this.query.aggregate("var_pop", "studentCapacity", retName);
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
    groupByPlatform() {
        this.query.groupBy("platform");
        return this;
    }
    groupByPlatformAs(retName) {
        this.query.groupBy("platform"); // In TS we don't alias group by yet natively
        return this;
    }
    groupBySchoolType() {
        this.query.groupBy("schoolType");
        return this;
    }
    groupBySchoolTypeAs(retName) {
        this.query.groupBy("schoolType"); // In TS we don't alias group by yet natively
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
    groupByAddress() {
        this.query.groupBy("address");
        return this;
    }
    groupByAddressAs(retName) {
        this.query.groupBy("address"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByEstablishedDate() {
        this.query.groupBy("establishedDate");
        return this;
    }
    groupByEstablishedDateAs(retName) {
        this.query.groupBy("establishedDate"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByStudentCapacity() {
        this.query.groupBy("studentCapacity");
        return this;
    }
    groupByStudentCapacityAs(retName) {
        this.query.groupBy("studentCapacity"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByActive() {
        this.query.groupBy("active");
        return this;
    }
    groupByActiveAs(retName) {
        this.query.groupBy("active"); // In TS we don't alias group by yet natively
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
    facetByPlatformAs(facetName, request, includeAllFacets = true) {
        this.query.facetBy(facetName, "platform", request, includeAllFacets);
        return this;
    }
    facetBySchoolTypeAs(facetName, request, includeAllFacets = true) {
        this.query.facetBy(facetName, "schoolType", request, includeAllFacets);
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
        const data = aggregateOnly ? [] : rows.map((row) => row instanceof School_1.School
            ? row
            : School_1.School.fromRecord(row, new teaql_ts_1.EntityRoot()));
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
        const data = new teaql_ts_1.SmartList(rows.map((row) => row instanceof School_1.School
            ? row
            : School_1.School.fromRecord(row, new teaql_ts_1.EntityRoot())));
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
                    yield entity instanceof School_1.School
                        ? entity
                        : School_1.School.fromRecord(entity, new teaql_ts_1.EntityRoot());
                }
            }
        })();
    }
    ensureIntent() {
        new teaql_ts_1.QueryIntent(this._comment, this._purpose);
    }
}
exports.SchoolRequest = SchoolRequest;
class ExecutableSchoolRequest {
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
        return new School_1.School();
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
exports.ExecutableSchoolRequest = ExecutableSchoolRequest;
