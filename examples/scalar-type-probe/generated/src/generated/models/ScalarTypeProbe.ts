import { CheckException, Decimal, decimal, Long, long, LocalTime, localTime, EntityVersion, entityVersion, nextEntityVersion, EntityKey, EntityRoot, GraphMutationSession, LoadedScalarSnapshot, MutationFieldLayout, MutationIntent, MutationTraceScope, ObjectLocation, SmartList, TeaQLDataService, UserContext } from '../../teaql-ts';
import { TypePlatform } from './TypePlatform';

export class ScalarTypeProbe {
    private static teaqlTemporaryId = 0;
    private static readonly teaqlMutationFields = new MutationFieldLayout("ScalarTypeProbe",
        ["id", "type_platform", "required_string", "optional_string", "large_text", "required_boolean", "optional_boolean", "required_integer", "optional_integer", "required_long", "optional_long", "required_decimal", "optional_decimal", "required_float", "optional_float", "required_double", "optional_double", "required_date", "optional_date", "required_time", "optional_time", "required_datetime", "optional_datetime", "create_time", "update_time", "version"], { id: "immutable_field", version: "immutable_field" });
        id?: string;
        typePlatform?: TypePlatform | string;
        requiredString?: string;
        optionalString?: string | null;
        largeText?: string | null;
        requiredBoolean?: boolean;
        optionalBoolean?: boolean | null;
        requiredInteger?: number;
        optionalInteger?: number | null;
        requiredLong?: Long;
        optionalLong?: Long | null;
        requiredDecimal?: Decimal;
        optionalDecimal?: Decimal | null;
        requiredFloat?: number;
        optionalFloat?: number | null;
        requiredDouble?: number;
        optionalDouble?: number | null;
        requiredDate?: string;
        optionalDate?: string | null;
        requiredTime?: LocalTime;
        optionalTime?: LocalTime | null;
        requiredDatetime?: string;
        optionalDatetime?: string | null;
        createTime?: string;
        updateTime?: string;
        version?: EntityVersion;

    constructor(init?: Partial<ScalarTypeProbe>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_fullyLoaded", { value: !init || !init.id, writable: true, enumerable: false });
        Object.defineProperty(this, "_loadedFields", { value: new Set(Object.keys(init || {})), writable: true, enumerable: false });
        Object.defineProperty(this, "_root", { value: new EntityRoot(), writable: true, enumerable: false });
        Object.defineProperty(this, "_ledgerId", { value: init?.id ?? --ScalarTypeProbe.teaqlTemporaryId, writable: true, enumerable: false });
        if (init) {
            const fields: Record<string, unknown> = { ...(init as Record<string, unknown>) };
            Object.assign(this, fields);
            if ((init as any).typePlatform && typeof (init as any).typePlatform === "object") {
                this.typePlatform = (init as any).typePlatform instanceof TypePlatform
                    ? (init as any).typePlatform
                    : TypePlatform.fromRecord((init as any).typePlatform);
                this.markLoaded("typePlatform");
            }
        }
        const key = this.teaqlEntityKey();
        if ((this as any).version !== undefined) (this as any).version = entityVersion((this as any).version);
        if ((this as any)._action === "Create") (this as any)._root.markAsNew(key);
        else if ((this as any).version !== undefined) (this as any)._root.setOriginalVersion(key, (this as any).version);
        LoadedScalarSnapshot.captureFor(this, this.teaqlMutationPayload(), key, (this as any).version);
    }

    private teaqlEntityKey(): EntityKey { return { entity: "ScalarTypeProbe", id: (this as any)._ledgerId }; }
    private teaqlAttachRoot(root: EntityRoot, hydration = false): this {
        if ((this as any)._root !== root) {
            root.mergeEntityFrom((this as any)._root, this.teaqlEntityKey());
            (this as any)._root = root;
        }
        return this;
    }

