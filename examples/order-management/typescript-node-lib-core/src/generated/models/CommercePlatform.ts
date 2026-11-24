import { CheckException, integer32Error, EntityCreation, EntityCreationError, Decimal, decimal, Long, long, LocalTime, localTime, EntityVersion, entityVersion, nextEntityVersion, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationIntent, MutationTraceScope, ObjectLocation, SmartList, TeaQLDataService, UserContext } from '../../teaql-ts';
import { Customer } from './Customer';
import { OrderStatus } from './OrderStatus';
import { CustomerOrder } from './CustomerOrder';
import { Product } from './Product';
import { OrderLine } from './OrderLine';
import { OrderSearchPreset } from './OrderSearchPreset';

const teaqlConstruction = Symbol("managed entity construction");

export class CommercePlatform {
    /** @internal Generated names shared by requests and entity state. */
    static readonly __teaqlFields = {
        ID_PROPERTY: { member: "id", model: "id" },
        NAME_PROPERTY: { member: "name", model: "name" },
        CREATE_TIME_PROPERTY: { member: "createTime", model: "create_time" },
        UPDATE_TIME_PROPERTY: { member: "updateTime", model: "update_time" },
        VERSION_PROPERTY: { member: "version", model: "version" }
    } as const;

    private static teaqlTemporaryId = 0;
    private static readonly teaqlMutationFields = new MutationFieldLayout("CommercePlatform",
        [CommercePlatform.__teaqlFields.ID_PROPERTY.model, CommercePlatform.__teaqlFields.NAME_PROPERTY.model, CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.model, CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.model, CommercePlatform.__teaqlFields.VERSION_PROPERTY.model], { id: "immutable_field", version: "immutable_field" });
        id?: string;
        name?: string;
        createTime?: string;
        updateTime?: string;
        version?: EntityVersion;

