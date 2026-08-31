import { CheckException, EntityKey, EntityRoot, ObjectLocation, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Platform } from './Platform';
import { School } from './School';

export class SchoolType {
    private static teaqlTemporaryId = 0;
        platform?: Platform | string;
        id?: string;
        name?: string;
        code?: string;
        displayOrder?: number;
        version?: number;

    constructor(init?: Partial<SchoolType>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --SchoolType.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_schoolList", { value: [], writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            delete fields["schoolList"];
            Object.assign(this, fields);
            if ((init as any).platform && typeof (init as any).platform === "object") {
                this.platform = (init as any).platform instanceof Platform
                    ? (init as any).platform
                    : Platform.fromRecord((init as any).platform);
                this.markLoaded("platform");
            }
            if (Array.isArray((init as any).schoolList)) {
                (this as any)._schoolList = (init as any).schoolList.map(
                    (child: unknown) => child instanceof School
                        ? child
                        : School.fromRecord(child as Record<string, unknown>),
                );
                this.markLoaded("schoolList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, Number((this as any).version));
    }

    private teaqlEntityKey(): EntityKey { return { entity: "SchoolType", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot): this {
        if ((this as any)._root !== root) { root.mergeFrom((this as any)._root); (this as any)._root = root; }
        for (const child of (this as any)._schoolList) child.teaqlAttachRoot(root);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): SchoolType {
        const entity = new SchoolType(record as Partial<SchoolType>);
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

    static refer(id: string | number): SchoolType {
        return new SchoolType({ id: String(id) } as Partial<SchoolType>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): SchoolType {
        return new SchoolType().updateId(String(id));
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

    async save(context: UserContext): Promise<SchoolType> {
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
            const notLoaded = [{ member: "platform", canonical: "platform" }, { member: "id", canonical: "id" }, { member: "name", canonical: "name" }, { member: "code", canonical: "code" }, { member: "displayOrder", canonical: "display_order" }, { member: "version", canonical: "version" }]
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
            entity: "SchoolType", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id, version: (this as any).version,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        });
        for (const [index, child] of (this as any)._schoolList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            child.updateSchoolType(this);
            child.auditAs((this as any)._comment);
            try { child.teaqlPreflightGraph(context, service); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("school_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService): Promise<SchoolType> {
        if (!(this as any)._comment?.trim()) {
            throw new Error("Security audit failure: auditAs() must be called before save()");
        }
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "SchoolType",
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
        for (const [index, child] of (this as any)._schoolList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            child.updateSchoolType(this);
            child.auditAs((this as any)._comment);
            try { await child.teaqlSaveWithinGraph(context, context.requireResource<TeaQLDataService>("dataService")); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("school_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        service.afterGraphCommit(() => {
            (this as any)._root.clearEntity(newKey);
            if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(newKey, Number((this as any).version));
        });
        return this;
    }

    private teaqlMutationPayload(): Record<string, unknown> {
        return {
            "platform": this.platform,
            "id": this.id,
            "name": this.name,
            "code": this.code,
            "display_order": this.displayOrder,
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

    updateCode(value: string): this {
        this.code = value;
        this.markLoaded("code");
        (this as any)._root.set(this.teaqlEntityKey(), "code", value);
        return this;
    }

    updateDisplayOrder(value: number): this {
        this.displayOrder = value;
        this.markLoaded("displayOrder");
        (this as any)._root.set(this.teaqlEntityKey(), "display_order", value);
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

    schoolList(): School[] {
        return (this as any)._schoolList;
    }
}