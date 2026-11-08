import { CheckException, integer32Error, EntityCreation, EntityCreationError, Decimal, decimal, Long, long, LocalTime, localTime, EntityVersion, entityVersion, nextEntityVersion, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationIntent, MutationTraceScope, ObjectLocation, SmartList, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Platform } from './Platform';
import { CustomerOrder } from './CustomerOrder';

const teaqlConstruction = Symbol("managed entity construction");

export class Customer {
    private static teaqlTemporaryId = 0;
    private static readonly teaqlMutationFields = new MutationFieldLayout("Customer",
        ["id", "platform", "name", "version"], { id: "immutable_field", version: "immutable_field" });
        id?: string;
        platform?: Platform | string;
        name?: string;
        version?: EntityVersion;

    private constructor(init?: Partial<Customer>, token?: symbol, creation = false) {
        if (token !== teaqlConstruction) throw new EntityCreationError();
        Object.defineProperty(this, "_action", { value: creation ? "Create" : "Update", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: creation, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Customer.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_customerOrderList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            for (const key of ["_action", "_comment", "_fullyLoaded", "_loadedFields", "_root", "_ledgerId"]) delete fields[key];
            delete fields["customerOrderList"];
            Object.assign(this, fields);
            if ((init as any).platform && typeof (init as any).platform === "object") {
                this.platform = (init as any).platform instanceof Platform
                    ? (init as any).platform
                    : Platform.fromRecord((init as any).platform);
                this.markLoaded("platform");
            }
            if (Array.isArray((init as any).customerOrderList)) {
                const selected = (init as any).customerOrderList;
                (this as any)._customerOrderList = new SmartList(selected.map(
                    (child: unknown) => child instanceof CustomerOrder
                        ? child
                        : CustomerOrder.fromRecord(child as Record<string, unknown>),
                ), { totalCount: selected.totalCount, aggregations: selected.aggregations,
                    summary: selected.summary, facets: selected.facets, isLoaded: selected.isLoaded ?? true });
                this.markLoaded("customerOrderList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any).version !== undefined) (this as any).version = entityVersion((this as any).version);
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, (this as any).version);
        LoadedScalarSnapshot.captureFor(this, this.teaqlMutationPayload(), key, (this as any).version,
            creation ? "creationBaseline" : "hydrated");
    }

    private teaqlEntityKey(): EntityKey { return { entity: "Customer", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            root.mergeEntityFrom((this as any)._root, this.teaqlEntityKey());
            (this as any)._root = root;
        }
        for (const child of (this as any)._customerOrderList) child.teaqlAttachRoot(root, hydration);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): Customer {
        const entity = EntityCreation.hydrated(new Customer(record as Partial<Customer>, teaqlConstruction));
        return root ? entity.teaqlAttachRoot(root, true) : entity;
    }

    toJSON(): Record<string, unknown> {
        const result = Object.fromEntries(Object.entries(this));
        if (this.isLoaded("customerOrderList")) result["customerOrderList"] = (this as any)._customerOrderList;
        return result;
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

    static refer(id: string | number): Customer {
        return Customer.fromRecord({ id: String(id) });
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(context: UserContext, id: string | number): Customer {
        return EntityCreation.bootstrap(context, "Customer", id,
            reserved => new Customer({id: reserved} as Partial<Customer>, teaqlConstruction, true));
    }

    /** @internal Q owns the awaited public creation entry point. */
    static teaqlCreate(context: UserContext): Promise<Customer> {
        return EntityCreation.create(context, "Customer",
            reserved => new Customer({id: reserved} as Partial<Customer>, teaqlConstruction, true));
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

    async save(context: UserContext): Promise<Customer> {
        const intent = new MutationIntent((this as any)._comment);
        this.teaqlValidateLoadedIdentities();
        if (!this.teaqlValidateMutationOrigins()) return this;
        const service = context.requireResource<TeaQLDataService>("dataService");
        return service.executeGraphSave(new MutationIntent((this as any)._comment), async (graph) => {
            return this.teaqlSaveWithinGraph(context, service, graph);
        }, (graph) => {
            this.teaqlPreflightGraph(context, service, graph);
            this.teaqlValidateLoadedIdentities();
            this.teaqlAdmitGraph();
            graph.sealPreparedGraph();
        }, (graph) => {
            this.teaqlValidateLoadedIdentities();
            this.teaqlDiscardRestoredGraph(graph);
            this.teaqlAdmitGraph();
            this.teaqlNormalizeGraph(graph);
            return this.teaqlAdmitGraph();
        });
    }

    /** @internal Pure provenance pass before resolving any Context resources. */
    private teaqlValidateMutationOrigins(seen = new Set<object>()): boolean {
        if (seen.has(this)) return false;
        seen.add(this);
        const action = (this as any)._action;
        let pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        EntityCreation.requireMutation(this, this.teaqlEntityKey(), this.id, action, (this as any)._root, pending);
        for (const child of (this as any)._customerOrderList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        return pending;
    }

    /** @internal Read-only first pass: no ledger attachment, FK edits or no-op shortcut. */
    private teaqlValidateLoadedIdentities(seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        LoadedScalarSnapshot.forEntity(this)?.validateNativeIdentity(this.teaqlEntityKey(), this.id, this.version);
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
    }

    /** @internal Cancel known no-ops across the graph before any derived FK edits. */
    private teaqlDiscardRestoredGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Customer.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        for (const child of (this as any)._customerOrderList) child.teaqlDiscardRestoredGraph(graph, seen);
    }

    /** @internal Model-key admission precedes restoration; only intended edits may normalize FKs. */
    private teaqlNormalizeGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Customer.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        graph.registerSource(this, (this as any)._root, this.teaqlEntityKey(), {
            "platform": "Platform"
        }, () => ({ ...this.teaqlMutationPayload(),
            __teaql_key: this.teaqlEntityKey(), __teaql_action: (this as any)._action,
            __teaql_comment: (this as any)._comment,
            __teaql_load: {fullyLoaded: (this as any)._fullyLoaded, fields: [...(this as any)._loadedFields].sort()},
            "customer_order_list": graph.sourceMembers((this as any)._customerOrderList)
        }));
        for (const child of (this as any)._customerOrderList) {
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.customer;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("customer") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCustomer(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
    }

    /** @internal Whole-input version/completeness pass; does not use Context or Fix. */
    private teaqlAdmitGraph(seen = new Set<object>()): boolean {
        if (seen.has(this)) return false;
        seen.add(this);
        const action = (this as any)._action;
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        EntityCreation.requireMutation(this, this.teaqlEntityKey(), this.id, action, (this as any)._root, pending);
        LoadedScalarSnapshot.forEntity(this)?.validateMutationVersion((this as any)._root, this.teaqlEntityKey());
        Customer.teaqlMutationFields.validate((this as any)._root.change(this.teaqlEntityKey()), action === "Update");
        if (pending) {
            nextEntityVersion(action, LoadedScalarSnapshot.forEntity(this)?.persistedVersion);
            if (action === "Update") {
                const notLoaded = [{ member: "id", canonical: "id" }, { member: "platform", canonical: "platform" }, { member: "name", canonical: "name" }, { member: "version", canonical: "version" }].find(field => !this.isLoaded(field.member));
                if (notLoaded) throw new CheckException([{ruleId: "invalid_type", entityType: "Customer", location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity"}]);
            }
        }
        let graphPending = pending;
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        return graphPending;
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): void {
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return;
        seen.add(this);
        const action = (this as any)._action;
        graph.discardRestoredFields(Customer.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "platform", canonical: "platform" }, { member: "name", canonical: "name" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    entityType: "Customer",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        const request = graph.request({
            entity: "Customer", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: LoadedScalarSnapshot.forEntity(this)?.persistedVersion,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        }, parent, (this as any)._comment).withLoadedSnapshot(LoadedScalarSnapshot.forEntity(this) ?? new LoadedScalarSnapshot());
        if (pending) service.preflightMutation(request);
        const scope = request.scopeFor(this.teaqlEntityKey());
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.customer;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("customer") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCustomer(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): Promise<Customer> {
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return this;
        seen.add(this);
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Customer",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: LoadedScalarSnapshot.forEntity(this)?.persistedVersion,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const request = graph.request(mutation, parent, (this as any)._comment)
            .withLoadedSnapshot(LoadedScalarSnapshot.forEntity(this) ?? new LoadedScalarSnapshot());
        if (action === "Update" && !(this as any)._root.hasPending(this.teaqlEntityKey())) {
            const scope = request.scopeFor(this.teaqlEntityKey());
            for (const [index, child] of (this as any)._customerOrderList.entries()) {
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.customer;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("customer") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCustomer(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("customer_order_list").index(index);
                    throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    }))));
                }
            }
            return this;
        }
        const result = await service.executeMutation(request);
        graph.validatePreparedSources();
        if (!result.persistedRecord) {
            throw new Error("Mutation did not return the authoritative persisted record");
        }
        const rollbackState = {
            ownProperties: Object.getOwnPropertyDescriptors(this),
            ledgerId: (this as any)._ledgerId,
            action: (this as any)._action,
            loadedFields: new Set((this as any)._loadedFields),
            fullyLoaded: (this as any)._fullyLoaded,
            loadedSnapshot: LoadedScalarSnapshot.forEntity(this),
        };
        const oldKey = this.teaqlEntityKey();
        Object.assign(this, result.persistedRecord);
        (this as any)._ledgerId = (this as any).id ?? (this as any)._ledgerId;
        const newKey = this.teaqlEntityKey();
        (this as any)._root.rekey(oldKey, newKey);
        const committedSnapshot = this.teaqlScalarSnapshot();
        const activeScope = request.scopeFor(newKey);
        service.afterGraphRollback(() => {
            for (const name of Object.getOwnPropertyNames(this)) {
                if (!Object.prototype.hasOwnProperty.call(rollbackState.ownProperties, name)) delete (this as any)[name];
            }
            Object.defineProperties(this, rollbackState.ownProperties);
            (this as any)._ledgerId = rollbackState.ledgerId;
            (this as any)._action = rollbackState.action;
            (this as any)._loadedFields = rollbackState.loadedFields;
            (this as any)._fullyLoaded = rollbackState.fullyLoaded;
            LoadedScalarSnapshot.restoreFor(this, rollbackState.loadedSnapshot);
            (this as any)._root.rekey(newKey, oldKey);
        });
        (this as any)._loadedFields = new Set(Object.keys(result.persistedRecord));
        (this as any)._fullyLoaded = false;
        if (mutation.action !== "Delete") (this as any)._action = "Update";
        graph.acceptPreparedResult((this as any)._root, oldKey, newKey);
        const scope = request.scopeFor(newKey);
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.customer;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("customer") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCustomer(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        service.afterGraphCommit(() => {
            graph.validatePreparedSources();
            LoadedScalarSnapshot.restoreFor(this, committedSnapshot);
            (this as any)._root.clearEntity(newKey);
            if ((this as any).version !== undefined) (this as any)._root.acceptCommittedVersion(newKey, (this as any).version);
            graph.finishPreparedCommit((this as any)._root, newKey);
        });
        return this;
    }

    private teaqlMutationPayload(): Record<string, unknown> {
        return {
            "id": this.id,
            "platform": this.platform,
            "name": this.name,
            "version": this.version
        };
    }

    private teaqlScalarSnapshot(): LoadedScalarSnapshot {
        return new LoadedScalarSnapshot(this.teaqlMutationPayload(), this.teaqlEntityKey(), (this as any).version);
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

    updateVersion(value: EntityVersion): this {
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

    customerOrderList(): SmartList<CustomerOrder> {
        return (this as any)._customerOrderList;
    }
}