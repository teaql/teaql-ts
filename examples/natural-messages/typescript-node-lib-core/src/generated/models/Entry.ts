import { CheckException, integer32Error, EntityCreation, EntityCreationError, Decimal, decimal, Long, long, LocalTime, localTime, EntityVersion, entityVersion, nextEntityVersion, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationIntent, MutationTraceScope, ObjectLocation, SmartList, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Catalog } from './Catalog';

const teaqlConstruction = Symbol("managed entity construction");

export class Entry {
    /** @internal Generated names shared by requests and entity state. */
    static readonly __teaqlFields = {
        ID_PROPERTY: { member: "id", model: "id" },
        CATALOG_PROPERTY: { member: "catalog", model: "catalog" },
        NAME_PROPERTY: { member: "name", model: "name" },
        BORN_AT_PROPERTY: { member: "bornAt", model: "born_at" },
        TOUCHED_AT_PROPERTY: { member: "touchedAt", model: "touched_at" },
        VERSION_PROPERTY: { member: "version", model: "version" }
    } as const;

    private static teaqlTemporaryId = 0;
    private static readonly teaqlMutationFields = new MutationFieldLayout("Entry",
        [Entry.__teaqlFields.ID_PROPERTY.model, Entry.__teaqlFields.CATALOG_PROPERTY.model, Entry.__teaqlFields.NAME_PROPERTY.model, Entry.__teaqlFields.BORN_AT_PROPERTY.model, Entry.__teaqlFields.TOUCHED_AT_PROPERTY.model, Entry.__teaqlFields.VERSION_PROPERTY.model], { id: "immutable_field", version: "immutable_field" });
        id?: string;
        catalog?: Catalog | string;
        name?: string;
        bornAt?: string;
        touchedAt?: string;
        version?: EntityVersion;

    private constructor(init?: Partial<Entry>, token?: symbol, creation = false) {
        if (token !== teaqlConstruction) throw new EntityCreationError();
        Object.defineProperty(this, "_action", { value: creation ? "Create" : "Update", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: creation, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Entry.teaqlTemporaryId, writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            for (const key of ["_action", "_comment", "_fullyLoaded", "_loadedFields", "_root", "_ledgerId"]) delete fields[key];
            Object.assign(this, fields);
            if ((init as any).catalog && typeof (init as any).catalog === "object") {
                this.catalog = (init as any).catalog instanceof Catalog
                    ? (init as any).catalog
                    : Catalog.fromRecord((init as any).catalog);
                this.markLoaded(Entry.__teaqlFields.CATALOG_PROPERTY.member);
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any).version !== undefined) (this as any).version = entityVersion((this as any).version);
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, (this as any).version);
        LoadedScalarSnapshot.captureFor(this, this.teaqlMutationPayload(), key, (this as any).version,
            creation ? "creationBaseline" : "hydrated");
    }

