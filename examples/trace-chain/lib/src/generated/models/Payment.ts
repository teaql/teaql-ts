import { CheckException, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationIntent, MutationTraceScope, ObjectLocation, TeaQLDataService, UserContext } from '../../teaql-ts';
import { CustomerOrder } from './CustomerOrder';
import { PaymentAttempt } from './PaymentAttempt';

export class Payment {
    private static teaqlTemporaryId = 0;
        id?: string;
        customerOrder?: CustomerOrder | string;
        referenceCode?: string;
        version?: number;

    constructor(init?: Partial<Payment>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Payment.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_paymentAttemptList", { value: [], writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            delete fields["paymentAttemptList"];
            Object.assign(this, fields);
            if ((init as any).customerOrder && typeof (init as any).customerOrder === "object") {
                this.customerOrder = (init as any).customerOrder instanceof CustomerOrder
                    ? (init as any).customerOrder
                    : CustomerOrder.fromRecord((init as any).customerOrder);
                this.markLoaded("customerOrder");
            }
            if (Array.isArray((init as any).paymentAttemptList)) {
                (this as any)._paymentAttemptList = (init as any).paymentAttemptList.map(
                    (child: unknown) => child instanceof PaymentAttempt
                        ? child
                        : PaymentAttempt.fromRecord(child as Record<string, unknown>),
                );
                this.markLoaded("paymentAttemptList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, Number((this as any).version));
        Object.defineProperty(this, "_loadedSnapshot", { value: (this as any)._action === "Update"
            ? this.teaqlScalarSnapshot() : new LoadedScalarSnapshot(), writable: true, enumerable: false });
    }

    private teaqlEntityKey(): EntityKey { return { entity: "Payment", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            const source = (this as any)._root as EntityRoot;
            const key = this.teaqlEntityKey();
            root.mergeEntityFrom(source, key);
            if (hydration || source.hasPending(key)) (this as any)._root = root;
        }
        for (const child of (this as any)._paymentAttemptList) child.teaqlAttachRoot(root, hydration);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): Payment {
        const entity = new Payment(record as Partial<Payment>);
        return root ? entity.teaqlAttachRoot(root, true) : entity;
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

    static refer(id: string | number): Payment {
        return new Payment({ id: String(id) } as Partial<Payment>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): Payment {
        return new Payment().updateId(String(id));
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

    async save(context: UserContext): Promise<Payment> {
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
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "customerOrder", canonical: "customer_order" }, { member: "referenceCode", canonical: "reference_code" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        if (pending) service.preflightMutation(graph.request({
            entity: "Payment", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? (this as any).version,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        }).withLoadedSnapshot((this as any)._loadedSnapshot));
        for (const [index, child] of (this as any)._paymentAttemptList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.payment as any)?.id ?? child.payment) !== String(this.id))
                child.updatePayment(this);
            try { child.teaqlPreflightGraph(context, service, graph); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("payment_attempt_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService,
        graph: GraphMutationSession, parent?: MutationTraceScope): Promise<Payment> {
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Payment",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? (this as any).version,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const request = graph.request(mutation, parent, (this as any)._comment)
            .withLoadedSnapshot((this as any)._loadedSnapshot);
        if (action === "Update" && !(this as any)._root.hasPending(this.teaqlEntityKey())) {
            const activeScope = request.scopeFor(this.teaqlEntityKey());
            for (const [index, child] of (this as any)._paymentAttemptList.entries()) {
                child.teaqlAttachRoot((this as any)._root);
                if (this.id === undefined || String((child.payment as any)?.id ?? child.payment) !== String(this.id))
                    child.updatePayment(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("payment_attempt_list").index(index);
                    throw new CheckException(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    })));
                }
            }
            return this;
        }
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
        const committedSnapshot = this.teaqlScalarSnapshot();
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
        for (const [index, child] of (this as any)._paymentAttemptList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.payment as any)?.id ?? child.payment) !== String(this.id))
                child.updatePayment(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("payment_attempt_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        service.afterGraphCommit(() => {
            (this as any)._loadedSnapshot = committedSnapshot;
            (this as any)._root.clearEntity(newKey);
            if ((this as any).version !== undefined) (this as any)._root.acceptCommittedVersion(newKey, Number((this as any).version));
        });
        return this;
    }

    private teaqlMutationPayload(): Record<string, unknown> {
        return {
            "id": this.id,
            "customer_order": this.customerOrder,
            "reference_code": this.referenceCode,
            "version": this.version
        };
    }

    private teaqlScalarSnapshot(): LoadedScalarSnapshot {
        return new LoadedScalarSnapshot({
            "id": this.id,
            "reference_code": this.referenceCode,
            "version": this.version
        });
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
    updateCustomerOrder(value: any): this {
        this.customerOrder = value?.id ?? value;
        this.markLoaded("customerOrder");
        (this as any)._root.set(this.teaqlEntityKey(), "customer_order", this.customerOrder);
        return this;
    }

    paymentAttemptList(): PaymentAttempt[] {
        return (this as any)._paymentAttemptList;
    }
}