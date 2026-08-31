import { CheckException, EntityKey, EntityRoot, ObjectLocation, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Platform } from './Platform';
import { SchoolType } from './SchoolType';

export class School {
    private static teaqlTemporaryId = 0;
        id?: string;
        platform?: Platform | string;
        schoolType?: SchoolType | string;
        name?: string;
        address?: string;
        establishedDate?: string;
        studentCapacity?: number;
        active?: boolean;
        createTime?: string;
        updateTime?: string;
        version?: number;

    constructor(init?: Partial<School>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --School.teaqlTemporaryId, writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            Object.assign(this, fields);
            if ((init as any).platform && typeof (init as any).platform === "object") {
                this.platform = (init as any).platform instanceof Platform
                    ? (init as any).platform
                    : Platform.fromRecord((init as any).platform);
                this.markLoaded("platform");
            }
            if ((init as any).schoolType && typeof (init as any).schoolType === "object") {
                this.schoolType = (init as any).schoolType instanceof SchoolType
                    ? (init as any).schoolType
                    : SchoolType.fromRecord((init as any).schoolType);
                this.markLoaded("schoolType");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, Number((this as any).version));
    }

    private teaqlEntityKey(): EntityKey { return { entity: "School", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot): this {
        if ((this as any)._root !== root) { root.mergeFrom((this as any)._root); (this as any)._root = root; }
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): School {
        const entity = new School(record as Partial<School>);
        return root ? entity.teaqlAttachRoot(root) : entity;
    }

    isLoaded(field: string): boolean {
        return (this as any)._fullyLoaded || (this as any)._loadedFields.has(field);
    }

    markLoaded(...fields: string[]): this {
        for (const field of fields) (this as any)._loadedFields.add(field);
        return this;
    }

    markLoadedOnly(...fields: string[]): this {
        (this as any)._fullyLoaded = false;
        (this as any)._loadedFields = new Set(fields);
        return this;
    }

    static refer(id: string | number): School {
        return new School({ id: String(id) } as Partial<School>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): School {
        return new School().updateId(String(id));
    }

    markForDeletion(): this {
        (this as any)._action = "Delete";
        (this as any)._root.markAsDeleted(this.teaqlEntityKey());
        return this;
    }

    auditAs(comment: string): this {
        if (!comment?.trim()) {
            throw new Error("Security audit failure: auditAs() requires a non-empty reason");
        }
        (this as any)._comment = comment;
        return this;
    }

    async save(context: UserContext): Promise<School> {
        const service = context.requireResource<TeaQLDataService>("dataService");
        return service.executeGraphSave(async () => {
            this.teaqlPreflightGraph(context, service);
            return this.teaqlSaveWithinGraph(context, service);
        });
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService): void {
        if (!(this as any)._comment?.trim()) {
            throw new Error("Security audit failure: auditAs() must be called before save()");
        }
        const action = (this as any)._action;
        if (action === "Update") {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "platform", canonical: "platform" }, { member: "schoolType", canonical: "school_type" }, { member: "name", canonical: "name" }, { member: "address", canonical: "address" }, { member: "establishedDate", canonical: "established_date" }, { member: "studentCapacity", canonical: "student_capacity" }, { member: "active", canonical: "active" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        service.preflightMutation({
            entity: "School", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id, version: (this as any).version,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        });
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService): Promise<School> {
        if (!(this as any)._comment?.trim()) {
            throw new Error("Security audit failure: auditAs() must be called before save()");
        }
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "School",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any).version,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const result = await service.executeMutation(mutation);
        for (const [field, value] of Object.entries(mutation.payload as Record<string, unknown>)) {
            if (field !== "id" && field !== "version") (this as any)._root.set(this.teaqlEntityKey(), field, value);
        }
        if (!result.persistedRecord) {
            throw new Error("Mutation did not return the authoritative persisted record");
        }
        const rollbackState = {
            payload: this.teaqlMutationPayload(),
            ledgerId: (this as any)._ledgerId,
            action: (this as any)._action,
            loadedFields: new Set((this as any)._loadedFields),
            fullyLoaded: (this as any)._fullyLoaded,
        };
        const oldKey = this.teaqlEntityKey();
        Object.assign(this, result.persistedRecord);
        (this as any)._ledgerId = (this as any).id ?? (this as any)._ledgerId;
        const newKey = this.teaqlEntityKey();
        (this as any)._root.rekey(oldKey, newKey);
        service.afterGraphRollback(() => {
            Object.assign(this, rollbackState.payload);
            (this as any)._ledgerId = rollbackState.ledgerId;
            (this as any)._action = rollbackState.action;
            (this as any)._loadedFields = rollbackState.loadedFields;
            (this as any)._fullyLoaded = rollbackState.fullyLoaded;
            (this as any)._root.rekey(newKey, oldKey);
        });
        (this as any)._loadedFields = new Set(Object.keys(result.persistedRecord));
        (this as any)._fullyLoaded = false;
        if (mutation.action !== "Delete") (this as any)._action = "Update";
        service.afterGraphCommit(() => {
            (this as any)._root.clearEntity(newKey);
            if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(newKey, Number((this as any).version));
        });
        return this;
    }

    private teaqlMutationPayload(): Record<string, unknown> {
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

    updateId(value: string): this {
        this.id = value;
        this.markLoaded("id");
        (this as any)._root.set(this.teaqlEntityKey(), "id", value);
        return this;
    }

    updateName(value: string): this {
        this.name = value;
        this.markLoaded("name");
        (this as any)._root.set(this.teaqlEntityKey(), "name", value);
        return this;
    }

    updateAddress(value: string): this {
        this.address = value;
        this.markLoaded("address");
        (this as any)._root.set(this.teaqlEntityKey(), "address", value);
        return this;
    }

    updateEstablishedDate(value: string): this {
        this.establishedDate = value;
        this.markLoaded("establishedDate");
        (this as any)._root.set(this.teaqlEntityKey(), "established_date", value);
        return this;
    }

    updateStudentCapacity(value: number): this {
        this.studentCapacity = value;
        this.markLoaded("studentCapacity");
        (this as any)._root.set(this.teaqlEntityKey(), "student_capacity", value);
        return this;
    }

    updateActive(value: boolean): this {
        this.active = value;
        this.markLoaded("active");
        (this as any)._root.set(this.teaqlEntityKey(), "active", value);
        return this;
    }

    updateCreateTime(value: string): this {
        this.createTime = value;
        this.markLoaded("createTime");
        (this as any)._root.set(this.teaqlEntityKey(), "create_time", value);
        return this;
    }

    updateUpdateTime(value: string): this {
        this.updateTime = value;
        this.markLoaded("updateTime");
        (this as any)._root.set(this.teaqlEntityKey(), "update_time", value);
        return this;
    }

    updateVersion(value: number): this {
        this.version = value;
        this.markLoaded("version");
        (this as any)._root.set(this.teaqlEntityKey(), "version", value);
        return this;
    }
    updatePlatform(value: any): this {
        this.platform = value?.id ?? value;
        this.markLoaded("platform");
        (this as any)._root.set(this.teaqlEntityKey(), "platform", this.platform);
        return this;
    }


    updateSchoolType(value: any): this {
        this.schoolType = value?.id ?? value;
        this.markLoaded("schoolType");
        (this as any)._root.set(this.teaqlEntityKey(), "school_type", this.schoolType);
        return this;
    }
    public updateSchoolTypeToPrimary(): School {
        this.schoolType = "1001";
        this.markLoaded("schoolType");
        (this as any)._root.set(this.teaqlEntityKey(), "school_type", this.schoolType);
        return this;
    }

}