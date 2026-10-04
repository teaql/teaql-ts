"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.School = void 0;
const teaql_ts_1 = require("../../teaql-ts");
const Platform_1 = require("./Platform");
const SchoolType_1 = require("./SchoolType");
class School {
    static teaqlTemporaryId = 0;
    id;
    platform;
    schoolType;
    name;
    address;
    establishedDate;
    studentCapacity;
    active;
    createTime;
    updateTime;
    version;
    constructor(init) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new teaql_ts_1.EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --School.teaqlTemporaryId, writable: true, enumerable: false });
        if (init) {
            const fields = { ...init };
            Object.assign(this, fields);
            if (init.platform && typeof init.platform === "object") {
                this.platform = init.platform instanceof Platform_1.Platform
                    ? init.platform
                    : Platform_1.Platform.fromRecord(init.platform);
                this.markLoaded("platform");
            }
            if (init.schoolType && typeof init.schoolType === "object") {
                this.schoolType = init.schoolType instanceof SchoolType_1.SchoolType
                    ? init.schoolType
                    : SchoolType_1.SchoolType.fromRecord(init.schoolType);
                this.markLoaded("schoolType");
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
    teaqlEntityKey() { return { entity: "School", id: this._ledgerId }; }
    teaqlAttachRoot(root, hydration = false) {
        if (this._root !== root) {
            const source = this._root;
            const key = this.teaqlEntityKey();
            root.mergeEntityFrom(source, key);
            if (hydration || source.hasPending(key))
                this._root = root;
        }
        return this;
    }
    static fromRecord(record, root) {
        const entity = new School(record);
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
        return new School({ id: String(id) });
    }
    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id) {
        return new School().updateId(String(id));
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
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "platform", canonical: "platform" }, { member: "schoolType", canonical: "school_type" }, { member: "name", canonical: "name" }, { member: "address", canonical: "address" }, { member: "establishedDate", canonical: "established_date" }, { member: "studentCapacity", canonical: "student_capacity" }, { member: "active", canonical: "active" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }]
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
                entity: "School", action,
                payload: action === "Update"
                    ? this._root.change(this.teaqlEntityKey())
                    : this.teaqlMutationPayload(),
                id: this.id,
                version: this._root.originalVersion(this.teaqlEntityKey()) ?? this.version,
                comment: this._comment,
                ledgerKey: this.teaqlEntityKey(), ledgerRoot: this._root,
            }).withLoadedSnapshot(this._loadedSnapshot));
    }
    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context, service, graph, parent) {
        const action = this._action;
        const ledgerPayload = this._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "School",
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
            "platform": this.platform,
            "school_type": this.schoolType,
            "name": this.name,
            "address": this.address,
            "established_date": this.establishedDate,
            "student_capacity": this.studentCapacity,
            "active": this.active,
            "create_time": this.createTime,
            "update_time": this.updateTime,
            "version": this.version
        };
    }
    teaqlScalarSnapshot() {
        return new teaql_ts_1.LoadedScalarSnapshot({
            "id": this.id,
            "name": this.name,
            "address": this.address,
            "established_date": this.establishedDate,
            "student_capacity": this.studentCapacity,
            "active": this.active,
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
    updateAddress(value) {
        this.address = value;
        this.markLoaded("address");
        this._root.set(this.teaqlEntityKey(), "address", value);
        return this;
    }
    updateEstablishedDate(value) {
        this.establishedDate = value;
        this.markLoaded("establishedDate");
        this._root.set(this.teaqlEntityKey(), "established_date", value);
        return this;
    }
    updateStudentCapacity(value) {
        this.studentCapacity = value;
        this.markLoaded("studentCapacity");
        this._root.set(this.teaqlEntityKey(), "student_capacity", value);
        return this;
    }
    updateActive(value) {
        this.active = value;
        this.markLoaded("active");
        this._root.set(this.teaqlEntityKey(), "active", value);
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
    updatePlatform(value) {
        this.platform = value?.id ?? value;
        this.markLoaded("platform");
        this._root.set(this.teaqlEntityKey(), "platform", this.platform);
        return this;
    }
    updateSchoolType(value) {
        this.schoolType = value?.id ?? value;
        this.markLoaded("schoolType");
        this._root.set(this.teaqlEntityKey(), "school_type", this.schoolType);
        return this;
    }
    updateSchoolTypeToPrimary() {
        this.schoolType = "1001";
        this.markLoaded("schoolType");
        this._root.set(this.teaqlEntityKey(), "school_type", this.schoolType);
        return this;
    }
}
exports.School = School;
