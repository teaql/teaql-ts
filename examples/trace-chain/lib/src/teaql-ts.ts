import {
    CheckException, EntityChecker, RuntimeModule,
    SelectQuery as RuntimeSelectQuery, UserContext,
    GraphCommittedError, GraphMutationSession, MutationIntent, MutationRequest, QueryRequest,
    executeRelationFacets,
} from "teaql-ts";

export { CheckException, EntityRoot, LoadedScalarSnapshot, ObjectLocation, SmartList, UserContext, executeRelationFacets } from "teaql-ts";
export { GraphCommittedError, GraphMutationSession, MutationIntent, MutationRequest, MutationTraceScope, QueryIntent, QueryRequest, RequestIntentError } from "teaql-ts";
export type { EntityKey } from "teaql-ts";
export type { TeaQLPage } from "teaql-ts";

function soundex(input: unknown): string {
    const text = String(input ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    if (!text) return "";
    const code = (char: string): string => "BFPV".includes(char) ? "1"
        : "CGJKQSXZ".includes(char) ? "2" : "DT".includes(char) ? "3"
        : char === "L" ? "4" : "MN".includes(char) ? "5" : char === "R" ? "6" : "";
    let result = text[0], previous = code(text[0]);
    for (const char of text.slice(1)) {
        const current = code(char);
        if (current && current !== previous) result += current;
        previous = current;
        if (result.length === 4) break;
    }
    return (result + "000").slice(0, 4);
}

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
    executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T>;
    preflightMutation(mutation: any): any;
    afterGraphCommit(work: () => void): void;
    afterGraphRollback(work: () => void): void;
    executeMutation(mutation: any): Promise<any>;
    executeQuery(query: any): Promise<any[]>;
    executeCount(query: any): Promise<number>;
    executeForStream(query: any, chunkSize?: number): AsyncIterable<any[]>;
    close?(): Promise<void>;
}

export class TeaQLClient implements TeaQLDataService {
    private data: Record<string, Record<string, any>> = {};
    private nextIds: Record<string, number> = {};
    private readonly checkers: Record<string, EntityChecker> = {};
    private userContext = new UserContext();
    private graphSaveActive = false;
    private activeGraph?: GraphMutationSession;
    private graphCommitActions: Array<() => void> = [];
    private graphRollbackActions: Array<() => void> = [];
    private graphAuditActions: Array<() => Promise<void>> = [];
    private graphSaveTail: Promise<void> = Promise.resolve();
    private readonly mutationGovernanceEvents: any[] = [];
    private readonly auditEvents: Readonly<Record<string, unknown>>[] = [];
    private auditSink?: (event: Readonly<Record<string, unknown>>) => void | Promise<void>;

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

    /** Installs passive generated metadata. It never mutates storage. */
    install(module: RuntimeModule): this {
        Object.assign(this.checkers, module.checkers);
        return this;
    }

    setUserContext(context: UserContext): this {
        this.userContext = context;
        return this;
    }

    get mutationGovernanceTrace(): readonly any[] {
        return [...this.mutationGovernanceEvents];
    }

