import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { TypePlatform } from '../models/TypePlatform';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class TypePlatformRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("TypePlatform");
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

    purpose(p: string): ExecutableTypePlatformRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableTypePlatformRequest(
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
        this.filters = this.filters.filter(filter => !("version" in filter));
        return this;
    }

    deletedRowsOnly(): this {
        this.withDeletedRows();
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




    selectScalarTypeProbeListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery(
            "scalarTypeProbeList", request.toQuery(), "id", "typePlatform", true,
            { kind: "relation-select", method: "selectScalarTypeProbeListWith", relation: "scalarTypeProbeList" });
        return this;
    }

    haveScalarTypeProbes(): this {
        return this.withScalarTypeProbeListMatching({
            toQuery: () => new SelectQuery("ScalarTypeProbe"),
        });
    }

    haveNoScalarTypeProbes(): this {
        return this.withoutScalarTypeProbeListMatching({
            toQuery: () => new SelectQuery("ScalarTypeProbe"),
        });
    }

    withScalarTypeProbeListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$inSubquery": {
                    query: request.toQuery(), field: "typePlatform",
                },
            },
        });
        return this;
    }

    withoutScalarTypeProbeListMatching(request: { toQuery(): SelectQuery }): this {
        this.filters.push({
            "id": {
                "$notInSubquery": {
                    query: request.toQuery(), field: "typePlatform",
                },
            },
        });
        return this;
    }

    countScalarTypeProbes(): this {
        return this.countScalarTypeProbesAs("countScalarTypeProbes");
    }

    countScalarTypeProbesAs(alias: string): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        this.countScalarTypeProbesWith(alias, { toQuery: () => query });
        this.query.relationAggregates[this.query.relationAggregates.length - 1].operation = {
            kind: "relation-count", method: "countScalarTypeProbesAs", relation: "scalarTypeProbeList", alias };
        return this;
    }

    countScalarTypeProbesWith(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("Count", "id", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "relation-count", method: "countScalarTypeProbesWith", relation: "scalarTypeProbeList", alias });
        return this;
    }

    minRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minRequiredIntegerOfScalarTypeProbesAs(
            "minOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    minRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxRequiredIntegerOfScalarTypeProbesAs(
            "maxOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    maxRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumRequiredIntegerOfScalarTypeProbesAs(
            "sumOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    sumRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgRequiredIntegerOfScalarTypeProbesAs(
            "avgOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    avgRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationRequiredIntegerOfScalarTypeProbesAs(
            "standardDeviationOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationRequiredIntegerOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceRequiredIntegerOfScalarTypeProbesAs(
            "sampleVarianceOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceRequiredIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceRequiredIntegerOfScalarTypeProbesAs(
            "samplePopulationVarianceOfRequiredIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceRequiredIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "requiredInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceRequiredIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minOptionalIntegerOfScalarTypeProbesAs(
            "minOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    minOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxOptionalIntegerOfScalarTypeProbesAs(
            "maxOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    maxOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumOptionalIntegerOfScalarTypeProbesAs(
            "sumOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    sumOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgOptionalIntegerOfScalarTypeProbesAs(
            "avgOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    avgOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationOptionalIntegerOfScalarTypeProbesAs(
            "standardDeviationOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationOptionalIntegerOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceOptionalIntegerOfScalarTypeProbesAs(
            "sampleVarianceOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceOptionalIntegerOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceOptionalIntegerOfScalarTypeProbesAs(
            "samplePopulationVarianceOfOptionalIntegerOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceOptionalIntegerOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "optionalInteger", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceOptionalIntegerOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minRequiredLongOfScalarTypeProbesAs(
            "minOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    minRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxRequiredLongOfScalarTypeProbesAs(
            "maxOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    maxRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumRequiredLongOfScalarTypeProbesAs(
            "sumOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    sumRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgRequiredLongOfScalarTypeProbesAs(
            "avgOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    avgRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationRequiredLongOfScalarTypeProbesAs(
            "standardDeviationOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationRequiredLongOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceRequiredLongOfScalarTypeProbesAs(
            "sampleVarianceOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceRequiredLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceRequiredLongOfScalarTypeProbesAs(
            "samplePopulationVarianceOfRequiredLongOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceRequiredLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "requiredLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceRequiredLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minOptionalLongOfScalarTypeProbesAs(
            "minOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    minOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxOptionalLongOfScalarTypeProbesAs(
            "maxOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    maxOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumOptionalLongOfScalarTypeProbesAs(
            "sumOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    sumOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgOptionalLongOfScalarTypeProbesAs(
            "avgOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    avgOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationOptionalLongOfScalarTypeProbesAs(
            "standardDeviationOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationOptionalLongOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceOptionalLongOfScalarTypeProbesAs(
            "sampleVarianceOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceOptionalLongOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceOptionalLongOfScalarTypeProbesAs(
            "samplePopulationVarianceOfOptionalLongOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceOptionalLongOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "optionalLong", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceOptionalLongOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minRequiredDecimalOfScalarTypeProbesAs(
            "minOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    minRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxRequiredDecimalOfScalarTypeProbesAs(
            "maxOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    maxRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumRequiredDecimalOfScalarTypeProbesAs(
            "sumOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    sumRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgRequiredDecimalOfScalarTypeProbesAs(
            "avgOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    avgRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationRequiredDecimalOfScalarTypeProbesAs(
            "standardDeviationOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationRequiredDecimalOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceRequiredDecimalOfScalarTypeProbesAs(
            "sampleVarianceOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceRequiredDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceRequiredDecimalOfScalarTypeProbesAs(
            "samplePopulationVarianceOfRequiredDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceRequiredDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "requiredDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceRequiredDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minOptionalDecimalOfScalarTypeProbesAs(
            "minOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    minOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxOptionalDecimalOfScalarTypeProbesAs(
            "maxOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    maxOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumOptionalDecimalOfScalarTypeProbesAs(
            "sumOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    sumOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgOptionalDecimalOfScalarTypeProbesAs(
            "avgOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    avgOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationOptionalDecimalOfScalarTypeProbesAs(
            "standardDeviationOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationOptionalDecimalOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceOptionalDecimalOfScalarTypeProbesAs(
            "sampleVarianceOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceOptionalDecimalOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceOptionalDecimalOfScalarTypeProbesAs(
            "samplePopulationVarianceOfOptionalDecimalOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceOptionalDecimalOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "optionalDecimal", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceOptionalDecimalOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minRequiredFloatOfScalarTypeProbesAs(
            "minOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    minRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxRequiredFloatOfScalarTypeProbesAs(
            "maxOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    maxRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumRequiredFloatOfScalarTypeProbesAs(
            "sumOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    sumRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgRequiredFloatOfScalarTypeProbesAs(
            "avgOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    avgRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationRequiredFloatOfScalarTypeProbesAs(
            "standardDeviationOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationRequiredFloatOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceRequiredFloatOfScalarTypeProbesAs(
            "sampleVarianceOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceRequiredFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceRequiredFloatOfScalarTypeProbesAs(
            "samplePopulationVarianceOfRequiredFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceRequiredFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "requiredFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceRequiredFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minOptionalFloatOfScalarTypeProbesAs(
            "minOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    minOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxOptionalFloatOfScalarTypeProbesAs(
            "maxOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    maxOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumOptionalFloatOfScalarTypeProbesAs(
            "sumOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    sumOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgOptionalFloatOfScalarTypeProbesAs(
            "avgOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    avgOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationOptionalFloatOfScalarTypeProbesAs(
            "standardDeviationOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationOptionalFloatOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceOptionalFloatOfScalarTypeProbesAs(
            "sampleVarianceOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceOptionalFloatOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceOptionalFloatOfScalarTypeProbesAs(
            "samplePopulationVarianceOfOptionalFloatOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceOptionalFloatOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "optionalFloat", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceOptionalFloatOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minRequiredDoubleOfScalarTypeProbesAs(
            "minOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    minRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxRequiredDoubleOfScalarTypeProbesAs(
            "maxOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    maxRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumRequiredDoubleOfScalarTypeProbesAs(
            "sumOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    sumRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgRequiredDoubleOfScalarTypeProbesAs(
            "avgOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    avgRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationRequiredDoubleOfScalarTypeProbesAs(
            "standardDeviationOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationRequiredDoubleOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceRequiredDoubleOfScalarTypeProbesAs(
            "sampleVarianceOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceRequiredDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceRequiredDoubleOfScalarTypeProbesAs(
            "samplePopulationVarianceOfRequiredDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceRequiredDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "requiredDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceRequiredDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    minOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.minOptionalDoubleOfScalarTypeProbesAs(
            "minOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    minOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("min", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "minOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    maxOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.maxOptionalDoubleOfScalarTypeProbesAs(
            "maxOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    maxOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("max", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "maxOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sumOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sumOptionalDoubleOfScalarTypeProbesAs(
            "sumOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    sumOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("sum", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sumOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    avgOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.avgOptionalDoubleOfScalarTypeProbesAs(
            "avgOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    avgOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("avg", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "avgOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    standardDeviationOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.standardDeviationOptionalDoubleOfScalarTypeProbesAs(
            "standardDeviationOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    standardDeviationOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "standardDeviationOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    squareRootOfPopulationStandardDeviationOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.squareRootOfPopulationStandardDeviationOptionalDoubleOfScalarTypeProbesAs(
            "squareRootOfPopulationStandardDeviationOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    squareRootOfPopulationStandardDeviationOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("stddev_pop", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "squareRootOfPopulationStandardDeviationOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    sampleVarianceOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.sampleVarianceOptionalDoubleOfScalarTypeProbesAs(
            "sampleVarianceOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    sampleVarianceOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_samp", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "sampleVarianceOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
        return this;
    }
    samplePopulationVarianceOptionalDoubleOfScalarTypeProbes(): this {
        const query = new SelectQuery("ScalarTypeProbe").filter({ version: { "$gte": 1 } });
        return this.samplePopulationVarianceOptionalDoubleOfScalarTypeProbesAs(
            "samplePopulationVarianceOfOptionalDoubleOfScalarTypeProbes", { toQuery: () => query });
    }

    samplePopulationVarianceOptionalDoubleOfScalarTypeProbesAs(alias: string, child: { toQuery(): SelectQuery }): this {
        const query = child.toQuery().clone();
        query.aggregateItems = [];
        query.aggregate("var_pop", "optionalDouble", alias);
        this.query.relationAggregate("scalarTypeProbeList", alias, query, true,
            { kind: "aggregate", method: "samplePopulationVarianceOptionalDoubleOfScalarTypeProbesAs", relation: "scalarTypeProbeList", alias });
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
    groupByName(): this {
        this.query.groupBy("name");
        return this;
    }

    groupByNameAs(retName: string): this {
        this.query.groupBy("name"); // In TS we don't alias group by yet natively
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

    private async executeForListInternal(context: UserContext): Promise<SmartList<TypePlatform>> {
        this.ensureIntent();
        if (this._pageCountAlias !== undefined) return this.executeCountedListInternal(context);
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof TypePlatform
                ? row
                : TypePlatform.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<TypePlatform>(data);
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
    ): Promise<SmartList<TypePlatform>> {
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
            row instanceof TypePlatform
                ? row
                : TypePlatform.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<TypePlatform> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const preparedQuery = context.prepareQuery(this.query);
        // Prepare Context and capture the runtime request before returning a lazy iterator.
        const chunks = service.executeForStream(preparedQuery, chunkSize);
        return (async function* () {
            for await (const chunk of chunks) {
                for (const entity of chunk) {
                    yield entity instanceof TypePlatform
                        ? entity
                        : TypePlatform.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutableTypePlatformRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<TypePlatform>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<TypePlatform>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): TypePlatform {
        this.ensureIntent();
        return new TypePlatform();
    }

    executeForList(context: UserContext): Promise<SmartList<TypePlatform>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<TypePlatform> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<TypePlatform | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}