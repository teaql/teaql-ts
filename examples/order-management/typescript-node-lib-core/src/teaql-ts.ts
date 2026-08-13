export class SelectQuery {
    entity: string;
    _comment?: string;
    _purpose?: string;
    _limit?: number;
    _offset?: number;
    _orderBy: any[] = [];
    _groupBy: string[] = [];
    _aggregates: any[] = [];
    _filters: any[] = [];
    facets: any[] = [];
    relations: Array<{ name: string; query?: SelectQuery }> = [];

    constructor(entity: string) {
        this.entity = entity;
    }
    comment(c: string) { this._comment = c; }
    purpose(p: string) { this._purpose = p; }
    limit(n: number) { this._limit = n; }
    offset(n: number) { this._offset = n; }
    orderBy(f: string, d: string) { this._orderBy.push({f, d}); }
    groupBy(f: string) { this._groupBy.push(f); }
    countField(f: string, n: string) { this._aggregates.push({func: "count", field: f, retName: n}); }
    aggregate(func: string, field: string, retName: string) { this._aggregates.push({func, field, retName}); }
    andFilter(expr: any) { this._filters.push(expr); }
    filter(expr: any) { this._filters.push(expr); }
    relationQuery(name: string, query: SelectQuery) { this.relations.push({ name, query }); }
    facetBy(facetName: string, field: string, req: any) {
        this.facets.push({ facetName, query: req.query });
    }
}

export interface TeaQLDataService {
    executeMutation(mutation: any): Promise<any>;
    executeQuery(query: any): Promise<any[]>;
    close?(): Promise<void>;
}

export class TeaQLClient implements TeaQLDataService {
    private data: Record<string, Record<string, any>> = {};
    private nextIds: Record<string, number> = {};

    constructor(private storagePath?: string) {
        if (storagePath) {
            const fs = require("fs");
            if (fs.existsSync(storagePath)) {
                const state = JSON.parse(fs.readFileSync(storagePath, "utf8"));
                this.data = state.data || {};
                this.nextIds = state.nextIds || {};
            }
        }
    }

    private persist() {
        if (!this.storagePath) return;
        const fs = require("fs");
        const path = require("path");
        fs.mkdirSync(path.dirname(path.resolve(this.storagePath)), { recursive: true });
        const temporaryPath = `${this.storagePath}.tmp`;
        fs.writeFileSync(temporaryPath, JSON.stringify({ data: this.data, nextIds: this.nextIds }));
        fs.renameSync(temporaryPath, this.storagePath);
    }

    async executeMutation(mutation: any): Promise<any> {
        const table = this.data[mutation.entity] ||= {};
        if (mutation.action === "Create") {
            const id = mutation.id ?? String(this.nextIds[mutation.entity] || 1);
            this.nextIds[mutation.entity] = Number(id) + 1;
            const record = { ...mutation.payload, id: String(id), version: Number(mutation.version || 0) + 1 };
            table[String(id)] = record;
            this.persist();
            return { success: true, id: String(id), version: record.version };
        }
        if (mutation.action === "Update") {
            const id = String(mutation.id);
            if (!table[id]) throw new Error(`${mutation.entity}(${id}) does not exist`);
            table[id] = { ...table[id], ...mutation.payload, id, version: Number(table[id].version || 0) + 1 };
            this.persist();
            return { success: true, id, version: table[id].version };
        }
        if (mutation.action === "Delete") {
            const id = String(mutation.id);
            if (!table[id]) throw new Error(`${mutation.entity}(${id}) does not exist`);
            delete table[id];
            this.persist();
            return { success: true, id, deleted: true };
        }
        throw new Error(`Unsupported mutation action: ${mutation.action}`);
    }
    async query(ctx: any, req: any): Promise<any> {
        return { rows: [] };
    }
    async executeQuery(query: any): Promise<any> {
        let rows = Object.values(this.data[query.entity] || {}).map((row: any) => ({ ...row }));
        const matches = (row: any, expression: any): boolean => {
            if (expression?.$and) return expression.$and.every((item: any) => matches(row, item));
            return Object.entries(expression || {}).every(([field, predicate]: [string, any]) => {
                if (predicate?.$eq !== undefined) return row[field] === (predicate.$eq?.id ?? predicate.$eq);
                if (predicate?.$contains !== undefined) return String(row[field] ?? "").includes(String(predicate.$contains));
                return true;
            });
        };
        for (const expression of query._filters || []) rows = rows.filter(row => matches(row, expression));
        for (const order of [...(query._orderBy || [])].reverse()) {
            rows.sort((a, b) => (a[order.f] === b[order.f] ? 0 : a[order.f] > b[order.f] ? 1 : -1) * (order.d === "desc" ? -1 : 1));
        }
        const start = query._offset || 0;
        return rows.slice(start, query._limit === undefined ? undefined : start + query._limit);
    }
}

declare const require: any;

export class UserContext {
    private readonly resources = new Map<string, unknown>();

    insertResource<T>(name: string, resource: T): this {
        this.resources.set(name, resource);
        return this;
    }

    getResource<T>(name: string): T | undefined {
        return this.resources.get(name) as T | undefined;
    }

    requireResource<T>(name: string): T {
        const resource = this.getResource<T>(name);
        if (resource === undefined) {
            throw new Error(`Required UserContext resource is missing: ${name}`);
        }
        return resource;
    }
}

export function eq(a: any, b: any) { return {type: 'eq', field: a, value: b}; }
export function contain(a: any, b: any) { return {type: 'contain', field: a, value: b}; }