import { CheckException, EntityKey, EntityRoot, GraphMutationSession, MutationIntent, MutationTraceScope, ObjectLocation, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Platform } from './Platform';
import { OrderItem } from './OrderItem';
import { Payment } from './Payment';
import { Shipment } from './Shipment';

export class CustomerOrder {
    private static teaqlTemporaryId = 0;
        id?: string;
        platform?: Platform | string;
        orderNumber?: string;
        description?: string;
        version?: number;

    constructor(init?: Partial<CustomerOrder>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --CustomerOrder.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_orderItemList", { value: [], writable: true, enumerable: false });
        Object.defineProperty(this, "_paymentList", { value: [], writable: true, enumerable: false });
        Object.defineProperty(this, "_shipmentList", { value: [], writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            delete fields["orderItemList"];
            delete fields["paymentList"];
            delete fields["shipmentList"];
            Object.assign(this, fields);
            if ((init as any).platform && typeof (init as any).platform === "object") {
                this.platform = (init as any).platform instanceof Platform
                    ? (init as any).platform
                    : Platform.fromRecord((init as any).platform);
                this.markLoaded("platform");
            }
            if (Array.isArray((init as any).orderItemList)) {
                (this as any)._orderItemList = (init as any).orderItemList.map(
                    (child: unknown) => child instanceof OrderItem
                        ? child
                        : OrderItem.fromRecord(child as Record<string, unknown>),
                );
                this.markLoaded("orderItemList");
            }
            if (Array.isArray((init as any).paymentList)) {
                (this as any)._paymentList = (init as any).paymentList.map(
                    (child: unknown) => child instanceof Payment
                        ? child
                        : Payment.fromRecord(child as Record<string, unknown>),
                );
                this.markLoaded("paymentList");
            }
            if (Array.isArray((init as any).shipmentList)) {
                (this as any)._shipmentList = (init as any).shipmentList.map(
                    (child: unknown) => child instanceof Shipment
                        ? child
                        : Shipment.fromRecord(child as Record<string, unknown>),
                );
                this.markLoaded("shipmentList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, Number((this as any).version));
    }

    private teaqlEntityKey(): EntityKey { return { entity: "CustomerOrder", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            const source = (this as any)._root as EntityRoot;
            const key = this.teaqlEntityKey();
            root.mergeEntityFrom(source, key);
            if (hydration || source.hasPending(key)) (this as any)._root = root;
        }
        for (const child of (this as any)._orderItemList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._paymentList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._shipmentList) child.teaqlAttachRoot(root, hydration);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): CustomerOrder {
        const entity = new CustomerOrder(record as Partial<CustomerOrder>);
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

    static refer(id: string | number): CustomerOrder {
        return new CustomerOrder({ id: String(id) } as Partial<CustomerOrder>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): CustomerOrder {
        return new CustomerOrder().updateId(String(id));
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

    async save(context: UserContext): Promise<CustomerOrder> {
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
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "platform", canonical: "platform" }, { member: "orderNumber", canonical: "order_number" }, { member: "description", canonical: "description" }, { member: "version", canonical: "version" }]
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
            entity: "CustomerOrder", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? (this as any).version,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        }));
        for (const [index, child] of (this as any)._orderItemList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                child.updateCustomerOrder(this);
            try { child.teaqlPreflightGraph(context, service, graph); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_item_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        for (const [index, child] of (this as any)._paymentList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                child.updateCustomerOrder(this);
            try { child.teaqlPreflightGraph(context, service, graph); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("payment_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        for (const [index, child] of (this as any)._shipmentList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                child.updateCustomerOrder(this);
            try { child.teaqlPreflightGraph(context, service, graph); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("shipment_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService,
        graph: GraphMutationSession, parent?: MutationTraceScope): Promise<CustomerOrder> {
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "CustomerOrder",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? (this as any).version,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const request = graph.request(mutation, parent, (this as any)._comment);
        if (action === "Update" && !(this as any)._root.hasPending(this.teaqlEntityKey())) {
            const activeScope = request.scopeFor(this.teaqlEntityKey());
            for (const [index, child] of (this as any)._orderItemList.entries()) {
                child.teaqlAttachRoot((this as any)._root);
                if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                    child.updateCustomerOrder(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("order_item_list").index(index);
                    throw new CheckException(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    })));
                }
            }
            for (const [index, child] of (this as any)._paymentList.entries()) {
                child.teaqlAttachRoot((this as any)._root);
                if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                    child.updateCustomerOrder(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("payment_list").index(index);
                    throw new CheckException(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    })));
                }
            }
            for (const [index, child] of (this as any)._shipmentList.entries()) {
                child.teaqlAttachRoot((this as any)._root);
                if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                    child.updateCustomerOrder(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("shipment_list").index(index);
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
        for (const [index, child] of (this as any)._orderItemList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                child.updateCustomerOrder(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_item_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        for (const [index, child] of (this as any)._paymentList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                child.updateCustomerOrder(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("payment_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        for (const [index, child] of (this as any)._shipmentList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            if (this.id === undefined || String((child.customerOrder as any)?.id ?? child.customerOrder) !== String(this.id))
                child.updateCustomerOrder(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, activeScope); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("shipment_list").index(index);
                throw new CheckException(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                })));
            }
        }
        service.afterGraphCommit(() => {
            (this as any)._root.clearEntity(newKey);
            if ((this as any).version !== undefined) (this as any)._root.acceptCommittedVersion(newKey, Number((this as any).version));
        });
        return this;
    }

    private teaqlMutationPayload(): Record<string, unknown> {
        return {
            "id": this.id,
            "platform": this.platform,
            "order_number": this.orderNumber,
            "description": this.description,
            "version": this.version
        };
    }

    updateId(value: string): this {
        this.id = value;
        this.markLoaded("id");
        (this as any)._root.set(this.teaqlEntityKey(), "id", value);
        return this;
    }

    updateOrderNumber(value: string): this {
        this.orderNumber = value;
        this.markLoaded("orderNumber");
        (this as any)._root.set(this.teaqlEntityKey(), "order_number", value);
        return this;
    }

    updateDescription(value: string): this {
        this.description = value;
        this.markLoaded("description");
        (this as any)._root.set(this.teaqlEntityKey(), "description", value);
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

    orderItemList(): OrderItem[] {
        return (this as any)._orderItemList;
    }

    paymentList(): Payment[] {
        return (this as any)._paymentList;
    }

    shipmentList(): Shipment[] {
        return (this as any)._shipmentList;
    }
}