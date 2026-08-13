import { SelectQuery, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Product } from '../models/Product';



export class ProductRequest {
    private query: SelectQuery;
    private filters: any[] = [];
    private _purpose: string | undefined;
    private _comment: string | undefined;

    constructor() {
        this.query = new SelectQuery("Product");
    }

    comment(c: string): this {
        this.query.comment(c);
        this._comment = c;
        return this;
    }

    purpose(p: string): ExecutableProductRequest {
        if (!this._comment || !this._comment.trim()) {
            throw new Error("purpose() requires a non-empty comment() set earlier on the request");
        }
        this.query.purpose(p);
        this._purpose = p;
        return new ExecutableProductRequest(
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

        withImageUrlContaining(val: string): this {
            this.filters.push({ "imageUrl": { "$contains": val } });
            return this;
        }

        withImageUrlIs(val: string): this {
            this.filters.push({ "imageUrl": { "$eq": val } });
            return this;
        }

        withImageUrlIn(...vals: string[]): this {
            this.filters.push({ "imageUrl": { "$in": vals } });
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

    orderByNameAscending(): this {
        this.query.orderBy("name", "asc");
        return this;
    }

    orderByNameDescending(): this {
        this.query.orderBy("name", "desc");
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

    orderByImageUrlAscending(): this {
        this.query.orderBy("imageUrl", "asc");
        return this;
    }

    orderByImageUrlDescending(): this {
        this.query.orderBy("imageUrl", "desc");
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
    groupBySku(): this {
        this.query.groupBy("sku");
        return this;
    }

    groupBySkuAs(retName: string): this {
        this.query.groupBy("sku"); // In TS we don't alias group by yet natively
        return this;
    }
    groupByImageUrl(): this {
        this.query.groupBy("imageUrl");
        return this;
    }

    groupByImageUrlAs(retName: string): this {
        this.query.groupBy("imageUrl"); // In TS we don't alias group by yet natively
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

export class ExecutableProductRequest {
    constructor(
        private readonly execute: (ctx: UserContext) => Promise<any>,
        private readonly limitOne: () => void,
    ) {}

    newEntity(ctx: UserContext): Product {
        return new Product();
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