import { SelectQuery, TeaQLDataService, UserContext } from '../../teaql-ts';
import { CustomerOrder } from '../models/CustomerOrder';



export class CustomerOrderRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor() {
        this.query = new SelectQuery("CustomerOrder");
    }

    comment(c: string): this {
        this.query.comment(c);
        this._comment = c;
        return this;
    }

    purpose(p: string): ExecutableCustomerOrderRequest {
        if (!this._comment || !this._comment.trim()) {
            throw new Error("purpose() requires a non-empty comment() set earlier on the request");
        }
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableCustomerOrderRequest(
            (ctx) => this.executeForListInternal(ctx),
            () => this.limit(1));
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

    selectOrderLineListWith(request: { toQuery(): SelectQuery }): this {
        this.query.relationQuery("orderLineList", request.toQuery());
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

        withOrderNumberContaining(val: string): this {
            this.filters.push({ "orderNumber": { "$contains": val } });
            return this;
        }

        withOrderNumberIs(val: string): this {
            this.filters.push({ "orderNumber": { "$eq": val } });
            return this;
        }

        withOrderNumberIn(...vals: string[]): this {
            this.filters.push({ "orderNumber": { "$in": vals } });
            return this;
        }

        withOrderDateIs(val: any): this {
            this.filters.push({ "orderDate": { "$eq": val } });
            return this;
        }

        withOrderDateIn(...vals: any[]): this {
            this.filters.push({ "orderDate": { "$in": vals } });
            return this;
        }

        withOrderDateGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "orderDate": { "$gte": val } });
            return this;
        }

        withOrderDateLessThanOrEqualTo(val: any): this {
            this.filters.push({ "orderDate": { "$lte": val } });
            return this;
        }

        withTotalAmountIs(val: any): this {
            this.filters.push({ "totalAmount": { "$eq": val } });
            return this;
        }

        withTotalAmountIn(...vals: any[]): this {
            this.filters.push({ "totalAmount": { "$in": vals } });
            return this;
        }

        withTotalAmountGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "totalAmount": { "$gte": val } });
            return this;
        }

        withTotalAmountLessThanOrEqualTo(val: any): this {
            this.filters.push({ "totalAmount": { "$lte": val } });
            return this;
        }

        filterByStatus(val: any): this {
            this.filters.push({ "status": { "$eq": val } });
            return this;
        }

        filterByStatusIn(...vals: any[]): this {
            this.filters.push({ "status": { "$in": vals } });
            return this;
        }

        filterByCustomer(val: any): this {
            this.filters.push({ "customer": { "$eq": val } });
            return this;
        }

        filterByCustomerIn(...vals: any[]): this {
            this.filters.push({ "customer": { "$in": vals } });
            return this;
        }

        filterByCommercePlatform(val: any): this {
            this.filters.push({ "commercePlatform": { "$eq": val } });
            return this;
        }

        filterByCommercePlatformIn(...vals: any[]): this {
            this.filters.push({ "commercePlatform": { "$in": vals } });
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

    orderByOrderNumberAscending(): this {
        this.query.orderBy("orderNumber", "asc");
        return this;
    }

    orderByOrderNumberDescending(): this {
        this.query.orderBy("orderNumber", "desc");
        return this;
    }

    orderByOrderDateAscending(): this {
        this.query.orderBy("orderDate", "asc");
        return this;
    }

    orderByOrderDateDescending(): this {
        this.query.orderBy("orderDate", "desc");
        return this;
    }

    orderByTotalAmountAscending(): this {
        this.query.orderBy("totalAmount", "asc");
        return this;
    }

    orderByTotalAmountDescending(): this {
        this.query.orderBy("totalAmount", "desc");
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

    minTotalAmount(): this {
        return this.minTotalAmountAs("minOfTotalAmount");
    }

    minTotalAmountAs(retName: string): this {
        this.query.aggregate("min", "totalAmount", retName);
        return this;
    }
    maxTotalAmount(): this {
        return this.maxTotalAmountAs("maxOfTotalAmount");
    }

    maxTotalAmountAs(retName: string): this {
        this.query.aggregate("max", "totalAmount", retName);
        return this;
    }
    sumTotalAmount(): this {
        return this.sumTotalAmountAs("sumOfTotalAmount");
    }

    sumTotalAmountAs(retName: string): this {
        this.query.aggregate("sum", "totalAmount", retName);
        return this;
    }
    avgTotalAmount(): this {
        return this.avgTotalAmountAs("avgOfTotalAmount");
    }

    avgTotalAmountAs(retName: string): this {
        this.query.aggregate("avg", "totalAmount", retName);
        return this;
    }
    standardDeviationTotalAmount(): this {
        return this.standardDeviationTotalAmountAs("standardDeviationOfTotalAmount");
    }

    standardDeviationTotalAmountAs(retName: string): this {
        this.query.aggregate("stddev", "totalAmount", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationTotalAmount(): this {
        return this.squareRootOfPopulationStandardDeviationTotalAmountAs("squareRootOfPopulationStandardDeviationOfTotalAmount");
    }

    squareRootOfPopulationStandardDeviationTotalAmountAs(retName: string): this {
        this.query.aggregate("stddev_pop", "totalAmount", retName);
        return this;
    }
    sampleVarianceTotalAmount(): this {
        return this.sampleVarianceTotalAmountAs("sampleVarianceOfTotalAmount");
    }

    sampleVarianceTotalAmountAs(retName: string): this {
        this.query.aggregate("var_samp", "totalAmount", retName);
        return this;
    }
    samplePopulationVarianceTotalAmount(): this {
        return this.samplePopulationVarianceTotalAmountAs("samplePopulationVarianceOfTotalAmount");
    }

    samplePopulationVarianceTotalAmountAs(retName: string): this {
        this.query.aggregate("var_pop", "totalAmount", retName);
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
    groupByOrderNumber(): this {
        this.query.groupBy("orderNumber");
        return this;
    }

    groupByOrderNumberAs(retName: string): this {
        this.query.groupBy("orderNumber"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByOrderDate(): this {
        this.query.groupBy("orderDate");
        return this;
    }

    groupByOrderDateAs(retName: string): this {
        this.query.groupBy("orderDate"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByTotalAmount(): this {
        this.query.groupBy("totalAmount");
        return this;
    }

    groupByTotalAmountAs(retName: string): this {
        this.query.groupBy("totalAmount"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByStatus(): this {
        this.query.groupBy("status");
        return this;
    }

    groupByStatusAs(retName: string): this {
        this.query.groupBy("status"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCustomer(): this {
        this.query.groupBy("customer");
        return this;
    }

    groupByCustomerAs(retName: string): this {
        this.query.groupBy("customer"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByCommercePlatform(): this {
        this.query.groupBy("commercePlatform");
        return this;
    }

    groupByCommercePlatformAs(retName: string): this {
        this.query.groupBy("commercePlatform"); // In TS we don't alias group by yet natively
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
    facetByStatusAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "STATUS_PROPERTY", request);
        return this;
    }

    facetByCustomerAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "CUSTOMER_PROPERTY", request);
        return this;
    }

    facetByCommercePlatformAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "COMMERCE_PLATFORM_PROPERTY", request);
        return this;
    }


    private async executeForListInternal(ctx: UserContext): Promise<any> {
        if (!this._purpose || !this._comment) {
            throw new Error("Security audit failure: comment() and purpose() must be called before executeForList()");
        }
        if (this.filters.length > 0) {
            this.query.filter({ "$and": this.filters });
        }

        const service = ctx.requireResource<TeaQLDataService>("dataService");
        const data = await service.executeQuery(this.query);
        const result: any = { data };

        if (this.query.facets && this.query.facets.length > 0) {
            result.facets = {};
            for (const f of this.query.facets) {
                if (this.filters.length > 0) {
                    f.query.filter({ "$and": this.filters });
                }
                result.facets[f.facetName] = await service.executeQuery(f.query);
            }
        }

        return result;
    }

}

export class ExecutableCustomerOrderRequest {
    constructor(
        private readonly execute: (ctx: UserContext) => Promise<any>,
        private readonly limitOne: () => void,
    ) {}

    newEntity(ctx: UserContext): CustomerOrder {
        return new CustomerOrder();
    }

    executeForList(ctx: UserContext): Promise<any> {
        return this.execute(ctx);
    }

    async executeForOne(ctx: UserContext): Promise<any> {
        this.limitOne();
        const res = await this.executeForList(ctx);
        if (res.data && res.data.length > 0) {
            return res.data[0];
        }
        return null;
    }
}