    static fromRecord(record: Record<string, unknown>, root?: EntityRoot): ScalarTypeProbe {
        const entity = new ScalarTypeProbe(record as Partial<ScalarTypeProbe>);
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

    static refer(id: string | number): ScalarTypeProbe {
        return new ScalarTypeProbe({ id: String(id) } as Partial<ScalarTypeProbe>);
    }

    /** @internal Generated Runtime Module fixed-ID construction capability. */
    static teaqlBootstrapNew(id: string | number): ScalarTypeProbe {
        return new ScalarTypeProbe().updateId(String(id));
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

    async save(context: UserContext): Promise<ScalarTypeProbe> {
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
            this.teaqlNormalizeGraph(graph);
            return this.teaqlAdmitGraph();
        });
    }

    /** @internal Read-only first pass: no ledger attachment, FK edits or no-op shortcut. */
    private teaqlValidateLoadedIdentities(seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        LoadedScalarSnapshot.forEntity(this)?.validateNativeIdentity(this.teaqlEntityKey(), this.id, this.version);
    }

    /** @internal Model-key admission precedes restoration; only intended edits may normalize FKs. */
    private teaqlNormalizeGraph(graph: GraphMutationSession, seen = new Set<object>()): void {
        if (seen.has(this)) return;
        seen.add(this);
        graph.discardRestoredFields(ScalarTypeProbe.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        graph.registerSource(this, (this as any)._root, this.teaqlEntityKey(), {
            "type_platform": "TypePlatform"
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
        LoadedScalarSnapshot.forEntity(this)?.validateMutationVersion((this as any)._root, this.teaqlEntityKey());
        ScalarTypeProbe.teaqlMutationFields.validate((this as any)._root.change(this.teaqlEntityKey()), action === "Update");
        if (pending) {
            nextEntityVersion(action, (this as any)._root.originalVersion(this.teaqlEntityKey()) ?? this.version);
            if (action === "Update") {
                const notLoaded = [{ member: "id", canonical: "id" }, { member: "typePlatform", canonical: "type_platform" }, { member: "requiredString", canonical: "required_string" }, { member: "optionalString", canonical: "optional_string" }, { member: "largeText", canonical: "large_text" }, { member: "requiredBoolean", canonical: "required_boolean" }, { member: "optionalBoolean", canonical: "optional_boolean" }, { member: "requiredInteger", canonical: "required_integer" }, { member: "optionalInteger", canonical: "optional_integer" }, { member: "requiredLong", canonical: "required_long" }, { member: "optionalLong", canonical: "optional_long" }, { member: "requiredDecimal", canonical: "required_decimal" }, { member: "optionalDecimal", canonical: "optional_decimal" }, { member: "requiredFloat", canonical: "required_float" }, { member: "optionalFloat", canonical: "optional_float" }, { member: "requiredDouble", canonical: "required_double" }, { member: "optionalDouble", canonical: "optional_double" }, { member: "requiredDate", canonical: "required_date" }, { member: "optionalDate", canonical: "optional_date" }, { member: "requiredTime", canonical: "required_time" }, { member: "optionalTime", canonical: "optional_time" }, { member: "requiredDatetime", canonical: "required_datetime" }, { member: "optionalDatetime", canonical: "optional_datetime" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }].find(field => !this.isLoaded(field.member));
                if (notLoaded) throw new CheckException([{ruleId: "invalid_type", entityType: "ScalarTypeProbe", location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity"}]);
            }
        }
        let graphPending = pending;
        return graphPending;
    }

    /** @internal Validates and fixes the complete graph before its first mutation. */
    teaqlPreflightGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope): void {
        if (!parent) new MutationIntent((this as any)._comment);
        const action = (this as any)._action;
        graph.discardRestoredFields(ScalarTypeProbe.teaqlMutationFields,
            (this as any)._root, this.teaqlEntityKey(), LoadedScalarSnapshot.forEntity(this));
        const pending = action !== "Update" || (this as any)._root.hasPending(this.teaqlEntityKey());
        if (action === "Update" && pending) {
            const notLoaded = [{ member: "id", canonical: "id" }, { member: "typePlatform", canonical: "type_platform" }, { member: "requiredString", canonical: "required_string" }, { member: "optionalString", canonical: "optional_string" }, { member: "largeText", canonical: "large_text" }, { member: "requiredBoolean", canonical: "required_boolean" }, { member: "optionalBoolean", canonical: "optional_boolean" }, { member: "requiredInteger", canonical: "required_integer" }, { member: "optionalInteger", canonical: "optional_integer" }, { member: "requiredLong", canonical: "required_long" }, { member: "optionalLong", canonical: "optional_long" }, { member: "requiredDecimal", canonical: "required_decimal" }, { member: "optionalDecimal", canonical: "optional_decimal" }, { member: "requiredFloat", canonical: "required_float" }, { member: "optionalFloat", canonical: "optional_float" }, { member: "requiredDouble", canonical: "required_double" }, { member: "optionalDouble", canonical: "optional_double" }, { member: "requiredDate", canonical: "required_date" }, { member: "optionalDate", canonical: "optional_date" }, { member: "requiredTime", canonical: "required_time" }, { member: "optionalTime", canonical: "optional_time" }, { member: "requiredDatetime", canonical: "required_datetime" }, { member: "optionalDatetime", canonical: "optional_datetime" }, { member: "createTime", canonical: "create_time" }, { member: "updateTime", canonical: "update_time" }, { member: "version", canonical: "version" }]
                .find(field => !this.isLoaded(field.member));
            if (notLoaded) {
                throw new CheckException([{
                    ruleId: "invalid_type",
                    entityType: "ScalarTypeProbe",
                    location: ObjectLocation.property(notLoaded.canonical),
                    message: "Mutation requires a fully loaded entity",
                }]);
            }
        }
        const request = graph.request({
            entity: "ScalarTypeProbe", action,
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
    }

    /** @internal Used by generated relation cascades inside the root graph transaction. */
    async teaqlSaveWithinGraph(context: UserContext, service: TeaQLDataService, graph: GraphMutationSession, parent?: MutationTraceScope): Promise<ScalarTypeProbe> {
        if (!parent) new MutationIntent((this as any)._comment);
        const action = (this as any)._action;
        const ledgerPayload = (this as any)._root.change(this.teaqlEntityKey());
        const mutation = {
            entity: "ScalarTypeProbe",
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
            return this;
        }
        const result = await service.executeMutation(request);
        graph.validatePreparedSources();
        if (!result.persistedRecord) {
            throw new Error("Mutation did not return the authoritative persisted record");
        }
        const rollbackState = {
            payload: this.teaqlMutationPayload(),
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
            Object.assign(this, rollbackState.payload);
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
            "type_platform": this.typePlatform,
            "required_string": this.requiredString,
            "optional_string": this.optionalString,
            "large_text": this.largeText,
            "required_boolean": this.requiredBoolean,
            "optional_boolean": this.optionalBoolean,
            "required_integer": this.requiredInteger,
            "optional_integer": this.optionalInteger,
            "required_long": this.requiredLong,
            "optional_long": this.optionalLong,
            "required_decimal": this.requiredDecimal,
            "optional_decimal": this.optionalDecimal,
            "required_float": this.requiredFloat,
            "optional_float": this.optionalFloat,
            "required_double": this.requiredDouble,
            "optional_double": this.optionalDouble,
            "required_date": this.requiredDate,
            "optional_date": this.optionalDate,
            "required_time": this.requiredTime,
            "optional_time": this.optionalTime,
            "required_datetime": this.requiredDatetime,
            "optional_datetime": this.optionalDatetime,
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

    updateRequiredString(value: string): this {
        this.requiredString = value;
        this.markLoaded("requiredString");
        (this as any)._root.set(this.teaqlEntityKey(), "required_string", value);
        return this;
    }

    updateOptionalString(value: string | null): this {
        this.optionalString = value;
        this.markLoaded("optionalString");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_string", value);
        return this;
    }

    updateLargeText(value: string | null): this {
        this.largeText = value;
        this.markLoaded("largeText");
        (this as any)._root.set(this.teaqlEntityKey(), "large_text", value);
        return this;
    }

    updateRequiredBoolean(value: boolean): this {
        this.requiredBoolean = value;
        this.markLoaded("requiredBoolean");
        (this as any)._root.set(this.teaqlEntityKey(), "required_boolean", value);
        return this;
    }

    updateOptionalBoolean(value: boolean | null): this {
        this.optionalBoolean = value;
        this.markLoaded("optionalBoolean");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_boolean", value);
        return this;
    }

    updateRequiredInteger(value: number): this {
        this.requiredInteger = value;
        this.markLoaded("requiredInteger");
        (this as any)._root.set(this.teaqlEntityKey(), "required_integer", value);
        return this;
    }

    updateOptionalInteger(value: number | null): this {
        this.optionalInteger = value;
        this.markLoaded("optionalInteger");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_integer", value);
        return this;
    }

    updateRequiredLong(value: Long): this {
        if (value != null) value = long(value);
        this.requiredLong = value;
        this.markLoaded("requiredLong");
        (this as any)._root.set(this.teaqlEntityKey(), "required_long", value);
        return this;
    }

    updateOptionalLong(value: Long | null): this {
        if (value != null) value = long(value);
        this.optionalLong = value;
        this.markLoaded("optionalLong");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_long", value);
        return this;
    }

    updateRequiredDecimal(value: Decimal): this {
        if (value != null) value = decimal(value);
        this.requiredDecimal = value;
        this.markLoaded("requiredDecimal");
        (this as any)._root.set(this.teaqlEntityKey(), "required_decimal", value);
        return this;
    }

    updateOptionalDecimal(value: Decimal | null): this {
        if (value != null) value = decimal(value);
        this.optionalDecimal = value;
        this.markLoaded("optionalDecimal");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_decimal", value);
        return this;
    }

    updateRequiredFloat(value: number): this {
        this.requiredFloat = value;
        this.markLoaded("requiredFloat");
        (this as any)._root.set(this.teaqlEntityKey(), "required_float", value);
        return this;
    }

    updateOptionalFloat(value: number | null): this {
        this.optionalFloat = value;
        this.markLoaded("optionalFloat");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_float", value);
        return this;
    }

    updateRequiredDouble(value: number): this {
        this.requiredDouble = value;
        this.markLoaded("requiredDouble");
        (this as any)._root.set(this.teaqlEntityKey(), "required_double", value);
        return this;
    }

    updateOptionalDouble(value: number | null): this {
        this.optionalDouble = value;
        this.markLoaded("optionalDouble");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_double", value);
        return this;
    }

    updateRequiredDate(value: string): this {
        this.requiredDate = value;
        this.markLoaded("requiredDate");
        (this as any)._root.set(this.teaqlEntityKey(), "required_date", value);
        return this;
    }

    updateOptionalDate(value: string | null): this {
        this.optionalDate = value;
        this.markLoaded("optionalDate");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_date", value);
        return this;
    }

    updateRequiredTime(value: LocalTime): this {
        if (value != null) value = localTime(value);
        this.requiredTime = value;
        this.markLoaded("requiredTime");
        (this as any)._root.set(this.teaqlEntityKey(), "required_time", value);
        return this;
    }

    updateOptionalTime(value: LocalTime | null): this {
        if (value != null) value = localTime(value);
        this.optionalTime = value;
        this.markLoaded("optionalTime");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_time", value);
        return this;
    }

    updateRequiredDatetime(value: string): this {
        this.requiredDatetime = value;
        this.markLoaded("requiredDatetime");
        (this as any)._root.set(this.teaqlEntityKey(), "required_datetime", value);
        return this;
    }

    updateOptionalDatetime(value: string | null): this {
        this.optionalDatetime = value;
        this.markLoaded("optionalDatetime");
        (this as any)._root.set(this.teaqlEntityKey(), "optional_datetime", value);
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
    updateTypePlatform(value: any): this {
        this.typePlatform = value?.id ?? value;
        this.markLoaded("typePlatform");
        (this as any)._root.set(this.teaqlEntityKey(), "type_platform", this.typePlatform);
        return this;
    }

}