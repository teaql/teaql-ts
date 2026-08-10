import { SelectQuery, MutationBuilder, TeaQLClient } from '../../../../../../src';
import { TaskStatus } from '../models/TaskStatus';

export class TaskStatusRequest {
    private query: SelectQuery;
    private filters: any = {};

    constructor() {
        this.query = new SelectQuery("TaskStatus");
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

        withCodeContaining(val: string): this {
            this.filters["code"] = { "$contains": val };
            return this;
        }

        withCodeIs(val: string): this {
            this.filters["code"] = { "$eq": val };
            return this;
        }

        withColorContaining(val: string): this {
            this.filters["color"] = { "$contains": val };
            return this;
        }

        withColorIs(val: string): this {
            this.filters["color"] = { "$eq": val };
            return this;
        }

        withDisplayOrderIs(val: any): this {
            this.filters["displayOrder"] = { "$eq": val };
            return this;
        }

        withProgressIs(val: any): this {
            this.filters["progress"] = { "$eq": val };
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

    minDisplayOrder(): this {
        return this.minDisplayOrderAs("minOfDisplayOrder");
    }

    minDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    maxDisplayOrder(): this {
        return this.maxDisplayOrderAs("maxOfDisplayOrder");
    }

    maxDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    sumDisplayOrder(): this {
        return this.sumDisplayOrderAs("sumOfDisplayOrder");
    }

    sumDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    avgDisplayOrder(): this {
        return this.avgDisplayOrderAs("avgOfDisplayOrder");
    }

    avgDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    standardDeviationDisplayOrder(): this {
        return this.standardDeviationDisplayOrderAs("standardDeviationOfDisplayOrder");
    }

    standardDeviationDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationDisplayOrder(): this {
        return this.squareRootOfPopulationStandardDeviationDisplayOrderAs("squareRootOfPopulationStandardDeviationOfDisplayOrder");
    }

    squareRootOfPopulationStandardDeviationDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    sampleVarianceDisplayOrder(): this {
        return this.sampleVarianceDisplayOrderAs("sampleVarianceOfDisplayOrder");
    }

    sampleVarianceDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    samplePopulationVarianceDisplayOrder(): this {
        return this.samplePopulationVarianceDisplayOrderAs("samplePopulationVarianceOfDisplayOrder");
    }

    samplePopulationVarianceDisplayOrderAs(retName: string): this {
        this.query.aggregate("", "display_order", retName);
        return this;
    }
    minProgress(): this {
        return this.minProgressAs("minOfProgress");
    }

    minProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    maxProgress(): this {
        return this.maxProgressAs("maxOfProgress");
    }

    maxProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    sumProgress(): this {
        return this.sumProgressAs("sumOfProgress");
    }

    sumProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    avgProgress(): this {
        return this.avgProgressAs("avgOfProgress");
    }

    avgProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    standardDeviationProgress(): this {
        return this.standardDeviationProgressAs("standardDeviationOfProgress");
    }

    standardDeviationProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    squareRootOfPopulationStandardDeviationProgress(): this {
        return this.squareRootOfPopulationStandardDeviationProgressAs("squareRootOfPopulationStandardDeviationOfProgress");
    }

    squareRootOfPopulationStandardDeviationProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    sampleVarianceProgress(): this {
        return this.sampleVarianceProgressAs("sampleVarianceOfProgress");
    }

    sampleVarianceProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
        return this;
    }
    samplePopulationVarianceProgress(): this {
        return this.samplePopulationVarianceProgressAs("samplePopulationVarianceOfProgress");
    }

    samplePopulationVarianceProgressAs(retName: string): this {
        this.query.aggregate("", "progress", retName);
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

    groupByCode(): this {
        this.query.groupBy("code");
        return this;
    }

    groupByCodeAs(retName: string): this {
        this.query.groupBy("code"); // In TS we don't alias group by yet natively
        return this;
    }

    groupByColor(): this {
        this.query.groupBy("color");
        return this;
    }

    groupByColorAs(retName: string): this {
        this.query.groupBy("color"); // In TS we don't alias group by yet natively
        return this;
    }

    groupByDisplayOrder(): this {
        this.query.groupBy("display_order");
        return this;
    }

    groupByDisplayOrderAs(retName: string): this {
        this.query.groupBy("display_order"); // In TS we don't alias group by yet natively
        return this;
    }

    groupByProgress(): this {
        this.query.groupBy("progress");
        return this;
    }

    groupByProgressAs(retName: string): this {
        this.query.groupBy("progress"); // In TS we don't alias group by yet natively
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

    create(payload: TaskStatus): MutationBuilder {
        return new MutationBuilder("TaskStatus", "Create", payload);
    }

    update(payload: TaskStatus): MutationBuilder {
        return new MutationBuilder("TaskStatus", "Update", payload, payload.id);
    }

    delete(id: any): MutationBuilder {
        return new MutationBuilder("TaskStatus", "Delete", {}, id);
    }
}