    get auditTrace(): ReadonlyArray<Readonly<Record<string, unknown>>> { return [...this.auditEvents]; }
    setAuditSink(sink: (event: Readonly<Record<string, unknown>>) => void | Promise<void>): this {
        this.auditSink = sink;
        return this;
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

    async executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>): Promise<T> {
        const graph = new GraphMutationSession(intent);
        const predecessor = this.graphSaveTail;
        let release!: () => void;
        this.graphSaveTail = new Promise<void>(resolve => { release = resolve; });
        await predecessor;
        const dataSnapshot = JSON.parse(JSON.stringify(this.data));
        const nextIdsSnapshot = { ...this.nextIds };
        let fixEvidenceStarted = false;
        let mutationPolicyGraphStarted = false;
        let committed = false;
        try {
            this.graphSaveActive = true;
            this.activeGraph = graph;
            this.graphCommitActions = [];
            this.graphRollbackActions = [];
            this.graphAuditActions = [];
            this.userContext.insertResource("fixTime", new Date());
            this.userContext.beginFixEvidence();
            fixEvidenceStarted = true;
            this.userContext.beginMutationPolicyGraph();
            mutationPolicyGraphStarted = true;
            const result = await work(graph);
            this.userContext.ensureMutationPolicyGraphComplete();
            this.persist();
            committed = true;
            let failure: unknown;
            let failed = false;
            for (const action of [...this.graphCommitActions, ...this.graphAuditActions]) {
                try { await action(); } catch (error) { if (!failed) failure = error; failed = true; }
            }
            if (failed) throw new GraphCommittedError(failure);
            return result;
        } catch (error) {
            if (!committed) {
                this.data = dataSnapshot;
                this.nextIds = nextIdsSnapshot;
                for (const action of [...this.graphRollbackActions].reverse()) {
                    try { action(); } catch { /* retain the original failure */ }
                }
            }
            throw error;
        } finally {
            this.graphSaveActive = false;
            this.activeGraph = undefined;
            this.graphCommitActions = [];
            this.graphRollbackActions = [];
            this.graphAuditActions = [];
            if (mutationPolicyGraphStarted) this.userContext.endMutationPolicyGraph();
            this.userContext.removeResource("fixTime");
            if (fixEvidenceStarted) this.userContext.finishFixEvidence();
            release();
        }
    }

    afterGraphCommit(work: () => void): void {
        if (!this.graphSaveActive) throw new Error("No graph save is active");
        this.graphCommitActions.push(work);
    }

    afterGraphRollback(work: () => void): void {
        if (!this.graphSaveActive) throw new Error("No graph save is active");
        this.graphRollbackActions.push(work);
    }

    preflightMutation(mutation: any): any {
        const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
        mutation = this.checkAndFixMutation(request);
        if (request.graphSession) {
            const values = [...Object.values(mutation.payload || {}), ...Object.values(request.loadedValues())];
            request.graphSession.captureLogBindings({ parameterizedSQL: "", sqlOrigin: "generated",
                parameters: values, parameterLogPolicies: values.map(() => "unknown" as const) });
        }
        this.userContext.recordMutationPolicyPreflight(mutation);
        return mutation;
    }

    private checkAndFixMutation(mutation: any): any {
        const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
        if (request.graphSession !== this.activeGraph || (this.graphSaveActive && !request.graphSession)) {
            throw new Error("GRAPH_MUTATION_SESSION_REQUIRED: use the explicit active graph request capability");
        }
        mutation = request.mutation;
        mutation = { ...mutation, payload: { ...(mutation?.payload || {}) } };
        Object.defineProperty(mutation, "comment", { value: request.comment, enumerable: true });
        const checker = this.checkers[String(mutation.entity)];
        if (!checker) return mutation;
        const results: any[] = [];
        const ownsFixTime = this.userContext.getResource("fixTime") === undefined;
        if (ownsFixTime) this.userContext.insertResource("fixTime", new Date()).beginFixEvidence();
        try {
            checker.checkAndFix(this.userContext, mutation, results);
            if (mutation.ledgerKey && mutation.ledgerRoot) for (const [field, value] of Object.entries(mutation.payload)) mutation.ledgerRoot.set(mutation.ledgerKey, field, value);
            this.userContext.translateCheckResults(results);
            if (results.length) throw new CheckException(results);
            return mutation;
        } finally { if (ownsFixTime) this.userContext.removeResource("fixTime").finishFixEvidence(); }
    }

