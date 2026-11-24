import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { OrderSearchPreset } from '../models/OrderSearchPreset';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class OrderSearchPresetRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("OrderSearchPreset");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "OrderSearchPreset" {
        return "OrderSearchPreset";
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

    purpose(p: string): ExecutableOrderSearchPresetRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableOrderSearchPresetRequest(
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
        this.query.select([OrderSearchPreset.__teaqlFields.ID_PROPERTY.member, OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member, OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member, OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member, OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member, OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member, OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member, OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }

    selectName(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]);
        return this;
    }

    selectFilterJson(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]);
        return this;
    }

    selectRequestId(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]);
        return this;
    }

    selectOwnerUserId(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]);
        return this;
    }


    selectCreateTime(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectCommercePlatformWith(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.query.select([OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request.toQuery(), OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCommercePlatformWith", relation: OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member });
        return this;
    }

    withCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCommercePlatformMatching(request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withNameContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withFilterJsonContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withFilterJsonIs(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withFilterJsonIsNot(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withFilterJsonIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withFilterJsonNotIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withFilterJsonGreaterThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withFilterJsonGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withFilterJsonLessThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withFilterJsonLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withFilterJsonBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withFilterJsonIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withFilterJsonIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withFilterJsonNotContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withFilterJsonStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withFilterJsonNotStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withFilterJsonEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withFilterJsonNotEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withFilterJsonSoundingLike(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withRequestIdContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withRequestIdIs(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withRequestIdIsNot(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withRequestIdIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withRequestIdNotIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withRequestIdGreaterThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withRequestIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withRequestIdLessThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withRequestIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withRequestIdBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withRequestIdIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withRequestIdIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withRequestIdNotContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withRequestIdStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withRequestIdNotStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withRequestIdEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withRequestIdNotEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withRequestIdSoundingLike(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withOwnerUserIdContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withOwnerUserIdIs(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withOwnerUserIdIsNot(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withOwnerUserIdIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withOwnerUserIdNotIn(...vals: string[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withOwnerUserIdGreaterThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withOwnerUserIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withOwnerUserIdLessThan(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withOwnerUserIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withOwnerUserIdBetween(lower: string, upper: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withOwnerUserIdIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withOwnerUserIdIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withOwnerUserIdNotContaining(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withOwnerUserIdStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withOwnerUserIdNotStartingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withOwnerUserIdEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withOwnerUserIdNotEndingWith(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withOwnerUserIdSoundingLike(val: string): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        filterByCommercePlatform(val: any): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByCommercePlatformIn(...vals: any[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCommercePlatformIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCommercePlatformIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }

    orderByNameAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member, "desc");
        return this;
    }

    orderByFilterJsonAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member, "asc");
        return this;
    }

    orderByFilterJsonDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member, "desc");
        return this;
    }

    orderByRequestIdAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member, "asc");
        return this;
    }

    orderByRequestIdDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member, "desc");
        return this;
    }

    orderByOwnerUserIdAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member, "asc");
        return this;
    }

    orderByOwnerUserIdDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member, "desc");
        return this;
    }


    orderByCreateTimeAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(OrderSearchPreset.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member);
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.NAME_PROPERTY.member, retName);
        return this;
    }
    groupByFilterJson(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member);
        return this;
    }

    groupByFilterJsonAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.FILTER_JSON_PROPERTY.member, retName);
        return this;
    }
    groupByRequestId(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member);
        return this;
    }

    groupByRequestIdAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.REQUEST_ID_PROPERTY.member, retName);
        return this;
    }
    groupByOwnerUserId(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member);
        return this;
    }

    groupByOwnerUserIdAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.OWNER_USER_ID_PROPERTY.member, retName);
        return this;
    }
    groupByCommercePlatform(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member);
        return this;
    }

    groupByCommercePlatformAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member);
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.CREATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.UPDATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(OrderSearchPreset.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByCommercePlatformAs(
        facetName: string,
        request: { readonly entityName: "CommercePlatform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByCommercePlatformAs", relation: OrderSearchPreset.__teaqlFields.COMMERCE_PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<OrderSearchPreset>> {
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
            row instanceof OrderSearchPreset
                ? row
                : OrderSearchPreset.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<OrderSearchPreset>(data);
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
    ): Promise<SmartList<OrderSearchPreset>> {
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
        const data = new SmartList<OrderSearchPreset>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof OrderSearchPreset
                ? row
                : OrderSearchPreset.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<OrderSearchPreset> {
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
                    yield entity instanceof OrderSearchPreset
                        ? entity
                        : OrderSearchPreset.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableOrderSearchPresetRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<OrderSearchPreset>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<OrderSearchPreset>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<OrderSearchPreset> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return OrderSearchPreset.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<OrderSearchPreset>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<OrderSearchPreset> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<OrderSearchPreset | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}