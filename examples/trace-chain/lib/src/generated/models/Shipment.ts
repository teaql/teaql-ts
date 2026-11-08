import { CheckException, integer32Error, EntityCreation, EntityCreationError, Decimal, decimal, Long, long, LocalTime, localTime, EntityVersion, entityVersion, nextEntityVersion, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationIntent, MutationTraceScope, ObjectLocation, SmartList, TeaQLDataService, UserContext } from '../../teaql-ts';
import { CustomerOrder } from './CustomerOrder';

const teaqlConstruction = Symbol("managed entity construction");

export class Shipment {
    private static teaqlTemporaryId = 0;
    private static readonly teaqlMutationFields = new MutationFieldLayout("Shipment",
        ["id", "customer_order", "reference_code", "version"], { id: "immutable_field", version: "immutable_field" });
        id?: string;
        customerOrder?: CustomerOrder | string;
        referenceCode?: string;
        version?: EntityVersion;

    private constructor(init?: Partial<Shipment>, token?: symbol, creation = false) {
        if (token !== teaqlConstruction) throw new EntityCreationError();
        Object.defineProperty(this, "_action", { value: creation ? "Create" : "Update", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: creation, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Shipment.teaqlTemporaryId, writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            for (const key of ["_action", "_comment", "_fullyLoaded", "_loadedFields", "_root", "_ledgerId"]) delete fields[key];
            Object.assign(this, fields);
            if ((init as any).customerOrder && typeof (init as any).customerOrder === "object") {
                this.customerOrder = (init as any).customerOrder instanceof CustomerOrder
                    ? (init as any).customerOrder
                    : CustomerOrder.fromRecord((init as any).customerOrder);
                this.markLoaded("customerOrder");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any).version !== undefined) (this as any).version = entityVersion((this as any).version);
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, (this as any).version);
        LoadedScalarSnapshot.captureFor(this, this.teaqlMutationPayload(), key, (this as any).version,
            creation ? "creationBaseline" : "hydrated");
    }

    private teaqlEntityKey(): EntityKey { return { entity: "Shipment", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            root.mergeEntityFrom((this as any)._root, this.teaqlEntityKey());
            (this as any)._root = root;
        }
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): Shipment {
        const entity = EntityCreation.hydrated(new Shipment(record as Partial<Shipment>, teaqlConstruction));
        return root ? entity.teaqlAttachRoot(root, true) : entity;
    }

    toJSON(): Record<string, unknown> {
        const result = Object.fromEntries(Object.entries(this));
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

    static refer(id: string | number): Shipment {
        return Shipment.fromRecord({ id: String(id) });
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(context: UserContext, id: string | number): Shipment {
        return EntityCreation.bootstrap(context, "Shipment", id,
            reserved => new Shipment({id: reserved} as Partial<Shipment>, teaqlConstruction, true));
    }

    /** @internal Q owns the awaited public creation entry point. */
    static teaqlCreate(context: UserContext): Promise<Shipment> {
        return EntityCreation.create(context, "Shipment",
            reserved => new Shipment({id: reserved} as Partial<Shipment>, teaqlConstruction, true));
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

    async save(context: UserContext): Promise<Shipment> {
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
        return pending;
    }

    /** @internal Read-only first pass: no ledger attachment, FK edits or no-op shortcut. */
    private teaqlValidateLoadedIdentities(seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        LoadedScalarSnapshot.forEntity(this)?.validateNativeIdentity(this.teaqlEntityKey(), this.id, this.version);
    }

    /** @internal Cancel known no-ops across the graph before any derived FK edits. */
    private teaqlDiscardRestoredGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Shipment.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
    }

    /** @internal Model-key admission precedes restoration; only intended edits may normalize FKs. */
    private teaqlNormalizeGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Shipment.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        graph.registerSource(this, (this as any)._root, this.teaqlEntityKey(), {
            "customer_order": "CustomerOrder"
        }, () => ({ ...this.teaqlMutationPayload(),
            __teaql_key: this.teaqlEntityKey(), __teaql_action: (this as any)._action,
            __teaql_comment: (this as any)._comment,
            __teaql_load: {fullyLoaded: (this as any)._fullyLoaded, fields: [...(this as any)._loadedFields].sort()},
        }));
    }

    /** @internal Whole-input version/completeness pass; does not use Context or Fix. */
    private teaqlAdmitGraph(seen = new Set<object>()): boolean {
        if (seen.has(this)) return false;
        seen.add(this);
        const action = (this as any)._action;
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        EntityCreation.requireMutation(this, this.teaqlEntityKey(), this.id, action, (this as any)._root, pending);
        LoadedScalarSnapshot.forEntity(this)?.validateMutationVersion((this as any)._root, this.teaqlEntityKey());
        Shipment.teaqlMutationFields.validate((this as any)._root.change(this.teaqlEntityKey()), action === "Update");
        if (pending) {
            nextEntityVersion(action, LoadedScalarSnapshot.forEntity(this)?.persistedVersion);
            if (action === "Update") {
                const notLoaded = [{ member: "id", canonical: "id" }, { member: "customerOrder", canonical: "customer_order" }, { member: "referenceCode", canonical: "reference_code" }, { member: "version", canonical: "version" }].find(field => !this.isLoaded(field.member));
                if (notLoaded) throw new CheckException([{ruleId: "invalid_type", entityType: "Shipment", location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity"}]);
            }
        }
        let graphPending = pending;
        return graphPending;
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): void {
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return;
        seen.add(this);
        const action = (this as any)._action;
        graph.discardRestoredFields(Shipment.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "customerOrder", canonical: "customer_order" }, { member: "referenceCode", canonical: "reference_code" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    entityType: "Shipment",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        const request = graph.request({
            entity: "Shipment", action,
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
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): Promise<Shipment> {
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return this;
        seen.add(this);
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Shipment",
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
            "customer_order": this.customerOrder,
            "reference_code": this.referenceCode,
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

    updateReferenceCode(value: string): this {
        this.referenceCode = value;
        this.markLoaded("referenceCode");
        (this as any)._root.set(this.teaqlEntityKey(), "reference_code", value);
        return this;
    }

    updateVersion(value: EntityVersion): this {
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

}