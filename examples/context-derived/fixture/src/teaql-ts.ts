import {
    CheckException, EntityChecker, RuntimeModule, ContextSchemaProvider, ContextFix,
    SelectQuery as RuntimeSelectQuery, UserContext,
    GraphCommittedError, executeRelationFacets, QueryRequest, MutationIntent, MutationRequest, GraphMutationSession, MutationFieldLayout,
    EntityVersion, entityVersion, nextEntityVersion, MutationVersionError, compareLongs, ModeledInteger32Layout,
} from "teaql-ts";

export { CheckException, EntityRoot, ObjectLocation, SmartList, UserContext, executeRelationFacets, MutationIntent } from "teaql-ts";
export { decimal, compareDecimals } from "teaql-ts";
export type { Decimal } from "teaql-ts";
export { long, compareLongs, localTime } from "teaql-ts";
export type { Long, LocalTime } from "teaql-ts";
export { entityVersion, nextEntityVersion } from "teaql-ts";
export { integer32Error } from "teaql-ts";
export type { EntityVersion } from "teaql-ts";
export { GraphCommittedError, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationTraceScope, QueryIntent, QueryRequest, RequestIntentError } from "teaql-ts";
export { ExpressionPath, TeaQLNotLoadedError } from "teaql-ts";
export type { EntityKey } from "teaql-ts";
export type { TeaQLPage } from "teaql-ts";
import type { QueryOperation } from "teaql-ts";
import type { EntitySchema } from "teaql-ts/sql/core";

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
        operation?: QueryOperation,
    ): this {
        return super.relationQuery(name, query, localKey, foreignKey, many, operation);
    }
}

export interface TeaQLDataService {
    executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>, prepare?: (graph: GraphMutationSession) => void | Promise<void>, admit?: (graph: GraphMutationSession) => boolean): Promise<T>;
    preflightMutation(mutation: any): any;
    afterGraphCommit(work: () => void): void;
    afterGraphRollback(work: () => void): void;
    executeMutation(mutation: any): Promise<any>;
    executeQuery(query: any): Promise<any[]>;
    executeCount(query: any, alias?: string, operation?: QueryOperation): Promise<number>;
    executeForStream(query: any, chunkSize?: number): AsyncIterable<any[]>;
    close?(): Promise<void>;
}

