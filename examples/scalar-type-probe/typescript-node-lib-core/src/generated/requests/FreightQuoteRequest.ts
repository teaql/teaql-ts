import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { FreightQuote } from '../models/FreightQuote';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class FreightQuoteRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("FreightQuote");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "FreightQuote" {
        return "FreightQuote";
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

    purpose(p: string): ExecutableFreightQuoteRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableFreightQuoteRequest(
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
        this.query.select([FreightQuote.__teaqlFields.ID_PROPERTY.member, FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member, FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member, FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member, FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member, FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member, FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member, FreightQuote.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([FreightQuote.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }


    selectReference(): this {
        this.query.select([FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]);
        return this;
    }

    selectAmount(): this {
        this.query.select([FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]);
        return this;
    }

    selectShipmentNumber(): this {
        this.query.select([FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]);
        return this;
    }

    selectPackageCount(): this {
        this.query.select([FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]);
        return this;
    }

    selectDeliveryDate(): this {
        this.query.select([FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]);
        return this;
    }

    selectPickupTime(): this {
        this.query.select([FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]);
        return this;
    }

    selectQuotedAt(): this {
        this.query.select([FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]);
        return this;
    }

    selectInstructions(): this {
        this.query.select([FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([FreightQuote.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPlatformWith(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.query.select([FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]);
        this.query.relationQuery(
            FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member, request.toQuery(), FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPlatformWith", relation: FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member });
        return this;
    }

    withPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPlatformMatching(request: { readonly entityName: "Platform"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByPlatform(val: any): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPlatformIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPlatformIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withReferenceContaining(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withReferenceIs(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withReferenceIsNot(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withReferenceIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withReferenceNotIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withReferenceGreaterThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withReferenceGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withReferenceLessThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withReferenceLessThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withReferenceBetween(lower: string, upper: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withReferenceIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withReferenceIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withReferenceNotContaining(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withReferenceStartingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withReferenceNotStartingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withReferenceEndingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withReferenceNotEndingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withReferenceSoundingLike(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withAmountIs(val: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withAmountIsNot(val: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withAmountIn(...vals: Decimal[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withAmountNotIn(...vals: Decimal[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withAmountGreaterThan(val: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withAmountGreaterThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withAmountLessThan(val: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withAmountLessThanOrEqualTo(val: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withAmountBetween(lower: Decimal, upper: Decimal): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withAmountIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withAmountIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withShipmentNumberIs(val: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withShipmentNumberIsNot(val: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withShipmentNumberIn(...vals: Long[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withShipmentNumberNotIn(...vals: Long[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withShipmentNumberGreaterThan(val: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withShipmentNumberGreaterThanOrEqualTo(val: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withShipmentNumberLessThan(val: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withShipmentNumberLessThanOrEqualTo(val: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withShipmentNumberBetween(lower: Long, upper: Long): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withShipmentNumberIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withShipmentNumberIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withPackageCountIs(val: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withPackageCountIsNot(val: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withPackageCountIn(...vals: number[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPackageCountNotIn(...vals: number[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withPackageCountGreaterThan(val: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withPackageCountGreaterThanOrEqualTo(val: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withPackageCountLessThan(val: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withPackageCountLessThanOrEqualTo(val: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withPackageCountBetween(lower: number, upper: number): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withPackageCountIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPackageCountIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withDeliveryDateIs(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withDeliveryDateIsNot(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withDeliveryDateIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withDeliveryDateNotIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withDeliveryDateGreaterThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withDeliveryDateGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withDeliveryDateLessThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withDeliveryDateLessThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withDeliveryDateBetween(lower: string, upper: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withDeliveryDateIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withDeliveryDateIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withPickupTimeIs(val: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withPickupTimeIsNot(val: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withPickupTimeIn(...vals: LocalTime[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPickupTimeNotIn(...vals: LocalTime[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withPickupTimeGreaterThan(val: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withPickupTimeGreaterThanOrEqualTo(val: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withPickupTimeLessThan(val: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withPickupTimeLessThanOrEqualTo(val: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withPickupTimeBetween(lower: LocalTime, upper: LocalTime): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withPickupTimeIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPickupTimeIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withQuotedAtIs(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withQuotedAtIsNot(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withQuotedAtIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withQuotedAtNotIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withQuotedAtGreaterThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withQuotedAtGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withQuotedAtLessThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withQuotedAtLessThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withQuotedAtBetween(lower: string, upper: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withQuotedAtIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withQuotedAtIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withInstructionsContaining(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withInstructionsIs(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withInstructionsIsNot(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withInstructionsIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withInstructionsNotIn(...vals: string[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withInstructionsGreaterThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withInstructionsGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withInstructionsLessThan(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withInstructionsLessThanOrEqualTo(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withInstructionsBetween(lower: string, upper: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withInstructionsIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withInstructionsIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withInstructionsNotContaining(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withInstructionsStartingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withInstructionsNotStartingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withInstructionsEndingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withInstructionsNotEndingWith(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withInstructionsSoundingLike(val: string): this {
            this.filters.push({ [FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [FreightQuote.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }


    orderByReferenceAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member, "asc");
        return this;
    }

    orderByReferenceDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member, "desc");
        return this;
    }

    orderByAmountAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, "asc");
        return this;
    }

    orderByAmountDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, "desc");
        return this;
    }

    orderByShipmentNumberAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, "asc");
        return this;
    }

    orderByShipmentNumberDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, "desc");
        return this;
    }

    orderByPackageCountAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, "asc");
        return this;
    }

    orderByPackageCountDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, "desc");
        return this;
    }

    orderByDeliveryDateAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member, "asc");
        return this;
    }

    orderByDeliveryDateDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member, "desc");
        return this;
    }

    orderByPickupTimeAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByPickupTimeDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByQuotedAtAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member, "asc");
        return this;
    }

    orderByQuotedAtDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member, "desc");
        return this;
    }

    orderByInstructionsAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member, "asc");
        return this;
    }

    orderByInstructionsDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(FreightQuote.__teaqlFields.VERSION_PROPERTY.member, "desc");
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

    minAmount(): this {
        return this.minAmountAs("minOfAmount");
    }

    minAmountAs(retName: string): this {
        this.query.aggregate("min", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    maxAmount(): this {
        return this.maxAmountAs("maxOfAmount");
    }

    maxAmountAs(retName: string): this {
        this.query.aggregate("max", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    sumAmount(): this {
        return this.sumAmountAs("sumOfAmount");
    }

    sumAmountAs(retName: string): this {
        this.query.aggregate("sum", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    avgAmount(): this {
        return this.avgAmountAs("avgOfAmount");
    }

    avgAmountAs(retName: string): this {
        this.query.aggregate("avg", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    standardDeviationAmount(): this {
        return this.standardDeviationAmountAs("standardDeviationOfAmount");
    }

    standardDeviationAmountAs(retName: string): this {
        this.query.aggregate("stddev", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationAmount(): this {
        return this.squareRootOfPopulationStandardDeviationAmountAs("squareRootOfPopulationStandardDeviationOfAmount");
    }

    squareRootOfPopulationStandardDeviationAmountAs(retName: string): this {
        this.query.aggregate("stddev_pop", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    sampleVarianceAmount(): this {
        return this.sampleVarianceAmountAs("sampleVarianceOfAmount");
    }

    sampleVarianceAmountAs(retName: string): this {
        this.query.aggregate("var_samp", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVarianceAmount(): this {
        return this.samplePopulationVarianceAmountAs("samplePopulationVarianceOfAmount");
    }

    samplePopulationVarianceAmountAs(retName: string): this {
        this.query.aggregate("var_pop", FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    minShipmentNumber(): this {
        return this.minShipmentNumberAs("minOfShipmentNumber");
    }

    minShipmentNumberAs(retName: string): this {
        this.query.aggregate("min", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    maxShipmentNumber(): this {
        return this.maxShipmentNumberAs("maxOfShipmentNumber");
    }

    maxShipmentNumberAs(retName: string): this {
        this.query.aggregate("max", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    sumShipmentNumber(): this {
        return this.sumShipmentNumberAs("sumOfShipmentNumber");
    }

    sumShipmentNumberAs(retName: string): this {
        this.query.aggregate("sum", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    avgShipmentNumber(): this {
        return this.avgShipmentNumberAs("avgOfShipmentNumber");
    }

    avgShipmentNumberAs(retName: string): this {
        this.query.aggregate("avg", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    standardDeviationShipmentNumber(): this {
        return this.standardDeviationShipmentNumberAs("standardDeviationOfShipmentNumber");
    }

    standardDeviationShipmentNumberAs(retName: string): this {
        this.query.aggregate("stddev", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationShipmentNumber(): this {
        return this.squareRootOfPopulationStandardDeviationShipmentNumberAs("squareRootOfPopulationStandardDeviationOfShipmentNumber");
    }

    squareRootOfPopulationStandardDeviationShipmentNumberAs(retName: string): this {
        this.query.aggregate("stddev_pop", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    sampleVarianceShipmentNumber(): this {
        return this.sampleVarianceShipmentNumberAs("sampleVarianceOfShipmentNumber");
    }

    sampleVarianceShipmentNumberAs(retName: string): this {
        this.query.aggregate("var_samp", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVarianceShipmentNumber(): this {
        return this.samplePopulationVarianceShipmentNumberAs("samplePopulationVarianceOfShipmentNumber");
    }

    samplePopulationVarianceShipmentNumberAs(retName: string): this {
        this.query.aggregate("var_pop", FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    minPackageCount(): this {
        return this.minPackageCountAs("minOfPackageCount");
    }

    minPackageCountAs(retName: string): this {
        this.query.aggregate("min", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    maxPackageCount(): this {
        return this.maxPackageCountAs("maxOfPackageCount");
    }

    maxPackageCountAs(retName: string): this {
        this.query.aggregate("max", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    sumPackageCount(): this {
        return this.sumPackageCountAs("sumOfPackageCount");
    }

    sumPackageCountAs(retName: string): this {
        this.query.aggregate("sum", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    avgPackageCount(): this {
        return this.avgPackageCountAs("avgOfPackageCount");
    }

    avgPackageCountAs(retName: string): this {
        this.query.aggregate("avg", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    standardDeviationPackageCount(): this {
        return this.standardDeviationPackageCountAs("standardDeviationOfPackageCount");
    }

    standardDeviationPackageCountAs(retName: string): this {
        this.query.aggregate("stddev", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationPackageCount(): this {
        return this.squareRootOfPopulationStandardDeviationPackageCountAs("squareRootOfPopulationStandardDeviationOfPackageCount");
    }

    squareRootOfPopulationStandardDeviationPackageCountAs(retName: string): this {
        this.query.aggregate("stddev_pop", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    sampleVariancePackageCount(): this {
        return this.sampleVariancePackageCountAs("sampleVarianceOfPackageCount");
    }

    sampleVariancePackageCountAs(retName: string): this {
        this.query.aggregate("var_samp", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    samplePopulationVariancePackageCount(): this {
        return this.samplePopulationVariancePackageCountAs("samplePopulationVarianceOfPackageCount");
    }

    samplePopulationVariancePackageCountAs(retName: string): this {
        this.query.aggregate("var_pop", FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }

    // --- Group By ---
    groupById(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByPlatform(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member);
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member, retName);
        return this;
    }
    groupByReference(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member);
        return this;
    }

    groupByReferenceAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.REFERENCE_PROPERTY.member, retName);
        return this;
    }
    groupByAmount(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member);
        return this;
    }

    groupByAmountAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.AMOUNT_PROPERTY.member, retName);
        return this;
    }
    groupByShipmentNumber(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member);
        return this;
    }

    groupByShipmentNumberAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.SHIPMENT_NUMBER_PROPERTY.member, retName);
        return this;
    }
    groupByPackageCount(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member);
        return this;
    }

    groupByPackageCountAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.PACKAGE_COUNT_PROPERTY.member, retName);
        return this;
    }
    groupByDeliveryDate(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member);
        return this;
    }

    groupByDeliveryDateAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.DELIVERY_DATE_PROPERTY.member, retName);
        return this;
    }
    groupByPickupTime(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member);
        return this;
    }

    groupByPickupTimeAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.PICKUP_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByQuotedAt(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member);
        return this;
    }

    groupByQuotedAtAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.QUOTED_AT_PROPERTY.member, retName);
        return this;
    }
    groupByInstructions(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member);
        return this;
    }

    groupByInstructionsAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.INSTRUCTIONS_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(FreightQuote.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(FreightQuote.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPlatformAs(
        facetName: string,
        request: { readonly entityName: "Platform"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPlatformAs", relation: FreightQuote.__teaqlFields.PLATFORM_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<FreightQuote>> {
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
            row instanceof FreightQuote
                ? row
                : FreightQuote.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<FreightQuote>(data);
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
    ): Promise<SmartList<FreightQuote>> {
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
        const data = new SmartList<FreightQuote>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof FreightQuote
                ? row
                : FreightQuote.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<FreightQuote> {
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
                    yield entity instanceof FreightQuote
                        ? entity
                        : FreightQuote.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableFreightQuoteRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<FreightQuote>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<FreightQuote>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<FreightQuote> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return FreightQuote.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<FreightQuote>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<FreightQuote> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<FreightQuote | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}