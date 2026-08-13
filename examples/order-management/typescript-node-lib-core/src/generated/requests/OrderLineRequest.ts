import { SelectQuery, TeaQLDataService, UserContext } from '../../teaql-ts';
import { OrderLine } from '../models/OrderLine';



export class OrderLineRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor() {
        this.query = new SelectQuery("OrderLine");
    }

    comment(c: string): this {
        this.query.comment(c);
        this._comment = c;
        return this;
    }

    purpose(p: string): ExecutableOrderLineRequest {
        if (!this._comment || !this._comment.trim()) {
            throw new Error("purpose() requires a non-empty comment() set earlier on the request");
        }
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableOrderLineRequest(
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

        filterByCustomerOrder(val: any): this {
            this.filters.push({ "customerOrder": { "$eq": val } });
            return this;
        }

        filterByCustomerOrderIn(...vals: any[]): this {
            this.filters.push({ "customerOrder": { "$in": vals } });
            return this;
        }

        filterByProduct(val: any): this {
            this.filters.push({ "product": { "$eq": val } });
            return this;
        }

        filterByProductIn(...vals: any[]): this {
            this.filters.push({ "product": { "$in": vals } });
            return this;
        }

        withProductNameContaining(val: string): this {
            this.filters.push({ "productName": { "$contains": val } });
            return this;
        }

        withProductNameIs(val: string): this {
            this.filters.push({ "productName": { "$eq": val } });
            return this;
        }

        withProductNameIn(...vals: string[]): this {
            this.filters.push({ "productName": { "$in": vals } });
            return this;
        }

        withSkuContaining(val: string): this {
            this.filters.push({ "sku": { "$contains": val } });
            return this;
        }

        withSkuIs(val: string): this {
            this.filters.push({ "sku": { "$eq": val } });
            return this;
        }

        withSkuIn(...vals: string[]): this {
            this.filters.push({ "sku": { "$in": vals } });
            return this;
        }

        withQuantityIs(val: any): this {
            this.filters.push({ "quantity": { "$eq": val } });
            return this;
        }

        withQuantityIn(...vals: any[]): this {
            this.filters.push({ "quantity": { "$in": vals } });
            return this;
        }

        withQuantityGreaterThanOrEqualTo(val: any): this {
            this.filters.push({ "quantity": { "$gte": val } });
            return this;
        }

        withQuantityLessThanOrEqualTo(val: any): this {
            this.filters.push({ "quantity": { "$lte": val } });
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



    orderByProductNameAscending(): this {
        this.query.orderBy("productName", "asc");
        return this;
    }

    orderByProductNameDescending(): this {
        this.query.orderBy("productName", "desc");
        return this;
    }

    orderBySkuAscending(): this {
        this.query.orderBy("sku", "asc");
        return this;
    }

    orderBySkuDescending(): this {
        this.query.orderBy("sku", "desc");
        return this;
    }

    orderByQuantityAscending(): this {
        this.query.orderBy("quantity", "asc");
        return this;
    }

    orderByQuantityDescending(): this {
        this.query.orderBy("quantity", "desc");
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

    minQuantity(): this {
        return this.minQuantityAs("minOfQuantity");
    }

    minQuantityAs(retName: string): this {
        this.query.aggregate("min", "quantity", retName);
        return this;
    }
    maxQuantity(): this {
        return this.maxQuantityAs("maxOfQuantity");
    }

    maxQuantityAs(retName: string): this {
        this.query.aggregate("max", "quantity", retName);
        return this;
    }
    sumQuantity(): this {
        return this.sumQuantityAs("sumOfQuantity");
    }

    sumQuantityAs(retName: string): this {
        this.query.aggregate("sum", "quantity", retName);
        return this;
    }
    avgQuantity(): this {
        return this.avgQuantityAs("avgOfQuantity");
    }

    avgQuantityAs(retName: string): this {
        this.query.aggregate("avg", "quantity", retName);
        return this;
    }
    standardDeviationQuantity(): this {
        return this.standardDeviationQuantityAs("standardDeviationOfQuantity");
    }

    standardDeviationQuantityAs(retName: string): this {
        this.query.aggregate("stddev", "quantity", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationQuantity(): this {
        return this.squareRootOfPopulationStandardDeviationQuantityAs("squareRootOfPopulationStandardDeviationOfQuantity");
    }

    squareRootOfPopulationStandardDeviationQuantityAs(retName: string): this {
        this.query.aggregate("stddev_pop", "quantity", retName);
        return this;
    }
    sampleVarianceQuantity(): this {
        return this.sampleVarianceQuantityAs("sampleVarianceOfQuantity");
    }

    sampleVarianceQuantityAs(retName: string): this {
        this.query.aggregate("var_samp", "quantity", retName);
        return this;
    }
    samplePopulationVarianceQuantity(): this {
        return this.samplePopulationVarianceQuantityAs("samplePopulationVarianceOfQuantity");
    }

    samplePopulationVarianceQuantityAs(retName: string): this {
        this.query.aggregate("var_pop", "quantity", retName);
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
    groupByCustomerOrder(): this {
        this.query.groupBy("customerOrder");
        return this;
    }

    groupByCustomerOrderAs(retName: string): this {
        this.query.groupBy("customerOrder"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByProduct(): this {
        this.query.groupBy("product");
        return this;
    }

    groupByProductAs(retName: string): this {
        this.query.groupBy("product"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByProductName(): this {
        this.query.groupBy("productName");
        return this;
    }

    groupByProductNameAs(retName: string): this {
        this.query.groupBy("productName"); // In TS we don't alias group by yet natively
        return this;
    }
    groupBySku(): this {
        this.query.groupBy("sku");
        return this;
    }

    groupBySkuAs(retName: string): this {
        this.query.groupBy("sku"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByQuantity(): this {
        this.query.groupBy("quantity");
        return this;
    }

    groupByQuantityAs(retName: string): this {
        this.query.groupBy("quantity"); // In TS we don't alias group by yet natively
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
    groupByVersion(): this {
        this.query.groupBy("version");
        return this;
    }

    groupByVersionAs(retName: string): this {
        this.query.groupBy("version"); // In TS we don't alias group by yet natively
        return this;
    }

    // --- Facets ---
    facetByCustomerOrderAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "CUSTOMER_ORDER_PROPERTY", request);
        return this;
    }

    facetByProductAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "PRODUCT_PROPERTY", request);
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

export class ExecutableOrderLineRequest {
    constructor(
        private readonly execute: (ctx: UserContext) => Promise<any>,
        private readonly limitOne: () => void,
    ) {}

    newEntity(ctx: UserContext): OrderLine {
        return new OrderLine();
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