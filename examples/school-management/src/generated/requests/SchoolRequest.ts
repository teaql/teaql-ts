import { SelectQuery, SmartList, TeaQLDataService, TeaQLPage, UserContext } from '../../teaql-ts';
import { School } from '../models/School';



export class SchoolRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor(minimal = false) {
        this.query = new SelectQuery("School");
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

    purpose(p: string): ExecutableSchoolRequest {
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableSchoolRequest(
            (context) => this.executeForListInternal(context),
            (context, offset, limit) => this.executeForPageInternal(context, offset, limit),
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

    limit(n: number): this {
        this.query.limit(n);
        return this;
    }

    offset(n: number): this {
        this.query.offset(n);
        return this;
    }

    toQuery(): SelectQuery {
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
        this.query.select(["id", "platform", "schoolType", "name", "address", "establishedDate", "studentCapacity", "active", "createTime", "updateTime", "version"]);
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

    selectAddress(): this {
        this.query.select(["address"]);
        return this;
    }

    selectEstablishedDate(): this {
        this.query.select(["establishedDate"]);
        return this;
    }

    selectStudentCapacity(): this {
        this.query.select(["studentCapacity"]);
        return this;
    }

    selectActive(): this {
        this.query.select(["active"]);
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


    selectPlatformWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["platform"]);
        this.query.relationQuery(
            "platform", request.toQuery(), "platform", "id", false);
        return this;
    }
    selectSchoolTypeWith(request: { toQuery(): SelectQuery }): this {
        this.query.select(["schoolType"]);
        this.query.relationQuery(
            "schoolType", request.toQuery(), "schoolType", "id", false);
        return this;
    }


        withIdIs(val: any): this {
            this.filters.push({ "id": { "$eq": val } });
            return this;
        }

        withIdIn(...vals: any[]): this {
            this.filters.push({ "id": { "$in": vals } });
            return this;
        }

        withIdGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$gte": val } });
            return this;
        }

        withIdLessThanOrEqualTo(val: any): this {
            this.filters.push({ "id": { "$lte": val } });
            return this;
        }

        filterByPlatform(val: any): this {
            this.filters.push({ "platform": { "$eq": val } });
            return this;
        }

        filterByPlatformIn(...vals: any[]): this {
            this.filters.push({ "platform": { "$in": vals } });
            return this;
        }

        filterBySchoolType(val: any): this {
            this.filters.push({ "schoolType": { "$eq": val } });
            return this;
        }

        filterBySchoolTypeIn(...vals: any[]): this {
            this.filters.push({ "schoolType": { "$in": vals } });
            return this;
        }
        withSchoolTypeIsPrimary(): this {
            this.filters.push({ "schoolType": { "$eq": "1001" } });
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

        withNameIn(...vals: string[]): this {
            this.filters.push({ "name": { "$in": vals } });
            return this;
        }

        withAddressContaining(val: string): this {
            this.filters.push({ "address": { "$contains": val } });
            return this;
        }

        withAddressIs(val: string): this {
            this.filters.push({ "address": { "$eq": val } });
            return this;
        }

        withAddressIn(...vals: string[]): this {
            this.filters.push({ "address": { "$in": vals } });
            return this;
        }

        withEstablishedDateIs(val: any): this {
            this.filters.push({ "establishedDate": { "$eq": val } });
            return this;
        }

        withEstablishedDateIn(...vals: any[]): this {
            this.filters.push({ "establishedDate": { "$in": vals } });
            return this;
        }

        withEstablishedDateGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "establishedDate": { "$gte": val } });
            return this;
        }

        withEstablishedDateLessThanOrEqualTo(val: any): this {
            this.filters.push({ "establishedDate": { "$lte": val } });
            return this;
        }

        withStudentCapacityIs(val: any): this {
            this.filters.push({ "studentCapacity": { "$eq": val } });
            return this;
        }

        withStudentCapacityIn(...vals: any[]): this {
            this.filters.push({ "studentCapacity": { "$in": vals } });
            return this;
        }

        withStudentCapacityGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "studentCapacity": { "$gte": val } });
            return this;
        }

        withStudentCapacityLessThanOrEqualTo(val: any): this {
            this.filters.push({ "studentCapacity": { "$lte": val } });
            return this;
        }

        whichAreActive(): this {
            this.filters.push({ "active": { "$eq": true } });
            return this;
        }

        whichAreNotActive(): this {
            this.filters.push({ "active": { "$eq": false } });
            return this;
        }

        withCreateTimeIs(val: any): this {
            this.filters.push({ "createTime": { "$eq": val } });
            return this;
        }

        withCreateTimeIn(...vals: any[]): this {
            this.filters.push({ "createTime": { "$in": vals } });
            return this;
        }

        withCreateTimeGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "createTime": { "$gte": val } });
            return this;
        }

        withCreateTimeLessThanOrEqualTo(val: any): this {
            this.filters.push({ "createTime": { "$lte": val } });
            return this;
        }

        withUpdateTimeIs(val: any): this {
            this.filters.push({ "updateTime": { "$eq": val } });
            return this;
        }

        withUpdateTimeIn(...vals: any[]): this {
            this.filters.push({ "updateTime": { "$in": vals } });
            return this;
        }

        withUpdateTimeGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "updateTime": { "$gte": val } });
            return this;
        }

        withUpdateTimeLessThanOrEqualTo(val: any): this {
            this.filters.push({ "updateTime": { "$lte": val } });
            return this;
        }

        withVersionIs(val: any): this {
            this.filters.push({ "version": { "$eq": val } });
            return this;
        }

        withVersionIn(...vals: any[]): this {
            this.filters.push({ "version": { "$in": vals } });
            return this;
        }

        withVersionGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$gte": val } });
            return this;
        }

        withVersionLessThanOrEqualTo(val: any): this {
            this.filters.push({ "version": { "$lte": val } });
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

    orderByAddressAscending(): this {
        this.query.orderBy("address", "asc");
        return this;
    }

    orderByAddressDescending(): this {
        this.query.orderBy("address", "desc");
        return this;
    }

    orderByEstablishedDateAscending(): this {
        this.query.orderBy("establishedDate", "asc");
        return this;
    }

    orderByEstablishedDateDescending(): this {
        this.query.orderBy("establishedDate", "desc");
        return this;
    }

    orderByStudentCapacityAscending(): this {
        this.query.orderBy("studentCapacity", "asc");
        return this;
    }

    orderByStudentCapacityDescending(): this {
        this.query.orderBy("studentCapacity", "desc");
        return this;
    }

    orderByActiveAscending(): this {
        this.query.orderBy("active", "asc");
        return this;
    }

    orderByActiveDescending(): this {
        this.query.orderBy("active", "desc");
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
        return this;
    }

    countAs(retName: string): this {
        this.query.aggregate("Count", "id", retName);
        return this;
    }

    minStudentCapacity(): this {
        return this.minStudentCapacityAs("minOfStudentCapacity");
    }

    minStudentCapacityAs(retName: string): this {
        this.query.aggregate("min", "studentCapacity", retName);
        return this;
    }
    maxStudentCapacity(): this {
        return this.maxStudentCapacityAs("maxOfStudentCapacity");
    }

    maxStudentCapacityAs(retName: string): this {
        this.query.aggregate("max", "studentCapacity", retName);
        return this;
    }
    sumStudentCapacity(): this {
        return this.sumStudentCapacityAs("sumOfStudentCapacity");
    }

    sumStudentCapacityAs(retName: string): this {
        this.query.aggregate("sum", "studentCapacity", retName);
        return this;
    }
    avgStudentCapacity(): this {
        return this.avgStudentCapacityAs("avgOfStudentCapacity");
    }

    avgStudentCapacityAs(retName: string): this {
        this.query.aggregate("avg", "studentCapacity", retName);
        return this;
    }
    standardDeviationStudentCapacity(): this {
        return this.standardDeviationStudentCapacityAs("standardDeviationOfStudentCapacity");
    }

    standardDeviationStudentCapacityAs(retName: string): this {
        this.query.aggregate("stddev", "studentCapacity", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationStudentCapacity(): this {
        return this.squareRootOfPopulationStandardDeviationStudentCapacityAs("squareRootOfPopulationStandardDeviationOfStudentCapacity");
    }

    squareRootOfPopulationStandardDeviationStudentCapacityAs(retName: string): this {
        this.query.aggregate("stddev_pop", "studentCapacity", retName);
        return this;
    }
    sampleVarianceStudentCapacity(): this {
        return this.sampleVarianceStudentCapacityAs("sampleVarianceOfStudentCapacity");
    }

    sampleVarianceStudentCapacityAs(retName: string): this {
        this.query.aggregate("var_samp", "studentCapacity", retName);
        return this;
    }
    samplePopulationVarianceStudentCapacity(): this {
        return this.samplePopulationVarianceStudentCapacityAs("samplePopulationVarianceOfStudentCapacity");
    }

    samplePopulationVarianceStudentCapacityAs(retName: string): this {
        this.query.aggregate("var_pop", "studentCapacity", retName);
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
    groupByPlatform(): this {
        this.query.groupBy("platform");
        return this;
    }

    groupByPlatformAs(retName: string): this {
        this.query.groupBy("platform"); // In TS we don't alias group by yet natively
        return this;
    }
    groupBySchoolType(): this {
        this.query.groupBy("schoolType");
        return this;
    }

    groupBySchoolTypeAs(retName: string): this {
        this.query.groupBy("schoolType"); // In TS we don't alias group by yet natively
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
    groupByAddress(): this {
        this.query.groupBy("address");
        return this;
    }

    groupByAddressAs(retName: string): this {
        this.query.groupBy("address"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByEstablishedDate(): this {
        this.query.groupBy("establishedDate");
        return this;
    }

    groupByEstablishedDateAs(retName: string): this {
        this.query.groupBy("establishedDate"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByStudentCapacity(): this {
        this.query.groupBy("studentCapacity");
        return this;
    }

    groupByStudentCapacityAs(retName: string): this {
        this.query.groupBy("studentCapacity"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByActive(): this {
        this.query.groupBy("active");
        return this;
    }

    groupByActiveAs(retName: string): this {
        this.query.groupBy("active"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCreateTime(): this {
        this.query.groupBy("createTime");
        return this;
    }

    groupByCreateTimeAs(retName: string): this {
        this.query.groupBy("createTime"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByUpdateTime(): this {
        this.query.groupBy("updateTime");
        return this;
    }

    groupByUpdateTimeAs(retName: string): this {
        this.query.groupBy("updateTime"); // In TS we don't alias group by yet natively
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
    facetByPlatformAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "PLATFORM_PROPERTY", request);
        return this;
    }

    facetBySchoolTypeAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "SCHOOL_TYPE_PROPERTY", request);
        return this;
    }


    private async executeForListInternal(context: UserContext): Promise<SmartList<School>> {
        this.ensureIntent();
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = context.requireResource<TeaQLDataService>("dataService");
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const aggregateOnly = this.query.aggregateItems.length > 0 && this.query.groupByItems.length === 0;
        const data = aggregateOnly ? [] : rows.map((row: unknown) =>
            row instanceof School
                ? row
                : School.fromRecord(row as Record<string, unknown>, context.entityRoot));
        const result = new SmartList<School>(data);
        if (aggregateOnly && rows[0]) Object.assign(result.aggregations, rows[0]);

        if (this.query.facets && this.query.facets.length > 0) {
            for (const f of this.query.facets) {
                if (this.filters.length > 0) {
                    f.query.filter({ "$and": this.filters });
                }
                result.facets[f.facetName] = new SmartList(
                    await service.executeQuery(context.prepareQuery(f.query)));
            }
        }

        return result;
    }

    private async executeForPageInternal(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<School>> {
        this.ensureIntent();
        this.query.offset(offset).limit(limit);
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        const totalCount = await service.executeCount(this.query);
        const rows = await service.executeQuery(context.prepareQuery(this.query));
        const data = new SmartList(rows.map((row: unknown) =>
            row instanceof School
                ? row
                : School.fromRecord(row as Record<string, unknown>, context.entityRoot)));
        data.totalCount = totalCount;
        return { data, totalCount, offset, limit };
    }

    private async *executeForStreamInternal(context: UserContext, chunkSize: number): AsyncIterable<School> {
        this.ensureIntent();
        if (this.filters.length > 0) this.query.filter({ "$and": this.filters });
        const service = context.requireResource<TeaQLDataService>("dataService");
        for await (const chunk of service.executeForStream(this.query, chunkSize)) {
            for (const entity of chunk) {
                yield entity instanceof School
                    ? entity
                    : School.fromRecord(entity as Record<string, unknown>, context.entityRoot);
            }
        }
    }

    private ensureIntent(): void {
        if (!this._comment?.trim()) {
            throw new Error("Security audit failure: non-empty comment() is required before execution");
        }
        if (!this._purpose?.trim()) {
            throw new Error("Security audit failure: non-empty purpose() is required before execution");
        }
    }

}

export class ExecutableSchoolRequest {
    constructor(
        private readonly execute: (context: UserContext) => Promise<SmartList<School>>,
        private readonly page: (
            context: UserContext, offset: number, limit: number,
        ) => Promise<TeaQLPage<School>>,
        private readonly stream: (context: UserContext, chunkSize: number) => AsyncIterable<School>,
        private readonly limitOne: () => void,
        private readonly addComment: (comment: string) => void,
        private readonly ensureIntent: () => void,
    ) {}

    comment(c: string): this {
        this.addComment(c);
        return this;
    }

    newEntity(context: UserContext): School {
        this.ensureIntent();
        return new School();
    }

    executeForList(context: UserContext): Promise<SmartList<School>> {
        this.ensureIntent();
        return this.execute(context);
    }

    executeForPage(
        context: UserContext, offset: number, limit: number,
    ): Promise<TeaQLPage<School>> {
        this.ensureIntent();
        return this.page(context, offset, limit);
    }

    executeForStream(context: UserContext, chunkSize = 1000): AsyncIterable<School> {
        this.ensureIntent();
        return this.stream(context, chunkSize);
    }

    async executeForOne(context: UserContext): Promise<School | undefined> {
        this.limitOne();
        return (await this.executeForList(context))[0];
    }
}