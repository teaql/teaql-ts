import { EntityKey, EntityRoot, TeaQLDataService, UserContext } from '../../teaql-ts';
import { WorkItem } from './WorkItem';

export class Platform {
    private static teaqlTemporaryId = 0;
        id?: string;
        name?: string;
        version?: number;

    constructor(init?: Partial<Platform>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Platform.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_workItemList", { value: [], writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            delete fields["workItemList"];
            Object.assign(this, fields);
            if (Array.isArray((init as any).workItemList)) {
                (this as any)._workItemList = (init as any).workItemList.map(
                    (child: unknown) => child instanceof WorkItem
                        ? child
                        : WorkItem.fromRecord(child as Record<string, unknown>),
                );
                this.markLoaded("workItemList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, Number((this as any).version));
    }

    private teaqlEntityKey(): EntityKey { return { entity: "Platform", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot): this {
        if ((this as any)._root !== root) { root.mergeFrom((this as any)._root); (this as any)._root = root; }
        for (const child of (this as any)._workItemList) child.teaqlAttachRoot(root);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): Platform {
        const entity = new Platform(record as Partial<Platform>);
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

    static refer(id: string | number): Platform {
        return new Platform({ id: String(id) } as Partial<Platform>);
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

    async save(context: UserContext): Promise<Platform> {
        if (!(this as any)._comment?.trim()) {
            throw new Error("Security audit failure: auditAs() must be called before save()");
        }
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Platform",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any).version,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const service = context.requireResource<TeaQLDataService>("dataService");
        const result = await service.executeMutation(mutation);
        for (const [field, value] of Object.entries(mutation.payload as Record<string, unknown>)) {
            if (field !== "id" && field !== "version") (this as any)._root.set(this.teaqlEntityKey(), field, value);
        }
        if (!result.persistedRecord) {
            throw new Error("Mutation did not return the authoritative persisted record");
        }
        const oldKey = this.teaqlEntityKey();
        Object.assign(this, result.persistedRecord);
        (this as any)._ledgerId = (this as any).id ?? (this as any)._ledgerId;
        const newKey = this.teaqlEntityKey();
        (this as any)._root.rekey(oldKey, newKey);
        (this as any)._loadedFields = new Set(Object.keys(result.persistedRecord));
        (this as any)._fullyLoaded = false;
        if (mutation.action !== "Delete") (this as any)._action = "Update";
        for (const child of (this as any)._workItemList) {
            child.teaqlAttachRoot((this as any)._root);
            child.updatePlatform(this);
            child.auditAs((this as any)._comment);
            await child.save(context);
        }
        (this as any)._root.clearEntity(newKey);
        if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(newKey, Number((this as any).version));
        return this;
    }

    private teaqlMutationPayload(): Record<string, unknown> {
        return {
            "id": this.id,
            "name": this.name,
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

    updateVersion(value: number): this {
        this.version = value;
        this.markLoaded("version");
        (this as any)._root.set(this.teaqlEntityKey(), "version", value);
        return this;
    }
    workItemList(): WorkItem[] {
        return (this as any)._workItemList;
    }
}
