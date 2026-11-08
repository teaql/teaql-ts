import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { ScalarTypeProbe } from '../models/ScalarTypeProbe';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class ScalarTypeProbeRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("ScalarTypeProbe");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "ScalarTypeProbe" {
        return "ScalarTypeProbe";
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

    purpose(p: string): ExecutableScalarTypeProbeRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableScalarTypeProbeRequest(
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
        this.query.select(["id", "typePlatform", "requiredString", "optionalString", "largeText", "requiredBoolean", "optionalBoolean", "requiredInteger", "optionalInteger", "requiredLong", "optionalLong", "requiredDecimal", "optionalDecimal", "requiredFloat", "optionalFloat", "requiredDouble", "optionalDouble", "requiredDate", "optionalDate", "requiredTime", "optionalTime", "requiredDatetime", "optionalDatetime", "createTime", "updateTime", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }


    selectRequiredString(): this {
        this.query.select(["requiredString"]);
        return this;
    }

    selectOptionalString(): this {
        this.query.select(["optionalString"]);
        return this;
    }

    selectLargeText(): this {
        this.query.select(["largeText"]);
        return this;
    }

    selectRequiredBoolean(): this {
        this.query.select(["requiredBoolean"]);
        return this;
    }

    selectOptionalBoolean(): this {
        this.query.select(["optionalBoolean"]);
        return this;
    }

    selectRequiredInteger(): this {
        this.query.select(["requiredInteger"]);
        return this;
    }

    selectOptionalInteger(): this {
        this.query.select(["optionalInteger"]);
        return this;
    }

    selectRequiredLong(): this {
        this.query.select(["requiredLong"]);
        return this;
    }

    selectOptionalLong(): this {
        this.query.select(["optionalLong"]);
        return this;
    }

    selectRequiredDecimal(): this {
        this.query.select(["requiredDecimal"]);
        return this;
    }

    selectOptionalDecimal(): this {
        this.query.select(["optionalDecimal"]);
        return this;
    }

    selectRequiredFloat(): this {
        this.query.select(["requiredFloat"]);
        return this;
    }

    selectOptionalFloat(): this {
        this.query.select(["optionalFloat"]);
        return this;
    }

    selectRequiredDouble(): this {
        this.query.select(["requiredDouble"]);
        return this;
    }

    selectOptionalDouble(): this {
        this.query.select(["optionalDouble"]);
        return this;
    }

    selectRequiredDate(): this {
        this.query.select(["requiredDate"]);
        return this;
    }

    selectOptionalDate(): this {
        this.query.select(["optionalDate"]);
        return this;
    }

    selectRequiredTime(): this {
        this.query.select(["requiredTime"]);
        return this;
    }

    selectOptionalTime(): this {
        this.query.select(["optionalTime"]);
        return this;
    }

    selectRequiredDatetime(): this {
        this.query.select(["requiredDatetime"]);
        return this;
    }

    selectOptionalDatetime(): this {
        this.query.select(["optionalDatetime"]);
        return this;
    }

    selectCreateTime(): this {
        this.query.select(["createTime"]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select(["updateTime"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectTypePlatformWith(request: { readonly entityName: "TypePlatform"; toQuery(): SelectQuery }): this {
        this.query.select(["typePlatform"]);
        this.query.relationQuery(
            "typePlatform", request.toQuery(), "typePlatform", "id", false,
            { kind: "relation-select", method: "selectTypePlatformWith", relation: "typePlatform" });
        return this;
    }

    withTypePlatformMatching(request: { readonly entityName: "TypePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "typePlatform": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutTypePlatformMatching(request: { readonly entityName: "TypePlatform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "typePlatform": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
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

        filterByTypePlatform(val: any): this {
            this.filters.push({ "typePlatform": { "$eq": val } });
            return this;
        }

        filterByTypePlatformIn(...vals: any[]): this {
            this.filters.push({ "typePlatform": { "$in": vals } });
            return this;
        }

        withTypePlatformIsKnown(): this {
            this.filters.push({ "typePlatform": { "$isNull": false } });
            return this;
        }

        withTypePlatformIsUnknown(): this {
            this.filters.push({ "typePlatform": { "$isNull": true } });
            return this;
        }

        withRequiredStringContaining(val: string): this {
            this.filters.push({ "requiredString": { "$contains": val } });
            return this;
        }

        withRequiredStringIs(val: string): this {
            this.filters.push({ "requiredString": { "$eq": val } });
            return this;
        }

        withRequiredStringIsNot(val: string): this {
            this.filters.push({ "requiredString": { "$ne": val } });
            return this;
        }

        withRequiredStringIn(...vals: string[]): this {
            this.filters.push({ "requiredString": { "$in": vals } });
            return this;
        }

        withRequiredStringNotIn(...vals: string[]): this {
            this.filters.push({ "requiredString": { "$notIn": vals } });
            return this;
        }

        withRequiredStringGreaterThan(val: string): this {
            this.filters.push({ "requiredString": { "$gt": val } });
            return this;
        }

        withRequiredStringGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "requiredString": { "$gte": val } });
            return this;
        }

        withRequiredStringLessThan(val: string): this {
            this.filters.push({ "requiredString": { "$lt": val } });
            return this;
        }

        withRequiredStringLessThanOrEqualTo(val: string): this {
            this.filters.push({ "requiredString": { "$lte": val } });
            return this;
        }

        withRequiredStringBetween(lower: string, upper: string): this {
            this.filters.push({ "requiredString": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredStringIsKnown(): this {
            this.filters.push({ "requiredString": { "$isNull": false } });
            return this;
        }

        withRequiredStringIsUnknown(): this {
            this.filters.push({ "requiredString": { "$isNull": true } });
            return this;
        }
        withRequiredStringNotContaining(val: string): this {
            this.filters.push({ "requiredString": { "$notContains": val } });
            return this;
        }

        withRequiredStringStartingWith(val: string): this {
            this.filters.push({ "requiredString": { "$startsWith": val } });
            return this;
        }

        withRequiredStringNotStartingWith(val: string): this {
            this.filters.push({ "requiredString": { "$notStartsWith": val } });
            return this;
        }

        withRequiredStringEndingWith(val: string): this {
            this.filters.push({ "requiredString": { "$endsWith": val } });
            return this;
        }

        withRequiredStringNotEndingWith(val: string): this {
            this.filters.push({ "requiredString": { "$notEndsWith": val } });
            return this;
        }

        withRequiredStringSoundingLike(val: string): this {
            this.filters.push({ "requiredString": { "$soundLike": val } });
            return this;
        }

        withOptionalStringContaining(val: string): this {
            this.filters.push({ "optionalString": { "$contains": val } });
            return this;
        }

        withOptionalStringIs(val: string): this {
            this.filters.push({ "optionalString": { "$eq": val } });
            return this;
        }

        withOptionalStringIsNot(val: string): this {
            this.filters.push({ "optionalString": { "$ne": val } });
            return this;
        }

        withOptionalStringIn(...vals: string[]): this {
            this.filters.push({ "optionalString": { "$in": vals } });
            return this;
        }

        withOptionalStringNotIn(...vals: string[]): this {
            this.filters.push({ "optionalString": { "$notIn": vals } });
            return this;
        }

        withOptionalStringGreaterThan(val: string): this {
            this.filters.push({ "optionalString": { "$gt": val } });
            return this;
        }

        withOptionalStringGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "optionalString": { "$gte": val } });
            return this;
        }

        withOptionalStringLessThan(val: string): this {
            this.filters.push({ "optionalString": { "$lt": val } });
            return this;
        }

        withOptionalStringLessThanOrEqualTo(val: string): this {
            this.filters.push({ "optionalString": { "$lte": val } });
            return this;
        }

        withOptionalStringBetween(lower: string, upper: string): this {
            this.filters.push({ "optionalString": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalStringIsKnown(): this {
            this.filters.push({ "optionalString": { "$isNull": false } });
            return this;
        }

        withOptionalStringIsUnknown(): this {
            this.filters.push({ "optionalString": { "$isNull": true } });
            return this;
        }
        withOptionalStringNotContaining(val: string): this {
            this.filters.push({ "optionalString": { "$notContains": val } });
            return this;
        }

        withOptionalStringStartingWith(val: string): this {
            this.filters.push({ "optionalString": { "$startsWith": val } });
            return this;
        }

        withOptionalStringNotStartingWith(val: string): this {
            this.filters.push({ "optionalString": { "$notStartsWith": val } });
            return this;
        }

        withOptionalStringEndingWith(val: string): this {
            this.filters.push({ "optionalString": { "$endsWith": val } });
            return this;
        }

        withOptionalStringNotEndingWith(val: string): this {
            this.filters.push({ "optionalString": { "$notEndsWith": val } });
            return this;
        }

        withOptionalStringSoundingLike(val: string): this {
            this.filters.push({ "optionalString": { "$soundLike": val } });
            return this;
        }

        withLargeTextContaining(val: string): this {
            this.filters.push({ "largeText": { "$contains": val } });
            return this;
        }

        withLargeTextIs(val: string): this {
            this.filters.push({ "largeText": { "$eq": val } });
            return this;
        }

        withLargeTextIsNot(val: string): this {
            this.filters.push({ "largeText": { "$ne": val } });
            return this;
        }

        withLargeTextIn(...vals: string[]): this {
            this.filters.push({ "largeText": { "$in": vals } });
            return this;
        }

        withLargeTextNotIn(...vals: string[]): this {
            this.filters.push({ "largeText": { "$notIn": vals } });
            return this;
        }

        withLargeTextGreaterThan(val: string): this {
            this.filters.push({ "largeText": { "$gt": val } });
            return this;
        }

        withLargeTextGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "largeText": { "$gte": val } });
            return this;
        }

        withLargeTextLessThan(val: string): this {
            this.filters.push({ "largeText": { "$lt": val } });
            return this;
        }

        withLargeTextLessThanOrEqualTo(val: string): this {
            this.filters.push({ "largeText": { "$lte": val } });
            return this;
        }

        withLargeTextBetween(lower: string, upper: string): this {
            this.filters.push({ "largeText": { "$between": [lower, upper] } });
            return this;
        }

        withLargeTextIsKnown(): this {
            this.filters.push({ "largeText": { "$isNull": false } });
            return this;
        }

        withLargeTextIsUnknown(): this {
            this.filters.push({ "largeText": { "$isNull": true } });
            return this;
        }
        withLargeTextNotContaining(val: string): this {
            this.filters.push({ "largeText": { "$notContains": val } });
            return this;
        }

        withLargeTextStartingWith(val: string): this {
            this.filters.push({ "largeText": { "$startsWith": val } });
            return this;
        }

        withLargeTextNotStartingWith(val: string): this {
            this.filters.push({ "largeText": { "$notStartsWith": val } });
            return this;
        }

        withLargeTextEndingWith(val: string): this {
            this.filters.push({ "largeText": { "$endsWith": val } });
            return this;
        }

        withLargeTextNotEndingWith(val: string): this {
            this.filters.push({ "largeText": { "$notEndsWith": val } });
            return this;
        }

        withLargeTextSoundingLike(val: string): this {
            this.filters.push({ "largeText": { "$soundLike": val } });
            return this;
        }

        whichAreRequiredBoolean(): this {
            this.filters.push({ "requiredBoolean": { "$eq": true } });
            return this;
        }

        whichAreNotRequiredBoolean(): this {
            this.filters.push({ "requiredBoolean": { "$eq": false } });
            return this;
        }
        withRequiredBooleanIsNot(val: boolean): this {
            this.filters.push({ "requiredBoolean": { "$ne": val } });
            return this;
        }

        withRequiredBooleanIn(...vals: boolean[]): this {
            this.filters.push({ "requiredBoolean": { "$in": vals } });
            return this;
        }

        withRequiredBooleanNotIn(...vals: boolean[]): this {
            this.filters.push({ "requiredBoolean": { "$notIn": vals } });
            return this;
        }

        withRequiredBooleanGreaterThan(val: boolean): this {
            this.filters.push({ "requiredBoolean": { "$gt": val } });
            return this;
        }

        withRequiredBooleanGreaterThanOrEqualTo(val: boolean): this {
            this.filters.push({ "requiredBoolean": { "$gte": val } });
            return this;
        }

        withRequiredBooleanLessThan(val: boolean): this {
            this.filters.push({ "requiredBoolean": { "$lt": val } });
            return this;
        }

        withRequiredBooleanLessThanOrEqualTo(val: boolean): this {
            this.filters.push({ "requiredBoolean": { "$lte": val } });
            return this;
        }

        withRequiredBooleanBetween(lower: boolean, upper: boolean): this {
            this.filters.push({ "requiredBoolean": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredBooleanIsKnown(): this {
            this.filters.push({ "requiredBoolean": { "$isNull": false } });
            return this;
        }

        withRequiredBooleanIsUnknown(): this {
            this.filters.push({ "requiredBoolean": { "$isNull": true } });
            return this;
        }

        whichAreOptionalBoolean(): this {
            this.filters.push({ "optionalBoolean": { "$eq": true } });
            return this;
        }

        whichAreNotOptionalBoolean(): this {
            this.filters.push({ "optionalBoolean": { "$eq": false } });
            return this;
        }
        withOptionalBooleanIsNot(val: boolean): this {
            this.filters.push({ "optionalBoolean": { "$ne": val } });
            return this;
        }

        withOptionalBooleanIn(...vals: boolean[]): this {
            this.filters.push({ "optionalBoolean": { "$in": vals } });
            return this;
        }

        withOptionalBooleanNotIn(...vals: boolean[]): this {
            this.filters.push({ "optionalBoolean": { "$notIn": vals } });
            return this;
        }

        withOptionalBooleanGreaterThan(val: boolean): this {
            this.filters.push({ "optionalBoolean": { "$gt": val } });
            return this;
        }

        withOptionalBooleanGreaterThanOrEqualTo(val: boolean): this {
            this.filters.push({ "optionalBoolean": { "$gte": val } });
            return this;
        }

        withOptionalBooleanLessThan(val: boolean): this {
            this.filters.push({ "optionalBoolean": { "$lt": val } });
            return this;
        }

        withOptionalBooleanLessThanOrEqualTo(val: boolean): this {
            this.filters.push({ "optionalBoolean": { "$lte": val } });
            return this;
        }

        withOptionalBooleanBetween(lower: boolean, upper: boolean): this {
            this.filters.push({ "optionalBoolean": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalBooleanIsKnown(): this {
            this.filters.push({ "optionalBoolean": { "$isNull": false } });
            return this;
        }

        withOptionalBooleanIsUnknown(): this {
            this.filters.push({ "optionalBoolean": { "$isNull": true } });
            return this;
        }

        withRequiredIntegerIs(val: number): this {
            this.filters.push({ "requiredInteger": { "$eq": val } });
            return this;
        }

        withRequiredIntegerIsNot(val: number): this {
            this.filters.push({ "requiredInteger": { "$ne": val } });
            return this;
        }

        withRequiredIntegerIn(...vals: number[]): this {
            this.filters.push({ "requiredInteger": { "$in": vals } });
            return this;
        }

        withRequiredIntegerNotIn(...vals: number[]): this {
            this.filters.push({ "requiredInteger": { "$notIn": vals } });
            return this;
        }

        withRequiredIntegerGreaterThan(val: number): this {
            this.filters.push({ "requiredInteger": { "$gt": val } });
            return this;
        }

        withRequiredIntegerGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "requiredInteger": { "$gte": val } });
            return this;
        }

        withRequiredIntegerLessThan(val: number): this {
            this.filters.push({ "requiredInteger": { "$lt": val } });
            return this;
        }

        withRequiredIntegerLessThanOrEqualTo(val: number): this {
            this.filters.push({ "requiredInteger": { "$lte": val } });
            return this;
        }

        withRequiredIntegerBetween(lower: number, upper: number): this {
            this.filters.push({ "requiredInteger": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredIntegerIsKnown(): this {
            this.filters.push({ "requiredInteger": { "$isNull": false } });
            return this;
        }

        withRequiredIntegerIsUnknown(): this {
            this.filters.push({ "requiredInteger": { "$isNull": true } });
            return this;
        }

        withOptionalIntegerIs(val: number): this {
            this.filters.push({ "optionalInteger": { "$eq": val } });
            return this;
        }

        withOptionalIntegerIsNot(val: number): this {
            this.filters.push({ "optionalInteger": { "$ne": val } });
            return this;
        }

        withOptionalIntegerIn(...vals: number[]): this {
            this.filters.push({ "optionalInteger": { "$in": vals } });
            return this;
        }

        withOptionalIntegerNotIn(...vals: number[]): this {
            this.filters.push({ "optionalInteger": { "$notIn": vals } });
            return this;
        }

        withOptionalIntegerGreaterThan(val: number): this {
            this.filters.push({ "optionalInteger": { "$gt": val } });
            return this;
        }

        withOptionalIntegerGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "optionalInteger": { "$gte": val } });
            return this;
        }

        withOptionalIntegerLessThan(val: number): this {
            this.filters.push({ "optionalInteger": { "$lt": val } });
            return this;
        }

        withOptionalIntegerLessThanOrEqualTo(val: number): this {
            this.filters.push({ "optionalInteger": { "$lte": val } });
            return this;
        }

        withOptionalIntegerBetween(lower: number, upper: number): this {
            this.filters.push({ "optionalInteger": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalIntegerIsKnown(): this {
            this.filters.push({ "optionalInteger": { "$isNull": false } });
            return this;
        }

        withOptionalIntegerIsUnknown(): this {
            this.filters.push({ "optionalInteger": { "$isNull": true } });
            return this;
        }

        withRequiredLongIs(val: Long): this {
            this.filters.push({ "requiredLong": { "$eq": val } });
            return this;
        }

        withRequiredLongIsNot(val: Long): this {
            this.filters.push({ "requiredLong": { "$ne": val } });
            return this;
        }

        withRequiredLongIn(...vals: Long[]): this {
            this.filters.push({ "requiredLong": { "$in": vals } });
            return this;
        }

        withRequiredLongNotIn(...vals: Long[]): this {
            this.filters.push({ "requiredLong": { "$notIn": vals } });
            return this;
        }

        withRequiredLongGreaterThan(val: Long): this {
            this.filters.push({ "requiredLong": { "$gt": val } });
            return this;
        }

        withRequiredLongGreaterThanOrEqualTo(val: Long): this {
            this.filters.push({ "requiredLong": { "$gte": val } });
            return this;
        }

        withRequiredLongLessThan(val: Long): this {
            this.filters.push({ "requiredLong": { "$lt": val } });
            return this;
        }

        withRequiredLongLessThanOrEqualTo(val: Long): this {
            this.filters.push({ "requiredLong": { "$lte": val } });
            return this;
        }

        withRequiredLongBetween(lower: Long, upper: Long): this {
            this.filters.push({ "requiredLong": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredLongIsKnown(): this {
            this.filters.push({ "requiredLong": { "$isNull": false } });
            return this;
        }

        withRequiredLongIsUnknown(): this {
            this.filters.push({ "requiredLong": { "$isNull": true } });
            return this;
        }

        withOptionalLongIs(val: Long): this {
            this.filters.push({ "optionalLong": { "$eq": val } });
            return this;
        }

        withOptionalLongIsNot(val: Long): this {
            this.filters.push({ "optionalLong": { "$ne": val } });
            return this;
        }

        withOptionalLongIn(...vals: Long[]): this {
            this.filters.push({ "optionalLong": { "$in": vals } });
            return this;
        }

        withOptionalLongNotIn(...vals: Long[]): this {
            this.filters.push({ "optionalLong": { "$notIn": vals } });
            return this;
        }

        withOptionalLongGreaterThan(val: Long): this {
            this.filters.push({ "optionalLong": { "$gt": val } });
            return this;
        }

        withOptionalLongGreaterThanOrEqualTo(val: Long): this {
            this.filters.push({ "optionalLong": { "$gte": val } });
            return this;
        }

        withOptionalLongLessThan(val: Long): this {
            this.filters.push({ "optionalLong": { "$lt": val } });
            return this;
        }

        withOptionalLongLessThanOrEqualTo(val: Long): this {
            this.filters.push({ "optionalLong": { "$lte": val } });
            return this;
        }

        withOptionalLongBetween(lower: Long, upper: Long): this {
            this.filters.push({ "optionalLong": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalLongIsKnown(): this {
            this.filters.push({ "optionalLong": { "$isNull": false } });
            return this;
        }

        withOptionalLongIsUnknown(): this {
            this.filters.push({ "optionalLong": { "$isNull": true } });
            return this;
        }

        withRequiredDecimalIs(val: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$eq": val } });
            return this;
        }

        withRequiredDecimalIsNot(val: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$ne": val } });
            return this;
        }

        withRequiredDecimalIn(...vals: Decimal[]): this {
            this.filters.push({ "requiredDecimal": { "$in": vals } });
            return this;
        }

        withRequiredDecimalNotIn(...vals: Decimal[]): this {
            this.filters.push({ "requiredDecimal": { "$notIn": vals } });
            return this;
        }

        withRequiredDecimalGreaterThan(val: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$gt": val } });
            return this;
        }

        withRequiredDecimalGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$gte": val } });
            return this;
        }

        withRequiredDecimalLessThan(val: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$lt": val } });
            return this;
        }

        withRequiredDecimalLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$lte": val } });
            return this;
        }

        withRequiredDecimalBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ "requiredDecimal": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredDecimalIsKnown(): this {
            this.filters.push({ "requiredDecimal": { "$isNull": false } });
            return this;
        }

        withRequiredDecimalIsUnknown(): this {
            this.filters.push({ "requiredDecimal": { "$isNull": true } });
            return this;
        }

        withOptionalDecimalIs(val: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$eq": val } });
            return this;
        }

        withOptionalDecimalIsNot(val: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$ne": val } });
            return this;
        }

        withOptionalDecimalIn(...vals: Decimal[]): this {
            this.filters.push({ "optionalDecimal": { "$in": vals } });
            return this;
        }

        withOptionalDecimalNotIn(...vals: Decimal[]): this {
            this.filters.push({ "optionalDecimal": { "$notIn": vals } });
            return this;
        }

        withOptionalDecimalGreaterThan(val: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$gt": val } });
            return this;
        }

        withOptionalDecimalGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$gte": val } });
            return this;
        }

        withOptionalDecimalLessThan(val: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$lt": val } });
            return this;
        }

        withOptionalDecimalLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$lte": val } });
            return this;
        }

        withOptionalDecimalBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ "optionalDecimal": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalDecimalIsKnown(): this {
            this.filters.push({ "optionalDecimal": { "$isNull": false } });
            return this;
        }

        withOptionalDecimalIsUnknown(): this {
            this.filters.push({ "optionalDecimal": { "$isNull": true } });
            return this;
        }

        withRequiredFloatIs(val: number): this {
            this.filters.push({ "requiredFloat": { "$eq": val } });
            return this;
        }

        withRequiredFloatIsNot(val: number): this {
            this.filters.push({ "requiredFloat": { "$ne": val } });
            return this;
        }

        withRequiredFloatIn(...vals: number[]): this {
            this.filters.push({ "requiredFloat": { "$in": vals } });
            return this;
        }

        withRequiredFloatNotIn(...vals: number[]): this {
            this.filters.push({ "requiredFloat": { "$notIn": vals } });
            return this;
        }

        withRequiredFloatGreaterThan(val: number): this {
            this.filters.push({ "requiredFloat": { "$gt": val } });
            return this;
        }

        withRequiredFloatGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "requiredFloat": { "$gte": val } });
            return this;
        }

        withRequiredFloatLessThan(val: number): this {
            this.filters.push({ "requiredFloat": { "$lt": val } });
            return this;
        }

        withRequiredFloatLessThanOrEqualTo(val: number): this {
            this.filters.push({ "requiredFloat": { "$lte": val } });
            return this;
        }

        withRequiredFloatBetween(lower: number, upper: number): this {
            this.filters.push({ "requiredFloat": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredFloatIsKnown(): this {
            this.filters.push({ "requiredFloat": { "$isNull": false } });
            return this;
        }

        withRequiredFloatIsUnknown(): this {
            this.filters.push({ "requiredFloat": { "$isNull": true } });
            return this;
        }

        withOptionalFloatIs(val: number): this {
            this.filters.push({ "optionalFloat": { "$eq": val } });
            return this;
        }

        withOptionalFloatIsNot(val: number): this {
            this.filters.push({ "optionalFloat": { "$ne": val } });
            return this;
        }

        withOptionalFloatIn(...vals: number[]): this {
            this.filters.push({ "optionalFloat": { "$in": vals } });
            return this;
        }

        withOptionalFloatNotIn(...vals: number[]): this {
            this.filters.push({ "optionalFloat": { "$notIn": vals } });
            return this;
        }

        withOptionalFloatGreaterThan(val: number): this {
            this.filters.push({ "optionalFloat": { "$gt": val } });
            return this;
        }

        withOptionalFloatGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "optionalFloat": { "$gte": val } });
            return this;
        }

        withOptionalFloatLessThan(val: number): this {
            this.filters.push({ "optionalFloat": { "$lt": val } });
            return this;
        }

        withOptionalFloatLessThanOrEqualTo(val: number): this {
            this.filters.push({ "optionalFloat": { "$lte": val } });
            return this;
        }

        withOptionalFloatBetween(lower: number, upper: number): this {
            this.filters.push({ "optionalFloat": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalFloatIsKnown(): this {
            this.filters.push({ "optionalFloat": { "$isNull": false } });
            return this;
        }

        withOptionalFloatIsUnknown(): this {
            this.filters.push({ "optionalFloat": { "$isNull": true } });
            return this;
        }

        withRequiredDoubleIs(val: number): this {
            this.filters.push({ "requiredDouble": { "$eq": val } });
            return this;
        }

        withRequiredDoubleIsNot(val: number): this {
            this.filters.push({ "requiredDouble": { "$ne": val } });
            return this;
        }

        withRequiredDoubleIn(...vals: number[]): this {
            this.filters.push({ "requiredDouble": { "$in": vals } });
            return this;
        }

        withRequiredDoubleNotIn(...vals: number[]): this {
            this.filters.push({ "requiredDouble": { "$notIn": vals } });
            return this;
        }

        withRequiredDoubleGreaterThan(val: number): this {
            this.filters.push({ "requiredDouble": { "$gt": val } });
            return this;
        }

        withRequiredDoubleGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "requiredDouble": { "$gte": val } });
            return this;
        }

        withRequiredDoubleLessThan(val: number): this {
            this.filters.push({ "requiredDouble": { "$lt": val } });
            return this;
        }

        withRequiredDoubleLessThanOrEqualTo(val: number): this {
            this.filters.push({ "requiredDouble": { "$lte": val } });
            return this;
        }

        withRequiredDoubleBetween(lower: number, upper: number): this {
            this.filters.push({ "requiredDouble": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredDoubleIsKnown(): this {
            this.filters.push({ "requiredDouble": { "$isNull": false } });
            return this;
        }

        withRequiredDoubleIsUnknown(): this {
            this.filters.push({ "requiredDouble": { "$isNull": true } });
            return this;
        }

        withOptionalDoubleIs(val: number): this {
            this.filters.push({ "optionalDouble": { "$eq": val } });
            return this;
        }

        withOptionalDoubleIsNot(val: number): this {
            this.filters.push({ "optionalDouble": { "$ne": val } });
            return this;
        }

        withOptionalDoubleIn(...vals: number[]): this {
            this.filters.push({ "optionalDouble": { "$in": vals } });
            return this;
        }

        withOptionalDoubleNotIn(...vals: number[]): this {
            this.filters.push({ "optionalDouble": { "$notIn": vals } });
            return this;
        }

        withOptionalDoubleGreaterThan(val: number): this {
            this.filters.push({ "optionalDouble": { "$gt": val } });
            return this;
        }

        withOptionalDoubleGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "optionalDouble": { "$gte": val } });
            return this;
        }

        withOptionalDoubleLessThan(val: number): this {
            this.filters.push({ "optionalDouble": { "$lt": val } });
            return this;
        }

        withOptionalDoubleLessThanOrEqualTo(val: number): this {
            this.filters.push({ "optionalDouble": { "$lte": val } });
            return this;
        }

        withOptionalDoubleBetween(lower: number, upper: number): this {
            this.filters.push({ "optionalDouble": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalDoubleIsKnown(): this {
            this.filters.push({ "optionalDouble": { "$isNull": false } });
            return this;
        }

        withOptionalDoubleIsUnknown(): this {
            this.filters.push({ "optionalDouble": { "$isNull": true } });
            return this;
        }

        withRequiredDateIs(val: string): this {
            this.filters.push({ "requiredDate": { "$eq": val } });
            return this;
        }

        withRequiredDateIsNot(val: string): this {
            this.filters.push({ "requiredDate": { "$ne": val } });
            return this;
        }

        withRequiredDateIn(...vals: string[]): this {
            this.filters.push({ "requiredDate": { "$in": vals } });
            return this;
        }

        withRequiredDateNotIn(...vals: string[]): this {
            this.filters.push({ "requiredDate": { "$notIn": vals } });
            return this;
        }

        withRequiredDateGreaterThan(val: string): this {
            this.filters.push({ "requiredDate": { "$gt": val } });
            return this;
        }

        withRequiredDateGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "requiredDate": { "$gte": val } });
            return this;
        }

        withRequiredDateLessThan(val: string): this {
            this.filters.push({ "requiredDate": { "$lt": val } });
            return this;
        }

        withRequiredDateLessThanOrEqualTo(val: string): this {
            this.filters.push({ "requiredDate": { "$lte": val } });
            return this;
        }

        withRequiredDateBetween(lower: string, upper: string): this {
            this.filters.push({ "requiredDate": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredDateIsKnown(): this {
            this.filters.push({ "requiredDate": { "$isNull": false } });
            return this;
        }

        withRequiredDateIsUnknown(): this {
            this.filters.push({ "requiredDate": { "$isNull": true } });
            return this;
        }

        withOptionalDateIs(val: string): this {
            this.filters.push({ "optionalDate": { "$eq": val } });
            return this;
        }

        withOptionalDateIsNot(val: string): this {
            this.filters.push({ "optionalDate": { "$ne": val } });
            return this;
        }

        withOptionalDateIn(...vals: string[]): this {
            this.filters.push({ "optionalDate": { "$in": vals } });
            return this;
        }

        withOptionalDateNotIn(...vals: string[]): this {
            this.filters.push({ "optionalDate": { "$notIn": vals } });
            return this;
        }

        withOptionalDateGreaterThan(val: string): this {
            this.filters.push({ "optionalDate": { "$gt": val } });
            return this;
        }

        withOptionalDateGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "optionalDate": { "$gte": val } });
            return this;
        }

        withOptionalDateLessThan(val: string): this {
            this.filters.push({ "optionalDate": { "$lt": val } });
            return this;
        }

        withOptionalDateLessThanOrEqualTo(val: string): this {
            this.filters.push({ "optionalDate": { "$lte": val } });
            return this;
        }

        withOptionalDateBetween(lower: string, upper: string): this {
            this.filters.push({ "optionalDate": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalDateIsKnown(): this {
            this.filters.push({ "optionalDate": { "$isNull": false } });
            return this;
        }

        withOptionalDateIsUnknown(): this {
            this.filters.push({ "optionalDate": { "$isNull": true } });
            return this;
        }

        withRequiredTimeIs(val: LocalTime): this {
            this.filters.push({ "requiredTime": { "$eq": val } });
            return this;
        }

        withRequiredTimeIsNot(val: LocalTime): this {
            this.filters.push({ "requiredTime": { "$ne": val } });
            return this;
        }

        withRequiredTimeIn(...vals: LocalTime[]): this {
            this.filters.push({ "requiredTime": { "$in": vals } });
            return this;
        }

        withRequiredTimeNotIn(...vals: LocalTime[]): this {
            this.filters.push({ "requiredTime": { "$notIn": vals } });
            return this;
        }

        withRequiredTimeGreaterThan(val: LocalTime): this {
            this.filters.push({ "requiredTime": { "$gt": val } });
            return this;
        }

        withRequiredTimeGreaterThanOrEqualTo(val: LocalTime): this {
            this.filters.push({ "requiredTime": { "$gte": val } });
            return this;
        }

        withRequiredTimeLessThan(val: LocalTime): this {
            this.filters.push({ "requiredTime": { "$lt": val } });
            return this;
        }

        withRequiredTimeLessThanOrEqualTo(val: LocalTime): this {
            this.filters.push({ "requiredTime": { "$lte": val } });
            return this;
        }

        withRequiredTimeBetween(lower: LocalTime, upper: LocalTime): this {
            this.filters.push({ "requiredTime": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredTimeIsKnown(): this {
            this.filters.push({ "requiredTime": { "$isNull": false } });
            return this;
        }

        withRequiredTimeIsUnknown(): this {
            this.filters.push({ "requiredTime": { "$isNull": true } });
            return this;
        }

        withOptionalTimeIs(val: LocalTime): this {
            this.filters.push({ "optionalTime": { "$eq": val } });
            return this;
        }

        withOptionalTimeIsNot(val: LocalTime): this {
            this.filters.push({ "optionalTime": { "$ne": val } });
            return this;
        }

        withOptionalTimeIn(...vals: LocalTime[]): this {
            this.filters.push({ "optionalTime": { "$in": vals } });
            return this;
        }

        withOptionalTimeNotIn(...vals: LocalTime[]): this {
            this.filters.push({ "optionalTime": { "$notIn": vals } });
            return this;
        }

        withOptionalTimeGreaterThan(val: LocalTime): this {
            this.filters.push({ "optionalTime": { "$gt": val } });
            return this;
        }

        withOptionalTimeGreaterThanOrEqualTo(val: LocalTime): this {
            this.filters.push({ "optionalTime": { "$gte": val } });
            return this;
        }

        withOptionalTimeLessThan(val: LocalTime): this {
            this.filters.push({ "optionalTime": { "$lt": val } });
            return this;
        }

        withOptionalTimeLessThanOrEqualTo(val: LocalTime): this {
            this.filters.push({ "optionalTime": { "$lte": val } });
            return this;
        }

        withOptionalTimeBetween(lower: LocalTime, upper: LocalTime): this {
            this.filters.push({ "optionalTime": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalTimeIsKnown(): this {
            this.filters.push({ "optionalTime": { "$isNull": false } });
            return this;
        }

        withOptionalTimeIsUnknown(): this {
            this.filters.push({ "optionalTime": { "$isNull": true } });
            return this;
        }

        withRequiredDatetimeIs(val: string): this {
            this.filters.push({ "requiredDatetime": { "$eq": val } });
            return this;
        }

        withRequiredDatetimeIsNot(val: string): this {
            this.filters.push({ "requiredDatetime": { "$ne": val } });
            return this;
        }

        withRequiredDatetimeIn(...vals: string[]): this {
            this.filters.push({ "requiredDatetime": { "$in": vals } });
            return this;
        }

        withRequiredDatetimeNotIn(...vals: string[]): this {
            this.filters.push({ "requiredDatetime": { "$notIn": vals } });
            return this;
        }

        withRequiredDatetimeGreaterThan(val: string): this {
            this.filters.push({ "requiredDatetime": { "$gt": val } });
            return this;
        }

        withRequiredDatetimeGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "requiredDatetime": { "$gte": val } });
            return this;
        }

        withRequiredDatetimeLessThan(val: string): this {
            this.filters.push({ "requiredDatetime": { "$lt": val } });
            return this;
        }

        withRequiredDatetimeLessThanOrEqualTo(val: string): this {
            this.filters.push({ "requiredDatetime": { "$lte": val } });
            return this;
        }

        withRequiredDatetimeBetween(lower: string, upper: string): this {
            this.filters.push({ "requiredDatetime": { "$between": [lower, upper] } });
            return this;
        }

        withRequiredDatetimeIsKnown(): this {
            this.filters.push({ "requiredDatetime": { "$isNull": false } });
            return this;
        }

        withRequiredDatetimeIsUnknown(): this {
            this.filters.push({ "requiredDatetime": { "$isNull": true } });
            return this;
        }

        withOptionalDatetimeIs(val: string): this {
            this.filters.push({ "optionalDatetime": { "$eq": val } });
            return this;
        }

        withOptionalDatetimeIsNot(val: string): this {
            this.filters.push({ "optionalDatetime": { "$ne": val } });
            return this;
        }

        withOptionalDatetimeIn(...vals: string[]): this {
            this.filters.push({ "optionalDatetime": { "$in": vals } });
            return this;
        }

        withOptionalDatetimeNotIn(...vals: string[]): this {
            this.filters.push({ "optionalDatetime": { "$notIn": vals } });
            return this;
        }

        withOptionalDatetimeGreaterThan(val: string): this {
            this.filters.push({ "optionalDatetime": { "$gt": val } });
            return this;
        }

        withOptionalDatetimeGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "optionalDatetime": { "$gte": val } });
            return this;
        }

        withOptionalDatetimeLessThan(val: string): this {
            this.filters.push({ "optionalDatetime": { "$lt": val } });
            return this;
        }

        withOptionalDatetimeLessThanOrEqualTo(val: string): this {
            this.filters.push({ "optionalDatetime": { "$lte": val } });
            return this;
        }

        withOptionalDatetimeBetween(lower: string, upper: string): this {
            this.filters.push({ "optionalDatetime": { "$between": [lower, upper] } });
            return this;
        }

        withOptionalDatetimeIsKnown(): this {
            this.filters.push({ "optionalDatetime": { "$isNull": false } });
            return this;
        }

        withOptionalDatetimeIsUnknown(): this {
            this.filters.push({ "optionalDatetime": { "$isNull": true } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ "createTime": { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ "createTime": { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ "createTime": { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ "createTime": { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ "createTime": { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ "createTime": { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ "createTime": { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ "createTime": { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ "createTime": { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ "createTime": { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ "createTime": { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ "updateTime": { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ "updateTime": { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ "updateTime": { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ "updateTime": { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ "updateTime": { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ "updateTime": { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ "updateTime": { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ "updateTime": { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ "updateTime": { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ "updateTime": { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ "updateTime": { "$isNull": true } });
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


    orderByRequiredStringAscending(): this {
        this.query.orderBy("requiredString", "asc");
        return this;
    }

    orderByRequiredStringDescending(): this {
        this.query.orderBy("requiredString", "desc");
        return this;
    }

    orderByOptionalStringAscending(): this {
        this.query.orderBy("optionalString", "asc");
        return this;
    }

    orderByOptionalStringDescending(): this {
        this.query.orderBy("optionalString", "desc");
        return this;
    }

    orderByLargeTextAscending(): this {
        this.query.orderBy("largeText", "asc");
        return this;
    }

    orderByLargeTextDescending(): this {
        this.query.orderBy("largeText", "desc");
        return this;
    }

    orderByRequiredBooleanAscending(): this {
        this.query.orderBy("requiredBoolean", "asc");
        return this;
    }

    orderByRequiredBooleanDescending(): this {
        this.query.orderBy("requiredBoolean", "desc");
        return this;
    }

    orderByOptionalBooleanAscending(): this {
        this.query.orderBy("optionalBoolean", "asc");
        return this;
    }

    orderByOptionalBooleanDescending(): this {
        this.query.orderBy("optionalBoolean", "desc");
        return this;
    }

    orderByRequiredIntegerAscending(): this {
        this.query.orderBy("requiredInteger", "asc");
        return this;
    }

    orderByRequiredIntegerDescending(): this {
        this.query.orderBy("requiredInteger", "desc");
        return this;
    }

    orderByOptionalIntegerAscending(): this {
        this.query.orderBy("optionalInteger", "asc");
        return this;
    }

    orderByOptionalIntegerDescending(): this {
        this.query.orderBy("optionalInteger", "desc");
        return this;
    }

    orderByRequiredLongAscending(): this {
        this.query.orderBy("requiredLong", "asc");
        return this;
    }

    orderByRequiredLongDescending(): this {
        this.query.orderBy("requiredLong", "desc");
        return this;
    }

    orderByOptionalLongAscending(): this {
        this.query.orderBy("optionalLong", "asc");
        return this;
    }

    orderByOptionalLongDescending(): this {
        this.query.orderBy("optionalLong", "desc");
        return this;
    }

    orderByRequiredDecimalAscending(): this {
        this.query.orderBy("requiredDecimal", "asc");
        return this;
    }

    orderByRequiredDecimalDescending(): this {
        this.query.orderBy("requiredDecimal", "desc");
        return this;
    }

    orderByOptionalDecimalAscending(): this {
        this.query.orderBy("optionalDecimal", "asc");
        return this;
    }

    orderByOptionalDecimalDescending(): this {
        this.query.orderBy("optionalDecimal", "desc");
        return this;
    }

    orderByRequiredFloatAscending(): this {
        this.query.orderBy("requiredFloat", "asc");
        return this;
    }

    orderByRequiredFloatDescending(): this {
        this.query.orderBy("requiredFloat", "desc");
        return this;
    }

    orderByOptionalFloatAscending(): this {
        this.query.orderBy("optionalFloat", "asc");
        return this;
    }

    orderByOptionalFloatDescending(): this {
        this.query.orderBy("optionalFloat", "desc");
        return this;
    }

    orderByRequiredDoubleAscending(): this {
        this.query.orderBy("requiredDouble", "asc");
        return this;
    }

    orderByRequiredDoubleDescending(): this {
        this.query.orderBy("requiredDouble", "desc");
        return this;
    }

    orderByOptionalDoubleAscending(): this {
        this.query.orderBy("optionalDouble", "asc");
        return this;
    }

    orderByOptionalDoubleDescending(): this {
        this.query.orderBy("optionalDouble", "desc");
        return this;
    }

    orderByRequiredDateAscending(): this {
        this.query.orderBy("requiredDate", "asc");
        return this;
    }

    orderByRequiredDateDescending(): this {
        this.query.orderBy("requiredDate", "desc");
        return this;
    }

    orderByOptionalDateAscending(): this {
        this.query.orderBy("optionalDate", "asc");
        return this;
    }

    orderByOptionalDateDescending(): this {
        this.query.orderBy("optionalDate", "desc");
        return this;
    }

    orderByRequiredTimeAscending(): this {
        this.query.orderBy("requiredTime", "asc");
        return this;
    }

    orderByRequiredTimeDescending(): this {
        this.query.orderBy("requiredTime", "desc");
        return this;
    }

    orderByOptionalTimeAscending(): this {
        this.query.orderBy("optionalTime", "asc");
        return this;
    }

    orderByOptionalTimeDescending(): this {
        this.query.orderBy("optionalTime", "desc");
        return this;
    }

    orderByRequiredDatetimeAscending(): this {
        this.query.orderBy("requiredDatetime", "asc");
        return this;
    }

    orderByRequiredDatetimeDescending(): this {
        this.query.orderBy("requiredDatetime", "desc");
        return this;
    }

    orderByOptionalDatetimeAscending(): this {
        this.query.orderBy("optionalDatetime", "asc");
        return this;
    }

    orderByOptionalDatetimeDescending(): this {
        this.query.orderBy("optionalDatetime", "desc");
        return this;
    }

    orderByCreateTimeAscending(): this {
        this.query.orderBy("createTime", "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy("createTime", "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy("updateTime", "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy("updateTime", "desc");
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

    minRequiredInteger(): this {
        return this.minRequiredIntegerAs("minOfRequiredInteger");
    }

    minRequiredIntegerAs(retName: string): this {
        this.query.aggregate("min", "requiredInteger", retName);
        return this;
    }
    maxRequiredInteger(): this {
        return this.maxRequiredIntegerAs("maxOfRequiredInteger");
    }

    maxRequiredIntegerAs(retName: string): this {
        this.query.aggregate("max", "requiredInteger", retName);
        return this;
    }
    sumRequiredInteger(): this {
        return this.sumRequiredIntegerAs("sumOfRequiredInteger");
    }

    sumRequiredIntegerAs(retName: string): this {
        this.query.aggregate("sum", "requiredInteger", retName);
        return this;
    }
    avgRequiredInteger(): this {
        return this.avgRequiredIntegerAs("avgOfRequiredInteger");
    }

    avgRequiredIntegerAs(retName: string): this {
        this.query.aggregate("avg", "requiredInteger", retName);
        return this;
    }
    standardDeviationRequiredInteger(): this {
        return this.standardDeviationRequiredIntegerAs("standardDeviationOfRequiredInteger");
    }

    standardDeviationRequiredIntegerAs(retName: string): this {
        this.query.aggregate("stddev", "requiredInteger", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredInteger(): this {
        return this.squareRootOfPopulationStandardDeviationRequiredIntegerAs("squareRootOfPopulationStandardDeviationOfRequiredInteger");
    }

    squareRootOfPopulationStandardDeviationRequiredIntegerAs(retName: string): this {
        this.query.aggregate("stddev_pop", "requiredInteger", retName);
        return this;
    }
    sampleVarianceRequiredInteger(): this {
        return this.sampleVarianceRequiredIntegerAs("sampleVarianceOfRequiredInteger");
    }

    sampleVarianceRequiredIntegerAs(retName: string): this {
        this.query.aggregate("var_samp", "requiredInteger", retName);
        return this;
    }
    samplePopulationVarianceRequiredInteger(): this {
        return this.samplePopulationVarianceRequiredIntegerAs("samplePopulationVarianceOfRequiredInteger");
    }

    samplePopulationVarianceRequiredIntegerAs(retName: string): this {
        this.query.aggregate("var_pop", "requiredInteger", retName);
        return this;
    }
    minOptionalInteger(): this {
        return this.minOptionalIntegerAs("minOfOptionalInteger");
    }

    minOptionalIntegerAs(retName: string): this {
        this.query.aggregate("min", "optionalInteger", retName);
        return this;
    }
    maxOptionalInteger(): this {
        return this.maxOptionalIntegerAs("maxOfOptionalInteger");
    }

    maxOptionalIntegerAs(retName: string): this {
        this.query.aggregate("max", "optionalInteger", retName);
        return this;
    }
    sumOptionalInteger(): this {
        return this.sumOptionalIntegerAs("sumOfOptionalInteger");
    }

    sumOptionalIntegerAs(retName: string): this {
        this.query.aggregate("sum", "optionalInteger", retName);
        return this;
    }
    avgOptionalInteger(): this {
        return this.avgOptionalIntegerAs("avgOfOptionalInteger");
    }

    avgOptionalIntegerAs(retName: string): this {
        this.query.aggregate("avg", "optionalInteger", retName);
        return this;
    }
    standardDeviationOptionalInteger(): this {
        return this.standardDeviationOptionalIntegerAs("standardDeviationOfOptionalInteger");
    }

    standardDeviationOptionalIntegerAs(retName: string): this {
        this.query.aggregate("stddev", "optionalInteger", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalInteger(): this {
        return this.squareRootOfPopulationStandardDeviationOptionalIntegerAs("squareRootOfPopulationStandardDeviationOfOptionalInteger");
    }

    squareRootOfPopulationStandardDeviationOptionalIntegerAs(retName: string): this {
        this.query.aggregate("stddev_pop", "optionalInteger", retName);
        return this;
    }
    sampleVarianceOptionalInteger(): this {
        return this.sampleVarianceOptionalIntegerAs("sampleVarianceOfOptionalInteger");
    }

    sampleVarianceOptionalIntegerAs(retName: string): this {
        this.query.aggregate("var_samp", "optionalInteger", retName);
        return this;
    }
    samplePopulationVarianceOptionalInteger(): this {
        return this.samplePopulationVarianceOptionalIntegerAs("samplePopulationVarianceOfOptionalInteger");
    }

    samplePopulationVarianceOptionalIntegerAs(retName: string): this {
        this.query.aggregate("var_pop", "optionalInteger", retName);
        return this;
    }
    minRequiredLong(): this {
        return this.minRequiredLongAs("minOfRequiredLong");
    }

    minRequiredLongAs(retName: string): this {
        this.query.aggregate("min", "requiredLong", retName);
        return this;
    }
    maxRequiredLong(): this {
        return this.maxRequiredLongAs("maxOfRequiredLong");
    }

    maxRequiredLongAs(retName: string): this {
        this.query.aggregate("max", "requiredLong", retName);
        return this;
    }
    sumRequiredLong(): this {
        return this.sumRequiredLongAs("sumOfRequiredLong");
    }

    sumRequiredLongAs(retName: string): this {
        this.query.aggregate("sum", "requiredLong", retName);
        return this;
    }
    avgRequiredLong(): this {
        return this.avgRequiredLongAs("avgOfRequiredLong");
    }

    avgRequiredLongAs(retName: string): this {
        this.query.aggregate("avg", "requiredLong", retName);
        return this;
    }
    standardDeviationRequiredLong(): this {
        return this.standardDeviationRequiredLongAs("standardDeviationOfRequiredLong");
    }

    standardDeviationRequiredLongAs(retName: string): this {
        this.query.aggregate("stddev", "requiredLong", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredLong(): this {
        return this.squareRootOfPopulationStandardDeviationRequiredLongAs("squareRootOfPopulationStandardDeviationOfRequiredLong");
    }

    squareRootOfPopulationStandardDeviationRequiredLongAs(retName: string): this {
        this.query.aggregate("stddev_pop", "requiredLong", retName);
        return this;
    }
    sampleVarianceRequiredLong(): this {
        return this.sampleVarianceRequiredLongAs("sampleVarianceOfRequiredLong");
    }

    sampleVarianceRequiredLongAs(retName: string): this {
        this.query.aggregate("var_samp", "requiredLong", retName);
        return this;
    }
    samplePopulationVarianceRequiredLong(): this {
        return this.samplePopulationVarianceRequiredLongAs("samplePopulationVarianceOfRequiredLong");
    }

    samplePopulationVarianceRequiredLongAs(retName: string): this {
        this.query.aggregate("var_pop", "requiredLong", retName);
        return this;
    }
    minOptionalLong(): this {
        return this.minOptionalLongAs("minOfOptionalLong");
    }

    minOptionalLongAs(retName: string): this {
        this.query.aggregate("min", "optionalLong", retName);
        return this;
    }
    maxOptionalLong(): this {
        return this.maxOptionalLongAs("maxOfOptionalLong");
    }

    maxOptionalLongAs(retName: string): this {
        this.query.aggregate("max", "optionalLong", retName);
        return this;
    }
    sumOptionalLong(): this {
        return this.sumOptionalLongAs("sumOfOptionalLong");
    }

    sumOptionalLongAs(retName: string): this {
        this.query.aggregate("sum", "optionalLong", retName);
        return this;
    }
    avgOptionalLong(): this {
        return this.avgOptionalLongAs("avgOfOptionalLong");
    }

    avgOptionalLongAs(retName: string): this {
        this.query.aggregate("avg", "optionalLong", retName);
        return this;
    }
    standardDeviationOptionalLong(): this {
        return this.standardDeviationOptionalLongAs("standardDeviationOfOptionalLong");
    }

    standardDeviationOptionalLongAs(retName: string): this {
        this.query.aggregate("stddev", "optionalLong", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalLong(): this {
        return this.squareRootOfPopulationStandardDeviationOptionalLongAs("squareRootOfPopulationStandardDeviationOfOptionalLong");
    }

    squareRootOfPopulationStandardDeviationOptionalLongAs(retName: string): this {
        this.query.aggregate("stddev_pop", "optionalLong", retName);
        return this;
    }
    sampleVarianceOptionalLong(): this {
        return this.sampleVarianceOptionalLongAs("sampleVarianceOfOptionalLong");
    }

    sampleVarianceOptionalLongAs(retName: string): this {
        this.query.aggregate("var_samp", "optionalLong", retName);
        return this;
    }
    samplePopulationVarianceOptionalLong(): this {
        return this.samplePopulationVarianceOptionalLongAs("samplePopulationVarianceOfOptionalLong");
    }

    samplePopulationVarianceOptionalLongAs(retName: string): this {
        this.query.aggregate("var_pop", "optionalLong", retName);
        return this;
    }
    minRequiredDecimal(): this {
        return this.minRequiredDecimalAs("minOfRequiredDecimal");
    }

    minRequiredDecimalAs(retName: string): this {
        this.query.aggregate("min", "requiredDecimal", retName);
        return this;
    }
    maxRequiredDecimal(): this {
        return this.maxRequiredDecimalAs("maxOfRequiredDecimal");
    }

    maxRequiredDecimalAs(retName: string): this {
        this.query.aggregate("max", "requiredDecimal", retName);
        return this;
    }
    sumRequiredDecimal(): this {
        return this.sumRequiredDecimalAs("sumOfRequiredDecimal");
    }

    sumRequiredDecimalAs(retName: string): this {
        this.query.aggregate("sum", "requiredDecimal", retName);
        return this;
    }
    avgRequiredDecimal(): this {
        return this.avgRequiredDecimalAs("avgOfRequiredDecimal");
    }

    avgRequiredDecimalAs(retName: string): this {
        this.query.aggregate("avg", "requiredDecimal", retName);
        return this;
    }
    standardDeviationRequiredDecimal(): this {
        return this.standardDeviationRequiredDecimalAs("standardDeviationOfRequiredDecimal");
    }

    standardDeviationRequiredDecimalAs(retName: string): this {
        this.query.aggregate("stddev", "requiredDecimal", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredDecimal(): this {
        return this.squareRootOfPopulationStandardDeviationRequiredDecimalAs("squareRootOfPopulationStandardDeviationOfRequiredDecimal");
    }

    squareRootOfPopulationStandardDeviationRequiredDecimalAs(retName: string): this {
        this.query.aggregate("stddev_pop", "requiredDecimal", retName);
        return this;
    }
    sampleVarianceRequiredDecimal(): this {
        return this.sampleVarianceRequiredDecimalAs("sampleVarianceOfRequiredDecimal");
    }

    sampleVarianceRequiredDecimalAs(retName: string): this {
        this.query.aggregate("var_samp", "requiredDecimal", retName);
        return this;
    }
    samplePopulationVarianceRequiredDecimal(): this {
        return this.samplePopulationVarianceRequiredDecimalAs("samplePopulationVarianceOfRequiredDecimal");
    }

    samplePopulationVarianceRequiredDecimalAs(retName: string): this {
        this.query.aggregate("var_pop", "requiredDecimal", retName);
        return this;
    }
    minOptionalDecimal(): this {
        return this.minOptionalDecimalAs("minOfOptionalDecimal");
    }

    minOptionalDecimalAs(retName: string): this {
        this.query.aggregate("min", "optionalDecimal", retName);
        return this;
    }
    maxOptionalDecimal(): this {
        return this.maxOptionalDecimalAs("maxOfOptionalDecimal");
    }

    maxOptionalDecimalAs(retName: string): this {
        this.query.aggregate("max", "optionalDecimal", retName);
        return this;
    }
    sumOptionalDecimal(): this {
        return this.sumOptionalDecimalAs("sumOfOptionalDecimal");
    }

    sumOptionalDecimalAs(retName: string): this {
        this.query.aggregate("sum", "optionalDecimal", retName);
        return this;
    }
    avgOptionalDecimal(): this {
        return this.avgOptionalDecimalAs("avgOfOptionalDecimal");
    }

    avgOptionalDecimalAs(retName: string): this {
        this.query.aggregate("avg", "optionalDecimal", retName);
        return this;
    }
    standardDeviationOptionalDecimal(): this {
        return this.standardDeviationOptionalDecimalAs("standardDeviationOfOptionalDecimal");
    }

    standardDeviationOptionalDecimalAs(retName: string): this {
        this.query.aggregate("stddev", "optionalDecimal", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalDecimal(): this {
        return this.squareRootOfPopulationStandardDeviationOptionalDecimalAs("squareRootOfPopulationStandardDeviationOfOptionalDecimal");
    }

    squareRootOfPopulationStandardDeviationOptionalDecimalAs(retName: string): this {
        this.query.aggregate("stddev_pop", "optionalDecimal", retName);
        return this;
    }
    sampleVarianceOptionalDecimal(): this {
        return this.sampleVarianceOptionalDecimalAs("sampleVarianceOfOptionalDecimal");
    }

    sampleVarianceOptionalDecimalAs(retName: string): this {
        this.query.aggregate("var_samp", "optionalDecimal", retName);
        return this;
    }
    samplePopulationVarianceOptionalDecimal(): this {
        return this.samplePopulationVarianceOptionalDecimalAs("samplePopulationVarianceOfOptionalDecimal");
    }

    samplePopulationVarianceOptionalDecimalAs(retName: string): this {
        this.query.aggregate("var_pop", "optionalDecimal", retName);
        return this;
    }
    minRequiredFloat(): this {
        return this.minRequiredFloatAs("minOfRequiredFloat");
    }

    minRequiredFloatAs(retName: string): this {
        this.query.aggregate("min", "requiredFloat", retName);
        return this;
    }
    maxRequiredFloat(): this {
        return this.maxRequiredFloatAs("maxOfRequiredFloat");
    }

    maxRequiredFloatAs(retName: string): this {
        this.query.aggregate("max", "requiredFloat", retName);
        return this;
    }
    sumRequiredFloat(): this {
        return this.sumRequiredFloatAs("sumOfRequiredFloat");
    }

    sumRequiredFloatAs(retName: string): this {
        this.query.aggregate("sum", "requiredFloat", retName);
        return this;
    }
    avgRequiredFloat(): this {
        return this.avgRequiredFloatAs("avgOfRequiredFloat");
    }

    avgRequiredFloatAs(retName: string): this {
        this.query.aggregate("avg", "requiredFloat", retName);
        return this;
    }
    standardDeviationRequiredFloat(): this {
        return this.standardDeviationRequiredFloatAs("standardDeviationOfRequiredFloat");
    }

    standardDeviationRequiredFloatAs(retName: string): this {
        this.query.aggregate("stddev", "requiredFloat", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredFloat(): this {
        return this.squareRootOfPopulationStandardDeviationRequiredFloatAs("squareRootOfPopulationStandardDeviationOfRequiredFloat");
    }

    squareRootOfPopulationStandardDeviationRequiredFloatAs(retName: string): this {
        this.query.aggregate("stddev_pop", "requiredFloat", retName);
        return this;
    }
    sampleVarianceRequiredFloat(): this {
        return this.sampleVarianceRequiredFloatAs("sampleVarianceOfRequiredFloat");
    }

    sampleVarianceRequiredFloatAs(retName: string): this {
        this.query.aggregate("var_samp", "requiredFloat", retName);
        return this;
    }
    samplePopulationVarianceRequiredFloat(): this {
        return this.samplePopulationVarianceRequiredFloatAs("samplePopulationVarianceOfRequiredFloat");
    }

    samplePopulationVarianceRequiredFloatAs(retName: string): this {
        this.query.aggregate("var_pop", "requiredFloat", retName);
        return this;
    }
    minOptionalFloat(): this {
        return this.minOptionalFloatAs("minOfOptionalFloat");
    }

    minOptionalFloatAs(retName: string): this {
        this.query.aggregate("min", "optionalFloat", retName);
        return this;
    }
    maxOptionalFloat(): this {
        return this.maxOptionalFloatAs("maxOfOptionalFloat");
    }

    maxOptionalFloatAs(retName: string): this {
        this.query.aggregate("max", "optionalFloat", retName);
        return this;
    }
    sumOptionalFloat(): this {
        return this.sumOptionalFloatAs("sumOfOptionalFloat");
    }

    sumOptionalFloatAs(retName: string): this {
        this.query.aggregate("sum", "optionalFloat", retName);
        return this;
    }
    avgOptionalFloat(): this {
        return this.avgOptionalFloatAs("avgOfOptionalFloat");
    }

    avgOptionalFloatAs(retName: string): this {
        this.query.aggregate("avg", "optionalFloat", retName);
        return this;
    }
    standardDeviationOptionalFloat(): this {
        return this.standardDeviationOptionalFloatAs("standardDeviationOfOptionalFloat");
    }

    standardDeviationOptionalFloatAs(retName: string): this {
        this.query.aggregate("stddev", "optionalFloat", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalFloat(): this {
        return this.squareRootOfPopulationStandardDeviationOptionalFloatAs("squareRootOfPopulationStandardDeviationOfOptionalFloat");
    }

    squareRootOfPopulationStandardDeviationOptionalFloatAs(retName: string): this {
        this.query.aggregate("stddev_pop", "optionalFloat", retName);
        return this;
    }
    sampleVarianceOptionalFloat(): this {
        return this.sampleVarianceOptionalFloatAs("sampleVarianceOfOptionalFloat");
    }

    sampleVarianceOptionalFloatAs(retName: string): this {
        this.query.aggregate("var_samp", "optionalFloat", retName);
        return this;
    }
    samplePopulationVarianceOptionalFloat(): this {
        return this.samplePopulationVarianceOptionalFloatAs("samplePopulationVarianceOfOptionalFloat");
    }

    samplePopulationVarianceOptionalFloatAs(retName: string): this {
        this.query.aggregate("var_pop", "optionalFloat", retName);
        return this;
    }
    minRequiredDouble(): this {
        return this.minRequiredDoubleAs("minOfRequiredDouble");
    }

    minRequiredDoubleAs(retName: string): this {
        this.query.aggregate("min", "requiredDouble", retName);
        return this;
    }
    maxRequiredDouble(): this {
        return this.maxRequiredDoubleAs("maxOfRequiredDouble");
    }

    maxRequiredDoubleAs(retName: string): this {
        this.query.aggregate("max", "requiredDouble", retName);
        return this;
    }
    sumRequiredDouble(): this {
        return this.sumRequiredDoubleAs("sumOfRequiredDouble");
    }

    sumRequiredDoubleAs(retName: string): this {
        this.query.aggregate("sum", "requiredDouble", retName);
        return this;
    }
    avgRequiredDouble(): this {
        return this.avgRequiredDoubleAs("avgOfRequiredDouble");
    }

    avgRequiredDoubleAs(retName: string): this {
        this.query.aggregate("avg", "requiredDouble", retName);
        return this;
    }
    standardDeviationRequiredDouble(): this {
        return this.standardDeviationRequiredDoubleAs("standardDeviationOfRequiredDouble");
    }

    standardDeviationRequiredDoubleAs(retName: string): this {
        this.query.aggregate("stddev", "requiredDouble", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredDouble(): this {
        return this.squareRootOfPopulationStandardDeviationRequiredDoubleAs("squareRootOfPopulationStandardDeviationOfRequiredDouble");
    }

    squareRootOfPopulationStandardDeviationRequiredDoubleAs(retName: string): this {
        this.query.aggregate("stddev_pop", "requiredDouble", retName);
        return this;
    }
    sampleVarianceRequiredDouble(): this {
        return this.sampleVarianceRequiredDoubleAs("sampleVarianceOfRequiredDouble");
    }

    sampleVarianceRequiredDoubleAs(retName: string): this {
        this.query.aggregate("var_samp", "requiredDouble", retName);
        return this;
    }
    samplePopulationVarianceRequiredDouble(): this {
        return this.samplePopulationVarianceRequiredDoubleAs("samplePopulationVarianceOfRequiredDouble");
    }

    samplePopulationVarianceRequiredDoubleAs(retName: string): this {
        this.query.aggregate("var_pop", "requiredDouble", retName);
        return this;
    }
    minOptionalDouble(): this {
        return this.minOptionalDoubleAs("minOfOptionalDouble");
    }

    minOptionalDoubleAs(retName: string): this {
        this.query.aggregate("min", "optionalDouble", retName);
        return this;
    }
    maxOptionalDouble(): this {
        return this.maxOptionalDoubleAs("maxOfOptionalDouble");
    }

    maxOptionalDoubleAs(retName: string): this {
        this.query.aggregate("max", "optionalDouble", retName);
        return this;
    }
    sumOptionalDouble(): this {
        return this.sumOptionalDoubleAs("sumOfOptionalDouble");
    }

    sumOptionalDoubleAs(retName: string): this {
        this.query.aggregate("sum", "optionalDouble", retName);
        return this;
    }
    avgOptionalDouble(): this {
        return this.avgOptionalDoubleAs("avgOfOptionalDouble");
    }

    avgOptionalDoubleAs(retName: string): this {
        this.query.aggregate("avg", "optionalDouble", retName);
        return this;
    }
    standardDeviationOptionalDouble(): this {
        return this.standardDeviationOptionalDoubleAs("standardDeviationOfOptionalDouble");
    }

    standardDeviationOptionalDoubleAs(retName: string): this {
        this.query.aggregate("stddev", "optionalDouble", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalDouble(): this {
        return this.squareRootOfPopulationStandardDeviationOptionalDoubleAs("squareRootOfPopulationStandardDeviationOfOptionalDouble");
    }

    squareRootOfPopulationStandardDeviationOptionalDoubleAs(retName: string): this {
        this.query.aggregate("stddev_pop", "optionalDouble", retName);
        return this;
    }
    sampleVarianceOptionalDouble(): this {
        return this.sampleVarianceOptionalDoubleAs("sampleVarianceOfOptionalDouble");
    }

    sampleVarianceOptionalDoubleAs(retName: string): this {
        this.query.aggregate("var_samp", "optionalDouble", retName);
        return this;
    }
    samplePopulationVarianceOptionalDouble(): this {
        return this.samplePopulationVarianceOptionalDoubleAs("samplePopulationVarianceOfOptionalDouble");
    }

    samplePopulationVarianceOptionalDoubleAs(retName: string): this {
        this.query.aggregate("var_pop", "optionalDouble", retName);
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
    groupByTypePlatform(): this {
        this.query.groupBy("typePlatform");
        return this;
    }

    groupByTypePlatformAs(retName: string): this {
        this.query.groupBy("typePlatform", retName);
        return this;
    }
    groupByRequiredString(): this {
        this.query.groupBy("requiredString");
        return this;
    }

    groupByRequiredStringAs(retName: string): this {
        this.query.groupBy("requiredString", retName);
        return this;
    }
    groupByOptionalString(): this {
        this.query.groupBy("optionalString");
        return this;
    }

    groupByOptionalStringAs(retName: string): this {
        this.query.groupBy("optionalString", retName);
        return this;
    }
    groupByLargeText(): this {
        this.query.groupBy("largeText");
        return this;
    }

    groupByLargeTextAs(retName: string): this {
        this.query.groupBy("largeText", retName);
        return this;
    }
    groupByRequiredBoolean(): this {
        this.query.groupBy("requiredBoolean");
        return this;
    }

    groupByRequiredBooleanAs(retName: string): this {
        this.query.groupBy("requiredBoolean", retName);
        return this;
    }
    groupByOptionalBoolean(): this {
        this.query.groupBy("optionalBoolean");
        return this;
    }

    groupByOptionalBooleanAs(retName: string): this {
        this.query.groupBy("optionalBoolean", retName);
        return this;
    }
    groupByRequiredInteger(): this {
        this.query.groupBy("requiredInteger");
        return this;
    }

    groupByRequiredIntegerAs(retName: string): this {
        this.query.groupBy("requiredInteger", retName);
        return this;
    }
    groupByOptionalInteger(): this {
        this.query.groupBy("optionalInteger");
        return this;
    }

    groupByOptionalIntegerAs(retName: string): this {
        this.query.groupBy("optionalInteger", retName);
        return this;
    }
    groupByRequiredLong(): this {
        this.query.groupBy("requiredLong");
        return this;
    }

    groupByRequiredLongAs(retName: string): this {
        this.query.groupBy("requiredLong", retName);
        return this;
    }
    groupByOptionalLong(): this {
        this.query.groupBy("optionalLong");
        return this;
    }

    groupByOptionalLongAs(retName: string): this {
        this.query.groupBy("optionalLong", retName);
        return this;
    }
    groupByRequiredDecimal(): this {
        this.query.groupBy("requiredDecimal");
        return this;
    }

    groupByRequiredDecimalAs(retName: string): this {
        this.query.groupBy("requiredDecimal", retName);
        return this;
    }
    groupByOptionalDecimal(): this {
        this.query.groupBy("optionalDecimal");
        return this;
    }

    groupByOptionalDecimalAs(retName: string): this {
        this.query.groupBy("optionalDecimal", retName);
        return this;
    }
    groupByRequiredFloat(): this {
        this.query.groupBy("requiredFloat");
        return this;
    }

    groupByRequiredFloatAs(retName: string): this {
        this.query.groupBy("requiredFloat", retName);
        return this;
    }
    groupByOptionalFloat(): this {
        this.query.groupBy("optionalFloat");
        return this;
    }

    groupByOptionalFloatAs(retName: string): this {
        this.query.groupBy("optionalFloat", retName);
        return this;
    }
    groupByRequiredDouble(): this {
        this.query.groupBy("requiredDouble");
        return this;
    }

    groupByRequiredDoubleAs(retName: string): this {
        this.query.groupBy("requiredDouble", retName);
        return this;
    }
    groupByOptionalDouble(): this {
        this.query.groupBy("optionalDouble");
        return this;
    }

    groupByOptionalDoubleAs(retName: string): this {
        this.query.groupBy("optionalDouble", retName);
        return this;
    }
    groupByRequiredDate(): this {
        this.query.groupBy("requiredDate");
        return this;
    }

    groupByRequiredDateAs(retName: string): this {
        this.query.groupBy("requiredDate", retName);
        return this;
    }
    groupByOptionalDate(): this {
        this.query.groupBy("optionalDate");
        return this;
    }

    groupByOptionalDateAs(retName: string): this {
        this.query.groupBy("optionalDate", retName);
        return this;
    }
    groupByRequiredTime(): this {
        this.query.groupBy("requiredTime");
        return this;
    }

    groupByRequiredTimeAs(retName: string): this {
        this.query.groupBy("requiredTime", retName);
        return this;
    }
    groupByOptionalTime(): this {
        this.query.groupBy("optionalTime");
        return this;
    }

    groupByOptionalTimeAs(retName: string): this {
        this.query.groupBy("optionalTime", retName);
        return this;
    }
    groupByRequiredDatetime(): this {
        this.query.groupBy("requiredDatetime");
        return this;
    }

    groupByRequiredDatetimeAs(retName: string): this {
        this.query.groupBy("requiredDatetime", retName);
        return this;
    }
    groupByOptionalDatetime(): this {
        this.query.groupBy("optionalDatetime");
        return this;
    }

    groupByOptionalDatetimeAs(retName: string): this {
        this.query.groupBy("optionalDatetime", retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy("createTime");
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy("createTime", retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy("updateTime");
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy("updateTime", retName);
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
    facetByTypePlatformAs(
        facetName: string,
        request: { readonly entityName: "TypePlatform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "typePlatform", request, includeAllFacets,
            { kind: "facet", method: "facetByTypePlatformAs", relation: "typePlatform", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<ScalarTypeProbe>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof ScalarTypeProbe
                ? row
                : ScalarTypeProbe.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<ScalarTypeProbe>(data);
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
    ): Promise<SmartList<ScalarTypeProbe>> {
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
            row instanceof ScalarTypeProbe
                ? row
                : ScalarTypeProbe.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<ScalarTypeProbe> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof ScalarTypeProbe
                        ? entity
                        : ScalarTypeProbe.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableScalarTypeProbeRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<ScalarTypeProbe>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<ScalarTypeProbe>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<ScalarTypeProbe> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return ScalarTypeProbe.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<ScalarTypeProbe>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<ScalarTypeProbe> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<ScalarTypeProbe | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}