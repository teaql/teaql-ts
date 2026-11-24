import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { School } from '../models/School';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class SchoolRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("School");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "School" {
        return "School";
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

    purpose(p: string): ExecutableSchoolRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableSchoolRequest(
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
        this.query.select([School.__teaqlFields.ID_PROPERTY.member, School.__teaqlFields.PLATFORM_PROPERTY.member, School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member, School.__teaqlFields.NAME_PROPERTY.member, School.__teaqlFields.ADDRESS_PROPERTY.member, School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member, School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, School.__teaqlFields.ACTIVE_PROPERTY.member, School.__teaqlFields.CREATE_TIME_PROPERTY.member, School.__teaqlFields.UPDATE_TIME_PROPERTY.member, School.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([School.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }



    selectName(): this {
        this.query.select([School.__teaqlFields.NAME_PROPERTY.member]);
        return this;
    }

    selectAddress(): this {
        this.query.select([School.__teaqlFields.ADDRESS_PROPERTY.member]);
        return this;
    }

    selectEstablishedDate(): this {
        this.query.select([School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]);
        return this;
    }

    selectStudentCapacity(): this {
        this.query.select([School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]);
        return this;
    }

    selectActive(): this {
        this.query.select([School.__teaqlFields.ACTIVE_PROPERTY.member]);
        return this;
    }

    selectCreateTime(): this {
        this.query.select([School.__teaqlFields.CREATE_TIME_PROPERTY.member]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select([School.__teaqlFields.UPDATE_TIME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([School.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPlatformWith(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.query.select([School.__teaqlFields.PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            School.__teaqlFields.PLATFORM_PROPERTY.member, request.toQuery(), School.__teaqlFields.PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: School.__teaqlFields.PLATFORM_PROPERTY.member });
        return this;
    }
    selectSchoolTypeWith(request: { readonly entityName: "SchoolType"; toQuery(): SelectQuery }): this {
        this.query.select([School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]);
        this.query.relationQuery(
            School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member, request.toQuery(), School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectSchoolTypeWith", relation: School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member });
        return this;
    }

    withPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [School.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [School.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }
    withSchoolTypeMatching(request: { readonly entityName: "SchoolType"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutSchoolTypeMatching(request: { readonly entityName: "SchoolType"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByPlatform(val: any): this {
            this.filters.push({ [School.__teaqlFields.PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ [School.__teaqlFields.PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPlatformIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPlatformIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterBySchoolType(val: any): this {
            this.filters.push({ [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterBySchoolTypeIn(...vals: any[]): this {
            this.filters.push({ [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withSchoolTypeIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withSchoolTypeIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withSchoolTypeIsPrimarySchool(): this {
            this.filters.push({ [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: { "$eq": "1001" } });
            return this;
        }
        withSchoolTypeIsSecondary(): this {
            this.filters.push({ [School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member]: { "$eq": "1002" } });
            return this;
        }

        withNameContaining(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ [School.__teaqlFields.NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withAddressContaining(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withAddressIs(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withAddressIsNot(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withAddressIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withAddressNotIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withAddressGreaterThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withAddressGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withAddressLessThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withAddressLessThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withAddressBetween(lower: string, upper: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withAddressIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withAddressIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withAddressNotContaining(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withAddressStartingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withAddressNotStartingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withAddressEndingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withAddressNotEndingWith(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withAddressSoundingLike(val: string): this {
            this.filters.push({ [School.__teaqlFields.ADDRESS_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withEstablishedDateIs(val: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withEstablishedDateIsNot(val: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withEstablishedDateIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withEstablishedDateNotIn(...vals: string[]): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withEstablishedDateGreaterThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withEstablishedDateGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withEstablishedDateLessThan(val: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withEstablishedDateLessThanOrEqualTo(val: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withEstablishedDateBetween(lower: string, upper: string): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withEstablishedDateIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withEstablishedDateIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withStudentCapacityIs(val: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withStudentCapacityIsNot(val: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withStudentCapacityIn(...vals: number[]): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withStudentCapacityNotIn(...vals: number[]): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withStudentCapacityGreaterThan(val: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withStudentCapacityGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withStudentCapacityLessThan(val: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withStudentCapacityLessThanOrEqualTo(val: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withStudentCapacityBetween(lower: number, upper: number): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withStudentCapacityIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withStudentCapacityIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        whichAreActive(): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$eq": true } });
            return this;
        }

        whichAreNotActive(): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$eq": false } });
            return this;
        }
        withActiveIsNot(val: boolean): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withActiveIn(...vals: boolean[]): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withActiveNotIn(...vals: boolean[]): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withActiveGreaterThan(val: boolean): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withActiveGreaterThanOrEqualTo(val: boolean): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withActiveLessThan(val: boolean): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withActiveLessThanOrEqualTo(val: boolean): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withActiveBetween(lower: boolean, upper: boolean): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withActiveIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withActiveIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.ACTIVE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [School.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(School.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(School.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }



    orderByNameAscending(): this {
        this.query.orderBy(School.__teaqlFields.NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy(School.__teaqlFields.NAME_PROPERTY.member, "desc");
        return this;
    }

    orderByAddressAscending(): this {
        this.query.orderBy(School.__teaqlFields.ADDRESS_PROPERTY.member, "asc");
        return this;
    }

    orderByAddressDescending(): this {
        this.query.orderBy(School.__teaqlFields.ADDRESS_PROPERTY.member, "desc");
        return this;
    }

    orderByEstablishedDateAscending(): this {
        this.query.orderBy(School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member, "asc");
        return this;
    }

    orderByEstablishedDateDescending(): this {
        this.query.orderBy(School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member, "desc");
        return this;
    }

    orderByStudentCapacityAscending(): this {
        this.query.orderBy(School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, "asc");
        return this;
    }

    orderByStudentCapacityDescending(): this {
        this.query.orderBy(School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, "desc");
        return this;
    }

    orderByActiveAscending(): this {
        this.query.orderBy(School.__teaqlFields.ACTIVE_PROPERTY.member, "asc");
        return this;
    }

    orderByActiveDescending(): this {
        this.query.orderBy(School.__teaqlFields.ACTIVE_PROPERTY.member, "desc");
        return this;
    }

    orderByCreateTimeAscending(): this {
        this.query.orderBy(School.__teaqlFields.CREATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy(School.__teaqlFields.CREATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy(School.__teaqlFields.UPDATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy(School.__teaqlFields.UPDATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(School.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(School.__teaqlFields.VERSION_PROPERTY.member, "desc");
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

    minStudentCapacity(): this {
        return this.minStudentCapacityAs("minOfStudentCapacity");
    }

    minStudentCapacityAs(retName: string): this {
        this.query.aggregate("min", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    maxStudentCapacity(): this {
        return this.maxStudentCapacityAs("maxOfStudentCapacity");
    }

    maxStudentCapacityAs(retName: string): this {
        this.query.aggregate("max", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    sumStudentCapacity(): this {
        return this.sumStudentCapacityAs("sumOfStudentCapacity");
    }

    sumStudentCapacityAs(retName: string): this {
        this.query.aggregate("sum", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    avgStudentCapacity(): this {
        return this.avgStudentCapacityAs("avgOfStudentCapacity");
    }

    avgStudentCapacityAs(retName: string): this {
        this.query.aggregate("avg", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    standardDeviationStudentCapacity(): this {
        return this.standardDeviationStudentCapacityAs("standardDeviationOfStudentCapacity");
    }

    standardDeviationStudentCapacityAs(retName: string): this {
        this.query.aggregate("stddev", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationStudentCapacity(): this {
        return this.squareRootOfPopulationStandardDeviationStudentCapacityAs("squareRootOfPopulationStandardDeviationOfStudentCapacity");
    }

    squareRootOfPopulationStandardDeviationStudentCapacityAs(retName: string): this {
        this.query.aggregate("stddev_pop", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    sampleVarianceStudentCapacity(): this {
        return this.sampleVarianceStudentCapacityAs("sampleVarianceOfStudentCapacity");
    }

    sampleVarianceStudentCapacityAs(retName: string): this {
        this.query.aggregate("var_samp", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVarianceStudentCapacity(): this {
        return this.samplePopulationVarianceStudentCapacityAs("samplePopulationVarianceOfStudentCapacity");
    }

    samplePopulationVarianceStudentCapacityAs(retName: string): this {
        this.query.aggregate("var_pop", School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }

    // --- Group By ---
    groupById(): this {
        this.query.groupBy(School.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByPlatform(): this {
        this.query.groupBy(School.__teaqlFields.PLATFORM_PROPERTY.member);
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupBySchoolType(): this {
        this.query.groupBy(School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member);
        return this;
    }

    groupBySchoolTypeAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member, retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy(School.__teaqlFields.NAME_PROPERTY.member);
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.NAME_PROPERTY.member, retName);
        return this;
    }
    groupByAddress(): this {
        this.query.groupBy(School.__teaqlFields.ADDRESS_PROPERTY.member);
        return this;
    }

    groupByAddressAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.ADDRESS_PROPERTY.member, retName);
        return this;
    }
    groupByEstablishedDate(): this {
        this.query.groupBy(School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member);
        return this;
    }

    groupByEstablishedDateAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.ESTABLISHED_DATE_PROPERTY.member, retName);
        return this;
    }
    groupByStudentCapacity(): this {
        this.query.groupBy(School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member);
        return this;
    }

    groupByStudentCapacityAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.STUDENT_CAPACITY_PROPERTY.member, retName);
        return this;
    }
    groupByActive(): this {
        this.query.groupBy(School.__teaqlFields.ACTIVE_PROPERTY.member);
        return this;
    }

    groupByActiveAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.ACTIVE_PROPERTY.member, retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy(School.__teaqlFields.CREATE_TIME_PROPERTY.member);
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.CREATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy(School.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.UPDATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(School.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(School.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPlatformAs(
        facetName: string,
        request: { readonly entityName: "Platform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, School.__teaqlFields.PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: School.__teaqlFields.PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }

    facetBySchoolTypeAs(
        facetName: string,
        request: { readonly entityName: "SchoolType"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetBySchoolTypeAs", relation: School.__teaqlFields.SCHOOL_TYPE_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<School>> {
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
            row instanceof School
                ? row
                : School.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<School>(data);
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
    ): Promise<SmartList<School>> {
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
        const data = new SmartList<School>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof School
                ? row
                : School.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<School> {
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
                    yield entity instanceof School
                        ? entity
                        : School.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableSchoolRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<School>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<School>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<School> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return School.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<School>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<School> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<School | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}