    private constructor(init?: Partial<CommercePlatform>, token?: symbol, creation = false) {
        if (token !== teaqlConstruction) throw new EntityCreationError();
        Object.defineProperty(this, "_action", { value: creation ? "Create" : "Update", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: creation, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --CommercePlatform.teaqlTemporaryId, writable: true, enumerable: false });
        Object.defineProperty(this, "_customerList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        Object.defineProperty(this, "_orderStatusList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        Object.defineProperty(this, "_customerOrderList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        Object.defineProperty(this, "_productList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        Object.defineProperty(this, "_orderLineList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        Object.defineProperty(this, "_orderSearchPresetList", { value: creation ? new SmartList() : SmartList.empty(), writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            for (const key of ["_action", "_comment", "_fullyLoaded", "_loadedFields", "_root", "_ledgerId"]) delete fields[key];
            delete fields["customerList"];
            delete fields["orderStatusList"];
            delete fields["customerOrderList"];
            delete fields["productList"];
            delete fields["orderLineList"];
            delete fields["orderSearchPresetList"];
            Object.assign(this, fields);
            if (Array.isArray((init as any).customerList)) {
                const selected = (init as any).customerList;
                (this as any)._customerList = new SmartList(selected.map(
                    (child: unknown) => child instanceof Customer
                        ? child
                        : Customer.fromRecord(child as Record<string, unknown>),
                ), { totalCount: selected.totalCount, aggregations: selected.aggregations,
                    summary: selected.summary, facets: selected.facets, isLoaded: selected.isLoaded ?? true });
                this.markLoaded("customerList");
            }
            if (Array.isArray((init as any).orderStatusList)) {
                const selected = (init as any).orderStatusList;
                (this as any)._orderStatusList = new SmartList(selected.map(
                    (child: unknown) => child instanceof OrderStatus
                        ? child
                        : OrderStatus.fromRecord(child as Record<string, unknown>),
                ), { totalCount: selected.totalCount, aggregations: selected.aggregations,
                    summary: selected.summary, facets: selected.facets, isLoaded: selected.isLoaded ?? true });
                this.markLoaded("orderStatusList");
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
            if (Array.isArray((init as any).productList)) {
                const selected = (init as any).productList;
                (this as any)._productList = new SmartList(selected.map(
                    (child: unknown) => child instanceof Product
                        ? child
                        : Product.fromRecord(child as Record<string, unknown>),
                ), { totalCount: selected.totalCount, aggregations: selected.aggregations,
                    summary: selected.summary, facets: selected.facets, isLoaded: selected.isLoaded ?? true });
                this.markLoaded("productList");
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
            if (Array.isArray((init as any).orderSearchPresetList)) {
                const selected = (init as any).orderSearchPresetList;
                (this as any)._orderSearchPresetList = new SmartList(selected.map(
                    (child: unknown) => child instanceof OrderSearchPreset
                        ? child
                        : OrderSearchPreset.fromRecord(child as Record<string, unknown>),
                ), { totalCount: selected.totalCount, aggregations: selected.aggregations,
                    summary: selected.summary, facets: selected.facets, isLoaded: selected.isLoaded ?? true });
                this.markLoaded("orderSearchPresetList");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any).version !== undefined) (this as any).version = entityVersion((this as any).version);
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, (this as any).version);
        LoadedScalarSnapshot.captureFor(this, this.teaqlMutationPayload(), key, (this as any).version,
            creation ? "creationBaseline" : "hydrated");
    }

    private teaqlEntityKey(): EntityKey { return { entity: "CommercePlatform", id: (this as any)._ledgerId }; }
    /** @internal Restore known equal scalars after the prepared graph completes. */
    private teaqlRestoreFixedValues(values: Readonly<Record<string, unknown>>): void {
        for (const field of [{ member: CommercePlatform.__teaqlFields.ID_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.ID_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.NAME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.NAME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.VERSION_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.VERSION_PROPERTY.model }]) {
            if (Object.prototype.hasOwnProperty.call(values, field.canonical)) (this as any)[field.member] = values[field.canonical];
        }
    }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            root.mergeEntityFrom((this as any)._root, this.teaqlEntityKey());
            (this as any)._root = root;
        }
        for (const child of (this as any)._customerList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._orderStatusList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._customerOrderList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._productList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._orderLineList) child.teaqlAttachRoot(root, hydration);
        for (const child of (this as any)._orderSearchPresetList) child.teaqlAttachRoot(root, hydration);
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): CommercePlatform {
        const entity = EntityCreation.hydrated(new CommercePlatform(record as Partial<CommercePlatform>, teaqlConstruction));
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
                .map(([key, value]) => [key, CommercePlatform.teaqlJsonValue(value, active)]));
            const childrenCustomerList = this.customerList();
            if (childrenCustomerList.isLoaded || childrenCustomerList.some(child =>
                (child as any)._root.hasPending((child as any).teaqlEntityKey()))) {
                payload["customerList"] = CommercePlatform.teaqlJsonValue(childrenCustomerList, active);
            }
            const childrenOrderStatusList = this.orderStatusList();
            if (childrenOrderStatusList.isLoaded || childrenOrderStatusList.some(child =>
                (child as any)._root.hasPending((child as any).teaqlEntityKey()))) {
                payload["orderStatusList"] = CommercePlatform.teaqlJsonValue(childrenOrderStatusList, active);
            }
            const childrenCustomerOrderList = this.customerOrderList();
            if (childrenCustomerOrderList.isLoaded || childrenCustomerOrderList.some(child =>
                (child as any)._root.hasPending((child as any).teaqlEntityKey()))) {
                payload["customerOrderList"] = CommercePlatform.teaqlJsonValue(childrenCustomerOrderList, active);
            }
            const childrenProductList = this.productList();
            if (childrenProductList.isLoaded || childrenProductList.some(child =>
                (child as any)._root.hasPending((child as any).teaqlEntityKey()))) {
                payload["productList"] = CommercePlatform.teaqlJsonValue(childrenProductList, active);
            }
            const childrenOrderLineList = this.orderLineList();
            if (childrenOrderLineList.isLoaded || childrenOrderLineList.some(child =>
                (child as any)._root.hasPending((child as any).teaqlEntityKey()))) {
                payload["orderLineList"] = CommercePlatform.teaqlJsonValue(childrenOrderLineList, active);
            }
            const childrenOrderSearchPresetList = this.orderSearchPresetList();
            if (childrenOrderSearchPresetList.isLoaded || childrenOrderSearchPresetList.some(child =>
                (child as any)._root.hasPending((child as any).teaqlEntityKey()))) {
                payload["orderSearchPresetList"] = CommercePlatform.teaqlJsonValue(childrenOrderSearchPresetList, active);
            }
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

    static refer(id: string | number): CommercePlatform {
        return CommercePlatform.fromRecord({ id: String(id) });
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(context: UserContext, id: string | number): CommercePlatform {
        return EntityCreation.bootstrap(context, "CommercePlatform", id,
            reserved => new CommercePlatform({id: reserved} as Partial<CommercePlatform>, teaqlConstruction, true));
    }

    /** @internal Q owns the awaited public creation entry point. */
    static teaqlCreate(context: UserContext): Promise<CommercePlatform> {
        return EntityCreation.create(context, "CommercePlatform",
            reserved => new CommercePlatform({id: reserved} as Partial<CommercePlatform>, teaqlConstruction, true));
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

    async save(context: UserContext): Promise<CommercePlatform> {
        const intent = new MutationIntent((this as any)._comment);
        this.teaqlValidateLoadedIdentities();
        if (this.teaqlIsCancelledNew()) throw new CheckException([{ruleId: "invalid_deletion_state",
            entityType: "CommercePlatform", location: ObjectLocation.property("id"),
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
        for (const child of (this as any)._customerList) {
            if (child.teaqlHasPendingGraph(new Set<object>([this]))) throw new CheckException([{ruleId: "invalid_deletion_state",
                entityType: "CommercePlatform", location: ObjectLocation.property("customer_list"),
                message: "Cancelled new entity has pending descendants; explicit resolution is required"}]);
        }
        for (const child of (this as any)._orderStatusList) {
            if (child.teaqlHasPendingGraph(new Set<object>([this]))) throw new CheckException([{ruleId: "invalid_deletion_state",
                entityType: "CommercePlatform", location: ObjectLocation.property("order_status_list"),
                message: "Cancelled new entity has pending descendants; explicit resolution is required"}]);
        }
        for (const child of (this as any)._customerOrderList) {
            if (child.teaqlHasPendingGraph(new Set<object>([this]))) throw new CheckException([{ruleId: "invalid_deletion_state",
                entityType: "CommercePlatform", location: ObjectLocation.property("customer_order_list"),
                message: "Cancelled new entity has pending descendants; explicit resolution is required"}]);
        }
        for (const child of (this as any)._productList) {
            if (child.teaqlHasPendingGraph(new Set<object>([this]))) throw new CheckException([{ruleId: "invalid_deletion_state",
                entityType: "CommercePlatform", location: ObjectLocation.property("product_list"),
                message: "Cancelled new entity has pending descendants; explicit resolution is required"}]);
        }
        for (const child of (this as any)._orderLineList) {
            if (child.teaqlHasPendingGraph(new Set<object>([this]))) throw new CheckException([{ruleId: "invalid_deletion_state",
                entityType: "CommercePlatform", location: ObjectLocation.property("order_line_list"),
                message: "Cancelled new entity has pending descendants; explicit resolution is required"}]);
        }
        for (const child of (this as any)._orderSearchPresetList) {
            if (child.teaqlHasPendingGraph(new Set<object>([this]))) throw new CheckException([{ruleId: "invalid_deletion_state",
                entityType: "CommercePlatform", location: ObjectLocation.property("order_search_preset_list"),
                message: "Cancelled new entity has pending descendants; explicit resolution is required"}]);
        }
        return true;
    }

    /** @internal Pure pending-state check; nested cancellation is not an implicit cascade. */
    private teaqlHasPendingGraph(seen = new Set<object>()): boolean {
        if (seen.has(this)) return false;
        seen.add(this);
        let pending = (this as any)._action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        for (const child of (this as any)._customerList) pending = child.teaqlHasPendingGraph(seen) || pending;
        for (const child of (this as any)._orderStatusList) pending = child.teaqlHasPendingGraph(seen) || pending;
        for (const child of (this as any)._customerOrderList) pending = child.teaqlHasPendingGraph(seen) || pending;
        for (const child of (this as any)._productList) pending = child.teaqlHasPendingGraph(seen) || pending;
        for (const child of (this as any)._orderLineList) pending = child.teaqlHasPendingGraph(seen) || pending;
        for (const child of (this as any)._orderSearchPresetList) pending = child.teaqlHasPendingGraph(seen) || pending;
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
        for (const child of (this as any)._customerList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        for (const child of (this as any)._orderStatusList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        for (const child of (this as any)._customerOrderList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        for (const child of (this as any)._productList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        for (const child of (this as any)._orderLineList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        for (const child of (this as any)._orderSearchPresetList) pending = child.teaqlValidateMutationOrigins(seen) || pending;
        return pending;
    }

    /** @internal Read-only first pass: no ledger attachment, FK edits or no-op shortcut. */
    private teaqlValidateLoadedIdentities(seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        LoadedScalarSnapshot.forEntity(this)?.validateNativeIdentity(this.teaqlEntityKey(), this.id, this.version);
        for (const [index, child] of (this as any)._customerList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._orderStatusList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_status_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._productList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("product_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._orderSearchPresetList.entries()) {
            try { child.teaqlValidateLoadedIdentities(seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_search_preset_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
    }

    /** @internal Cancel known no-ops across the graph before any derived FK edits. */
    private teaqlDiscardRestoredGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (this.teaqlIsCancelledNew()) return;
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(CommercePlatform.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        for (const child of (this as any)._customerList) child.teaqlDiscardRestoredGraph(graph, seen);
        for (const child of (this as any)._orderStatusList) child.teaqlDiscardRestoredGraph(graph, seen);
        for (const child of (this as any)._customerOrderList) child.teaqlDiscardRestoredGraph(graph, seen);
        for (const child of (this as any)._productList) child.teaqlDiscardRestoredGraph(graph, seen);
        for (const child of (this as any)._orderLineList) child.teaqlDiscardRestoredGraph(graph, seen);
        for (const child of (this as any)._orderSearchPresetList) child.teaqlDiscardRestoredGraph(graph, seen);
    }

    /** @internal Model-key admission precedes restoration; only intended edits may normalize FKs. */
    private teaqlNormalizeGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(CommercePlatform.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        graph.registerSource(this, (this as any)._root, this.teaqlEntityKey(), {
        }, () => ({ ...this.teaqlMutationPayload(),
            __teaql_key: this.teaqlEntityKey(), __teaql_action: (this as any)._action,
            __teaql_comment: (this as any)._comment,
            __teaql_load: {fullyLoaded: (this as any)._fullyLoaded, fields: [...(this as any)._loadedFields].sort()},
            "customer_list": graph.sourceMembers((this as any)._customerList),
            "order_status_list": graph.sourceMembers((this as any)._orderStatusList),
            "customer_order_list": graph.sourceMembers((this as any)._customerOrderList),
            "product_list": graph.sourceMembers((this as any)._productList),
            "order_line_list": graph.sourceMembers((this as any)._orderLineList),
            "order_search_preset_list": graph.sourceMembers((this as any)._orderSearchPresetList)
        }));
        // Keep omitted nodes in the immutable input review, not in the write plan.
        if (this.teaqlIsCancelledNew()) return;
        for (const child of (this as any)._customerList) {
            if (child.teaqlIsCancelledNew()) { child.teaqlNormalizeGraph(graph, seen); continue; }
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
        for (const child of (this as any)._orderStatusList) {
            if (child.teaqlIsCancelledNew()) { child.teaqlNormalizeGraph(graph, seen); continue; }
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
        for (const child of (this as any)._customerOrderList) {
            if (child.teaqlIsCancelledNew()) { child.teaqlNormalizeGraph(graph, seen); continue; }
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
        for (const child of (this as any)._productList) {
            if (child.teaqlIsCancelledNew()) { child.teaqlNormalizeGraph(graph, seen); continue; }
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
        for (const child of (this as any)._orderLineList) {
            if (child.teaqlIsCancelledNew()) { child.teaqlNormalizeGraph(graph, seen); continue; }
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
        for (const child of (this as any)._orderSearchPresetList) {
            if (child.teaqlIsCancelledNew()) { child.teaqlNormalizeGraph(graph, seen); continue; }
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            child.teaqlNormalizeGraph(graph, seen);
        }
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
        CommercePlatform.teaqlMutationFields.validate((this as any)._root.change(this.teaqlEntityKey()), action === "Update");
        if (pending) {
            nextEntityVersion(action, LoadedScalarSnapshot.forEntity(this)?.persistedVersion);
            if (action === "Update") {
                const notLoaded = [{ member: CommercePlatform.__teaqlFields.ID_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.ID_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.NAME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.NAME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.VERSION_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.VERSION_PROPERTY.model }].find(field => !this.isLoaded(field.member));
                if (notLoaded) throw new CheckException([{ruleId: "invalid_type", entityType: "CommercePlatform", location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity"}]);
            }
        }
        let graphPending = pending;
        for (const [index, child] of (this as any)._customerList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._orderStatusList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_status_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._productList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("product_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        for (const [index, child] of (this as any)._orderSearchPresetList.entries()) {
            try { graphPending = child.teaqlAdmitGraph(seen) || graphPending; }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_search_preset_list").index(index);
                throw new CheckException(error.violations.map(violation => ({ ...violation, location: violation.location.prefixedBy(prefix) })));
            }
        }
        return graphPending;
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): void {
        if (this.teaqlIsCancelledNew()) return;
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return;
        seen.add(this);
        const action = (this as any)._action;
        graph.discardRestoredFields(CommercePlatform.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: CommercePlatform.__teaqlFields.ID_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.ID_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.NAME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.NAME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.model }, { member: CommercePlatform.__teaqlFields.VERSION_PROPERTY.member, canonical: CommercePlatform.__teaqlFields.VERSION_PROPERTY.model }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    entityType: "CommercePlatform",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        const request = graph.request({
            entity: "CommercePlatform", action,
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
        for (const [index, child] of (this as any)._customerList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._orderStatusList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_status_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._productList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("product_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._orderSearchPresetList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { child.teaqlPreflightGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_search_preset_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope, seen = new Set<object>()): Promise<CommercePlatform> {
        if (this.teaqlIsCancelledNew()) { graph.validatePreparedSources(); return this; }
        if (!parent) new MutationIntent((this as any)._comment);
        if (seen.has(this)) return this;
        seen.add(this);
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "CommercePlatform",
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
            for (const [index, child] of (this as any)._customerList.entries()) {
                if (child.teaqlIsCancelledNew()) continue;
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.commercePlatform;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("customer_list").index(index);
                    throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    }))));
                }
            }
            for (const [index, child] of (this as any)._orderStatusList.entries()) {
                if (child.teaqlIsCancelledNew()) continue;
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.commercePlatform;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("order_status_list").index(index);
                    throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    }))));
                }
            }
            for (const [index, child] of (this as any)._customerOrderList.entries()) {
                if (child.teaqlIsCancelledNew()) continue;
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.commercePlatform;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("customer_order_list").index(index);
                    throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    }))));
                }
            }
            for (const [index, child] of (this as any)._productList.entries()) {
                if (child.teaqlIsCancelledNew()) continue;
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.commercePlatform;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("product_list").index(index);
                    throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    }))));
                }
            }
            for (const [index, child] of (this as any)._orderLineList.entries()) {
                if (child.teaqlIsCancelledNew()) continue;
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.commercePlatform;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("order_line_list").index(index);
                    throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                        ...violation, location: violation.location.prefixedBy(prefix),
                    }))));
                }
            }
            for (const [index, child] of (this as any)._orderSearchPresetList.entries()) {
                if (child.teaqlIsCancelledNew()) continue;
                child.teaqlAttachRoot((this as any)._root);
                const currentParent = child.commercePlatform;
                if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                    && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                    ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
                try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
                catch (error) {
                    if (!(error instanceof CheckException)) throw error;
                    const prefix = ObjectLocation.property("order_search_preset_list").index(index);
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
        // Normalize the native action before the prepared result captures it.
        // The ledger keeps pending deletion until commit; rollback restores
        // rollbackState.action so the same graph can retry every mutation kind.
        (this as any)._action = "Update";
        graph.acceptPreparedResult((this as any)._root, oldKey, newKey);
        const scope = request.scopeFor(newKey);
        for (const [index, child] of (this as any)._customerList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._orderStatusList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_status_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._customerOrderList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("customer_order_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._productList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("product_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._orderLineList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_line_list").index(index);
                throw new CheckException(context.translateCheckResults(error.violations.map(violation => ({
                    ...violation, location: violation.location.prefixedBy(prefix),
                }))));
            }
        }
        for (const [index, child] of (this as any)._orderSearchPresetList.entries()) {
            if (child.teaqlIsCancelledNew()) continue;
            child.teaqlAttachRoot((this as any)._root);
            const currentParent = child.commercePlatform;
            if (((child as any)._action !== "Update" || (child as any)._root.hasPending(child.teaqlEntityKey()))
                && (this.id === undefined || !child.isLoaded("commercePlatform") || (typeof currentParent === "object" && currentParent !== null
                ? currentParent.id : currentParent) !== this.id)) child.updateCommercePlatform(this);
            try { await child.teaqlSaveWithinGraph(context, service, graph, scope, seen); }
            catch (error) {
                if (!(error instanceof CheckException)) throw error;
                const prefix = ObjectLocation.property("order_search_preset_list").index(index);
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
            [CommercePlatform.__teaqlFields.ID_PROPERTY.model]: this.id,
            [CommercePlatform.__teaqlFields.NAME_PROPERTY.model]: this.name,
            [CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.model]: this.createTime,
            [CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.model]: this.updateTime,
            [CommercePlatform.__teaqlFields.VERSION_PROPERTY.model]: this.version
        };
    }

    private teaqlScalarSnapshot(): LoadedScalarSnapshot {
        return new LoadedScalarSnapshot(this.teaqlMutationPayload(), this.teaqlEntityKey(), (this as any).version);
    }

    updateId(value: string): this {
        this.id = value;
        this.markLoaded(CommercePlatform.__teaqlFields.ID_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), CommercePlatform.__teaqlFields.ID_PROPERTY.model, value);
        return this;
    }

    updateName(value: string): this {
        this.name = value;
        this.markLoaded(CommercePlatform.__teaqlFields.NAME_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), CommercePlatform.__teaqlFields.NAME_PROPERTY.model, value);
        return this;
    }

    updateCreateTime(value: string): this {
        this.createTime = value;
        this.markLoaded(CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), CommercePlatform.__teaqlFields.CREATE_TIME_PROPERTY.model, value);
        return this;
    }

    updateUpdateTime(value: string): this {
        this.updateTime = value;
        this.markLoaded(CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), CommercePlatform.__teaqlFields.UPDATE_TIME_PROPERTY.model, value);
        return this;
    }

    updateVersion(value: EntityVersion): this {
        this.version = value;
        this.markLoaded(CommercePlatform.__teaqlFields.VERSION_PROPERTY.member);
        (this as any)._root.set(this.teaqlEntityKey(), CommercePlatform.__teaqlFields.VERSION_PROPERTY.model, value);
        return this;
    }
    customerList(): SmartList<Customer> {
        return (this as any)._customerList;
    }

    orderStatusList(): SmartList<OrderStatus> {
        return (this as any)._orderStatusList;
    }

    customerOrderList(): SmartList<CustomerOrder> {
        return (this as any)._customerOrderList;
    }

    productList(): SmartList<Product> {
        return (this as any)._productList;
    }

    orderLineList(): SmartList<OrderLine> {
        return (this as any)._orderLineList;
    }

    orderSearchPresetList(): SmartList<OrderSearchPreset> {
        return (this as any)._orderSearchPresetList;
    }
}