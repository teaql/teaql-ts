import { SelectQuery as RuntimeSelectQuery, UserContext } from "teaql-ts";

export { CheckException, EntityRoot, SmartList, UserContext } from "teaql-ts";
export type { EntityKey } from "teaql-ts";
export type { TeaQLPage } from "teaql-ts";

/** Generated naming adapter; query policy and execution remain in the formal runtime. */
export class SelectQuery extends RuntimeSelectQuery {
    orderBy(field: string, direction: string): this {
        return this.order({ field, expr: null, direction: direction === "desc" ? "Desc" : "Asc" } as any);
    }

    relationQuery(
        name: string, query: RuntimeSelectQuery, localKey = "id", foreignKey = "id", many = true,
    ): this {
        (this.relations as any[]).push({ name, query, localKey, foreignKey, many });
        return this;
    }
}

export interface TeaQLDataService {
    executeMutation(mutation: any): Promise<any>;
    executeQuery(query: any): Promise<any[]>;
    executeCount(query: any): Promise<number>;
    executeForStream(query: any, chunkSize?: number): AsyncIterable<any[]>;
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
            return { success: true, id: String(id), version: record.version, persistedRecord: { ...record } };
        }
        if (mutation.action === "Update") {
            const id = String(mutation.id);
            if (!table[id]) throw new Error(`${mutation.entity}(${id}) does not exist`);
            const expectedVersion = Number(mutation.version);
            const currentVersion = Number(table[id].version || 0);
            if (!Number.isFinite(expectedVersion) || expectedVersion !== currentVersion) {
                throw new Error(
                    `Optimistic lock conflict for ${mutation.entity}(${id}): expected ${expectedVersion}, current ${currentVersion}`);
            }
            table[id] = { ...table[id], ...mutation.payload, id, version: Number(table[id].version || 0) + 1 };
            this.persist();
            return { success: true, id, version: table[id].version, persistedRecord: { ...table[id] } };
        }
        if (mutation.action === "Delete") {
            const id = String(mutation.id);
            if (!table[id]) throw new Error(`${mutation.entity}(${id}) does not exist`);
            const expectedVersion = Number(mutation.version);
            const currentVersion = Number(table[id].version || 0);
            if (!Number.isFinite(expectedVersion) || expectedVersion !== currentVersion) {
                throw new Error(
                    `Optimistic lock conflict for ${mutation.entity}(${id}): expected ${expectedVersion}, current ${currentVersion}`);
            }
            table[id] = { ...table[id], id, version: -(currentVersion + 1) };
            this.persist();
            return { success: true, id, version: table[id].version, deleted: true, persistedRecord: { ...table[id] } };
        }
        throw new Error(`Unsupported mutation action: ${mutation.action}`);
    }
    async query(context: any, req: any): Promise<any> {
        return { rows: [] };
    }
    async executeQuery(query: any): Promise<any> {
        if (!(query instanceof RuntimeSelectQuery)) {
            throw new Error("TeaQL list execution requires the formal runtime SelectQuery");
        }
        query.prepareForList();
        let rows = Object.values(this.data[query.entity] || {}).map((row: any) => ({ ...row }));
        const matches = (row: any, expression: any): boolean => {
            if (expression?.$and) return expression.$and.every((item: any) => matches(row, item));
            return Object.entries(expression || {}).every(([field, predicate]: [string, any]) => {
                if (predicate?.$eq !== undefined) return row[field] === (predicate.$eq?.id ?? predicate.$eq);
                if (predicate?.$contains !== undefined) return String(row[field] ?? "").includes(String(predicate.$contains));
                if (predicate?.$in !== undefined) return predicate.$in.some((value: any) => row[field] === (value?.id ?? value));
                if (predicate?.$gte !== undefined) return row[field] >= predicate.$gte;
                if (predicate?.$lte !== undefined) return row[field] <= predicate.$lte;
                return true;
            });
        };
        if (query.filterCondition) rows = rows.filter(row => matches(row, query.filterCondition));
        if (query.aggregateItems?.length) {
            return [Object.fromEntries(query.aggregateItems.map((aggregate: any) => {
                if (String(aggregate.function).toLowerCase() !== "count") {
                    throw new Error(`Unsupported local aggregate: ${aggregate.function}`);
                }
                return [aggregate.alias, rows.length];
            }))];
        }
        for (const order of [...query.orderItems].reverse()) {
            rows.sort((a, b) => (a[order.field] === b[order.field] ? 0 : a[order.field] > b[order.field] ? 1 : -1) * (String(order.direction).toLowerCase() === "desc" ? -1 : 1));
        }
        const start = query.offsetValue || 0;
        rows = rows.slice(start, start + query.limitValue);
        for (const relation of (query.relations || []) as any[]) {
            const localValues = new Set(rows.map((row: any) => row[relation.localKey || "id"]));
            const relatedRows = (await this.executeQuery(relation.query)).filter(
                (row: any) => localValues.has(row[relation.foreignKey || "id"]));
            for (const row of rows) {
                const matches = relatedRows.filter(
                    (related: any) => related[relation.foreignKey || "id"] === row[relation.localKey || "id"]);
                row[relation.name] = relation.many === false ? matches[0] : matches;
            }
        }
        if (query.selectItems.length > 0) {
            const selections = new Set(query.selectItems);
            for (const relation of (query.relations || []) as any[]) selections.add(relation.name);
            rows = rows.map((row: any) => Object.fromEntries(
                Object.entries(row).filter(([field]) => selections.has(field))));
        }
        return rows;
    }
    async executeCount(query: any): Promise<number> {
        if (typeof query?.forExactCount !== "function") {
            throw new Error("TeaQL exact count requires the formal runtime SelectQuery");
        }
        const alias = "__teaql_total";
        const rows = await this.executeQuery(query.forExactCount(alias));
        const value = rows[0]?.[alias];
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error(`TeaQL provider did not return exact count alias ${alias}`);
        }
        return value;
    }
    async *executeForStream(query: any, chunkSize = 1000): AsyncIterable<any[]> {
        if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error("stream chunk size must be a positive integer");
        const rows = await this.executeQuery(query);
        for (let offset = 0; offset < rows.length; offset += chunkSize) {
            yield rows.slice(offset, offset + chunkSize);
        }
    }
}

declare const require: any;

export function eq(a: any, b: any) { return {type: 'eq', field: a, value: b}; }
export function contain(a: any, b: any) { return {type: 'contain', field: a, value: b}; }