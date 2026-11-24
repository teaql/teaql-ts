import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class PurchaseOrderRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("PurchaseOrder");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "PurchaseOrder" {
        return "PurchaseOrder";
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

    purpose(p: string): ExecutablePurchaseOrderRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutablePurchaseOrderRequest(
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
        this.query.select([PurchaseOrder.__teaqlFields.ID_PROPERTY.member, PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member, PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member, PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member, PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([PurchaseOrder.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }


    selectContactPhone(): this {
        this.query.select([PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]);
        return this;
    }

    selectInternalNote(): this {
        this.query.select([PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]);
        return this;
    }

    selectCreateTime(): this {
        this.query.select([PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]);
        return this;
    }

    selectUpdateTime(): this {
        this.query.select([PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectTenantWith(request: { readonly entityName: "Tenant"; toQuery(): SelectQuery }): this {
        this.query.select([PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]);
        this.query.relationQuery(
            PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member, request.toQuery(), PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectTenantWith", relation: PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member });
        return this;
    }

    withTenantMatching(request: { readonly entityName: "Tenant"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutTenantMatching(request: { readonly entityName: "Tenant"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    selectOrderItemListWith(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "orderItemList", request.toQuery(), "id", "purchaseOrder", true,
            { kind: "relation-select", method: "selectOrderItemListWith", relation: "orderItemList" });
        return this;
    }

    haveOrderItems(): this {
        return this.withOrderItemListMatching({
            entityName: "OrderItem",
            toQuery: () => new SelectQuery("OrderItem"),
        });
    }

    haveNoOrderItems(): this {
        return this.withoutOrderItemListMatching({
            entityName: "OrderItem",
            toQuery: () => new SelectQuery("OrderItem"),
        });
    }

    withOrderItemListMatching(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "purchaseOrder",
                },
            },
        });
        return this;
    }

    withoutOrderItemListMatching(request: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "purchaseOrder",
                },
            },
        });
        return this;
    }

    countOrderItems(): this {
        return this.countOrderItemsAs("countOrderItems");
    }

    countOrderItemsAs(alias: string): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        this.countOrderItemsWith(alias, { entityName: "OrderItem", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countOrderItemsAs", relation: "orderItemList", alias };
        return this;
    }

    countOrderItemsWith(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "relation-count", method: "countOrderItemsWith", relation: "orderItemList", alias });
        return this;
    }

    minUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.minUnitPriceOfOrderItemsAs(
            "minOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    minUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "minUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    maxUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.maxUnitPriceOfOrderItemsAs(
            "maxOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    maxUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "maxUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    sumUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.sumUnitPriceOfOrderItemsAs(
            "sumOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    sumUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "sumUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    avgUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.avgUnitPriceOfOrderItemsAs(
            "avgOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    avgUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "avgUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    standardDeviationUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.standardDeviationUnitPriceOfOrderItemsAs(
            "standardDeviationOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    standardDeviationUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs(
            "squareRootOfPopulationStandardDeviationOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    sampleVarianceUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceUnitPriceOfOrderItemsAs(
            "sampleVarianceOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    sampleVarianceUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }
    samplePopulationVarianceUnitPriceOfOrderItems(): this {
        const query = new SelectQuery("OrderItem").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceUnitPriceOfOrderItemsAs(
            "samplePopulationVarianceOfUnitPriceOfOrderItems", { entityName: "OrderItem", toQuery: () => query });
    }

    samplePopulationVarianceUnitPriceOfOrderItemsAs(alias: string, child: { readonly entityName: "OrderItem"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "unitPrice", alias);
        this.query.relationAggregate("orderItemList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceUnitPriceOfOrderItemsAs", relation: "orderItemList", alias });
        return this;
    }

        withIdIs(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByTenant(val: any): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByTenantIn(...vals: any[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withTenantIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withTenantIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withContactPhoneContaining(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withContactPhoneIs(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withContactPhoneIsNot(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withContactPhoneIn(...vals: string[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withContactPhoneNotIn(...vals: string[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withContactPhoneGreaterThan(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withContactPhoneGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withContactPhoneLessThan(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withContactPhoneLessThanOrEqualTo(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withContactPhoneBetween(lower: string, upper: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withContactPhoneIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withContactPhoneIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withContactPhoneNotContaining(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withContactPhoneStartingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withContactPhoneNotStartingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withContactPhoneEndingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withContactPhoneNotEndingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withContactPhoneSoundingLike(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withInternalNoteContaining(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withInternalNoteIs(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withInternalNoteIsNot(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withInternalNoteIn(...vals: string[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withInternalNoteNotIn(...vals: string[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withInternalNoteGreaterThan(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withInternalNoteGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withInternalNoteLessThan(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withInternalNoteLessThanOrEqualTo(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withInternalNoteBetween(lower: string, upper: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withInternalNoteIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withInternalNoteIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withInternalNoteNotContaining(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withInternalNoteStartingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withInternalNoteNotStartingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withInternalNoteEndingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withInternalNoteNotEndingWith(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withInternalNoteSoundingLike(val: string): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withCreateTimeIs(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withCreateTimeIsNot(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withCreateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCreateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withCreateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withCreateTimeLessThan(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withCreateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withCreateTimeIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCreateTimeIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withUpdateTimeIs(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withUpdateTimeIsNot(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withUpdateTimeIn(...vals: unknown[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withUpdateTimeNotIn(...vals: unknown[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withUpdateTimeGreaterThan(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThan(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withUpdateTimeBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withUpdateTimeIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withUpdateTimeIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }


    orderByContactPhoneAscending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member, "asc");
        return this;
    }

    orderByContactPhoneDescending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member, "desc");
        return this;
    }

    orderByInternalNoteAscending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member, "asc");
        return this;
    }

    orderByInternalNoteDescending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member, "desc");
        return this;
    }

    orderByCreateTimeAscending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByCreateTimeDescending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByUpdateTimeAscending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, "asc");
        return this;
    }

    orderByUpdateTimeDescending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(PurchaseOrder.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByTenant(): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member);
        return this;
    }

    groupByTenantAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member, retName);
        return this;
    }
    groupByContactPhone(): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member);
        return this;
    }

    groupByContactPhoneAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.CONTACT_PHONE_PROPERTY.member, retName);
        return this;
    }
    groupByInternalNote(): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member);
        return this;
    }

    groupByInternalNoteAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.INTERNAL_NOTE_PROPERTY.member, retName);
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member);
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.CREATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.UPDATE_TIME_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(PurchaseOrder.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByTenantAs(
        facetName: string,
        request: { readonly entityName: "Tenant"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByTenantAs", relation: PurchaseOrder.__teaqlFields.TENANT_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<PurchaseOrder>> {
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
            row instanceof PurchaseOrder
                ? row
                : PurchaseOrder.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<PurchaseOrder>(data);
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
    ): Promise<SmartList<PurchaseOrder>> {
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
        const data = new SmartList<PurchaseOrder>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof PurchaseOrder
                ? row
                : PurchaseOrder.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<PurchaseOrder> {
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
                    yield entity instanceof PurchaseOrder
                        ? entity
                        : PurchaseOrder.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutablePurchaseOrderRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<PurchaseOrder>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<PurchaseOrder>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<PurchaseOrder> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return PurchaseOrder.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<PurchaseOrder>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<PurchaseOrder> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<PurchaseOrder | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}