    private teaqlEntityKey(): EntityKey { return { entity: "Entry", id: (this as any)._ledgerId }; }
    /** @internal Restore known equal scalars after the prepared graph completes. */
    private teaqlRestoreFixedValues(values: Readonly<Record<string, unknown>>): void {
        for (const field of [{ member: Entry.__teaqlFields.ID_PROPERTY.member, canonical: Entry.__teaqlFields.ID_PROPERTY.model }, { member: Entry.__teaqlFields.NAME_PROPERTY.member, canonical: Entry.__teaqlFields.NAME_PROPERTY.model }, { member: Entry.__teaqlFields.BORN_AT_PROPERTY.member, canonical: Entry.__teaqlFields.BORN_AT_PROPERTY.model }, { member: Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, canonical: Entry.__teaqlFields.TOUCHED_AT_PROPERTY.model }, { member: Entry.__teaqlFields.VERSION_PROPERTY.member, canonical: Entry.__teaqlFields.VERSION_PROPERTY.model }]) {
            if (Object.prototype.hasOwnProperty.call(values, field.canonical)) (this as any)[field.member] = values[field.canonical];
        }
    }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            root.mergeEntityFrom((this as any)._root, this.teaqlEntityKey());
            (this as any)._root = root;
        }
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): Entry {
        const entity = EntityCreation.hydrated(new Entry(record as Partial<Entry>, teaqlConstruction));
        return root ? entity.teaqlAttachRoot(root, true) : entity;
    }

    toJSON(): Record<string, unknown> {
        return this.teaqlJson(new Set());
    }

    private static teaqlJsonValue(value: any, active: Set<object>): any {
        if (value === null || value === undefined) return value;
        if (typeof value.teaqlJson === "function") return value.teaqlJson(active);
        if (Array.isArray(value)) return Array.from(value, item => this.teaqlJsonValue(item, active));
        if (typeof value.toJSON === "function") return value.toJSON();
        if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(
            ([key, item]) => [key, this.teaqlJsonValue(item, active)]));
        return typeof value === "bigint" ? value.toString() : value;
    }

    private teaqlJson(active: Set<object>): Record<string, unknown> {
        if (active.has(this)) return { id: this.id, version: this.version };
        active.add(this);
        try {
            // Only enumerable business/query data participates; runtime state is private.
            const payload = Object.fromEntries(Object.entries(this).filter(([key]) => this.isLoaded(key))
                .map(([key, value]) => [key, Entry.teaqlJsonValue(value, active)]));
            return payload;
        } finally { active.delete(this); }
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

    static refer(id: string | number): Entry {
        return Entry.fromRecord({ id: String(id) });
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(context: UserContext, id: string | number): Entry {
        return EntityCreation.bootstrap(context, "Entry", id,
            reserved => new Entry({id: reserved} as Partial<Entry>, teaqlConstruction, true));
    }

    /** @internal Q owns the awaited public creation entry point. */
    static teaqlCreate(context: UserContext): Promise<Entry> {
        return EntityCreation.create(context, "Entry",
            reserved => new Entry({id: reserved} as Partial<Entry>, teaqlConstruction, true));
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

    async save(context: UserContext): Promise<Entry> {
        const intent = new MutationIntent((this as any)._comment);
        this.teaqlValidateLoadedIdentities();
        if (this.teaqlIsCancelledNew()) throw new CheckException([{ruleId: "invalid_deletion_state",
            entityType: "Entry", location: ObjectLocation.property("id"),
            message: "Cannot save a cancelled new root"}]);
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

    /** @internal Cancellation is admitted only for a real Context-reserved creation. */
    private teaqlIsCancelledNew(): boolean {
        const key = this.teaqlEntityKey(), root = (this as any)._root;
        if ((this as any)._action !== "Delete" || !root.isNew(key) || !root.isDeleted(key)) return false;
        EntityCreation.requireMutation(this, key, this.id, "Create", root, true);
        return true;
    }

    /** @internal Pure pending-state check; nested cancellation is not an implicit cascade. */
    private teaqlHasPendingGraph(seen = new Set<object>()): boolean {
        if (seen.has(this)) return false;
        seen.add(this);
        let pending = (this as any)._action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        return pending;
    }

    /** @internal Pure provenance pass before resolving any Context resources. */
    private teaqlValidateMutationOrigins(seen = new Set<object>()): boolean {
        if (this.teaqlIsCancelledNew()) return false;
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
        if (this.teaqlIsCancelledNew()) return;
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Entry.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
    }

    /** @internal Model-key admission precedes restoration; only intended edits may normalize FKs. */
    private teaqlNormalizeGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Entry.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        graph.registerSource(this, (this as any)._root, this.teaqlEntityKey(), {
            [Entry.__teaqlFields.CATALOG_PROPERTY.model]: "Catalog"
        }, () => ({ ...this.teaqlMutationPayload(),
            __teaql_key: this.teaqlEntityKey(), __teaql_action: (this as any)._action,
            __teaql_comment: (this as any)._comment,
            __teaql_load: {fullyLoaded: (this as any)._fullyLoaded, fields: [...(this as any)._loadedFields].sort()},
        }));
        // Keep omitted nodes in the immutable input review, not in the write plan.
        if (this.teaqlIsCancelledNew()) return;
    }

    /** @internal Whole-input version/completeness pass; does not use Context or Fix. */
    private teaqlAdmitGraph(seen = new Set<object>()): boolean {
        if (this.teaqlIsCancelledNew()) return false;
        if (seen.has(this)) return false;
        seen.add(this);
        const action = (this as any)._action;
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        EntityCreation.requireMutation(this, this.teaqlEntityKey(), this.id, action, (this as any)._root, pending);
        LoadedScalarSnapshot.forEntity(this)?.validateMutationVersion((this as any)._root, this.teaqlEntityKey());
        Entry.teaqlMutationFields.validate((this as any)._root.change(this.teaqlEntityKey()), action === "Update");
        if (pending) {
            nextEntityVersion(action, LoadedScalarSnapshot.forEntity(this)?.persistedVersion);
            if (action === "Update") {
                const notLoaded = [{ member: Entry.__teaqlFields.ID_PROPERTY.member, canonical: Entry.__teaqlFields.ID_PROPERTY.model }, { member: Entry.__teaqlFields.CATALOG_PROPERTY.member, canonical: Entry.__teaqlFields.CATALOG_PROPERTY.model }, { member: Entry.__teaqlFields.NAME_PROPERTY.member, canonical: Entry.__teaqlFields.NAME_PROPERTY.model }, { member: Entry.__teaqlFields.BORN_AT_PROPERTY.member, canonical: Entry.__teaqlFields.BORN_AT_PROPERTY.model }, { member: Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, canonical: Entry.__teaqlFields.TOUCHED_AT_PROPERTY.model }, { member: Entry.__teaqlFields.VERSION_PROPERTY.member, canonical: Entry.__teaqlFields.VERSION_PROPERTY.model }].find(field => !this.isLoaded(field.member));
                if (notLoaded) throw new CheckException([{ruleId: "invalid_type", entityType: "Entry", location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity"}]);
            }
        }
        let graphPending = pending;
        return graphPending;
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): void {
        if (this.teaqlIsCancelledNew()) return;
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return;
        seen.add(this);
        const action = (this as any)._action;
        graph.discardRestoredFields(Entry.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: Entry.__teaqlFields.ID_PROPERTY.member, canonical: Entry.__teaqlFields.ID_PROPERTY.model }, { member: Entry.__teaqlFields.CATALOG_PROPERTY.member, canonical: Entry.__teaqlFields.CATALOG_PROPERTY.model }, { member: Entry.__teaqlFields.NAME_PROPERTY.member, canonical: Entry.__teaqlFields.NAME_PROPERTY.model }, { member: Entry.__teaqlFields.BORN_AT_PROPERTY.member, canonical: Entry.__teaqlFields.BORN_AT_PROPERTY.model }, { member: Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member, canonical: Entry.__teaqlFields.TOUCHED_AT_PROPERTY.model }, { member: Entry.__teaqlFields.VERSION_PROPERTY.member, canonical: Entry.__teaqlFields.VERSION_PROPERTY.model }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    entityType: "Entry",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        const request = graph.request({
            entity: "Entry", action,
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
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): Promise<Entry> {
        if (this.teaqlIsCancelledNew()) { graph.validatePreparedSources(); return this; }
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return this;
        seen.add(this);
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Entry",
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
        // Normalize the native action before the prepared result captures it.
        // The ledger keeps pending deletion until commit; rollback restores
        // rollbackState.action so the same graph can retry every mutation kind.
        (this as any)._action = "Update";
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
            [Entry.__teaqlFields.ID_PROPERTY.model]: this.id,
            [Entry.__teaqlFields.CATALOG_PROPERTY.model]: this.catalog,
            [Entry.__teaqlFields.NAME_PROPERTY.model]: this.name,
            [Entry.__teaqlFields.BORN_AT_PROPERTY.model]: this.bornAt,
            [Entry.__teaqlFields.TOUCHED_AT_PROPERTY.model]: this.touchedAt,
            [Entry.__teaqlFields.VERSION_PROPERTY.model]: this.version
        };
    }

    private teaqlScalarSnapshot(): LoadedScalarSnapshot {
        return new LoadedScalarSnapshot(this.teaqlMutationPayload(), this.teaqlEntityKey(), (this as any).version);
    }

    updateId(value: string): this {
        this.id = value;
        this.markLoaded(Entry.__teaqlFields.ID_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), Entry.__teaqlFields.ID_PROPERTY.model, value);
        return this;
    }

    updateName(value: string): this {
        this.name = value;
        this.markLoaded(Entry.__teaqlFields.NAME_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), Entry.__teaqlFields.NAME_PROPERTY.model, value);
        return this;
    }

    updateBornAt(value: string): this {
        this.bornAt = value;
        this.markLoaded(Entry.__teaqlFields.BORN_AT_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), Entry.__teaqlFields.BORN_AT_PROPERTY.model, value);
        return this;
    }

    updateTouchedAt(value: string): this {
        this.touchedAt = value;
        this.markLoaded(Entry.__teaqlFields.TOUCHED_AT_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), Entry.__teaqlFields.TOUCHED_AT_PROPERTY.model, value);
        return this;
    }

    updateVersion(value: EntityVersion): this {
        this.version = value;
        this.markLoaded(Entry.__teaqlFields.VERSION_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), Entry.__teaqlFields.VERSION_PROPERTY.model, value);
        return this;
    }
    updateCatalog(value: any): this {
        this.catalog = value?.id ?? value;
        this.markLoaded(Entry.__teaqlFields.CATALOG_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), Entry.__teaqlFields.CATALOG_PROPERTY.model, this.catalog);
        return this;
    }

}