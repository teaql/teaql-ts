import { SelectQuery, MutationBuilder, TeaQLClient } from '../../../../../../src';
import { Platform } from '../models/Platform';

export class PlatformRequest {
    private query: SelectQuery;
    private filters: any = {};

    constructor() {
        this.query = new SelectQuery("Platform");
    }

    comment(c: string): this {
        this.query.comment(c);
        return this;
    }

    purpose(p: string): this {
        this.query.purpose(p);
        return this;
    }

        withIdIs(val: any): this {
            this.filters["id"] = { "$eq": val };
            return this;
        }

        withNameContaining(val: string): this {
            this.filters["name"] = { "$contains": val };
            return this;
        }

        withNameIs(val: string): this {
            this.filters["name"] = { "$eq": val };
            return this;
        }

        withFoundedIs(val: any): this {
            this.filters["founded"] = { "$eq": val };
            return this;
        }

        withUserEmailContaining(val: string): this {
            this.filters["userEmail"] = { "$contains": val };
            return this;
        }

        withUserEmailIs(val: string): this {
            this.filters["userEmail"] = { "$eq": val };
            return this;
        }

        withVersionIs(val: any): this {
            this.filters["version"] = { "$eq": val };
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

    groupByFounded(): this {
        this.query.groupBy("founded");
        return this;
    }

    groupByFoundedAs(retName: string): this {
        this.query.groupBy("founded"); // In TS we don't alias group by yet natively
        return this;
    }

    groupByUserEmail(): this {
        this.query.groupBy("user_email");
        return this;
    }

    groupByUserEmailAs(retName: string): this {
        this.query.groupBy("user_email"); // In TS we don't alias group by yet natively
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

    async executeForList(ctx: any): Promise<any> {
        if (Object.keys(this.filters).length > 0) {
            this.query.filter(this.filters);
        }

        const data = await ctx.client.executeQuery(this.query);
        const result: any = { data };

        if (this.query.facets && this.query.facets.length > 0) {
            result.facets = {};
            for (const f of this.query.facets) {
                if (Object.keys(this.filters).length > 0) {
                    f.query.filter(this.filters); // Inherit outer filters
                }
                result.facets[f.facetName] = await ctx.client.executeQuery(f.query);
            }
        }

        return result;
    }

    create(payload: Platform): MutationBuilder {
        return new MutationBuilder("Platform", "Create", payload);
    }

    update(payload: Platform): MutationBuilder {
        return new MutationBuilder("Platform", "Update", payload, payload.id);
    }

    delete(id: any): MutationBuilder {
        return new MutationBuilder("Platform", "Delete", {}, id);
    }
}