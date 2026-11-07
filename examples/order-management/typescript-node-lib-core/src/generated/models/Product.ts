import { CheckException, integer32Error, internalId, Decimal, decimal, Long, long, LocalTime, localTime, EntityVersion, entityVersion, nextEntityVersion, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationIntent, MutationTraceScope, ObjectLocation, SmartList, TeaQLDataService, UserContext } from '../../teaql-ts';
import { CommercePlatform } from './CommercePlatform';
import { OrderLine } from './OrderLine';

export class Product {
    private static teaqlTemporaryId = 0;
    private static readonly teaqlMutationFields = new MutationFieldLayout("Product",
        ["id", "name", "sku", "image_url", "commerce_platform", "create_time", "update_time", "version"], { id: "immutable_field", version: "immutable_field" });
        id?: string;
        name?: string;
        sku?: string;
        imageUrl?: string | null;
        commercePlatform?: CommercePlatform | string;
        createTime?: string;
        updateTime?: string;
        version?: EntityVersion;

    constructor(init?: Partial<Product>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --Product.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_orderLineList", { value: init?.id ? SmartList.empty() : new SmartList(), writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            delete fields["orderLineList"];
            Object.assign(this, fields);
            if ((init as any).commercePlatform && typeof (init as any).commercePlatform === "object") {
                this.commercePlatform = (init as any).commercePlatform instanceof CommercePlatform
                    ? (init as any).commercePlatform
                    : CommercePlatform.fromRecord((init as any).commercePlatform);
                this.markLoaded("commercePlatform");
            }
            if (Array.isArray((init as any).orderLineList)) {
                const selected = (init as any).orderLineList;
                (this as any)._orderLineList = new SmartList(selected.map(
                    (child: unknown) => child instanceof OrderLine
                        ? child
                        : OrderLine.fromRecord(child as Record<string, unknown>),
                ), { totalCount: selected.totalCount, aggregations: selected.aggregations,
                    summary: selected.summary, facets: selected.facets, isLoaded: selected.isLoaded ?? true });
                this.markLoaded("orderLineList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any).version !== undefined) (this as any).version = entityVersion((this as any).version);
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, (this as any).version);
        LoadedScalarSnapshot.captureFor(this, this.teaqlMutationPayload(), key, (this as any).version);
    }

    private teaqlEntityKey(): EntityKey { return { entity: "Product", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            root.mergeEntityFrom((this as any)._root, this.teaqlEntityKey());
            (this as any)._root = root;
        }
        for (const child of (this as any)._orderLineList) child.teaqlAttachRoot(root, hydration);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): Product {
        const entity = new Product(record as Partial<Product>);
        return root ? entity.teaqlAttachRoot(root, true) : entity;
    }

    toJSON(): Record<string, unknown> {
        const result = Object.fromEntries(Object.entries(this));
        if (this.isLoaded("orderLineList")) result["orderLineList"] = (this as any)._orderLineList;
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

    static refer(id: string | number): Product {
        return new Product({ id: String(id) } as Partial<Product>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): Product {
        return Product.teaqlNewWithId(internalId(id));
    }

    /** @internal Q calls this only after Context allocation has completed. */
    static teaqlNewWithId(value: string): Product {
        const id = internalId(value);
        const entity = new Product();
        const previous = entity.teaqlEntityKey();
        entity.updateId(id);
        (entity as any)._ledgerId = id;
        (entity as any)._root.rekey(previous, entity.teaqlEntityKey());
        return entity;
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

    async save(context: UserContext): Promise<Product> {
        const intent = new MutationIntent((this as any)._comment);
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

    /** @internal Read-only first pass: no ledger attachment, FK edits or no-op shortcut. */
    private teaqlValidateLoadedIdentities(seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        LoadedScalarSnapshot.forEntity(this)?.validateNativeIdentity(this.teaqlEntityKey(), this.id, this.version);
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
    }

    /** @internal Cancel known no-ops across the graph before any derived FK edits. */
    private teaqlDiscardRestoredGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Product.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        for (const child of (this as any)._orderLineList) child.teaqlDiscardRestoredGraph(graph, seen);
    }

    /** @internal Model-key admission precedes restoration; only intended edits may normalize FKs. */
    private teaqlNormalizeGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(Product.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        graph.registerSource(this, (this as any)._root, this.teaqlEntityKey(), {
            "commerce_platform": "CommercePlatform"
        }, () => ({ ...this.teaqlMutationPayload(),
            __teaql_key: this.teaqlEntityKey(), __teaql_action: (this as any)._action,
            __teaql_comment: (this as any)._comment,
            __teaql_load: {fullyLoaded: (this as any)._fullyLoaded, fields: [...(this as any)._loadedFields].sort()},
            "order_line_list": graph.sourceMembers((this as any)._orderLineList)
        }));
        for (const child of (this as any)._orderLineList) {
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.product;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("product") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateProduct(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
    }

    /** @internal Whole-input version/completeness pass; does not use Context or Fix. */
    private teaqlAdmitGraph(seen = new Set<object>()): boolean {
        if (seen.has(this)) return false;
        seen.add(this);
        const action = (this as any)._action;
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        LoadedScalarSnapshot.forEntity(this)?.validateMutationVersion((this as any)._root, this.teaqlEntityKey());
        Product.teaqlMutationFields.validate((this as any)._root.change(this.teaqlEntityKey()), action === "Update");
        if (pending) {
            nextEntityVersion(action, (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? this.version);
            if (action === "Update") {
                const notLoaded = [{ member: "id", canonical: "id" }, { member: "name", canonical: "name" }, { member: "sku", canonical: "sku" }, { member: "imageUrl", canonical: "image_url" }, { member: "commercePlatform", canonical: "commerce_platform" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }].find(field => !this.isLoaded(field.member));
                if (notLoaded) throw new CheckException([{ruleId: "invalid_type", entityType: "Product", location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity"}]);
            }
        }
        let graphPending = pending;
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
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
        graph.discardRestoredFields(Product.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "name", canonical: "name" }, { member: "sku", canonical: "sku" }, { member: "imageUrl", canonical: "image_url" }, { member: "commercePlatform", canonical: "commerce_platform" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    entityType: "Product",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        const request = graph.request({
            entity: "Product", action,
            payload: action === "Update"
                ? (this as any)._root.change(this.teaqlEntityKey())
                : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? (this as any).version,
            comment: (this as any)._comment,
            ledgerKey: this.teaqlEntityKey(), ledgerRoot: (this as any)._root,
        }, parent, (this as any)._comment).withLoadedSnapshot(LoadedScalarSnapshot.forEntity(this) ?? new LoadedScalarSnapshot());
        if (pending) service.preflightMutation(request);
        const scope = request.scopeFor(this.teaqlEntityKey());
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.product;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("product") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateProduct(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): Promise<Product> {
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return this;
        seen.add(this);
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "Product",
            action: (this as any)._action,
            payload: action === "Update" ? ledgerPayload : this.teaqlMutationPayload(),
            id: (this as any).id,
            version: (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? (this as any).version,
            comment: (this as any)._comment
            ,ledgerKey: this.teaqlEntityKey()
            ,ledgerRoot: (this as any)._root
        };
        const request = graph.request(mutation, parent, (this as any)._comment)
            .withLoadedSnapshot(LoadedScalarSnapshot.forEntity(this) ?? new LoadedScalarSnapshot());
        if (action === "Update" && !(this as any)._root.hasPending(this.teaqlEntityKey())) {
            const scope = request.scopeFor(this.teaqlEntityKey());
            for (const [index, child] of (this as any)._orderLineList.entries()) {
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.product;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("product") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateProduct(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("order_line_list").index(index);
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
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.product;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("product") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateProduct(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
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
            "name": this.name,
            "sku": this.sku,
            "image_url": this.imageUrl,
            "commerce_platform": this.commercePlatform,
            "create_time": this.createTime,
            "update_time": this.updateTime,
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

    updateSku(value: string): this {
        this.sku = value;
        this.markLoaded("sku");
        (this as any)._root.set(this.teaqlEntityKey(), "sku", value);
        return this;
    }

    updateImageUrl(value: string | null): this {
        this.imageUrl = value;
        this.markLoaded("imageUrl");
        (this as any)._root.set(this.teaqlEntityKey(), "image_url", value);
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

    updateVersion(value: EntityVersion): this {
        this.version = value;
        this.markLoaded("version");
        (this as any)._root.set(this.teaqlEntityKey(), "version", value);
        return this;
    }
    updateCommercePlatform(value: any): this {
        this.commercePlatform = value?.id ?? value;
        this.markLoaded("commercePlatform");
        (this as any)._root.set(this.teaqlEntityKey(), "commerce_platform", this.commercePlatform);
        return this;
    }

    orderLineList(): SmartList<OrderLine> {
        return (this as any)._orderLineList;
    }
}