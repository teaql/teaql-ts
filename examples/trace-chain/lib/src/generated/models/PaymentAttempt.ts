import { CheckException, EntityKey, EntityRoot, GraphMutationSession, MutationIntent, MutationTraceScope, ObjectLocation, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Payment } from './Payment';

export class PaymentAttempt {
    private static teaqlTemporaryId = 0;
        id?: string;
        payment?: Payment | string;
        referenceCode?: string;
        version?: number;

    constructor(init?: Partial<PaymentAttempt>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --PaymentAttempt.teaqlTemporaryId, writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            Object.assign(this, fields);
            if ((init as any).payment && typeof (init as any).payment === "object") {
                this.payment = (init as any).payment instanceof Payment
                    ? (init as any).payment
                    : Payment.fromRecord((init as any).payment);
                this.markLoaded("payment");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, Number((this as any).version));
    }

    private teaqlEntityKey(): EntityKey { return { entity: "PaymentAttempt", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot): this {
        if ((this as any)._root !== root) { root.mergeFrom((this as any)._root); (this as any)._root = root; }
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): PaymentAttempt {
        const entity = new PaymentAttempt(record as Partial<PaymentAttempt>);
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

    static refer(id: string | number): PaymentAttempt {
        return new PaymentAttempt({ id: String(id) } as Partial<PaymentAttempt>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): PaymentAttempt {
        return new PaymentAttempt().updateId(String(id));
    }

    markForDeletion(): this {
        (this as any)._action = "Delete";
        (this as any)._root.markAsDeleted(this.teaqlEntityKey());
        return this;
    }

    auditAs(comment: string): this {
        (this as any)._comment = new MutationIntent(comment).comment;
        return this;
    }

    async save(context: UserContext): Promise<PaymentAttempt> {
        const intent = new MutationIntent((this as any)._comment);
        const service = context.requireResource<TeaQLDataService>("dataService");
        return service.executeGraphSave(intent, async graph => {
            this.teaqlPreflightGraph(context, service, graph);
            return this.teaqlSaveWithinGraph(context, service, graph);
        });
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession): void {
        const action = (this as any)._action;
        if (action === "Update") {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "payment", canonical: "payment" }, { member: "referenceCode", canonical: "reference_code" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        service.preflightMutation(graph.request({
            entity: "PaymentAttempt", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id, version: (this as any).version,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        }));
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService,
        graph: GraphMutationSession, parent?: MutationTraceScope): Promise<PaymentAttempt> {
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "PaymentAttempt",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any).version,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const request = graph.request(mutation, parent, (this as any)._comment);
        const result = await service.executeMutation(request);
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
        const activeScope = request.scopeFor(newKey);
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
            "payment": this.payment,
            "reference_code": this.referenceCode,
            "version": this.version
        };
    }

    updateId(value: string): this {
        this.id = value;
        this.markLoaded("id");
        (this as any)._root.set(this.teaqlEntityKey(), "id", value);
        return this;
    }

    updateReferenceCode(value: string): this {
        this.referenceCode = value;
        this.markLoaded("referenceCode");
        (this as any)._root.set(this.teaqlEntityKey(), "reference_code", value);
        return this;
    }

    updateVersion(value: number): this {
        this.version = value;
        this.markLoaded("version");
        (this as any)._root.set(this.teaqlEntityKey(), "version", value);
        return this;
    }
    updatePayment(value: any): this {
        this.payment = value?.id ?? value;
        this.markLoaded("payment");
        (this as any)._root.set(this.teaqlEntityKey(), "payment", this.payment);
        return this;
    }

}