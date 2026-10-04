"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = void 0;
const teaql_ts_1 = require("../../teaql-ts");
const SchoolType_1 = require("./SchoolType");
const School_1 = require("./School");
class Platform {
    static teaqlTemporaryId = 0;
    id;
    name;
    baseUrl;
    createTime;
    updateTime;
    version;
    constructor(init) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new teaql_ts_1.EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Platform.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_schoolTypeList", { value: teaql_ts_1.SmartList.empty(), writable: true, enumerable: false });
        Object.defineProperty(this, "_schoolList", { value: teaql_ts_1.SmartList.empty(), writable: true, enumerable: false });
        if (init) {
            const fields = { ...init };
            delete fields["schoolTypeList"];
            delete fields["schoolList"];
            Object.assign(this, fields);
            if (Array.isArray(init.schoolTypeList)) {
                const source = init.schoolTypeList;
                this._schoolTypeList = new teaql_ts_1.SmartList(source.map((child) => child instanceof SchoolType_1.SchoolType
                    ? child
                    : SchoolType_1.SchoolType.fromRecord(child)), source instanceof teaql_ts_1.SmartList ? {
                    totalCount: source.totalCount, aggregations: source.aggregations,
                    summary: source.summary, facets: source.facets, isLoaded: source.isLoaded,
                } : { isLoaded: true });
                this.markLoaded("schoolTypeList");
            }
            if (Array.isArray(init.schoolList)) {
                const source = init.schoolList;
                this._schoolList = new teaql_ts_1.SmartList(source.map((child) => child instanceof School_1.School
                    ? child
                    : School_1.School.fromRecord(child)), source instanceof teaql_ts_1.SmartList ? {
                    totalCount: source.totalCount, aggregations: source.aggregations,
                    summary: source.summary, facets: source.facets, isLoaded: source.isLoaded,
                } : { isLoaded: true });
                this.markLoaded("schoolList");
            }
        }
        const key = this.teaqlEntityKey();
        if (this._action === "Create")
            this._root.markAsNew(key);
        else if (this.version !== undefined)
            this._root.setOriginalVersion(key, Number(this.version));
        Object.defineProperty(this, "_loadedSnapshot", { value: this._action === "Update"
                ? this.teaqlScalarSnapshot() : new teaql_ts_1.LoadedScalarSnapshot(), writable: true, enumerable: false });
    }
    teaqlEntityKey() { return { entity: "Platform", id: this._ledgerId }; }
    teaqlAttachRoot(root, hydration = false) {
        if (this._root !== root) {
            const source = this._root;
            const key = this.teaqlEntityKey();
            root.mergeEntityFrom(source, key);
            if (hydration || source.hasPending(key))
                this._root = root;
        }
        for (const child of this._schoolTypeList)
            child.teaqlAttachRoot(root, hydration);
        for (const child of this._schoolList)
            child.teaqlAttachRoot(root, hydration);
        return this;
    }
    static fromRecord(record, root) {
        const entity = new Platform(record);
        return root ? entity.teaqlAttachRoot(root, true) : entity;
    }
    isLoaded(field) {
        return this._fullyLoaded || this._loadedFields.has(field);
    }
    markLoaded(...fields) {
        for (const field of fields)
            this._loadedFields.add(field);
        return this;
    }
    markLoadedOnly(...fields) {
        this._fullyLoaded = false;
        this._loadedFields = new Set(fields);
        return this;
    }
    static refer(id) {
        return new Platform({ id: String(id) });
    }
    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id) {
        return new Platform().updateId(String(id));
    }
    markForDeletion() {
        this._action = "Delete";
        this._root.markAsDeleted(this.teaqlEntityKey());
        return this;
    }
    auditAs(comment) {
        this._comment = new teaql_ts_1.MutationIntent(comment).comment;
        return this;
    }
    async save(context) {
        const intent = new teaql_ts_1.MutationIntent(this._comment);
        const service = context.requireResource("dataService");
        return service.executeGraphSave(intent, async (graph) => {
            this.teaqlPreflightGraph(context, service, graph);
            return this.teaqlSaveWithinGraph(context, service, graph);
        });
    }
    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context, service, graph) {
        const action = this._action;
        const pending = action !== "Update" || this._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "name", canonical: "name" }, { member: "baseUrl", canonical: "base_url" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new teaql_ts_1.CheckException([{
                        ruleId: "invalid_type",
                        location: teaql_ts_1.ObjectLocation.property(notLoaded.canonical),
                        message: "Mutation requires a fully loaded entity",
                    }]);
            }
        }
        if (pending)
            service.preflightMutation(graph.request({
                entity: "Platform", action,
                payload: action === "Update"
                    ? this._root.change(this.teaqlEntityKey())
                    : this.teaqlMutationPayload(),
                id: this.id,
                version: this._root.originalVersion(this.teaqlEntityKey()) ?? this.version,
                comment: this._comment,
                ledgerKey: this.teaqlEntityKey(), ledgerRoot: this._root,
            }).withLoadedSnapshot(this._loadedSnapshot));
        for (const [index, child] of this._schoolTypeList.entries()) {
            child.teaqlAttachRoot(this._root);
            if (this.id === undefined || String(child.platform?.id ?? child.platform) !== String(this.id))
                child.updatePlatform(this);
            try {
                child.teaqlPreflightGraph(context, service, graph);
            }
            catch (error) {
                if (!(error instanceof teaql_ts_1.CheckException))
                    throw error;
                const prefix = teaql_ts_1.ObjectLocation.property("school_type_list").index(index);
                throw new teaql_ts_1.CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        for (const [index, child] of this._schoolList.entries()) {
            child.teaqlAttachRoot(this._root);
            if (this.id === undefined || String(child.platform?.id ?? child.platform) !== String(this.id))
                child.updatePlatform(this);
            try {
                child.teaqlPreflightGraph(context, service, graph);
            }
            catch (error) {
                if (!(error instanceof teaql_ts_1.CheckException))
                    throw error;
                const prefix = teaql_ts_1.ObjectLocation.property("school_list").index(index);
                throw new teaql_ts_1.CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
    }
    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context, service, graph, parent) {
        const action = this._action;
        const ledgerPayload = this._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Platform",
            action: this._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: this.id,
            version: this._root.originalVersion(this.teaqlEntityKey()) ?? this.version,
            comment: this._comment,
            ledgerKey: this.teaqlEntityKey(),
            ledgerRoot: this._root
        };
        const request = graph.request(mutation, parent, this._comment)
            .withLoadedSnapshot(this._loadedSnapshot);
        if (action === "Update" && !this._root.hasPending(this.teaqlEntityKey())) {
            const activeScope = request.scopeFor(this.teaqlEntityKey());
            for (const [index, child] of this._schoolTypeList.entries()) {
                child.teaqlAttachRoot(this._root);
                if (this.id === undefined || String(child.platform?.id ?? child.platform) !== String(this.id))
                    child.updatePlatform(this);
                try {
                    await child.teaqlSaveWithinGraph(context, service, graph, activeScope);
                }
                catch (error) {
                    if (!(error instanceof teaql_ts_1.CheckException))
                        throw error;
                    const prefix = teaql_ts_1.ObjectLocation.property("school_type_list").index(index);
                    throw new teaql_ts_1.CheckException(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    })));
                }
            }
            for (const [index, child] of this._schoolList.entries()) {
                child.teaqlAttachRoot(this._root);
                if (this.id === undefined || String(child.platform?.id ?? child.platform) !== String(this.id))
                    child.updatePlatform(this);
                try {
                    await child.teaqlSaveWithinGraph(context, service, graph, activeScope);
                }
                catch (error) {
                    if (!(error instanceof teaql_ts_1.CheckException))
                        throw error;
                    const prefix = teaql_ts_1.ObjectLocation.property("school_list").index(index);
                    throw new teaql_ts_1.CheckException(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    })));
                }
            }
            return this;
        }
        const result = await service.executeMutation(request);
        for (const [field, value] of Object.entries(mutation.payload)) {
            if (field !== "id" && field !== "version")
                this._root.set(this.teaqlEntityKey(), field, value);
        }
        if (!result.persistedRecord) {
            throw new Error("Mutation did not return the authoritative persisted record");
        }
        const rollbackState = {
            payload: this.teaqlMutationPayload(),
            ledgerId: this._ledgerId,
            action: this._action,
            loadedFields: new Set(this._loadedFields),
            fullyLoaded: this._fullyLoaded,
        };
        const oldKey = this.teaqlEntityKey();
        Object.assign(this, result.persistedRecord);
        const committedSnapshot = this.teaqlScalarSnapshot();
        this._ledgerId = this.id ?? this._ledgerId;
        const newKey = this.teaqlEntityKey();
        this._root.rekey(oldKey, newKey);
        const activeScope = request.scopeFor(newKey);
        service.afterGraphRollback(() => {
            Object.assign(this, rollbackState.payload);
            this._ledgerId = rollbackState.ledgerId;
            this._action = rollbackState.action;
            this._loadedFields = rollbackState.loadedFields;
            this._fullyLoaded = rollbackState.fullyLoaded;
            this._root.rekey(newKey, oldKey);
        });
        this._loadedFields = new Set(Object.keys(result.persistedRecord));
        this._fullyLoaded = false;
        if (mutation.action !== "Delete")
            this._action = "Update";
        for (const [index, child] of this._schoolTypeList.entries()) {
            child.teaqlAttachRoot(this._root);
            if (this.id === undefined || String(child.platform?.id ?? child.platform) !== String(this.id))
                child.updatePlatform(this);
            try {
                await child.teaqlSaveWithinGraph(context, service, graph, activeScope);
            }
            catch (error) {
                if (!(error instanceof teaql_ts_1.CheckException))
                    throw error;
                const prefix = teaql_ts_1.ObjectLocation.property("school_type_list").index(index);
                throw new teaql_ts_1.CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        for (const [index, child] of this._schoolList.entries()) {
            child.teaqlAttachRoot(this._root);
            if (this.id === undefined || String(child.platform?.id ?? child.platform) !== String(this.id))
                child.updatePlatform(this);
            try {
                await child.teaqlSaveWithinGraph(context, service, graph, activeScope);
            }
            catch (error) {
                if (!(error instanceof teaql_ts_1.CheckException))
                    throw error;
                const prefix = teaql_ts_1.ObjectLocation.property("school_list").index(index);
                throw new teaql_ts_1.CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        service.afterGraphCommit(() => {
            this._loadedSnapshot = committedSnapshot;
            this._root.clearEntity(newKey);
            if (this.version !== undefined)
                this._root.acceptCommittedVersion(newKey, Number(this.version));
        });
        return this;
    }
    teaqlMutationPayload() {
        return {
            "id": this.id,
            "name": this.name,
            "base_url": this.baseUrl,
            "create_time": this.createTime,
            "update_time": this.updateTime,
            "version": this.version
        };
    }
    teaqlScalarSnapshot() {
        return new teaql_ts_1.LoadedScalarSnapshot({
            "id": this.id,
            "name": this.name,
            "base_url": this.baseUrl,
            "create_time": this.createTime,
            "update_time": this.updateTime,
            "version": this.version
        });
    }
    updateId(value) {
        this.id = value;
        this.markLoaded("id");
        this._root.set(this.teaqlEntityKey(), "id", value);
        return this;
    }
    updateName(value) {
        this.name = value;
        this.markLoaded("name");
        this._root.set(this.teaqlEntityKey(), "name", value);
        return this;
    }
    updateBaseUrl(value) {
        this.baseUrl = value;
        this.markLoaded("baseUrl");
        this._root.set(this.teaqlEntityKey(), "base_url", value);
        return this;
    }
    updateCreateTime(value) {
        this.createTime = value;
        this.markLoaded("createTime");
        this._root.set(this.teaqlEntityKey(), "create_time", value);
        return this;
    }
    updateUpdateTime(value) {
        this.updateTime = value;
        this.markLoaded("updateTime");
        this._root.set(this.teaqlEntityKey(), "update_time", value);
        return this;
    }
    updateVersion(value) {
        this.version = value;
        this.markLoaded("version");
        this._root.set(this.teaqlEntityKey(), "version", value);
        return this;
    }
    schoolTypeList() {
        return this._schoolTypeList;
    }
    schoolList() {
        return this._schoolList;
    }
}
exports.Platform = Platform;
