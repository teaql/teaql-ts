import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { Platform } from '../models/Platform';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class PlatformRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("Platform");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "Platform" {
        return "Platform";
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

    purpose(p: string): ExecutablePlatformRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutablePlatformRequest(
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
        this.query.select(["id", "name", "version"]);
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

    selectVersion(): this {
        this.query.select(["version"]);
        return this;
    }




    selectFreightQuoteListWith(request: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "freightQuoteList", request.toQuery(), "id", "platform", true,
            { kind: "relation-select", method: "selectFreightQuoteListWith", relation: "freightQuoteList" });
        return this;
    }

    haveFreightQuotes(): this {
        return this.withFreightQuoteListMatching({
            entityName: "FreightQuote",
            toQuery: () => new SelectQuery("FreightQuote"),
        });
    }

    haveNoFreightQuotes(): this {
        return this.withoutFreightQuoteListMatching({
            entityName: "FreightQuote",
            toQuery: () => new SelectQuery("FreightQuote"),
        });
    }

    withFreightQuoteListMatching(request: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    withoutFreightQuoteListMatching(request: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "platform",
                },
            },
        });
        return this;
    }

    countFreightQuotes(): this {
        return this.countFreightQuotesAs("countFreightQuotes");
    }

    countFreightQuotesAs(alias: string): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        this.countFreightQuotesWith(alias, { entityName: "FreightQuote", toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countFreightQuotesAs", relation: "freightQuoteList", alias };
        return this;
    }

    countFreightQuotesWith(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "relation-count", method: "countFreightQuotesWith", relation: "freightQuoteList", alias });
        return this;
    }

    minAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.minAmountOfFreightQuotesAs(
            "minOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    minAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "minAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    maxAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.maxAmountOfFreightQuotesAs(
            "maxOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    maxAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "maxAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    sumAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.sumAmountOfFreightQuotesAs(
            "sumOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    sumAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "sumAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    avgAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.avgAmountOfFreightQuotesAs(
            "avgOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    avgAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "avgAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    standardDeviationAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.standardDeviationAmountOfFreightQuotesAs(
            "standardDeviationOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    standardDeviationAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationAmountOfFreightQuotesAs(
            "squareRootOfPopulationStandardDeviationOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    sampleVarianceAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceAmountOfFreightQuotesAs(
            "sampleVarianceOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    sampleVarianceAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    samplePopulationVarianceAmountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceAmountOfFreightQuotesAs(
            "samplePopulationVarianceOfAmountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    samplePopulationVarianceAmountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "amount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceAmountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    minShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.minShipmentNumberOfFreightQuotesAs(
            "minOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    minShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "minShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    maxShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.maxShipmentNumberOfFreightQuotesAs(
            "maxOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    maxShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "maxShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    sumShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.sumShipmentNumberOfFreightQuotesAs(
            "sumOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    sumShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "sumShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    avgShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.avgShipmentNumberOfFreightQuotesAs(
            "avgOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    avgShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "avgShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    standardDeviationShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.standardDeviationShipmentNumberOfFreightQuotesAs(
            "standardDeviationOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    standardDeviationShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationShipmentNumberOfFreightQuotesAs(
            "squareRootOfPopulationStandardDeviationOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    sampleVarianceShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceShipmentNumberOfFreightQuotesAs(
            "sampleVarianceOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    sampleVarianceShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    samplePopulationVarianceShipmentNumberOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceShipmentNumberOfFreightQuotesAs(
            "samplePopulationVarianceOfShipmentNumberOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    samplePopulationVarianceShipmentNumberOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "shipmentNumber", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceShipmentNumberOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    minPackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.minPackageCountOfFreightQuotesAs(
            "minOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    minPackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "minPackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    maxPackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.maxPackageCountOfFreightQuotesAs(
            "maxOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    maxPackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "maxPackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    sumPackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.sumPackageCountOfFreightQuotesAs(
            "sumOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    sumPackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "sumPackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    avgPackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.avgPackageCountOfFreightQuotesAs(
            "avgOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    avgPackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "avgPackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    standardDeviationPackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.standardDeviationPackageCountOfFreightQuotesAs(
            "standardDeviationOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    standardDeviationPackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationPackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationPackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationPackageCountOfFreightQuotesAs(
            "squareRootOfPopulationStandardDeviationOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationPackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationPackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    sampleVariancePackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.sampleVariancePackageCountOfFreightQuotesAs(
            "sampleVarianceOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    sampleVariancePackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "sampleVariancePackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
        return this;
    }
    samplePopulationVariancePackageCountOfFreightQuotes(): this {
        const query = new SelectQuery("FreightQuote").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVariancePackageCountOfFreightQuotesAs(
            "samplePopulationVarianceOfPackageCountOfFreightQuotes", { entityName: "FreightQuote", toQuery: () => query });
    }

    samplePopulationVariancePackageCountOfFreightQuotesAs(alias: string, child: { readonly entityName: "FreightQuote"; toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "packageCount", alias);
        this.query.relationAggregate("freightQuoteList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVariancePackageCountOfFreightQuotesAs", relation: "freightQuoteList", alias });
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

        withNameContaining(val: string): this {
            this.filters.push({ "name": { "$contains": val } });
            return this;
        }

        withNameIs(val: string): this {
            this.filters.push({ "name": { "$eq": val } });
            return this;
        }

        withNameIsNot(val: string): this {
            this.filters.push({ "name": { "$ne": val } });
            return this;
        }

        withNameIn(...vals: string[]): this {
            this.filters.push({ "name": { "$in": vals } });
            return this;
        }

        withNameNotIn(...vals: string[]): this {
            this.filters.push({ "name": { "$notIn": vals } });
            return this;
        }

        withNameGreaterThan(val: string): this {
            this.filters.push({ "name": { "$gt": val } });
            return this;
        }

        withNameGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ "name": { "$gte": val } });
            return this;
        }

        withNameLessThan(val: string): this {
            this.filters.push({ "name": { "$lt": val } });
            return this;
        }

        withNameLessThanOrEqualTo(val: string): this {
            this.filters.push({ "name": { "$lte": val } });
            return this;
        }

        withNameBetween(lower: string, upper: string): this {
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

    orderByNameAscending(): this {
        this.query.orderBy("name", "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy("name", "desc");
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
        this.query.groupBy("id", retName);
        return this;
    }
    groupByName(): this {
        this.query.groupBy("name");
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy("name", retName);
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

    private async executeForListInternal(context: UserContext): Promise<SmartList<Platform>> {
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
            row instanceof Platform
                ? row
                : Platform.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<Platform>(data);
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
    ): Promise<SmartList<Platform>> {
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
        const data = new SmartList<Platform>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof Platform
                ? row
                : Platform.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<Platform> {
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
                    yield entity instanceof Platform
                        ? entity
                        : Platform.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutablePlatformRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<Platform>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<Platform>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<Platform> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return Platform.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<Platform>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<Platform> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<Platform | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}