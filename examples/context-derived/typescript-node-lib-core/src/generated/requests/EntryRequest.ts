import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Entry } from '../models/Entry';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class EntryRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Entry");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "Entry" {
        return "Entry";
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

    purpose(p: string): ExecutableEntryRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableEntryRequest(
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
        this.query.select([Entry.__teaqlFields.ID_PROPERTY.member, Entry.__teaqlFields.CATALOG_PROPERTY.member, Entry.__teaqlFields.NAME_PROPERTY.member, Entry.__teaqlFields.BORN_AT_PROPERTY.member, Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, Entry.__teaqlFields.SOURCE_IP_PROPERTY.member, Entry.__teaqlFields.LAST_IP_PROPERTY.member, Entry.__teaqlFields.OPENED_BY_PROPERTY.member, Entry.__teaqlFields.CHANGED_BY_PROPERTY.member, Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member, Entry.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([Entry.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }


    selectName(): this {
        this.query.select([Entry.__teaqlFields.NAME_PROPERTY.member]);
        return this;
    }

    selectBornAt(): this {
        this.query.select([Entry.__teaqlFields.BORN_AT_PROPERTY.member]);
        return this;
    }

    selectTouchedAt(): this {
        this.query.select([Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]);
        return this;
    }

    selectSourceIp(): this {
        this.query.select([Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]);
        return this;
    }

    selectLastIp(): this {
        this.query.select([Entry.__teaqlFields.LAST_IP_PROPERTY.member]);
        return this;
    }

    selectOpenedBy(): this {
        this.query.select([Entry.__teaqlFields.OPENED_BY_PROPERTY.member]);
        return this;
    }

    selectChangedBy(): this {
        this.query.select([Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]);
        return this;
    }

    selectGuardedToken(): this {
        this.query.select([Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([Entry.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectCatalogWith(request: { readonly entityName: "Catalog"; toQuery(): SelectQuery }): this {
        this.query.select([Entry.__teaqlFields.CATALOG_PROPERTY.member]);
        this.query.relationQuery(
            Entry.__teaqlFields.CATALOG_PROPERTY.member, request.toQuery(), Entry.__teaqlFields.CATALOG_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectCatalogWith", relation: Entry.__teaqlFields.CATALOG_PROPERTY.member });
        return this;
    }

    withCatalogMatching(request: { readonly entityName: "Catalog"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [Entry.__teaqlFields.CATALOG_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCatalogMatching(request: { readonly entityName: "Catalog"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [Entry.__teaqlFields.CATALOG_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByCatalog(val: any): this {
            this.filters.push({ [Entry.__teaqlFields.CATALOG_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByCatalogIn(...vals: any[]): this {
            this.filters.push({ [Entry.__teaqlFields.CATALOG_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withCatalogIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.CATALOG_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withCatalogIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.CATALOG_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withNameContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.NAME_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withBornAtIs(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withBornAtIsNot(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withBornAtIn(...vals: unknown[]): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withBornAtNotIn(...vals: unknown[]): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withBornAtGreaterThan(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withBornAtGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withBornAtLessThan(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withBornAtLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withBornAtBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withBornAtIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withBornAtIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.BORN_AT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withTouchedAtIs(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withTouchedAtIsNot(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withTouchedAtIn(...vals: unknown[]): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withTouchedAtNotIn(...vals: unknown[]): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withTouchedAtGreaterThan(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withTouchedAtGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withTouchedAtLessThan(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withTouchedAtLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withTouchedAtBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withTouchedAtIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withTouchedAtIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withSourceIpContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withSourceIpIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withSourceIpIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withSourceIpIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withSourceIpNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withSourceIpGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withSourceIpGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withSourceIpLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withSourceIpLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withSourceIpBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withSourceIpIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withSourceIpIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withSourceIpNotContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withSourceIpStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withSourceIpNotStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withSourceIpEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withSourceIpNotEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withSourceIpSoundingLike(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.SOURCE_IP_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withLastIpContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withLastIpIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withLastIpIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withLastIpIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withLastIpNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withLastIpGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withLastIpGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withLastIpLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withLastIpLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withLastIpBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withLastIpIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withLastIpIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withLastIpNotContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withLastIpStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withLastIpNotStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withLastIpEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withLastIpNotEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withLastIpSoundingLike(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.LAST_IP_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withOpenedByContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withOpenedByIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withOpenedByIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withOpenedByIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withOpenedByNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withOpenedByGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withOpenedByGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withOpenedByLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withOpenedByLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withOpenedByBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withOpenedByIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withOpenedByIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withOpenedByNotContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withOpenedByStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withOpenedByNotStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withOpenedByEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withOpenedByNotEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withOpenedBySoundingLike(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.OPENED_BY_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withChangedByContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withChangedByIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withChangedByIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withChangedByIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withChangedByNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withChangedByGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withChangedByGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withChangedByLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withChangedByLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withChangedByBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withChangedByIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withChangedByIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withChangedByNotContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withChangedByStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withChangedByNotStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withChangedByEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withChangedByNotEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withChangedBySoundingLike(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.CHANGED_BY_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withGuardedTokenContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withGuardedTokenIs(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withGuardedTokenIsNot(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withGuardedTokenIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withGuardedTokenNotIn(...vals: string[]): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withGuardedTokenGreaterThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withGuardedTokenGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withGuardedTokenLessThan(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withGuardedTokenLessThanOrEqualTo(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withGuardedTokenBetween(lower: string, upper: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withGuardedTokenIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withGuardedTokenIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withGuardedTokenNotContaining(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withGuardedTokenStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withGuardedTokenNotStartingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withGuardedTokenEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withGuardedTokenNotEndingWith(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withGuardedTokenSoundingLike(val: string): this {
            this.filters.push({ [Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [Entry.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }


    orderByNameAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.NAME_PROPERTY.member, "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.NAME_PROPERTY.member, "desc");
        return this;
    }

    orderByBornAtAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.BORN_AT_PROPERTY.member, "asc");
        return this;
    }

    orderByBornAtDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.BORN_AT_PROPERTY.member, "desc");
        return this;
    }

    orderByTouchedAtAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, "asc");
        return this;
    }

    orderByTouchedAtDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, "desc");
        return this;
    }

    orderBySourceIpAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.SOURCE_IP_PROPERTY.member, "asc");
        return this;
    }

    orderBySourceIpDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.SOURCE_IP_PROPERTY.member, "desc");
        return this;
    }

    orderByLastIpAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.LAST_IP_PROPERTY.member, "asc");
        return this;
    }

    orderByLastIpDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.LAST_IP_PROPERTY.member, "desc");
        return this;
    }

    orderByOpenedByAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.OPENED_BY_PROPERTY.member, "asc");
        return this;
    }

    orderByOpenedByDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.OPENED_BY_PROPERTY.member, "desc");
        return this;
    }

    orderByChangedByAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.CHANGED_BY_PROPERTY.member, "asc");
        return this;
    }

    orderByChangedByDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.CHANGED_BY_PROPERTY.member, "desc");
        return this;
    }

    orderByGuardedTokenAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member, "asc");
        return this;
    }

    orderByGuardedTokenDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(Entry.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(Entry.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(Entry.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByCatalog(): this {
        this.query.groupBy(Entry.__teaqlFields.CATALOG_PROPERTY.member);
        return this;
    }

    groupByCatalogAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.CATALOG_PROPERTY.member, retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy(Entry.__teaqlFields.NAME_PROPERTY.member);
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.NAME_PROPERTY.member, retName);
        return this;
    }
    groupByBornAt(): this {
        this.query.groupBy(Entry.__teaqlFields.BORN_AT_PROPERTY.member);
        return this;
    }

    groupByBornAtAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.BORN_AT_PROPERTY.member, retName);
        return this;
    }
    groupByTouchedAt(): this {
        this.query.groupBy(Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member);
        return this;
    }

    groupByTouchedAtAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, retName);
        return this;
    }
    groupBySourceIp(): this {
        this.query.groupBy(Entry.__teaqlFields.SOURCE_IP_PROPERTY.member);
        return this;
    }

    groupBySourceIpAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.SOURCE_IP_PROPERTY.member, retName);
        return this;
    }
    groupByLastIp(): this {
        this.query.groupBy(Entry.__teaqlFields.LAST_IP_PROPERTY.member);
        return this;
    }

    groupByLastIpAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.LAST_IP_PROPERTY.member, retName);
        return this;
    }
    groupByOpenedBy(): this {
        this.query.groupBy(Entry.__teaqlFields.OPENED_BY_PROPERTY.member);
        return this;
    }

    groupByOpenedByAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.OPENED_BY_PROPERTY.member, retName);
        return this;
    }
    groupByChangedBy(): this {
        this.query.groupBy(Entry.__teaqlFields.CHANGED_BY_PROPERTY.member);
        return this;
    }

    groupByChangedByAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.CHANGED_BY_PROPERTY.member, retName);
        return this;
    }
    groupByGuardedToken(): this {
        this.query.groupBy(Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member);
        return this;
    }

    groupByGuardedTokenAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.GUARDED_TOKEN_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(Entry.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(Entry.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByCatalogAs(
        facetName: string,
        request: { readonly entityName: "Catalog"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, Entry.__teaqlFields.CATALOG_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByCatalogAs", relation: Entry.__teaqlFields.CATALOG_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<Entry>> {
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
            row instanceof Entry
                ? row
                : Entry.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Entry>(data);
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
    ): Promise<SmartList<Entry>> {
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
        const data = new SmartList<Entry>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Entry
                ? row
                : Entry.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Entry> {
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
                    yield entity instanceof Entry
                        ? entity
                        : Entry.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableEntryRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Entry>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Entry>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<Entry> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return Entry.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<Entry>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Entry> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Entry | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}