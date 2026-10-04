"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contain = exports.eq = exports.TeaQLClient = exports.SelectQuery = exports.RequestIntentError = exports.QueryRequest = exports.QueryIntent = exports.MutationTraceScope = exports.MutationRequest = exports.MutationIntent = exports.GraphMutationSession = exports.GraphCommittedError = exports.executeRelationFacets = exports.UserContext = exports.SmartList = exports.ObjectLocation = exports.LoadedScalarSnapshot = exports.EntityRoot = exports.CheckException = void 0;
const teaql_ts_1 = require("teaql-ts");
var teaql_ts_2 = require("teaql-ts");
Object.defineProperty(exports, "CheckException", { enumerable: true, get: function () { return teaql_ts_2.CheckException; } });
Object.defineProperty(exports, "EntityRoot", { enumerable: true, get: function () { return teaql_ts_2.EntityRoot; } });
Object.defineProperty(exports, "LoadedScalarSnapshot", { enumerable: true, get: function () { return teaql_ts_2.LoadedScalarSnapshot; } });
Object.defineProperty(exports, "ObjectLocation", { enumerable: true, get: function () { return teaql_ts_2.ObjectLocation; } });
Object.defineProperty(exports, "SmartList", { enumerable: true, get: function () { return teaql_ts_2.SmartList; } });
Object.defineProperty(exports, "UserContext", { enumerable: true, get: function () { return teaql_ts_2.UserContext; } });
Object.defineProperty(exports, "executeRelationFacets", { enumerable: true, get: function () { return teaql_ts_2.executeRelationFacets; } });
var teaql_ts_3 = require("teaql-ts");
Object.defineProperty(exports, "GraphCommittedError", { enumerable: true, get: function () { return teaql_ts_3.GraphCommittedError; } });
Object.defineProperty(exports, "GraphMutationSession", { enumerable: true, get: function () { return teaql_ts_3.GraphMutationSession; } });
Object.defineProperty(exports, "MutationIntent", { enumerable: true, get: function () { return teaql_ts_3.MutationIntent; } });
Object.defineProperty(exports, "MutationRequest", { enumerable: true, get: function () { return teaql_ts_3.MutationRequest; } });
Object.defineProperty(exports, "MutationTraceScope", { enumerable: true, get: function () { return teaql_ts_3.MutationTraceScope; } });
Object.defineProperty(exports, "QueryIntent", { enumerable: true, get: function () { return teaql_ts_3.QueryIntent; } });
Object.defineProperty(exports, "QueryRequest", { enumerable: true, get: function () { return teaql_ts_3.QueryRequest; } });
Object.defineProperty(exports, "RequestIntentError", { enumerable: true, get: function () { return teaql_ts_3.RequestIntentError; } });
function soundex(input) {
    const text = String(input ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    if (!text)
        return "";
    const code = (char) => "BFPV".includes(char) ? "1"
        : "CGJKQSXZ".includes(char) ? "2" : "DT".includes(char) ? "3"
            : char === "L" ? "4" : "MN".includes(char) ? "5" : char === "R" ? "6" : "";
    let result = text[0], previous = code(text[0]);
    for (const char of text.slice(1)) {
        const current = code(char);
        if (current && current !== previous)
            result += current;
        previous = current;
        if (result.length === 4)
            break;
    }
    return (result + "000").slice(0, 4);
}
/** Generated naming adapter; query policy and execution remain in the formal runtime. */
class SelectQuery extends teaql_ts_1.SelectQuery {
    orderBy(field, direction) {
        return this.order({ field, expr: null, direction: direction === "desc" ? "Desc" : "Asc" });
    }
    relationQuery(name, query, localKey = "id", foreignKey = "id", many = true) {
        this.relations.push({ name, query, localKey, foreignKey, many });
        return this;
    }
}
exports.SelectQuery = SelectQuery;
class TeaQLClient {
    storagePath;
    data = {};
    nextIds = {};
    checkers = {};
    userContext = new teaql_ts_1.UserContext();
    graphSaveActive = false;
    activeGraph;
    graphCommitActions = [];
    graphRollbackActions = [];
    graphAuditActions = [];
    graphSaveTail = Promise.resolve();
    mutationGovernanceEvents = [];
    auditEvents = [];
    auditSink;
    constructor(storagePath) {
        this.storagePath = storagePath;
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
    install(module) {
        Object.assign(this.checkers, module.checkers);
        return this;
    }
    setUserContext(context) {
        this.userContext = context;
        return this;
    }
    get mutationGovernanceTrace() {
        return [...this.mutationGovernanceEvents];
    }
    get auditTrace() { return [...this.auditEvents]; }
    setAuditSink(sink) {
        this.auditSink = sink;
        return this;
    }
    persist() {
        if (!this.storagePath)
            return;
        const fs = require("fs");
        const path = require("path");
        fs.mkdirSync(path.dirname(path.resolve(this.storagePath)), { recursive: true });
        const temporaryPath = `${this.storagePath}.tmp`;
        fs.writeFileSync(temporaryPath, JSON.stringify({ data: this.data, nextIds: this.nextIds }));
        fs.renameSync(temporaryPath, this.storagePath);
    }
    async executeGraphSave(intent, work) {
        const graph = new teaql_ts_1.GraphMutationSession(intent);
        const predecessor = this.graphSaveTail;
        let release;
        this.graphSaveTail = new Promise(resolve => { release = resolve; });
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
            let failure;
            let failed = false;
            for (const action of [...this.graphCommitActions, ...this.graphAuditActions]) {
                try {
                    await action();
                }
                catch (error) {
                    if (!failed)
                        failure = error;
                    failed = true;
                }
            }
            if (failed)
                throw new teaql_ts_1.GraphCommittedError(failure);
            return result;
        }
        catch (error) {
            if (!committed) {
                this.data = dataSnapshot;
                this.nextIds = nextIdsSnapshot;
                for (const action of [...this.graphRollbackActions].reverse()) {
                    try {
                        action();
                    }
                    catch { /* retain the original failure */ }
                }
            }
            throw error;
        }
        finally {
            this.graphSaveActive = false;
            this.activeGraph = undefined;
            this.graphCommitActions = [];
            this.graphRollbackActions = [];
            this.graphAuditActions = [];
            if (mutationPolicyGraphStarted)
                this.userContext.endMutationPolicyGraph();
            this.userContext.removeResource("fixTime");
            if (fixEvidenceStarted)
                this.userContext.finishFixEvidence();
            release();
        }
    }
    afterGraphCommit(work) {
        if (!this.graphSaveActive)
            throw new Error("No graph save is active");
        this.graphCommitActions.push(work);
    }
    afterGraphRollback(work) {
        if (!this.graphSaveActive)
            throw new Error("No graph save is active");
        this.graphRollbackActions.push(work);
    }
    preflightMutation(mutation) {
        const request = mutation instanceof teaql_ts_1.MutationRequest ? mutation : new teaql_ts_1.MutationRequest(mutation);
        mutation = this.checkAndFixMutation(request);
        if (request.graphSession) {
            const values = [...Object.values(mutation.payload || {}), ...Object.values(request.loadedValues())];
            request.graphSession.captureLogBindings({ parameterizedSQL: "", sqlOrigin: "generated",
                parameters: values, parameterLogPolicies: values.map(() => "unknown") });
        }
        this.userContext.recordMutationPolicyPreflight(mutation);
        return mutation;
    }
    checkAndFixMutation(mutation) {
        const request = mutation instanceof teaql_ts_1.MutationRequest ? mutation : new teaql_ts_1.MutationRequest(mutation);
        if (request.graphSession !== this.activeGraph || (this.graphSaveActive && !request.graphSession)) {
            throw new Error("GRAPH_MUTATION_SESSION_REQUIRED: use the explicit active graph request capability");
        }
        mutation = request.mutation;
        mutation = { ...mutation, payload: { ...(mutation?.payload || {}) } };
        Object.defineProperty(mutation, "comment", { value: request.comment, enumerable: true });
        const checker = this.checkers[String(mutation.entity)];
        if (!checker)
            return mutation;
        const results = [];
        const ownsFixTime = this.userContext.getResource("fixTime") === undefined;
        if (ownsFixTime)
            this.userContext.insertResource("fixTime", new Date()).beginFixEvidence();
        try {
            checker.checkAndFix(this.userContext, mutation, results);
            if (mutation.ledgerKey && mutation.ledgerRoot)
                for (const [field, value] of Object.entries(mutation.payload))
                    mutation.ledgerRoot.set(mutation.ledgerKey, field, value);
            this.userContext.translateCheckResults(results);
            if (results.length)
                throw new teaql_ts_1.CheckException(results);
            return mutation;
        }
        finally {
            if (ownsFixTime)
                this.userContext.removeResource("fixTime").finishFixEvidence();
        }
    }
    async executeMutation(mutation) {
        const request = mutation instanceof teaql_ts_1.MutationRequest ? mutation : new teaql_ts_1.MutationRequest(mutation);
        mutation = this.checkAndFixMutation(request);
        const mutationGovernance = this.userContext.enterMutationPolicy(mutation);
        const table = this.data[mutation.entity] ||= {};
        if (mutation.action === "Create") {
            const id = mutation.id ?? String(this.nextIds[mutation.entity] || 1);
            this.nextIds[mutation.entity] = Number(id) + 1;
            const record = { ...mutation.payload, id: String(id), version: Number(mutation.version || 0) + 1 };
            table[String(id)] = record;
            if (!this.graphSaveActive)
                this.persist();
            return this.finishMutation(request, mutation, mutationGovernance, { success: true, id: String(id), version: record.version, persistedRecord: { ...record } });
        }
        if (mutation.action === "Update") {
            const id = String(mutation.id);
            if (!table[id])
                throw new Error(`${mutation.entity}(${id}) does not exist`);
            const expectedVersion = Number(mutation.version);
            const currentVersion = Number(table[id].version || 0);
            if (!Number.isFinite(expectedVersion) || expectedVersion !== currentVersion) {
                throw new Error(`Optimistic lock conflict for ${mutation.entity}(${id}): expected ${expectedVersion}, current ${currentVersion}`);
            }
            table[id] = { ...table[id], ...mutation.payload, id, version: Number(table[id].version || 0) + 1 };
            if (!this.graphSaveActive)
                this.persist();
            return this.finishMutation(request, mutation, mutationGovernance, { success: true, id, version: table[id].version, persistedRecord: { ...table[id] } });
        }
        if (mutation.action === "Delete") {
            const id = String(mutation.id);
            if (!table[id])
                throw new Error(`${mutation.entity}(${id}) does not exist`);
            const expectedVersion = Number(mutation.version);
            const currentVersion = Number(table[id].version || 0);
            if (!Number.isFinite(expectedVersion) || expectedVersion !== currentVersion) {
                throw new Error(`Optimistic lock conflict for ${mutation.entity}(${id}): expected ${expectedVersion}, current ${currentVersion}`);
            }
            table[id] = { ...table[id], id, version: -(currentVersion + 1) };
            if (!this.graphSaveActive)
                this.persist();
            return this.finishMutation(request, mutation, mutationGovernance, { success: true, id, version: table[id].version, deleted: true, persistedRecord: { ...table[id] } });
        }
        throw new Error(`Unsupported mutation action: ${mutation.action}`);
    }
    async finishMutation(request, mutation, mutationGovernance, result) {
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
        if (request.graphSession)
            this.graphAuditActions.push(publish);
        else {
            try {
                await publish();
            }
            catch (error) {
                throw new teaql_ts_1.GraphCommittedError(error);
            }
        }
        return result;
    }
    async query(context, req) {
        return { rows: [] };
    }
    async executeQuery(query) {
        const request = query instanceof teaql_ts_1.QueryRequest ? query : new teaql_ts_1.QueryRequest(query);
        query = request.query;
        if (!(query instanceof teaql_ts_1.SelectQuery)) {
            throw new Error("TeaQL list execution requires the formal runtime SelectQuery");
        }
        query.prepareForList();
        let rows = Object.values(this.data[query.entity] || {}).map((row) => ({ ...row }));
        const matches = (row, expression) => {
            if (expression?.$and)
                return expression.$and.every((item) => matches(row, item));
            return Object.entries(expression || {}).every(([field, predicate]) => {
                if (predicate?.$eq !== undefined)
                    return row[field] === (predicate.$eq?.id ?? predicate.$eq);
                if (predicate?.$ne !== undefined)
                    return row[field] !== (predicate.$ne?.id ?? predicate.$ne);
                if (predicate?.$contains !== undefined)
                    return String(row[field] ?? "").includes(String(predicate.$contains));
                if (predicate?.$notContains !== undefined)
                    return !String(row[field] ?? "").includes(String(predicate.$notContains));
                if (predicate?.$startsWith !== undefined)
                    return String(row[field] ?? "").startsWith(String(predicate.$startsWith));
                if (predicate?.$notStartsWith !== undefined)
                    return !String(row[field] ?? "").startsWith(String(predicate.$notStartsWith));
                if (predicate?.$endsWith !== undefined)
                    return String(row[field] ?? "").endsWith(String(predicate.$endsWith));
                if (predicate?.$notEndsWith !== undefined)
                    return !String(row[field] ?? "").endsWith(String(predicate.$notEndsWith));
                if (predicate?.$soundLike !== undefined)
                    return soundex(row[field]) === soundex(predicate.$soundLike);
                if (predicate?.$in !== undefined)
                    return predicate.$in.some((value) => row[field] === (value?.id ?? value));
                if (predicate?.$notIn !== undefined)
                    return !predicate.$notIn.some((value) => row[field] === (value?.id ?? value));
                if (predicate?.$between !== undefined)
                    return row[field] >= predicate.$between[0] && row[field] <= predicate.$between[1];
                if (predicate?.$isNull === true)
                    return row[field] === null || row[field] === undefined;
                if (predicate?.$isNull === false)
                    return row[field] !== null && row[field] !== undefined;
                if (predicate?.$gt !== undefined)
                    return row[field] > predicate.$gt;
                if (predicate?.$gte !== undefined)
                    return row[field] >= predicate.$gte;
                if (predicate?.$lt !== undefined)
                    return row[field] < predicate.$lt;
                if (predicate?.$lte !== undefined)
                    return row[field] <= predicate.$lte;
                return true;
            });
        };
        if (query.filterCondition)
            rows = rows.filter(row => matches(row, query.filterCondition));
        if (query.aggregateItems?.length) {
            return [Object.fromEntries(query.aggregateItems.map((aggregate) => {
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
        for (const relation of (query.relations || [])) {
            const localValues = new Set(rows.map((row) => row[relation.localKey || "id"]));
            const relatedRows = (await this.executeQuery(request.derive(relation.query, relation.name))).filter((row) => localValues.has(row[relation.foreignKey || "id"]));
            for (const row of rows) {
                const matches = relatedRows.filter((related) => related[relation.foreignKey || "id"] === row[relation.localKey || "id"]);
                row[relation.name] = relation.many === false ? matches[0] : matches;
            }
        }
        if (query.selectItems.length > 0) {
            const selections = new Set(query.selectItems);
            for (const relation of (query.relations || []))
                selections.add(relation.name);
            rows = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([field]) => selections.has(field))));
        }
        return rows;
    }
    async executeCount(query) {
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
    async *executeForStream(query, chunkSize = 1000) {
        query = (query instanceof teaql_ts_1.QueryRequest ? query : new teaql_ts_1.QueryRequest(query)).query;
        if (!Number.isInteger(chunkSize) || chunkSize <= 0)
            throw new Error("stream chunk size must be a positive integer");
        const rows = await this.executeQuery(query);
        for (let offset = 0; offset < rows.length; offset += chunkSize) {
            yield rows.slice(offset, offset + chunkSize);
        }
    }
}
exports.TeaQLClient = TeaQLClient;
function eq(a, b) { return { type: 'eq', field: a, value: b }; }
exports.eq = eq;
function contain(a, b) { return { type: 'contain', field: a, value: b }; }
exports.contain = contain;
