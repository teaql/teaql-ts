import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { OrderAttachment } from '../models/OrderAttachment';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class OrderAttachmentRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("OrderAttachment");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "OrderAttachment" {
        return "OrderAttachment";
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

    purpose(p: string): ExecutableOrderAttachmentRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableOrderAttachmentRequest(
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
        this.query.select(["id", "customerOrder", "fileName", "contentType", "contentLength", "contentSha256", "objectKey", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }


    selectFileName(): this {
        this.query.select(["fileName"]);
        return this;
    }

    selectContentType(): this {
        this.query.select(["contentType"]);
        return this;
    }

    selectContentLength(): this {
        this.query.select(["contentLength"]);
        return this;
    }

    selectContentSha256(): this {
        this.query.select(["contentSha256"]);
        return this;
    }

    selectObjectKey(): this {
        this.query.select(["objectKey"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectCustomerOrderWith(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.query.select(["customerOrder"]);
        this.query.relationQuery(
            "customerOrder", request.toQuery(), "customerOrder", "id", false,
            { kind: "relation-select", method: "selectCustomerOrderWith", relation: "customerOrder" });
        return this;
    }

    withCustomerOrderMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "customerOrder": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCustomerOrderMatching(request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "customerOrder": {
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

        filterByCustomerOrder(val: any): this {
            this.filters.push({ "customerOrder": { "$eq": val } });
            return this;
        }

        filterByCustomerOrderIn(...vals: any[]): this {
            this.filters.push({ "customerOrder": { "$in": vals } });
            return this;
        }

        withCustomerOrderIsKnown(): this {
            this.filters.push({ "customerOrder": { "$isNull": false } });
            return this;
        }

        withCustomerOrderIsUnknown(): this {
            this.filters.push({ "customerOrder": { "$isNull": true } });
            return this;
        }

        withFileNameContaining(val: string): this {
            this.filters.push({ "fileName": { "$contains": val } });
            return this;
        }

        withFileNameIs(val: string): this {
            this.filters.push({ "fileName": { "$eq": val } });
            return this;
        }

        withFileNameIsNot(val: string): this {
            this.filters.push({ "fileName": { "$ne": val } });
            return this;
        }

        withFileNameIn(...vals: string[]): this {
            this.filters.push({ "fileName": { "$in": vals } });
            return this;
        }

        withFileNameNotIn(...vals: string[]): this {
            this.filters.push({ "fileName": { "$notIn": vals } });
            return this;
        }

        withFileNameGreaterThan(val: string): this {
            this.filters.push({ "fileName": { "$gt": val } });
            return this;
        }

        withFileNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "fileName": { "$gte": val } });
            return this;
        }

        withFileNameLessThan(val: string): this {
            this.filters.push({ "fileName": { "$lt": val } });
            return this;
        }

        withFileNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ "fileName": { "$lte": val } });
            return this;
        }

        withFileNameBetween(lower: string, upper: string): this {
            this.filters.push({ "fileName": { "$between": [lower, upper] } });
            return this;
        }

        withFileNameIsKnown(): this {
            this.filters.push({ "fileName": { "$isNull": false } });
            return this;
        }

        withFileNameIsUnknown(): this {
            this.filters.push({ "fileName": { "$isNull": true } });
            return this;
        }
        withFileNameNotContaining(val: string): this {
            this.filters.push({ "fileName": { "$notContains": val } });
            return this;
        }

        withFileNameStartingWith(val: string): this {
            this.filters.push({ "fileName": { "$startsWith": val } });
            return this;
        }

        withFileNameNotStartingWith(val: string): this {
            this.filters.push({ "fileName": { "$notStartsWith": val } });
            return this;
        }

        withFileNameEndingWith(val: string): this {
            this.filters.push({ "fileName": { "$endsWith": val } });
            return this;
        }

        withFileNameNotEndingWith(val: string): this {
            this.filters.push({ "fileName": { "$notEndsWith": val } });
            return this;
        }

        withFileNameSoundingLike(val: string): this {
            this.filters.push({ "fileName": { "$soundLike": val } });
            return this;
        }

        withContentTypeContaining(val: string): this {
            this.filters.push({ "contentType": { "$contains": val } });
            return this;
        }

        withContentTypeIs(val: string): this {
            this.filters.push({ "contentType": { "$eq": val } });
            return this;
        }

        withContentTypeIsNot(val: string): this {
            this.filters.push({ "contentType": { "$ne": val } });
            return this;
        }

        withContentTypeIn(...vals: string[]): this {
            this.filters.push({ "contentType": { "$in": vals } });
            return this;
        }

        withContentTypeNotIn(...vals: string[]): this {
            this.filters.push({ "contentType": { "$notIn": vals } });
            return this;
        }

        withContentTypeGreaterThan(val: string): this {
            this.filters.push({ "contentType": { "$gt": val } });
            return this;
        }

        withContentTypeGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "contentType": { "$gte": val } });
            return this;
        }

        withContentTypeLessThan(val: string): this {
            this.filters.push({ "contentType": { "$lt": val } });
            return this;
        }

        withContentTypeLessThanOrEqualTo(val: string): this {
            this.filters.push({ "contentType": { "$lte": val } });
            return this;
        }

        withContentTypeBetween(lower: string, upper: string): this {
            this.filters.push({ "contentType": { "$between": [lower, upper] } });
            return this;
        }

        withContentTypeIsKnown(): this {
            this.filters.push({ "contentType": { "$isNull": false } });
            return this;
        }

        withContentTypeIsUnknown(): this {
            this.filters.push({ "contentType": { "$isNull": true } });
            return this;
        }
        withContentTypeNotContaining(val: string): this {
            this.filters.push({ "contentType": { "$notContains": val } });
            return this;
        }

        withContentTypeStartingWith(val: string): this {
            this.filters.push({ "contentType": { "$startsWith": val } });
            return this;
        }

        withContentTypeNotStartingWith(val: string): this {
            this.filters.push({ "contentType": { "$notStartsWith": val } });
            return this;
        }

        withContentTypeEndingWith(val: string): this {
            this.filters.push({ "contentType": { "$endsWith": val } });
            return this;
        }

        withContentTypeNotEndingWith(val: string): this {
            this.filters.push({ "contentType": { "$notEndsWith": val } });
            return this;
        }

        withContentTypeSoundingLike(val: string): this {
            this.filters.push({ "contentType": { "$soundLike": val } });
            return this;
        }

        withContentLengthIs(val: number): this {
            this.filters.push({ "contentLength": { "$eq": val } });
            return this;
        }

        withContentLengthIsNot(val: number): this {
            this.filters.push({ "contentLength": { "$ne": val } });
            return this;
        }

        withContentLengthIn(...vals: number[]): this {
            this.filters.push({ "contentLength": { "$in": vals } });
            return this;
        }

        withContentLengthNotIn(...vals: number[]): this {
            this.filters.push({ "contentLength": { "$notIn": vals } });
            return this;
        }

        withContentLengthGreaterThan(val: number): this {
            this.filters.push({ "contentLength": { "$gt": val } });
            return this;
        }

        withContentLengthGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ "contentLength": { "$gte": val } });
            return this;
        }

        withContentLengthLessThan(val: number): this {
            this.filters.push({ "contentLength": { "$lt": val } });
            return this;
        }

        withContentLengthLessThanOrEqualTo(val: number): this {
            this.filters.push({ "contentLength": { "$lte": val } });
            return this;
        }

        withContentLengthBetween(lower: number, upper: number): this {
            this.filters.push({ "contentLength": { "$between": [lower, upper] } });
            return this;
        }

        withContentLengthIsKnown(): this {
            this.filters.push({ "contentLength": { "$isNull": false } });
            return this;
        }

        withContentLengthIsUnknown(): this {
            this.filters.push({ "contentLength": { "$isNull": true } });
            return this;
        }

        withContentSha256Containing(val: string): this {
            this.filters.push({ "contentSha256": { "$contains": val } });
            return this;
        }

        withContentSha256Is(val: string): this {
            this.filters.push({ "contentSha256": { "$eq": val } });
            return this;
        }

        withContentSha256IsNot(val: string): this {
            this.filters.push({ "contentSha256": { "$ne": val } });
            return this;
        }

        withContentSha256In(...vals: string[]): this {
            this.filters.push({ "contentSha256": { "$in": vals } });
            return this;
        }

        withContentSha256NotIn(...vals: string[]): this {
            this.filters.push({ "contentSha256": { "$notIn": vals } });
            return this;
        }

        withContentSha256GreaterThan(val: string): this {
            this.filters.push({ "contentSha256": { "$gt": val } });
            return this;
        }

        withContentSha256GreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "contentSha256": { "$gte": val } });
            return this;
        }

        withContentSha256LessThan(val: string): this {
            this.filters.push({ "contentSha256": { "$lt": val } });
            return this;
        }

        withContentSha256LessThanOrEqualTo(val: string): this {
            this.filters.push({ "contentSha256": { "$lte": val } });
            return this;
        }

        withContentSha256Between(lower: string, upper: string): this {
            this.filters.push({ "contentSha256": { "$between": [lower, upper] } });
            return this;
        }

        withContentSha256IsKnown(): this {
            this.filters.push({ "contentSha256": { "$isNull": false } });
            return this;
        }

        withContentSha256IsUnknown(): this {
            this.filters.push({ "contentSha256": { "$isNull": true } });
            return this;
        }
        withContentSha256NotContaining(val: string): this {
            this.filters.push({ "contentSha256": { "$notContains": val } });
            return this;
        }

        withContentSha256StartingWith(val: string): this {
            this.filters.push({ "contentSha256": { "$startsWith": val } });
            return this;
        }

        withContentSha256NotStartingWith(val: string): this {
            this.filters.push({ "contentSha256": { "$notStartsWith": val } });
            return this;
        }

        withContentSha256EndingWith(val: string): this {
            this.filters.push({ "contentSha256": { "$endsWith": val } });
            return this;
        }

        withContentSha256NotEndingWith(val: string): this {
            this.filters.push({ "contentSha256": { "$notEndsWith": val } });
            return this;
        }

        withContentSha256SoundingLike(val: string): this {
            this.filters.push({ "contentSha256": { "$soundLike": val } });
            return this;
        }

        withObjectKeyContaining(val: string): this {
            this.filters.push({ "objectKey": { "$contains": val } });
            return this;
        }

        withObjectKeyIs(val: string): this {
            this.filters.push({ "objectKey": { "$eq": val } });
            return this;
        }

        withObjectKeyIsNot(val: string): this {
            this.filters.push({ "objectKey": { "$ne": val } });
            return this;
        }

        withObjectKeyIn(...vals: string[]): this {
            this.filters.push({ "objectKey": { "$in": vals } });
            return this;
        }

        withObjectKeyNotIn(...vals: string[]): this {
            this.filters.push({ "objectKey": { "$notIn": vals } });
            return this;
        }

        withObjectKeyGreaterThan(val: string): this {
            this.filters.push({ "objectKey": { "$gt": val } });
            return this;
        }

        withObjectKeyGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "objectKey": { "$gte": val } });
            return this;
        }

        withObjectKeyLessThan(val: string): this {
            this.filters.push({ "objectKey": { "$lt": val } });
            return this;
        }

        withObjectKeyLessThanOrEqualTo(val: string): this {
            this.filters.push({ "objectKey": { "$lte": val } });
            return this;
        }

        withObjectKeyBetween(lower: string, upper: string): this {
            this.filters.push({ "objectKey": { "$between": [lower, upper] } });
            return this;
        }

        withObjectKeyIsKnown(): this {
            this.filters.push({ "objectKey": { "$isNull": false } });
            return this;
        }

        withObjectKeyIsUnknown(): this {
            this.filters.push({ "objectKey": { "$isNull": true } });
            return this;
        }
        withObjectKeyNotContaining(val: string): this {
            this.filters.push({ "objectKey": { "$notContains": val } });
            return this;
        }

        withObjectKeyStartingWith(val: string): this {
            this.filters.push({ "objectKey": { "$startsWith": val } });
            return this;
        }

        withObjectKeyNotStartingWith(val: string): this {
            this.filters.push({ "objectKey": { "$notStartsWith": val } });
            return this;
        }

        withObjectKeyEndingWith(val: string): this {
            this.filters.push({ "objectKey": { "$endsWith": val } });
            return this;
        }

        withObjectKeyNotEndingWith(val: string): this {
            this.filters.push({ "objectKey": { "$notEndsWith": val } });
            return this;
        }

        withObjectKeySoundingLike(val: string): this {
            this.filters.push({ "objectKey": { "$soundLike": val } });
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


    orderByFileNameAscending(): this {
        this.query.orderBy("fileName", "asc");
        return this;
    }

    orderByFileNameDescending(): this {
        this.query.orderBy("fileName", "desc");
        return this;
    }

    orderByContentTypeAscending(): this {
        this.query.orderBy("contentType", "asc");
        return this;
    }

    orderByContentTypeDescending(): this {
        this.query.orderBy("contentType", "desc");
        return this;
    }

    orderByContentLengthAscending(): this {
        this.query.orderBy("contentLength", "asc");
        return this;
    }

    orderByContentLengthDescending(): this {
        this.query.orderBy("contentLength", "desc");
        return this;
    }

    orderByContentSha256Ascending(): this {
        this.query.orderBy("contentSha256", "asc");
        return this;
    }

    orderByContentSha256Descending(): this {
        this.query.orderBy("contentSha256", "desc");
        return this;
    }

    orderByObjectKeyAscending(): this {
        this.query.orderBy("objectKey", "asc");
        return this;
    }

    orderByObjectKeyDescending(): this {
        this.query.orderBy("objectKey", "desc");
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

    minContentLength(): this {
        return this.minContentLengthAs("minOfContentLength");
    }

    minContentLengthAs(retName: string): this {
        this.query.aggregate("min", "contentLength", retName);
        return this;
    }
    maxContentLength(): this {
        return this.maxContentLengthAs("maxOfContentLength");
    }

    maxContentLengthAs(retName: string): this {
        this.query.aggregate("max", "contentLength", retName);
        return this;
    }
    sumContentLength(): this {
        return this.sumContentLengthAs("sumOfContentLength");
    }

    sumContentLengthAs(retName: string): this {
        this.query.aggregate("sum", "contentLength", retName);
        return this;
    }
    avgContentLength(): this {
        return this.avgContentLengthAs("avgOfContentLength");
    }

    avgContentLengthAs(retName: string): this {
        this.query.aggregate("avg", "contentLength", retName);
        return this;
    }
    standardDeviationContentLength(): this {
        return this.standardDeviationContentLengthAs("standardDeviationOfContentLength");
    }

    standardDeviationContentLengthAs(retName: string): this {
        this.query.aggregate("stddev", "contentLength", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationContentLength(): this {
        return this.squareRootOfPopulationStandardDeviationContentLengthAs("squareRootOfPopulationStandardDeviationOfContentLength");
    }

    squareRootOfPopulationStandardDeviationContentLengthAs(retName: string): this {
        this.query.aggregate("stddev_pop", "contentLength", retName);
        return this;
    }
    sampleVarianceContentLength(): this {
        return this.sampleVarianceContentLengthAs("sampleVarianceOfContentLength");
    }

    sampleVarianceContentLengthAs(retName: string): this {
        this.query.aggregate("var_samp", "contentLength", retName);
        return this;
    }
    samplePopulationVarianceContentLength(): this {
        return this.samplePopulationVarianceContentLengthAs("samplePopulationVarianceOfContentLength");
    }

    samplePopulationVarianceContentLengthAs(retName: string): this {
        this.query.aggregate("var_pop", "contentLength", retName);
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
    groupByCustomerOrder(): this {
        this.query.groupBy("customerOrder");
        return this;
    }

    groupByCustomerOrderAs(retName: string): this {
        this.query.groupBy("customerOrder", retName);
        return this;
    }
    groupByFileName(): this {
        this.query.groupBy("fileName");
        return this;
    }

    groupByFileNameAs(retName: string): this {
        this.query.groupBy("fileName", retName);
        return this;
    }
    groupByContentType(): this {
        this.query.groupBy("contentType");
        return this;
    }

    groupByContentTypeAs(retName: string): this {
        this.query.groupBy("contentType", retName);
        return this;
    }
    groupByContentLength(): this {
        this.query.groupBy("contentLength");
        return this;
    }

    groupByContentLengthAs(retName: string): this {
        this.query.groupBy("contentLength", retName);
        return this;
    }
    groupByContentSha256(): this {
        this.query.groupBy("contentSha256");
        return this;
    }

    groupByContentSha256As(retName: string): this {
        this.query.groupBy("contentSha256", retName);
        return this;
    }
    groupByObjectKey(): this {
        this.query.groupBy("objectKey");
        return this;
    }

    groupByObjectKeyAs(retName: string): this {
        this.query.groupBy("objectKey", retName);
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
    facetByCustomerOrderAs(
        facetName: string,
        request: { readonly entityName: "CustomerOrder"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "customerOrder", request, includeAllFacets,
            { kind: "facet", method: "facetByCustomerOrderAs", relation: "customerOrder", alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<OrderAttachment>> {
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
            row instanceof OrderAttachment
                ? row
                : OrderAttachment.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<OrderAttachment>(data);
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
    ): Promise<SmartList<OrderAttachment>> {
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
        const data = new SmartList<OrderAttachment>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof OrderAttachment
                ? row
                : OrderAttachment.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<OrderAttachment> {
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
                    yield entity instanceof OrderAttachment
                        ? entity
                        : OrderAttachment.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableOrderAttachmentRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<OrderAttachment>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<OrderAttachment>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<OrderAttachment> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return OrderAttachment.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<OrderAttachment>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<OrderAttachment> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<OrderAttachment | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}