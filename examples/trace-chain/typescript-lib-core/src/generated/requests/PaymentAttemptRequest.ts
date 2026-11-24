import { EntityRoot, SelectQuery, SmartList, TeaQLDataService, UserContext, executeRelationFacets } from '../../teaql-ts';
import { PaymentAttempt } from '../models/PaymentAttempt';
import { mergeGeneratedScalarSearch, DynamicSearchWarning, QueryIntent } from 'teaql-ts';
import type { Decimal, Long, LocalTime } from 'teaql-ts';
import { GENERATED_SEARCH_MODELS } from '../../generated-search-models';



export class PaymentAttemptRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;
    private _pageCountAlias: string | undefined;
    private _pageCountMethod: "count" | "countAs" | undefined;
    private _dynamicSearchWarnings: DynamicSearchWarning[] = [];

    constructor(minimal = false) {
        this.query = new SelectQuery("PaymentAttempt");
        this.filters.push({ version: { "$gte": 1 } });
        if (minimal) {
            this.selectId();
            this.selectVersion();
        }
        else this.selectSelfFields();
    }

    get entityName(): "PaymentAttempt" {
        return "PaymentAttempt";
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

    purpose(p: string): ExecutablePaymentAttemptRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutablePaymentAttemptRequest(
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
        this.query.select([PaymentAttempt.__teaqlFields.ID_PROPERTY.member, PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member, PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member, PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }

    selectId(): this {
        this.query.select([PaymentAttempt.__teaqlFields.ID_PROPERTY.member]);
        return this;
    }


    selectReferenceCode(): this {
        this.query.select([PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]);
        return this;
    }

    selectVersion(): this {
        this.query.select([PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]);
        return this;
    }


    selectPaymentWith(request: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        this.query.select([PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]);
        this.query.relationQuery(
            PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member, request.toQuery(), PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member, "id", false,
            { kind: "relation-select", method: "selectPaymentWith", relation: PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member });
        return this;
    }

    withPaymentMatching(request: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]: {
                "$inSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }

    withoutPaymentMatching(request: { readonly entityName: "Payment"; toQuery(): SelectQuery }): this {
        this.filters.push({
            [PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]: {
                "$notInSubquery": { query: request.toQuery(), field: "id" },
            },
        });
        return this;
    }




        withIdIs(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withIdIsNot(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withIdIn(...vals: string[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withIdNotIn(...vals: string[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withIdGreaterThan(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withIdLessThan(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withIdBetween(lower: string, upper: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withIdIsKnown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withIdIsUnknown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.ID_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        filterByPayment(val: any): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        filterByPaymentIn(...vals: any[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withPaymentIsKnown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withPaymentIsUnknown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

        withReferenceCodeContaining(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$contains": val } });
            return this;
        }

        withReferenceCodeIs(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withReferenceCodeIsNot(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withReferenceCodeIn(...vals: string[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withReferenceCodeNotIn(...vals: string[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withReferenceCodeGreaterThan(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withReferenceCodeGreaterThanOrEqualTo(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withReferenceCodeLessThan(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withReferenceCodeLessThanOrEqualTo(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withReferenceCodeBetween(lower: string, upper: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withReferenceCodeIsKnown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withReferenceCodeIsUnknown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$isNull": true } });
            return this;
        }
        withReferenceCodeNotContaining(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$notContains": val } });
            return this;
        }

        withReferenceCodeStartingWith(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$startsWith": val } });
            return this;
        }

        withReferenceCodeNotStartingWith(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$notStartsWith": val } });
            return this;
        }

        withReferenceCodeEndingWith(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$endsWith": val } });
            return this;
        }

        withReferenceCodeNotEndingWith(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$notEndsWith": val } });
            return this;
        }

        withReferenceCodeSoundingLike(val: string): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member]: { "$soundLike": val } });
            return this;
        }

        withVersionIs(val: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$eq": val } });
            return this;
        }

        withVersionIsNot(val: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$ne": val } });
            return this;
        }

        withVersionIn(...vals: unknown[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$in": vals } });
            return this;
        }

        withVersionNotIn(...vals: unknown[]): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$notIn": vals } });
            return this;
        }

        withVersionGreaterThan(val: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$gt": val } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$gte": val } });
            return this;
        }

        withVersionLessThan(val: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$lt": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$lte": val } });
            return this;
        }

        withVersionBetween(lower: unknown, upper: unknown): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$between": [lower, upper] } });
            return this;
        }

        withVersionIsKnown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": false } });
            return this;
        }

        withVersionIsUnknown(): this {
            this.filters.push({ [PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member]: { "$isNull": true } });
            return this;
        }

    orderByIdAscending(): this {
        this.query.orderBy(PaymentAttempt.__teaqlFields.ID_PROPERTY.member, "asc");
        return this;
    }

    orderByIdDescending(): this {
        this.query.orderBy(PaymentAttempt.__teaqlFields.ID_PROPERTY.member, "desc");
        return this;
    }


    orderByReferenceCodeAscending(): this {
        this.query.orderBy(PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member, "asc");
        return this;
    }

    orderByReferenceCodeDescending(): this {
        this.query.orderBy(PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member, "desc");
        return this;
    }

    orderByVersionAscending(): this {
        this.query.orderBy(PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member, "asc");
        return this;
    }

    orderByVersionDescending(): this {
        this.query.orderBy(PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member, "desc");
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
        this.query.groupBy(PaymentAttempt.__teaqlFields.ID_PROPERTY.member);
        return this;
    }

    groupByIdAs(retName: string): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.ID_PROPERTY.member, retName);
        return this;
    }
    groupByPayment(): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member);
        return this;
    }

    groupByPaymentAs(retName: string): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member, retName);
        return this;
    }
    groupByReferenceCode(): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member);
        return this;
    }

    groupByReferenceCodeAs(retName: string): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.REFERENCE_CODE_PROPERTY.member, retName);
        return this;
    }
    groupByVersion(): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member);
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy(PaymentAttempt.__teaqlFields.VERSION_PROPERTY.member, retName);
        return this;
    }

    // --- Facets ---
    facetByPaymentAs(
        facetName: string,
        request: { readonly entityName: "Payment"; toQuery(): SelectQuery },
        includeAllFacets = true,
    ): this {
        this.query.facetBy(facetName, PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member, request, includeAllFacets,
            { kind: "facet", method: "facetByPaymentAs", relation: PaymentAttempt.__teaqlFields.PAYMENT_PROPERTY.member, alias: facetName });
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<PaymentAttempt>> {
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
            row instanceof PaymentAttempt
                ? row
                : PaymentAttempt.fromRecord(row as Record<string, unknown>, new EntityRoot()));
        const result = new SmartList<PaymentAttempt>(data);
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
    ): Promise<SmartList<PaymentAttempt>> {
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
        const data = new SmartList<PaymentAttempt>(aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof PaymentAttempt
                ? row
                : PaymentAttempt.fromRecord(row as Record<string, unknown>, new EntityRoot())));
        if (aggregateOnly && rows[0]) Object.assign(data.aggregations, rows[0]);
        data.totalCount = totalCount;
        if (this._pageCountAlias !== undefined) data.aggregations[this._pageCountAlias] = totalCount;
        if (this.query.facets.length > 0) {
            data.facets = await executeRelationFacets(
                service, (query: any) => context.prepareQuery(query), preparedQuery, preparedQuery.facets);
        }
        return data;
    }

    private executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<PaymentAttempt> {
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
                    yield entity instanceof PaymentAttempt
                        ? entity
                        : PaymentAttempt.fromRecord(entity as Record<string, unknown>, new EntityRoot());
                }
            }
        })();
    }

    private ensureIntent(): void {
        // Runtime owns validation, Unicode whitespace rules and typed diagnostics.
        new QueryIntent(this._comment, this._purpose);
    }

}

export class ExecutablePaymentAttemptRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<PaymentAttempt>>,
        private readonly executeRows: (context: UserContext) => Promise<SmartList<Record<string, unknown>>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<PaymentAttempt>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    async newEntity(context: UserContext): Promise<PaymentAttempt> {
        this.ensureIntent();
        if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for creation");
        return PaymentAttempt.teaqlCreate(context);
    }

    executeForList(context: UserContext): Promise<SmartList<PaymentAttempt>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForRows(context: UserContext): Promise<SmartList<Record<string, unknown>>> {
        this.ensureIntent();
        return this.executeRows(context);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<PaymentAttempt> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<PaymentAttempt | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}