    async executeMutation(mutation: any): Promise<any> {
        const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
        mutation = this.checkAndFixMutation(request);
        const mutationGovernance = this.userContext.enterMutationPolicy(mutation);
        const table = this.data[mutation.entity] ||= {};
        if (mutation.action === "Create") {
            const id = mutation.id ?? String(this.nextIds[mutation.entity] || 1);
            this.nextIds[mutation.entity] = Number(id) + 1;
            const record = { ...mutation.payload, id: String(id), version: Number(mutation.version || 0) + 1 };
            table[String(id)] = record;
            if (!this.graphSaveActive) this.persist();
            return this.finishMutation(request, mutation, mutationGovernance,
                { success: true, id: String(id), version: record.version, persistedRecord: { ...record } });
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
            if (!this.graphSaveActive) this.persist();
            return this.finishMutation(request, mutation, mutationGovernance,
                { success: true, id, version: table[id].version, persistedRecord: { ...table[id] } });
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
            if (!this.graphSaveActive) this.persist();
            return this.finishMutation(request, mutation, mutationGovernance,
                { success: true, id, version: table[id].version, deleted: true, persistedRecord: { ...table[id] } });
        }
        throw new Error(`Unsupported mutation action: ${mutation.action}`);
    }
    private async finishMutation(request: MutationRequest<any>, mutation: any,
        mutationGovernance: unknown, result: any): Promise<any> {
        const event = Object.freeze({ entity: mutation.entity, action: mutation.action,
            id: result.id, version: result.version,
            ...request.auditProjection({ entity: mutation.entity, id: result.id }, mutation.payload),
            changedFields: Object.freeze(Object.keys(mutation.payload || {}).sort()),
            mutationGovernance, recordedAt: new Date().toISOString() });
        const publish = async () => {
            this.mutationGovernanceEvents.push(mutationGovernance);
            this.auditEvents.push(event);
            await this.auditSink?.(event);
        };
        if (request.graphSession) this.graphAuditActions.push(publish);
        else { try { await publish(); } catch (error) { throw new GraphCommittedError(error); } }
        return result;
    }
    async query(context: any, req: any): Promise<any> {
        return { rows: [] };
    }
    async executeQuery(query: any): Promise<any> {
        const request = query instanceof QueryRequest ? query : new QueryRequest(query);
        query = request.query;
        if (!(query instanceof RuntimeSelectQuery)) {
            throw new Error("TeaQL list execution requires the formal runtime SelectQuery");
        }
        query.prepareForList();
        let rows = Object.values(this.data[query.entity] || {}).map((row: any) => ({ ...row }));
        const matches = (row: any, expression: any): boolean => {
            if (expression?.$and) return expression.$and.every((item: any) => matches(row, item));
            return Object.entries(expression || {}).every(([field, predicate]: [string, any]) => {
                if (predicate?.$eq !== undefined) return row[field] === (predicate.$eq?.id ?? predicate.$eq);
                if (predicate?.$ne !== undefined) return row[field] !== (predicate.$ne?.id ?? predicate.$ne);
                if (predicate?.$contains !== undefined) return String(row[field] ?? "").includes(String(predicate.$contains));
                if (predicate?.$notContains !== undefined) return !String(row[field] ?? "").includes(String(predicate.$notContains));
                if (predicate?.$startsWith !== undefined) return String(row[field] ?? "").startsWith(String(predicate.$startsWith));
                if (predicate?.$notStartsWith !== undefined) return !String(row[field] ?? "").startsWith(String(predicate.$notStartsWith));
                if (predicate?.$endsWith !== undefined) return String(row[field] ?? "").endsWith(String(predicate.$endsWith));
                if (predicate?.$notEndsWith !== undefined) return !String(row[field] ?? "").endsWith(String(predicate.$notEndsWith));
                if (predicate?.$soundLike !== undefined) return soundex(row[field]) === soundex(predicate.$soundLike);
                if (predicate?.$in !== undefined) return predicate.$in.some((value: any) => row[field] === (value?.id ?? value));
                if (predicate?.$notIn !== undefined) return !predicate.$notIn.some((value: any) => row[field] === (value?.id ?? value));
                if (predicate?.$between !== undefined) return row[field] >= predicate.$between[0] && row[field] <= predicate.$between[1];
                if (predicate?.$isNull === true) return row[field] === null || row[field] === undefined;
                if (predicate?.$isNull === false) return row[field] !== null && row[field] !== undefined;
                if (predicate?.$gt !== undefined) return row[field] > predicate.$gt;
                if (predicate?.$gte !== undefined) return row[field] >= predicate.$gte;
                if (predicate?.$lt !== undefined) return row[field] < predicate.$lt;
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
            const relatedRows = (await this.executeQuery(request.derive(relation.query, relation.name))).filter(
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
        query = (query instanceof QueryRequest ? query : new QueryRequest(query)).query;
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