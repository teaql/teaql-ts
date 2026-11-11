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
        this.query.select(["id", "catalog", "name", "bornAt", "touchedAt", "sourceIp", "lastIp", "openedBy", "changedBy", "guardedToken", "version"]);
        return this;
    }

    selectId(): this {
        this.query.select(["id"]);
        return this;
    }


    selectName(): this {
        this.query.select(["name"]);
        return this;
    }

    selectBornAt(): this {
        this.query.select(["bornAt"]);
        return this;
    }

    selectTouchedAt(): this {
        this.query.select(["touchedAt"]);
        return this;
    }

    selectSourceIp(): this {
        this.query.select(["sourceIp"]);
        return this;
    }

    selectLastIp(): this {
        this.query.select(["lastIp"]);
        return this;
    }

    selectOpenedBy(): this {
        this.query.select(["openedBy"]);
        return this;
    }

    selectChangedBy(): this {
        this.query.select(["changedBy"]);
        return this;
    }

    selectGuardedToken(): this {
        this.query.select(["guardedToken"]);
        return this;
    }

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }


    selectCatalogWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["catalog"]);
        this.query.relationQuery(
            "catalog", request.toQuery(), "catalog", "id", false,
            { kind: "relation-select", method: "selectCatalogWith", relation: "catalog" });
        return this;
    }

    withCatalogMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "catalog": {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutCatalogMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "catalog": {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: any): this {
            this.filters.push({ "id": { "$eq": val } });
            return this;
        }

        withIdIsNot(val: any): this {
            this.filters.push({ "id": { "$ne": val } });
            return this;
        }

        withIdIn(...vals: any[]): this {
            this.filters.push({ "id": { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: any[]): this {
            this.filters.push({ "id": { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: any): this {
            this.filters.push({ "id": { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$gte": val } });
            return this;
        }

        withIdLessThan(val: any): this {
            this.filters.push({ "id": { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$lte": val } });
            return this;
        }

        withIdBetween(lower: any, upper: any): this {
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

        filterByCatalog(val: any): this {
            this.filters.push({ "catalog": { "$eq": val } });
            return this;
        }

        filterByCatalogIn(...vals: any[]): this {
            this.filters.push({ "catalog": { "$in": vals } });
            return this;
        }

        withCatalogIsKnown(): this {
            this.filters.push({ "catalog": { "$isNull": false } });
            return this;
        }

        withCatalogIsUnknown(): this {
            this.filters.push({ "catalog": { "$isNull": true } });
            return this;
        }

        withNameContaining(val: string): this {
            this.filters.push({ "name": { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ "name": { "$eq": val } });
            return this;
        }

        withNameIsNot(val: any): this {
            this.filters.push({ "name": { "$ne": val } });
            return this;
        }

        withNameIn(...vals: any[]): this {
            this.filters.push({ "name": { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: any[]): this {
            this.filters.push({ "name": { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: any): this {
            this.filters.push({ "name": { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "name": { "$gte": val } });
            return this;
        }

        withNameLessThan(val: any): this {
            this.filters.push({ "name": { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: any): this {
            this.filters.push({ "name": { "$lte": val } });
            return this;
        }

        withNameBetween(lower: any, upper: any): this {
            this.filters.push({ "name": { "$between": [lower, upper] } });
            return this;
        }

        withNameIsKnown(): this {
            this.filters.push({ "name": { "$isNull": false } });
            return this;
        }

        withNameIsUnknown(): this {
            this.filters.push({ "name": { "$isNull": true } });
            return this;
        }
        withNameNotContaining(val: string): this {
            this.filters.push({ "name": { "$notContains": val } });
            return this;
        }

        withNameStartingWith(val: string): this {
            this.filters.push({ "name": { "$startsWith": val } });
            return this;
        }

        withNameNotStartingWith(val: string): this {
            this.filters.push({ "name": { "$notStartsWith": val } });
            return this;
        }

        withNameEndingWith(val: string): this {
            this.filters.push({ "name": { "$endsWith": val } });
            return this;
        }

        withNameNotEndingWith(val: string): this {
            this.filters.push({ "name": { "$notEndsWith": val } });
            return this;
        }

        withNameSoundingLike(val: string): this {
            this.filters.push({ "name": { "$soundLike": val } });
            return this;
        }

        withBornAtIs(val: any): this {
            this.filters.push({ "bornAt": { "$eq": val } });
            return this;
        }

        withBornAtIsNot(val: any): this {
            this.filters.push({ "bornAt": { "$ne": val } });
            return this;
        }

        withBornAtIn(...vals: any[]): this {
            this.filters.push({ "bornAt": { "$in": vals } });
            return this;
        }

        withBornAtNotIn(...vals: any[]): this {
            this.filters.push({ "bornAt": { "$notIn": vals } });
            return this;
        }

        withBornAtGreaterThan(val: any): this {
            this.filters.push({ "bornAt": { "$gt": val } });
            return this;
        }

        withBornAtGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "bornAt": { "$gte": val } });
            return this;
        }

        withBornAtLessThan(val: any): this {
            this.filters.push({ "bornAt": { "$lt": val } });
            return this;
        }

        withBornAtLessThanOrEqualTo(val: any): this {
            this.filters.push({ "bornAt": { "$lte": val } });
            return this;
        }

        withBornAtBetween(lower: any, upper: any): this {
            this.filters.push({ "bornAt": { "$between": [lower, upper] } });
            return this;
        }

        withBornAtIsKnown(): this {
            this.filters.push({ "bornAt": { "$isNull": false } });
            return this;
        }

        withBornAtIsUnknown(): this {
            this.filters.push({ "bornAt": { "$isNull": true } });
            return this;
        }

        withTouchedAtIs(val: any): this {
            this.filters.push({ "touchedAt": { "$eq": val } });
            return this;
        }

        withTouchedAtIsNot(val: any): this {
            this.filters.push({ "touchedAt": { "$ne": val } });
            return this;
        }

        withTouchedAtIn(...vals: any[]): this {
            this.filters.push({ "touchedAt": { "$in": vals } });
            return this;
        }

        withTouchedAtNotIn(...vals: any[]): this {
            this.filters.push({ "touchedAt": { "$notIn": vals } });
            return this;
        }

        withTouchedAtGreaterThan(val: any): this {
            this.filters.push({ "touchedAt": { "$gt": val } });
            return this;
        }

        withTouchedAtGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "touchedAt": { "$gte": val } });
            return this;
        }

        withTouchedAtLessThan(val: any): this {
            this.filters.push({ "touchedAt": { "$lt": val } });
            return this;
        }

        withTouchedAtLessThanOrEqualTo(val: any): this {
            this.filters.push({ "touchedAt": { "$lte": val } });
            return this;
        }

        withTouchedAtBetween(lower: any, upper: any): this {
            this.filters.push({ "touchedAt": { "$between": [lower, upper] } });
            return this;
        }

        withTouchedAtIsKnown(): this {
            this.filters.push({ "touchedAt": { "$isNull": false } });
            return this;
        }

        withTouchedAtIsUnknown(): this {
            this.filters.push({ "touchedAt": { "$isNull": true } });
            return this;
        }

        withSourceIpContaining(val: string): this {
            this.filters.push({ "sourceIp": { "$contains": val } });
            return this;
        }

        withSourceIpIs(val: string): this {
            this.filters.push({ "sourceIp": { "$eq": val } });
            return this;
        }

        withSourceIpIsNot(val: any): this {
            this.filters.push({ "sourceIp": { "$ne": val } });
            return this;
        }

        withSourceIpIn(...vals: any[]): this {
            this.filters.push({ "sourceIp": { "$in": vals } });
            return this;
        }

        withSourceIpNotIn(...vals: any[]): this {
            this.filters.push({ "sourceIp": { "$notIn": vals } });
            return this;
        }

        withSourceIpGreaterThan(val: any): this {
            this.filters.push({ "sourceIp": { "$gt": val } });
            return this;
        }

        withSourceIpGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "sourceIp": { "$gte": val } });
            return this;
        }

        withSourceIpLessThan(val: any): this {
            this.filters.push({ "sourceIp": { "$lt": val } });
            return this;
        }

        withSourceIpLessThanOrEqualTo(val: any): this {
            this.filters.push({ "sourceIp": { "$lte": val } });
            return this;
        }

        withSourceIpBetween(lower: any, upper: any): this {
            this.filters.push({ "sourceIp": { "$between": [lower, upper] } });
            return this;
        }

        withSourceIpIsKnown(): this {
            this.filters.push({ "sourceIp": { "$isNull": false } });
            return this;
        }

        withSourceIpIsUnknown(): this {
            this.filters.push({ "sourceIp": { "$isNull": true } });
            return this;
        }
        withSourceIpNotContaining(val: string): this {
            this.filters.push({ "sourceIp": { "$notContains": val } });
            return this;
        }

        withSourceIpStartingWith(val: string): this {
            this.filters.push({ "sourceIp": { "$startsWith": val } });
            return this;
        }

        withSourceIpNotStartingWith(val: string): this {
            this.filters.push({ "sourceIp": { "$notStartsWith": val } });
            return this;
        }

        withSourceIpEndingWith(val: string): this {
            this.filters.push({ "sourceIp": { "$endsWith": val } });
            return this;
        }

        withSourceIpNotEndingWith(val: string): this {
            this.filters.push({ "sourceIp": { "$notEndsWith": val } });
            return this;
        }

        withSourceIpSoundingLike(val: string): this {
            this.filters.push({ "sourceIp": { "$soundLike": val } });
            return this;
        }

        withLastIpContaining(val: string): this {
            this.filters.push({ "lastIp": { "$contains": val } });
            return this;
        }

        withLastIpIs(val: string): this {
            this.filters.push({ "lastIp": { "$eq": val } });
            return this;
        }

        withLastIpIsNot(val: any): this {
            this.filters.push({ "lastIp": { "$ne": val } });
            return this;
        }

        withLastIpIn(...vals: any[]): this {
            this.filters.push({ "lastIp": { "$in": vals } });
            return this;
        }

        withLastIpNotIn(...vals: any[]): this {
            this.filters.push({ "lastIp": { "$notIn": vals } });
            return this;
        }

        withLastIpGreaterThan(val: any): this {
            this.filters.push({ "lastIp": { "$gt": val } });
            return this;
        }

        withLastIpGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "lastIp": { "$gte": val } });
            return this;
        }

        withLastIpLessThan(val: any): this {
            this.filters.push({ "lastIp": { "$lt": val } });
            return this;
        }

        withLastIpLessThanOrEqualTo(val: any): this {
            this.filters.push({ "lastIp": { "$lte": val } });
            return this;
        }

        withLastIpBetween(lower: any, upper: any): this {
            this.filters.push({ "lastIp": { "$between": [lower, upper] } });
            return this;
        }

        withLastIpIsKnown(): this {
            this.filters.push({ "lastIp": { "$isNull": false } });
            return this;
        }

        withLastIpIsUnknown(): this {
            this.filters.push({ "lastIp": { "$isNull": true } });
            return this;
        }
        withLastIpNotContaining(val: string): this {
            this.filters.push({ "lastIp": { "$notContains": val } });
            return this;
        }

        withLastIpStartingWith(val: string): this {
            this.filters.push({ "lastIp": { "$startsWith": val } });
            return this;
        }

        withLastIpNotStartingWith(val: string): this {
            this.filters.push({ "lastIp": { "$notStartsWith": val } });
            return this;
        }

        withLastIpEndingWith(val: string): this {
            this.filters.push({ "lastIp": { "$endsWith": val } });
            return this;
        }

        withLastIpNotEndingWith(val: string): this {
            this.filters.push({ "lastIp": { "$notEndsWith": val } });
            return this;
        }

        withLastIpSoundingLike(val: string): this {
            this.filters.push({ "lastIp": { "$soundLike": val } });
            return this;
        }

        withOpenedByContaining(val: string): this {
            this.filters.push({ "openedBy": { "$contains": val } });
            return this;
        }

        withOpenedByIs(val: string): this {
            this.filters.push({ "openedBy": { "$eq": val } });
            return this;
        }

        withOpenedByIsNot(val: any): this {
            this.filters.push({ "openedBy": { "$ne": val } });
            return this;
        }

        withOpenedByIn(...vals: any[]): this {
            this.filters.push({ "openedBy": { "$in": vals } });
            return this;
        }

        withOpenedByNotIn(...vals: any[]): this {
            this.filters.push({ "openedBy": { "$notIn": vals } });
            return this;
        }

        withOpenedByGreaterThan(val: any): this {
            this.filters.push({ "openedBy": { "$gt": val } });
            return this;
        }

        withOpenedByGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "openedBy": { "$gte": val } });
            return this;
        }

        withOpenedByLessThan(val: any): this {
            this.filters.push({ "openedBy": { "$lt": val } });
            return this;
        }

        withOpenedByLessThanOrEqualTo(val: any): this {
            this.filters.push({ "openedBy": { "$lte": val } });
            return this;
        }

        withOpenedByBetween(lower: any, upper: any): this {
            this.filters.push({ "openedBy": { "$between": [lower, upper] } });
            return this;
        }

        withOpenedByIsKnown(): this {
            this.filters.push({ "openedBy": { "$isNull": false } });
            return this;
        }

        withOpenedByIsUnknown(): this {
            this.filters.push({ "openedBy": { "$isNull": true } });
            return this;
        }
        withOpenedByNotContaining(val: string): this {
            this.filters.push({ "openedBy": { "$notContains": val } });
            return this;
        }

        withOpenedByStartingWith(val: string): this {
            this.filters.push({ "openedBy": { "$startsWith": val } });
            return this;
        }

        withOpenedByNotStartingWith(val: string): this {
            this.filters.push({ "openedBy": { "$notStartsWith": val } });
            return this;
        }

        withOpenedByEndingWith(val: string): this {
            this.filters.push({ "openedBy": { "$endsWith": val } });
            return this;
        }

        withOpenedByNotEndingWith(val: string): this {
            this.filters.push({ "openedBy": { "$notEndsWith": val } });
            return this;
        }

        withOpenedBySoundingLike(val: string): this {
            this.filters.push({ "openedBy": { "$soundLike": val } });
            return this;
        }

        withChangedByContaining(val: string): this {
            this.filters.push({ "changedBy": { "$contains": val } });
            return this;
        }

        withChangedByIs(val: string): this {
            this.filters.push({ "changedBy": { "$eq": val } });
            return this;
        }

        withChangedByIsNot(val: any): this {
            this.filters.push({ "changedBy": { "$ne": val } });
            return this;
        }

        withChangedByIn(...vals: any[]): this {
            this.filters.push({ "changedBy": { "$in": vals } });
            return this;
        }

        withChangedByNotIn(...vals: any[]): this {
            this.filters.push({ "changedBy": { "$notIn": vals } });
            return this;
        }

        withChangedByGreaterThan(val: any): this {
            this.filters.push({ "changedBy": { "$gt": val } });
            return this;
        }

        withChangedByGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "changedBy": { "$gte": val } });
            return this;
        }

        withChangedByLessThan(val: any): this {
            this.filters.push({ "changedBy": { "$lt": val } });
            return this;
        }

        withChangedByLessThanOrEqualTo(val: any): this {
            this.filters.push({ "changedBy": { "$lte": val } });
            return this;
        }

        withChangedByBetween(lower: any, upper: any): this {
            this.filters.push({ "changedBy": { "$between": [lower, upper] } });
            return this;
        }

        withChangedByIsKnown(): this {
            this.filters.push({ "changedBy": { "$isNull": false } });
            return this;
        }

        withChangedByIsUnknown(): this {
            this.filters.push({ "changedBy": { "$isNull": true } });
            return this;
        }
        withChangedByNotContaining(val: string): this {
            this.filters.push({ "changedBy": { "$notContains": val } });
            return this;
        }

        withChangedByStartingWith(val: string): this {
            this.filters.push({ "changedBy": { "$startsWith": val } });
            return this;
        }

        withChangedByNotStartingWith(val: string): this {
            this.filters.push({ "changedBy": { "$notStartsWith": val } });
            return this;
        }

        withChangedByEndingWith(val: string): this {
            this.filters.push({ "changedBy": { "$endsWith": val } });
            return this;
        }

        withChangedByNotEndingWith(val: string): this {
            this.filters.push({ "changedBy": { "$notEndsWith": val } });
            return this;
        }

        withChangedBySoundingLike(val: string): this {
            this.filters.push({ "changedBy": { "$soundLike": val } });
            return this;
        }

        withGuardedTokenContaining(val: string): this {
            this.filters.push({ "guardedToken": { "$contains": val } });
            return this;
        }

        withGuardedTokenIs(val: string): this {
            this.filters.push({ "guardedToken": { "$eq": val } });
            return this;
        }

        withGuardedTokenIsNot(val: any): this {
            this.filters.push({ "guardedToken": { "$ne": val } });
            return this;
        }

        withGuardedTokenIn(...vals: any[]): this {
            this.filters.push({ "guardedToken": { "$in": vals } });
            return this;
        }

        withGuardedTokenNotIn(...vals: any[]): this {
            this.filters.push({ "guardedToken": { "$notIn": vals } });
            return this;
        }

        withGuardedTokenGreaterThan(val: any): this {
            this.filters.push({ "guardedToken": { "$gt": val } });
            return this;
        }

        withGuardedTokenGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "guardedToken": { "$gte": val } });
            return this;
        }

        withGuardedTokenLessThan(val: any): this {
            this.filters.push({ "guardedToken": { "$lt": val } });
            return this;
        }

        withGuardedTokenLessThanOrEqualTo(val: any): this {
            this.filters.push({ "guardedToken": { "$lte": val } });
            return this;
        }

        withGuardedTokenBetween(lower: any, upper: any): this {
            this.filters.push({ "guardedToken": { "$between": [lower, upper] } });
            return this;
        }

        withGuardedTokenIsKnown(): this {
            this.filters.push({ "guardedToken": { "$isNull": false } });
            return this;
        }

        withGuardedTokenIsUnknown(): this {
            this.filters.push({ "guardedToken": { "$isNull": true } });
            return this;
        }
        withGuardedTokenNotContaining(val: string): this {
            this.filters.push({ "guardedToken": { "$notContains": val } });
            return this;
        }

        withGuardedTokenStartingWith(val: string): this {
            this.filters.push({ "guardedToken": { "$startsWith": val } });
            return this;
        }

        withGuardedTokenNotStartingWith(val: string): this {
            this.filters.push({ "guardedToken": { "$notStartsWith": val } });
            return this;
        }

        withGuardedTokenEndingWith(val: string): this {
            this.filters.push({ "guardedToken": { "$endsWith": val } });
            return this;
        }

        withGuardedTokenNotEndingWith(val: string): this {
            this.filters.push({ "guardedToken": { "$notEndsWith": val } });
            return this;
        }

        withGuardedTokenSoundingLike(val: string): this {
            this.filters.push({ "guardedToken": { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: any): this {
            this.filters.push({ "version": { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: any): this {
            this.filters.push({ "version": { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: any[]): this {
            this.filters.push({ "version": { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: any[]): this {
            this.filters.push({ "version": { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: any): this {
            this.filters.push({ "version": { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: any): this {
            this.filters.push({ "version": { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: any, upper: any): this {
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


    orderByNameAscending(): this {
        this.query.orderBy("name", "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy("name", "desc");
        return this;
    }

    orderByBornAtAscending(): this {
        this.query.orderBy("bornAt", "asc");
        return this;
    }

    orderByBornAtDescending(): this {
        this.query.orderBy("bornAt", "desc");
        return this;
    }

    orderByTouchedAtAscending(): this {
        this.query.orderBy("touchedAt", "asc");
        return this;
    }

    orderByTouchedAtDescending(): this {
        this.query.orderBy("touchedAt", "desc");
        return this;
    }

    orderBySourceIpAscending(): this {
        this.query.orderBy("sourceIp", "asc");
        return this;
    }

    orderBySourceIpDescending(): this {
        this.query.orderBy("sourceIp", "desc");
        return this;
    }

    orderByLastIpAscending(): this {
        this.query.orderBy("lastIp", "asc");
        return this;
    }

    orderByLastIpDescending(): this {
        this.query.orderBy("lastIp", "desc");
        return this;
    }

    orderByOpenedByAscending(): this {
        this.query.orderBy("openedBy", "asc");
        return this;
    }

    orderByOpenedByDescending(): this {
        this.query.orderBy("openedBy", "desc");
        return this;
    }

    orderByChangedByAscending(): this {
        this.query.orderBy("changedBy", "asc");
        return this;
    }

    orderByChangedByDescending(): this {
        this.query.orderBy("changedBy", "desc");
        return this;
    }

    orderByGuardedTokenAscending(): this {
        this.query.orderBy("guardedToken", "asc");
        return this;
    }

    orderByGuardedTokenDescending(): this {
        this.query.orderBy("guardedToken", "desc");
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


    // --- Group By ---
    groupById(): this {
        this.query.groupBy("id");
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy("id"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCatalog(): this {
        this.query.groupBy("catalog");
        return this;
    }

    groupByCatalogAs(retName: string): this {
        this.query.groupBy("catalog"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByName(): this {
        this.query.groupBy("name");
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy("name"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByBornAt(): this {
        this.query.groupBy("bornAt");
        return this;
    }

    groupByBornAtAs(retName: string): this {
        this.query.groupBy("bornAt"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByTouchedAt(): this {
        this.query.groupBy("touchedAt");
        return this;
    }

    groupByTouchedAtAs(retName: string): this {
        this.query.groupBy("touchedAt"); // In TS we don't alias group by yet natively
        return this;
    }
    groupBySourceIp(): this {
        this.query.groupBy("sourceIp");
        return this;
    }

    groupBySourceIpAs(retName: string): this {
        this.query.groupBy("sourceIp"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByLastIp(): this {
        this.query.groupBy("lastIp");
        return this;
    }

    groupByLastIpAs(retName: string): this {
        this.query.groupBy("lastIp"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByOpenedBy(): this {
        this.query.groupBy("openedBy");
        return this;
    }

    groupByOpenedByAs(retName: string): this {
        this.query.groupBy("openedBy"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByChangedBy(): this {
        this.query.groupBy("changedBy");
        return this;
    }

    groupByChangedByAs(retName: string): this {
        this.query.groupBy("changedBy"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByGuardedToken(): this {
        this.query.groupBy("guardedToken");
        return this;
    }

    groupByGuardedTokenAs(retName: string): this {
        this.query.groupBy("guardedToken"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy("version");
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy("version"); // In TS we don't alias group by yet natively
        return this;
    }

    // --- Facets ---
    facetByCatalogAs(
        facetName: string,
        request: { toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, "catalog", request, includeAllFacets,
            { kind: "facet", method: "facetByCatalogAs", relation: "catalog", alias: facetName });
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

    newEntity(context: UserContext): Entry {
        this.ensureIntent();
        return new Entry();
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