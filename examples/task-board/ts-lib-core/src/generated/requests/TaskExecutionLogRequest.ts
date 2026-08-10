import { SelectQuery, TeaQLClient } from '../../../../../../src';
import { TaskExecutionLog } from '../models/TaskExecutionLog';

export class TaskExecutionLogRequest {
    private query: SelectQuery;
    private filters: any = {};

    constructor() {
        this.query = new SelectQuery("TaskExecutionLog");
    }

    comment(c: string): this {
        // Just for logging/trace, currently ignored in SelectQuery
        return this;
    }

    purpose(p: string): this {
        return this;
    }

        withIdIs(val: any): this {
            this.filters["id"] = { "$eq": val };
            return this;
        }


        withActionContaining(val: string): this {
            this.filters["action"] = { "$contains": val };
            return this;
        }

        withActionIs(val: string): this {
            this.filters["action"] = { "$eq": val };
            return this;
        }

        withDetailContaining(val: string): this {
            this.filters["detail"] = { "$contains": val };
            return this;
        }

        withDetailIs(val: string): this {
            this.filters["detail"] = { "$eq": val };
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


    groupByAction(): this {
        this.query.groupBy("action");
        return this;
    }

    groupByActionAs(retName: string): this {
        this.query.groupBy("action"); // In TS we don't alias group by yet natively
        return this;
    }

    groupByDetail(): this {
        this.query.groupBy("detail");
        return this;
    }

    groupByDetailAs(retName: string): this {
        this.query.groupBy("detail"); // In TS we don't alias group by yet natively
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
    facetByTaskAs(facetName: string, request: any): this {
        this.query.facetBy(facetName, "TASK_PROPERTY", request);
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

    async save(ctx: any, payload: TaskExecutionLog, comment?: string): Promise<any> {
        const mutation = {
            entity: "TaskExecutionLog",
            action: payload.id ? "Update" : "Create",
            payload: payload,
            id: payload.id,
            comment: comment
        };
        return ctx.client.executeMutation(mutation);
    }

    async delete(ctx: any, id: any, comment?: string): Promise<any> {
        const mutation = {
            entity: "TaskExecutionLog",
            action: "Delete",
            payload: {},
            id: id,
            comment: comment
        };
        return ctx.client.executeMutation(mutation);
    }
}