export class TeaQLClient extends ContextSchemaProvider implements TeaQLDataService {
    private data: Record<string, Record<string, any>> = {};
    private nextIds: Record<string, number> = {};
    private readonly checkers: Record<string, EntityChecker> = {};
    private readonly schemas: Record<string, EntitySchema> = {};
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
        super();
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
        this.installBootstrap(module.bootstrap);
        Object.assign(this.checkers, module.checkers);
        Object.assign(this.schemas, module.schemas);
        return this;
    }

    protected enterSchemaContext(context: UserContext): () => void {
        const previous = this.userContext;
        this.userContext = context;
        return () => { this.userContext = previous; };
    }

    protected async ensurePhysicalSchema(_context: UserContext): Promise<void> {
        // JSON/in-memory storage has no physical DDL. The runtime still requires
        // the explicit Context invocation before running generated bootstrap.
    }

    private storagePayload(entity: string, payload: Record<string, any>): Record<string, any> {
        const values = { ...payload };
        for (const relation of Object.values(this.schemas[entity]?.relations || {})) {
            if (relation.many) continue;
            const modelName = this.schemas[entity]?.columns[relation.localKey]?.modelName;
            const field = modelName && Object.prototype.hasOwnProperty.call(values, modelName)
                ? modelName : relation.localKey;
            if (!Object.prototype.hasOwnProperty.call(values, field)) continue;
            const value = values[field];
            if (value === null || value === undefined || typeof value !== "object") continue;
            if (value.id === null || value.id === undefined) {
                throw new Error(`Unresolved relation identity: ${entity}.${field}`);
            }
            values[field] = String(value.id);
        }
        return values;
    }

    /** Physical/model keys stay canonical; generated entities use native TS members. */
    private runtimeRecord(entity: string, record: Record<string, any>): Record<string, any> {
        const columns = this.schemas[entity]?.columns;
        if (!columns) return { ...record };
        const result: Record<string, any> = {};
        for (const [name, column] of Object.entries(columns)) {
            const key = column.modelName ?? name;
            result[name] = Object.prototype.hasOwnProperty.call(record, key) ? record[key]
                : Object.prototype.hasOwnProperty.call(record, name) ? record[name] : null;
        }
        if (result.version != null) result.version = entityVersion(result.version);
        return result;
    }

    private checkedMutationVersion(mutation: any): EntityVersion | undefined {
        if (mutation.action === "Create") return undefined;
        if (!["Update", "Delete", "Recover"].includes(mutation.action)) return undefined;
        const version = entityVersion(mutation.version !== undefined ? mutation.version : mutation.expectedVersion);
        if (mutation.version !== undefined && mutation.expectedVersion !== undefined
            && version !== entityVersion(mutation.expectedVersion)) throw new MutationVersionError("invalid_type");
        nextEntityVersion(mutation.action, version);
        return version;
    }

    private sealMutationVersion(mutation: any, original: EntityVersion | undefined): any {
        Object.defineProperties(mutation, {
            version: { value: original, enumerable: true, writable: false, configurable: false },
            expectedVersion: { value: original, enumerable: mutation.expectedVersion !== undefined, writable: false, configurable: false },
            action: { value: mutation.action, enumerable: true, writable: false, configurable: false },
        });
        return mutation;
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

    async executeGraphSave<T>(intent: MutationIntent, work: (graph: GraphMutationSession) => Promise<T>, prepare?: (graph: GraphMutationSession) => void | Promise<void>, admit?: (graph: GraphMutationSession) => boolean): Promise<T> {
        const graph = new GraphMutationSession(intent);
        const executionContext = this.userContext;
        graph.bindExecutionReference(() => this.userContext);
        graph.bindExecutionMetadata(() => ({schemas: this.schemas, checkerNames: Object.keys(this.checkers).sort()}));
        for (const name of Object.keys(this.checkers)) {
            graph.bindExecutionReference(() => this.checkers[name]);
            graph.bindExecutionReference(() => this.checkers[name]?.checkAndFix);
        }
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
            graph.validatePreparedSources();
            this.graphSaveActive = true;
            this.activeGraph = graph;
            this.graphCommitActions = [];
            this.graphRollbackActions = [];
            this.graphAuditActions = [];
            const pending = admit?.(graph);
            if (admit && typeof pending !== "boolean") throw new Error("GRAPH_ADMISSION_RESULT_REQUIRED");
            graph.captureInputSources();
            if (pending === false) { graph.sealPreparedGraph(); return await work(graph); }
            executionContext.insertResource("fixTime", executionContext.businessTime());
            executionContext.beginFixEvidence();
            fixEvidenceStarted = true;
            executionContext.beginMutationPolicyGraph();
            mutationPolicyGraphStarted = true;
            await prepare?.(graph);
            if (prepare && !graph.isPreparedSealed) graph.sealPreparedGraph();
            executionContext.prepareMutationPolicyGraph(graph.preparedRootEntity);
            graph.validatePreparedSources();
            const result = await work(graph);
            graph.requirePreparedComplete();
            executionContext.ensureMutationPolicyGraphComplete();
            if (!graph.isPreparedEmpty) this.persist();
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
            if (mutationPolicyGraphStarted) executionContext.endMutationPolicyGraph();
            if (fixEvidenceStarted) executionContext.removeResource("fixTime").finishFixEvidence();
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
        request.graphSession?.recordPreparedMutation();
        mutation = this.checkAndFixMutation(request);
        if (request.graphSession) {
            const values = [...Object.values(mutation.payload || {}), ...Object.values(request.loadedValues())];
            request.graphSession.captureLogBindings({ parameterizedSQL: "", sqlOrigin: "generated",
                parameters: values, parameterLogPolicies: values.map(() => "unknown" as const) });
        }
        const schema = this.schemas[mutation.entity];
        const references = Object.fromEntries(Object.values(schema?.relations ?? {}).filter(relation => !relation.many)
            .map(relation => [schema.columns[relation.localKey]?.modelName ?? relation.localKey, relation.targetEntity]));
        const policyMutation = request.graphSession ? request.graphSession.capturePreparedMutation(request, mutation, references) : mutation;
        this.userContext.recordMutationPolicyPreflight(policyMutation);
        return mutation;
    }

    private checkAndFixMutation(mutation: any): any {
        const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
        if (request.graphSession !== this.activeGraph || (this.graphSaveActive && !request.graphSession)) {
            throw new Error("GRAPH_MUTATION_SESSION_REQUIRED: use the explicit active graph request capability");
        }
        const prepared = request.graphSession?.replayPreparedMutation(request);
        if (prepared) return prepared;
        mutation = request.mutation;
        const schema = this.schemas[String(mutation.entity)];
        if (schema) {
            const fields = new MutationFieldLayout(String(mutation.entity), Object.entries(schema.columns).map(([name, column]) => column.modelName ?? name));
            fields.validate(mutation.payload ?? {}, mutation.action === "Update");
            if (mutation.ledgerKey && mutation.ledgerRoot) {
                if (mutation.ledgerKey.entity !== mutation.entity) throw new Error("MUTATION_LAYOUT_OWNER_MISMATCH");
                fields.validate(mutation.ledgerRoot.change(mutation.ledgerKey), mutation.action === "Update");
            }
        }
        const originalVersion = this.checkedMutationVersion(mutation);
        mutation = { ...mutation, payload: { ...(mutation?.payload || {}) } };
        request.bindCheckerLoadedValues(mutation);
        Object.defineProperty(mutation, "comment", { value: request.comment, enumerable: true });
        const declaringEntityType = String(mutation.entity);
        const width = new ModeledInteger32Layout(declaringEntityType, schema);
        const checker = this.checkers[declaringEntityType];
        if (!checker) {
            const violations = width.checkMutation(mutation.payload || {});
            if (violations.length) throw new CheckException(violations);
            return this.sealMutationVersion(mutation, originalVersion);
        }
        const results: any[] = [];
        const ownsFixTime = this.userContext.getResource("fixTime") === undefined;
        if (ownsFixTime) this.userContext.insertResource("fixTime", this.userContext.businessTime()).beginFixEvidence();
        try {
            ContextFix.run(this.userContext, mutation, schema, () => checker.checkAndFix(this.userContext, mutation, results));
            if (mutation.action !== request.mutation.action || this.checkedMutationVersion(mutation) !== originalVersion)
                throw new MutationVersionError("invalid_type");
            width.checkMutation(mutation.payload || {}, results);
            this.userContext.translateCheckResults(results, declaringEntityType);
            if (results.length) throw new CheckException(results);
            if (mutation.action !== "Delete" && mutation.ledgerKey && mutation.ledgerRoot) {
                const undo = ContextFix.captureUndo(mutation, schema);
                if (request.graphSession && undo) this.graphRollbackActions.push(undo);
                for (const [field, value] of Object.entries(mutation.payload)) mutation.ledgerRoot.set(mutation.ledgerKey, field, value);
            }
            return this.sealMutationVersion(mutation, originalVersion);
        } finally { if (ownsFixTime) this.userContext.removeResource("fixTime").finishFixEvidence(); }
    }

    async executeMutation(mutation: any): Promise<any> {
        const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
        request.graphSession?.requireMutationAllowed();
        mutation = this.checkAndFixMutation(request);
        const nextVersion = nextEntityVersion(mutation.action, mutation.version);
        const mutationGovernance = this.userContext.enterMutationPolicy(mutation);
        const table = this.data[mutation.entity] ||= {};
        const payload = this.storagePayload(mutation.entity, mutation.payload);
        if (mutation.action === "Create") {
            const id = mutation.id ?? String(this.nextIds[mutation.entity] || 1);
            if (table[String(id)]) throw new Error(`${mutation.entity}(${id}) already exists`);
            this.nextIds[mutation.entity] = Math.max(this.nextIds[mutation.entity] || 1, Number(id) + 1);
            const record = { ...payload, id: String(id), version: nextVersion };
            table[String(id)] = record;
            if (!this.graphSaveActive) this.persist();
            return this.finishMutation(request, mutation, mutationGovernance,
                { success: true, id: String(id), version: record.version, persistedRecord: { ...record } });
        }
        if (["Update", "Delete", "Recover"].includes(mutation.action)) {
            const id = String(mutation.id);
            if (!table[id]) throw new Error(`${mutation.entity}(${id}) does not exist`);
            const expectedVersion = entityVersion(mutation.version);
            const currentVersion = entityVersion(table[id].version);
            if (expectedVersion !== currentVersion) {
                throw new Error(
                    `Optimistic lock conflict for ${mutation.entity}(${id}): expected ${expectedVersion}, current ${currentVersion}`);
            }
            table[id] = { ...table[id], ...(mutation.action === "Update" ? payload : {}), id, version: nextVersion };
            if (!this.graphSaveActive) this.persist();
            return this.finishMutation(request, mutation, mutationGovernance,
                { success: true, id, version: table[id].version, deleted: mutation.action === "Delete", persistedRecord: { ...table[id] } });
        }
        throw new Error(`Unsupported mutation action: ${mutation.action}`);
    }
    private async finishMutation(request: MutationRequest<any>, mutation: any,
        mutationGovernance: unknown, result: any): Promise<any> {
        request.graphSession?.recordPreparedResult(request, result);
        const event = Object.freeze({ entity: mutation.entity, action: mutation.action,
            id: result.id, version: result.version,
            ...request.auditProjection({ entity: mutation.entity, id: result.id }, mutation.payload),
            changedFields: Object.freeze(Object.keys(mutation.payload || {}).sort()),
            mutationGovernance,
            actor: this.userContext.getResource("bootstrapActor"),
            category: this.userContext.getResource("bootstrapCategory"),
            recordedAt: (this.userContext.getResource<Date>("fixTime") ?? new Date()).toISOString() });
        const publish = async () => {
            this.mutationGovernanceEvents.push(mutationGovernance);
            this.auditEvents.push(event);
            await this.auditSink?.(event);
        };
        if (request.graphSession) this.graphAuditActions.push(publish);
        else { try { await publish(); } catch (error) { throw new GraphCommittedError(error); } }
        return { ...result, persistedRecord: this.runtimeRecord(mutation.entity, result.persistedRecord) };
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
        const visibility = query.deletionVisibility ?? "live";
        if (!["live", "all", "deleted"].includes(visibility)) throw new Error("QUERY_INVALID_DELETION_VISIBILITY");
        let rows = Object.values(this.data[query.entity] || {}).map((row: any) => this.runtimeRecord(query.entity, row));
        if (this.schemas[query.entity]?.columns.version && visibility !== "all") rows = rows.filter(row =>
            compareLongs(String(row.version), "0") === (visibility === "deleted" ? -1 : 1));
        const matches = (row: any, expression: any): boolean => {
            if (expression?.$and) return expression.$and.every((item: any) => matches(row, item));
            return Object.entries(expression || {}).every(([field, predicate]: [string, any]) => {
                const compare = (value: any): number => field === "version" && value != null && row[field] != null
                    ? compareLongs(String(entityVersion(row[field])), String(entityVersion(value)))
                    : row[field] === (value?.id ?? value) ? 0 : row[field] > (value?.id ?? value) ? 1 : -1;
                const equal = (value: any): boolean => field === "version" ? compare(value) === 0 : row[field] === (value?.id ?? value);
                if (predicate?.$eq !== undefined) return equal(predicate.$eq);
                if (predicate?.$ne !== undefined) return !equal(predicate.$ne);
                if (predicate?.$contains !== undefined) return String(row[field] ?? "").includes(String(predicate.$contains));
                if (predicate?.$notContains !== undefined) return !String(row[field] ?? "").includes(String(predicate.$notContains));
                if (predicate?.$startsWith !== undefined) return String(row[field] ?? "").startsWith(String(predicate.$startsWith));
                if (predicate?.$notStartsWith !== undefined) return !String(row[field] ?? "").startsWith(String(predicate.$notStartsWith));
                if (predicate?.$endsWith !== undefined) return String(row[field] ?? "").endsWith(String(predicate.$endsWith));
                if (predicate?.$notEndsWith !== undefined) return !String(row[field] ?? "").endsWith(String(predicate.$notEndsWith));
                if (predicate?.$soundLike !== undefined) return soundex(row[field]) === soundex(predicate.$soundLike);
                if (predicate?.$in !== undefined) return predicate.$in.some((value: any) => equal(value));
                if (predicate?.$notIn !== undefined) return !predicate.$notIn.some((value: any) => equal(value));
                if (predicate?.$between !== undefined) return field === "version"
                    ? compare(predicate.$between[0]) >= 0 && compare(predicate.$between[1]) <= 0
                    : row[field] >= predicate.$between[0] && row[field] <= predicate.$between[1];
                if (predicate?.$isNull === true) return row[field] === null || row[field] === undefined;
                if (predicate?.$isNull === false) return row[field] !== null && row[field] !== undefined;
                if (predicate?.$gt !== undefined) return field === "version" ? compare(predicate.$gt) > 0 : row[field] > predicate.$gt;
                if (predicate?.$gte !== undefined) return field === "version" ? compare(predicate.$gte) >= 0 : row[field] >= predicate.$gte;
                if (predicate?.$lt !== undefined) return field === "version" ? compare(predicate.$lt) < 0 : row[field] < predicate.$lt;
                if (predicate?.$lte !== undefined) return field === "version" ? compare(predicate.$lte) <= 0 : row[field] <= predicate.$lte;
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
            rows.sort((a, b) => (order.field === "version" ? compareLongs(String(a.version), String(b.version))
                : a[order.field] === b[order.field] ? 0 : a[order.field] > b[order.field] ? 1 : -1) * (String(order.direction).toLowerCase() === "desc" ? -1 : 1));
        }
        const start = query.offsetValue || 0;
        rows = rows.slice(start, start + query.limitValue);
        for (const relation of (query.relations || []) as any[]) {
            for (const row of rows) {
                // Scope before ordering/offset/limit. A nested bound belongs to
                // each parent, not to unrelated children from earlier saves.
                const childQuery = relation.query.clone();
                childQuery.filter({$and: [childQuery.filterCondition ?? {},
                    {[relation.foreignKey || "id"]: {$eq: row[relation.localKey || "id"]}}]});
                const matches = await this.executeQuery(request.derive(childQuery, relation.name));
                row[relation.name] = relation.many === false ? matches[0] : matches;
            }
        }
        if (query.selectItems.length > 0) {
            const selections = new Set(query.selectItems);
            for (const relation of (query.relations || []) as any[]) selections.add(relation.name);
            rows = rows.map((row: any) => Object.fromEntries(
                Object.entries(row).filter(([field]) => selections.has(field))));
        }
        const width = new ModeledInteger32Layout(query.entity, this.schemas[query.entity]);
        for (const row of rows) for (const field of Object.keys(row)) row[field] = width.read(field, row[field]);
        return rows;
    }
    async executeCount(query: any, countAlias?: string, operation?: QueryOperation): Promise<number> {
        if (typeof query?.forExactCount !== "function") {
            throw new Error("TeaQL exact count requires the formal runtime SelectQuery");
        }
        const alias = countAlias ?? "__teaql_total";
        const request = new QueryRequest(query).deriveOperation(query.forExactCount(alias), operation ?? {
            kind: "named-count", ...(countAlias === undefined ? {} : { alias: countAlias }) });
        const rows = await this.executeQuery(request.query);
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