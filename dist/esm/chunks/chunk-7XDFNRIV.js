import {
  CheckException,
  LoadedScalarSnapshot,
  ObjectLocation,
  QueryRequest,
  cloneTraceNodes,
  entityVersion,
  long,
  retainQueryDiagnosticOrigin,
  snapshotQuery
} from "./chunk-D2TPHZDJ.js";
import {
  decimal
} from "./chunk-2M5YIPLE.js";
import {
  __privateAdd,
  __privateGet,
  __privateSet
} from "./chunk-UNAWFD3C.js";

// src/core/modeled-integer32.ts
function integer32Error(value, entityType, field) {
  if (value === null || value === void 0 || typeof value === "number" && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) return void 0;
  return new CheckException([{
    ruleId: "invalid_type",
    entityType,
    location: ObjectLocation.property(field),
    message: `Invalid field ${field}: expected an exact signed 32-bit Integer`
  }]);
}
var ModeledInteger32Layout = class {
  constructor(entityType, schema) {
    this.entityType = entityType;
    const fields = [];
    for (const [native, column] of Object.entries(schema?.columns ?? {})) {
      if (column.integer32 !== void 0 && typeof column.integer32 !== "boolean") throw new TypeError("INVALID_INTEGER32_METADATA");
      if (!column.integer32) continue;
      const canonical = column.modelName ?? native;
      if (column.logicalType !== "integer" || column.decode !== "number" || ["id", "version"].includes(native) || ["id", "version"].includes(canonical) || Object.values(schema?.relations ?? {}).some((r) => !r.many && r.localKey === native)) {
        throw new TypeError(`INVALID_INTEGER32_METADATA: ${entityType}.${canonical}`);
      }
      fields.push(Object.freeze({ native, canonical, column: column.columnName }));
    }
    this.fields = Object.freeze(fields);
    Object.freeze(this);
  }
  /** Validates canonical mutation values without coercion or modifying intent. */
  checkMutation(payload, results = []) {
    for (const field of this.fields) {
      const error = integer32Error(payload[field.canonical], this.entityType, field.canonical);
      if (error && !results.some((r) => r.ruleId === "invalid_type" && r.location.modelPath() === field.canonical)) results.push(...error.violations);
    }
    return results;
  }
  /** SQL may return an exact bigint for INTEGER; normalize before Number(...).
   * Native/text/bool coercion is deliberately not an Integer conversion. */
  read(fieldName, value) {
    const field = this.fields.find((f) => f.native === fieldName);
    if (!field || value == null) return value;
    if (typeof value === "bigint" && value >= -2147483648n && value <= 2147483647n) return Number(value);
    const error = integer32Error(value, this.entityType, field.canonical);
    if (error) throw error;
    return value;
  }
};
function validateInteger32Schemas(schemas) {
  for (const [name, schema] of Object.entries(schemas)) new ModeledInteger32Layout(name, schema);
}

// src/core/local-time.ts
var LOCAL_TIME_TEXT = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,6})?$/;
function localTime(value) {
  if (typeof value !== "string" || !LOCAL_TIME_TEXT.test(value)) {
    throw new TypeError("LocalTime requires HH:mm:ss with optional 1-6 fractional digits");
  }
  const dot = value.indexOf(".");
  if (dot < 0) return value;
  const fraction = value.slice(dot + 1).padEnd(6, "0");
  return fraction === "000000" ? value.slice(0, dot) : `${value.slice(0, dot)}.${fraction}`;
}

// src/core/entity-root.ts
var identity = (key) => `${key.entity}\0${typeof key.id}:${String(key.id)}`;
var EntityRoot = class {
  constructor() {
    this.changes = /* @__PURE__ */ new Map();
    this.originalVersions = /* @__PURE__ */ new Map();
    this.newKeys = /* @__PURE__ */ new Map();
    this.deletedKeys = /* @__PURE__ */ new Map();
    this.traces = /* @__PURE__ */ new Map();
  }
  /** A complete per-entity lineage replaces, rather than extends, graph fallback. */
  setTraceChain(key, nodes) {
    this.traces.set(identity(key), { key: Object.freeze({ ...key }), nodes: cloneTraceNodes(nodes) });
  }
  traceChain(key) {
    return this.traces.get(identity(key))?.nodes;
  }
  set(key, field, value) {
    if (!field.trim()) throw new TypeError("field is required");
    const id = identity(key);
    const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: /* @__PURE__ */ Object.create(null) };
    entry.values[field] = value;
    this.changes.set(id, entry);
  }
  snapshot() {
    return [...this.changes.values()].map((entry) => ({
      key: Object.freeze({ ...entry.key }),
      values: Object.freeze({ ...entry.values })
    }));
  }
  change(key) {
    return Object.freeze({ ...this.changes.get(identity(key))?.values ?? {} });
  }
  /** @internal A save-attempt undo of selected fields on one typed identity.
   * No lifecycle/version/trace changes or unrelated caller edits are reverted. */
  captureFields(key, fields) {
    const id = identity(key), before = this.changes.get(id)?.values ?? {};
    const captured = new Map(fields.map((field) => [field, {
      present: Object.prototype.hasOwnProperty.call(before, field),
      value: snapshotQuery(before[field])
    }]));
    return () => {
      const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: /* @__PURE__ */ Object.create(null) };
      for (const [field, value] of captured) {
        if (value.present) entry.values[field] = snapshotQuery(value.value);
        else delete entry.values[field];
      }
      if (Object.keys(entry.values).length) this.changes.set(id, entry);
      else this.changes.delete(id);
    };
  }
  /** @internal Remove only the exact intents observed during baseline comparison. */
  discardFields(key, observed) {
    const id = identity(key), entry = this.changes.get(id);
    if (!entry) return;
    for (const [field, value] of Object.entries(observed)) {
      if (Object.prototype.hasOwnProperty.call(entry.values, field) && Object.is(entry.values[field], value)) delete entry.values[field];
    }
    if (!Object.keys(entry.values).length) this.changes.delete(id);
  }
  mergeFrom(other) {
    if (other === this) return;
    for (const entry of other.snapshotVersions()) this.requireMatchingVersion(entry.key, entry.version);
    for (const entry of other.snapshot()) for (const [field, value] of Object.entries(entry.values)) this.set(entry.key, field, value);
    for (const key of other.newKeys.values()) this.markAsNew(key);
    for (const key of other.deletedKeys.values()) this.markAsDeleted(key);
    for (const entry of other.snapshotVersions()) this.setOriginalVersion(entry.key, entry.version);
    for (const entry of other.traces.values()) this.setTraceChain(entry.key, entry.nodes);
  }
  /** Import one explicitly reached entity, never its foreign graph or ownership. */
  mergeEntityFrom(other, key) {
    if (other === this) return;
    const version = other.originalVersion(key);
    if (version !== void 0) this.requireMatchingVersion(key, version);
    for (const [field, value] of Object.entries(other.change(key))) this.set(key, field, value);
    if (other.isNew(key)) this.markAsNew(key);
    if (other.isDeleted(key)) this.markAsDeleted(key);
    if (version !== void 0) this.setOriginalVersion(key, version);
    const trace = other.traceChain(key);
    if (trace) this.setTraceChain(key, trace);
  }
  hasPending(key) {
    const id = identity(key);
    return this.newKeys.has(id) || this.deletedKeys.has(id) || Object.keys(this.changes.get(id)?.values ?? {}).length > 0;
  }
  snapshotVersions() {
    return [...this.originalVersions.values()];
  }
  rekey(oldKey, newKey) {
    const oldId = identity(oldKey);
    const newId = identity(newKey);
    if (oldId === newId) return;
    const loadedVersion = this.originalVersion(oldKey);
    if (loadedVersion !== void 0) this.requireMatchingVersion(newKey, loadedVersion);
    const entry = this.changes.get(oldId);
    if (entry) {
      this.changes.delete(oldId);
      for (const [field, value] of Object.entries(entry.values)) this.set(newKey, field, value);
    }
    const version = this.originalVersions.get(oldId);
    if (version !== void 0) {
      this.originalVersions.delete(oldId);
      this.originalVersions.set(newId, { key: Object.freeze({ ...newKey }), version: version.version });
    }
    if (this.newKeys.delete(oldId)) this.newKeys.set(newId, Object.freeze({ ...newKey }));
    if (this.deletedKeys.delete(oldId)) this.deletedKeys.set(newId, Object.freeze({ ...newKey }));
    const trace = this.traces.get(oldId);
    if (trace) {
      this.traces.delete(oldId);
      this.setTraceChain(newKey, trace.nodes);
    }
  }
  clearEntity(key) {
    const id = identity(key);
    this.changes.delete(id);
    this.newKeys.delete(id);
    this.deletedKeys.delete(id);
    this.traces.delete(id);
  }
  requireMatchingVersion(key, version) {
    const original = this.originalVersion(key);
    if (original !== void 0 && original !== version) {
      throw new Error("ENTITY_VERSION_CONFLICT: one graph cannot contain different loaded versions of the same typed entity");
    }
  }
  setOriginalVersion(key, input) {
    const version = entityVersion(input);
    this.requireMatchingVersion(key, version);
    this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version });
  }
  /** @internal Accept only the authoritative result after this key committed. */
  acceptCommittedVersion(key, input) {
    const version = entityVersion(input);
    if (this.hasPending(key)) throw new Error("ENTITY_COMMIT_PENDING: clear committed changes before accepting the persisted version");
    this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version });
  }
  originalVersion(key) {
    return this.originalVersions.get(identity(key))?.version;
  }
  markAsNew(key) {
    this.newKeys.set(identity(key), Object.freeze({ ...key }));
  }
  isNew(key) {
    return this.newKeys.has(identity(key));
  }
  markAsDeleted(key) {
    const id = identity(key);
    this.changes.delete(id);
    this.deletedKeys.set(id, Object.freeze({ ...key }));
  }
  isDeleted(key) {
    return this.deletedKeys.has(identity(key));
  }
  clearCommitted() {
    this.changes.clear();
    this.newKeys.clear();
    this.deletedKeys.clear();
    this.traces.clear();
  }
};

// src/core/mutation-field-layout.ts
var _fields, _immutable;
var MutationFieldLayout = class {
  constructor(entity, fields, immutable = {}) {
    this.entity = entity;
    __privateAdd(this, _fields);
    __privateAdd(this, _immutable);
    __privateSet(this, _fields, new Set(fields));
    __privateSet(this, _immutable, Object.freeze({ ...immutable }));
    Object.freeze(this);
  }
  /** Admission must run before an equal value can disappear from pending intent. */
  validate(values, updating = false) {
    const violations = Object.keys(values).flatMap((field) => {
      const ruleId = !__privateGet(this, _fields).has(field) ? "unknown_field" : updating && Object.prototype.hasOwnProperty.call(__privateGet(this, _immutable), field) ? __privateGet(this, _immutable)[field] : void 0;
      return ruleId ? [{
        ruleId,
        location: ObjectLocation.property(field),
        message: ruleId === "unknown_field" ? "Expected a canonical model field name" : "Field is immutable after create"
      }] : [];
    });
    if (violations.length) throw new CheckException(violations);
  }
};
_fields = new WeakMap();
_immutable = new WeakMap();

// src/core/context-fix.ts
var frames = /* @__PURE__ */ new WeakMap();
var ContextFix = class {
  /** @internal Runtime/generated-service entry; never inferred from field names. */
  static run(context, mutation, schema, work) {
    const columns = new Map(Object.entries(schema?.columns ?? {}).map(([name, column]) => [column.modelName ?? name, { ...column }]));
    const eligible = mutation.action === "Create" || mutation.action === "Update" && Object.entries(mutation.payload ?? {}).some(([field, value]) => {
      if (field === "id" || field === "version" || field.startsWith("_")) return false;
      const column = columns.get(field);
      if (column?.createFunction || column?.updateFunction) return false;
      if (!Object.prototype.hasOwnProperty.call(mutation.loadedValues ?? {}, field)) return true;
      return new LoadedScalarSnapshot({ [field]: mutation.loadedValues[field] }).changedField({ [field]: value }) !== void 0;
    });
    const previous = frames.get(mutation);
    frames.set(mutation, { context, eligible, columns, now: context.getResource("fixTime") });
    try {
      return work();
    } finally {
      if (previous) frames.set(mutation, previous);
      else frames.delete(mutation);
    }
  }
  static apply(context, mutation, field, functionName, args = []) {
    const frame = frames.get(mutation);
    const invalid = () => new CheckException([{
      ruleId: "invalid_type",
      entityType: String(mutation.entity),
      location: ObjectLocation.property(field),
      message: `Context Fix failed at ${mutation.entity}.${field}`
    }]);
    if (!frame || frame.context !== context) throw invalid();
    if (!frame.eligible) return;
    const column = frame.columns.get(field);
    const declared = mutation.action === "Create" ? column?.createFunction : column?.updateFunction;
    if (!column || !declared || declared !== functionName) throw invalid();
    try {
      const resolver = context.getResource("contextFixResolver");
      let value;
      if (resolver) value = resolver(context, Object.freeze({
        entity: String(mutation.entity),
        field,
        function: functionName,
        arguments: Object.freeze([...args]),
        action: mutation.action,
        now: new Date(frame.now.getTime())
      }));
      else if (functionName === "now") value = new Date(frame.now.getTime());
      else if (functionName === "uniStr") {
        const bytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(bytes);
        value = (args[0] ?? "") + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      } else throw invalid();
      if (value instanceof Promise) {
        void value.catch(() => void 0);
        throw invalid();
      }
      if (!this.validValue(column, value)) throw invalid();
      mutation.payload[field] = snapshotQuery(value);
      context.recordFixEvidence({
        entityType: String(mutation.entity),
        modelPath: field,
        source: functionName === "now" ? "clock" : "context",
        sourceLabel: functionName === "now" ? "graphClock" : `contextFunction:${functionName}`
      });
    } catch {
      throw invalid();
    }
  }
  /** @internal Register with a graph's failure actions before publishing Fix. */
  static captureUndo(mutation, schema) {
    if (!(mutation.ledgerRoot instanceof EntityRoot) || !mutation.ledgerKey) return void 0;
    const fields = Object.entries(schema?.columns ?? {}).filter(([, column]) => column.createFunction || column.updateFunction).map(([name, column]) => column.modelName ?? name);
    return fields.length ? mutation.ledgerRoot.captureFields(mutation.ledgerKey, fields) : void 0;
  }
  static validValue(column, value) {
    if (value === null) return true;
    switch (column.logicalType) {
      case "text":
        return typeof value === "string";
      case "datetime":
      case "date":
        return value instanceof Date && Number.isFinite(value.getTime());
      case "boolean":
        return typeof value === "boolean";
      case "double":
        return typeof value === "number" && Number.isFinite(value);
      case "integer":
        return typeof value === "number" && Number.isSafeInteger(value);
      case "decimal":
        return typeof value === "string" && decimal(value) === value;
      case "long":
        return typeof value === "string" && long(value) === value;
      case "time":
        return typeof value === "string" && localTime(value) === value;
      case "json":
        return value !== void 0 && !(value instanceof Promise);
      default:
        return false;
    }
  }
};

// src/core/ast.ts
var SortDirection = /* @__PURE__ */ ((SortDirection2) => {
  SortDirection2["Asc"] = "Asc";
  SortDirection2["Desc"] = "Desc";
  return SortDirection2;
})(SortDirection || {});
var OrderBy = class _OrderBy {
  constructor(field, expr, direction) {
    this.field = field;
    this.expr = expr;
    this.direction = direction;
  }
  static new(field, direction) {
    return new _OrderBy(field, null, direction);
  }
  static expr(expr, direction) {
    return new _OrderBy("", expr, direction);
  }
  static asc(field) {
    return _OrderBy.new(field, "Asc" /* Asc */);
  }
  static desc(field) {
    return _OrderBy.new(field, "Desc" /* Desc */);
  }
};
var AggregationCacheOptions = class _AggregationCacheOptions {
  constructor(enabledValue, cacheExpiredMillis, propagateValue, propagateCacheExpiredMillis) {
    this.enabledValue = enabledValue;
    this.cacheExpiredMillis = cacheExpiredMillis;
    this.propagateValue = propagateValue;
    this.propagateCacheExpiredMillis = propagateCacheExpiredMillis;
  }
  static enabled(cacheExpiredMillis) {
    return new _AggregationCacheOptions(true, cacheExpiredMillis, false, 0);
  }
  propagate(cacheExpiredMillis) {
    this.propagateValue = true;
    this.propagateCacheExpiredMillis = cacheExpiredMillis;
    return this;
  }
};
var SelectQuery = class _SelectQuery {
  constructor(entity) {
    this.hardLimitValue = 1e4;
    this.filterCondition = null;
    this.limitValue = 0;
    this.offsetValue = 0;
    this.orderItems = [];
    this.selectItems = [];
    this.properties = [];
    this.joins = [];
    this.groupByItems = [];
    this.aggregateItems = [];
    this.facets = [];
    this.relations = [];
    this.relationAggregates = [];
    /** Query semantics, not authorization: Context policies still apply to every row. */
    this.deletionVisibility = "live";
    this.entity = entity;
    Object.defineProperty(this, "hardLimitValue", { enumerable: false, writable: true, value: 1e4 });
    Object.defineProperty(this, "continuousPageFetchOptions", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "continuousPageRuntimeContext", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "idSetPaginationOptions", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "idSetPaginationRuntimeContext", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "topNProbeThreshold", { enumerable: false, writable: true, value: void 0 });
  }
  comment(text) {
    this.commentText = text;
    return this;
  }
  purpose(text) {
    this.purposeText = text;
    return this;
  }
  facetBy(facetName, relationName, request, includeAllFacets = true, operation) {
    this.facets.push({
      facetName,
      relationName,
      query: request.toQuery(),
      includeAllFacets,
      operation
    });
    return this;
  }
  clone() {
    const copy = snapshotQuery(this);
    for (const field of ["commentText", "purposeText", "_comment", "_purpose"]) {
      const descriptor = Object.getOwnPropertyDescriptor(copy, field);
      if (descriptor && "value" in descriptor && descriptor.configurable) {
        Object.defineProperty(copy, field, { ...descriptor, writable: true });
      }
    }
    return copy;
  }
  filter(condition) {
    this.filterCondition = condition;
    return this;
  }
  withDeletedRows() {
    this.deletionVisibility = "all";
    return this;
  }
  deletedRowsOnly() {
    this.deletionVisibility = "deleted";
    return this;
  }
  limit(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error("QUERY_INVALID_LIMIT: limit must be a positive safe integer");
    }
    this.limitValue = limit;
    return this;
  }
  optimizeForContinuousPageFetch() {
    return this.optimizeForContinuousPageFetchWith("default", 600);
  }
  optimizeForContinuousPageFetchWith(namespace, ttlSeconds) {
    if (!namespace?.trim()) throw new Error("continuous page namespace must not be empty");
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error("continuous page ttlSeconds must be a positive integer");
    this.continuousPageFetchOptions = { namespace, ttlSeconds };
    return this;
  }
  bindContinuousPageRuntime(runtime) {
    this.continuousPageRuntimeContext = runtime;
    return this;
  }
  localContinuousPageOptions() {
    return this.continuousPageFetchOptions;
  }
  localContinuousPageRuntime() {
    return this.continuousPageRuntimeContext;
  }
  clearContinuousPageRuntime() {
    this.continuousPageRuntimeContext = void 0;
    return this;
  }
  optimizePaginationWithIdSet() {
    return this.optimizePaginationWithIdSetConfig("default", 600, 3e6);
  }
  optimizePaginationWithIdSetConfig(namespace, ttlSeconds, maxIds) {
    if (!namespace?.trim()) throw new Error("ID set namespace must not be empty");
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error("ID set ttlSeconds must be a positive integer");
    if (!Number.isSafeInteger(maxIds) || maxIds <= 0) throw new Error("ID set maxIds must be a positive integer");
    this.idSetPaginationOptions = { namespace, ttlSeconds, maxIds };
    return this;
  }
  bindIdSetPaginationRuntime(runtime) {
    this.idSetPaginationRuntimeContext = runtime;
    return this;
  }
  localIdSetPaginationOptions() {
    return this.idSetPaginationOptions;
  }
  localIdSetPaginationRuntime() {
    return this.idSetPaginationRuntimeContext;
  }
  clearIdSetPaginationRuntime() {
    this.idSetPaginationRuntimeContext = void 0;
    return this;
  }
  topNProbeParentThreshold(threshold) {
    if (!Number.isSafeInteger(threshold) || threshold < 0) {
      throw new Error("topNProbeParentThreshold must be a non-negative safe integer");
    }
    this.topNProbeThreshold = threshold;
    return this;
  }
  localTopNProbeParentThreshold() {
    return this.topNProbeThreshold;
  }
  prepareForList() {
    if (!Number.isSafeInteger(this.offsetValue) || this.offsetValue < 0) {
      throw new Error("QUERY_INVALID_OFFSET: offset must be a non-negative safe integer");
    }
    if (this.limitValue && (!Number.isSafeInteger(this.limitValue) || this.limitValue < 1)) {
      throw new Error("QUERY_INVALID_LIMIT: limit must be a positive safe integer");
    }
    this.applyListLimit(this.hardLimitValue);
    return this;
  }
  forExactCount(alias = "__teaql_total") {
    const count = new _SelectQuery(this.entity);
    count.filterCondition = snapshotQuery(this.filterCondition);
    count.commentText = this.commentText;
    count.purposeText = this.purposeText;
    count.deletionVisibility = this.deletionVisibility;
    count.aggregate("Count", "id", alias);
    retainQueryDiagnosticOrigin(this, count);
    return count;
  }
  applyListLimit(ceiling) {
    if (!this.limitValue) this.limitValue = ceiling;
    if (this.limitValue > ceiling) {
      throw new Error(`QUERY_HARD_LIMIT_EXCEEDED: requested limit ${this.limitValue} exceeds hard limit ${ceiling}`);
    }
    for (const relation of this.relations) {
      relation.query?.applyListLimit(1e4);
    }
  }
  offset(offset) {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error("QUERY_INVALID_OFFSET: offset must be a non-negative safe integer");
    }
    this.offsetValue = offset;
    return this;
  }
  relation(name) {
    this.relations.push({ name });
    return this;
  }
  relationQuery(name, query, localKey = "id", foreignKey = "id", many = true, operation) {
    this.relations.push({ name, query, localKey, foreignKey, many, operation });
    return this;
  }
  relationAggregate(relationName, alias, query, singleResult = true, operation) {
    this.relationAggregates.push({ relationName, alias, query, singleResult, operation });
    return this;
  }
  order(orderBy) {
    this.orderItems.push(orderBy);
    return this;
  }
  select(items) {
    this.selectItems.push(...items);
    return this;
  }
  enableAggregationCacheFor(cacheExpiredMillis) {
    this.aggregationCache = AggregationCacheOptions.enabled(cacheExpiredMillis);
    return this;
  }
  propagateAggregationCache(cacheExpiredMillis) {
    if (!this.aggregationCache) {
      this.aggregationCache = AggregationCacheOptions.enabled(0);
    }
    this.aggregationCache.propagate(cacheExpiredMillis);
    return this;
  }
  aggregate(functionName, field, alias) {
    this.aggregateItems.push({ function: functionName, field, alias });
    return this;
  }
  groupBy(item, alias) {
    if (alias !== void 0) {
      if (typeof alias !== "string" || !alias.trim()) throw new TypeError("Group alias must be a non-empty string");
      const existing = this.groupByAliases?.[item];
      if (existing !== void 0 && existing !== alias) throw new Error("Grouping field already has a different alias");
      this.groupByAliases ?? (this.groupByAliases = /* @__PURE__ */ Object.create(null));
      this.groupByAliases[item] = alias;
    }
    this.groupByItems.push(item);
    return this;
  }
};
var MutationQuery = class {
  constructor(entity, action, payload, id, comment, expectedVersion) {
    this.entity = entity;
    this.action = action;
    this.payload = payload;
    this.id = id;
    this.comment = comment;
    this.expectedVersion = expectedVersion;
  }
};

// src/core/runtime-module.ts
function mergeRuntimeBootstrap(left, right) {
  const leftRoot = left.defaultDomainRoot;
  const rightRoot = right.defaultDomainRoot;
  if (leftRoot && rightRoot && (leftRoot.entity !== rightRoot.entity || leftRoot.id !== rightRoot.id)) {
    throw new Error("Cannot compose Runtime Modules with different Default Domain Roots");
  }
  const constants = /* @__PURE__ */ new Map();
  for (const value of [...left.constants ?? [], ...right.constants ?? []]) {
    constants.set(`${value.entity}:${value.id}`, value);
  }
  return {
    defaultDomainRoot: rightRoot ?? leftRoot,
    constants: [...constants.values()],
    ensure: left.ensure && right.ensure ? async (context) => {
      await left.ensure(context);
      await right.ensure(context);
    } : right.ensure ?? left.ensure
  };
}
var RuntimeModule = class _RuntimeModule {
  constructor(schemas = {}, checkers = {}, bootstrap = {}) {
    validateInteger32Schemas(schemas);
    this.schemas = Object.freeze({ ...schemas });
    this.checkers = Object.freeze({ ...checkers });
    this.bootstrap = Object.freeze({
      defaultDomainRoot: bootstrap.defaultDomainRoot,
      constants: Object.freeze([...bootstrap.constants ?? []]),
      ensure: bootstrap.ensure
    });
  }
  and(other) {
    return new _RuntimeModule(
      { ...this.schemas, ...other.schemas },
      { ...this.checkers, ...other.checkers },
      mergeRuntimeBootstrap(this.bootstrap, other.bootstrap)
    );
  }
};

// src/core/smart-list.ts
var SmartList = class _SmartList extends Array {
  static get [Symbol.species]() {
    return Array;
  }
  constructor(data = [], options = {}) {
    super();
    if (typeof data === "number") this.length = data;
    else for (const item of data) super.push(item);
    Object.setPrototypeOf(this, _SmartList.prototype);
    if (options.totalCount !== void 0) validateCount(options.totalCount);
    this.totalCount = options.totalCount;
    this.aggregations = cloneMetadata(options.aggregations ?? {});
    this.summary = cloneMetadata(options.summary ?? {});
    this.facets = cloneMetadata(options.facets ?? {});
    this.isLoaded = options.isLoaded ?? true;
  }
  static empty() {
    return new _SmartList([], { isLoaded: false });
  }
  get data() {
    return this;
  }
  withTotalCount(totalCount) {
    validateCount(totalCount);
    this.totalCount = totalCount;
    return this;
  }
  withFacet(name, facet) {
    this.facets[name] = facet;
    return this;
  }
  facet(name) {
    return this.facets[name];
  }
  totalCountOrLength() {
    return this.totalCount ?? this.length;
  }
  /** Native map/filter return Array; these dedicated operations return SmartList. */
  mapSmart(mapper) {
    return new _SmartList(Array.from(this, mapper), {
      totalCount: this.totalCount,
      aggregations: this.aggregations,
      summary: this.summary,
      facets: this.facets,
      isLoaded: this.isLoaded
    });
  }
  filterSmart(predicate) {
    return new _SmartList(this.filter(predicate), { isLoaded: this.isLoaded });
  }
  flatMapSmart(mapper) {
    return new _SmartList(this.flatMap((item, index) => Array.from(mapper(item, index))), { isLoaded: this.isLoaded });
  }
  get(index) {
    return Number.isInteger(index) && index >= 0 && index < this.length ? this[index] : void 0;
  }
  set(index, value) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return false;
    this[index] = value;
    return true;
  }
  first() {
    return this.get(0);
  }
  last() {
    return this.get(this.length - 1);
  }
  mergeBy(incoming, key) {
    const positions = /* @__PURE__ */ new Map();
    this.forEach((item, index) => positions.set(key(item), index));
    for (const item of incoming) {
      const itemKey = key(item), position = positions.get(itemKey);
      if (position !== void 0) this[position] = item;
      else {
        positions.set(itemKey, this.length);
        this.push(item);
      }
    }
  }
  identityMap(key) {
    return new Map(Array.from(this, (item) => [key(item), item]));
  }
  groupBy(key) {
    const groups = /* @__PURE__ */ new Map();
    for (const item of this) {
      const itemKey = key(item), values = groups.get(itemKey) ?? [];
      values.push(item);
      groups.set(itemKey, values);
    }
    return groups;
  }
  ids() {
    return Array.from(this, (item) => item.id ?? null);
  }
  mapById() {
    const result = /* @__PURE__ */ new Map();
    for (const item of this) if (item.id !== void 0 && item.id !== null) result.set(item.id, item);
    return result;
  }
  versions() {
    return Array.from(this, (item) => item.version ?? null);
  }
  removeFacet(name) {
    const result = this.facets[name];
    delete this.facets[name];
    return result;
  }
  takeFacets() {
    const result = this.facets;
    this.facets = {};
    return result;
  }
};
function validateCount(count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("totalCount must be an exact non-negative safe integer");
}
function cloneMetadata(value) {
  if (value instanceof SmartList) return value.mapSmart(cloneMetadata);
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneMetadata);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneMetadata(item)]));
  }
  return value;
}

// src/core/facet.ts
function snakeCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
function scalarId(value) {
  if (value && typeof value === "object") {
    const record = value;
    return record.id ?? record.Id;
  }
  return value;
}
function relationId(row, relationName) {
  const snake = snakeCase(relationName);
  for (const key of [relationName, `${relationName}Id`, snake, `${snake}_id`]) {
    const value = scalarId(row[key]);
    if (value !== void 0 && value !== null) return value;
  }
  return void 0;
}
function emptyAggregateValue(aggregate) {
  const fn = aggregate.function.toLowerCase();
  return fn === "count" ? 0 : null;
}
function compareAggregateValues(left, right) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime();
  return String(left).localeCompare(String(right));
}
async function executeFacetAggregatesFallback(service, prepareQuery, request, outerQuery, relationName, aggregates) {
  const membershipQuery = outerQuery.clone();
  membershipQuery.facets = [];
  membershipQuery.relations = [];
  membershipQuery.relationAggregates = [];
  membershipQuery.orderItems = [];
  membershipQuery.aggregateItems = [];
  membershipQuery.groupByItems = [];
  membershipQuery.groupByAliases = void 0;
  membershipQuery.offsetValue = 0;
  membershipQuery.limitValue = 0;
  membershipQuery.selectItems = [.../* @__PURE__ */ new Set([
    relationName,
    ...aggregates.map((aggregate) => aggregate.field)
  ])];
  membershipQuery.comment(`aggregate ${relationName}`);
  retainQueryDiagnosticOrigin(outerQuery, membershipQuery);
  const memberships = await service.executeQuery(
    request.deriveHelper(prepareQuery(membershipQuery), `aggregate ${relationName}`).query
  );
  const result = /* @__PURE__ */ new Map();
  const averageCounts = /* @__PURE__ */ new Map();
  for (const row of memberships) {
    const id = relationId(row, relationName);
    if (id === void 0 || id === null) continue;
    const key = String(id);
    const values = result.get(key) ?? {};
    const counts = averageCounts.get(key) ?? {};
    for (const aggregate of aggregates) {
      const fn = aggregate.function.toLowerCase();
      const raw = row[aggregate.field];
      if (fn === "count") {
        if (raw !== void 0 && raw !== null) {
          values[aggregate.alias] = Number(values[aggregate.alias] ?? 0) + 1;
        }
      } else if (fn === "sum" || fn === "avg") {
        if (raw !== void 0 && raw !== null) {
          const numeric = Number(raw);
          if (!Number.isFinite(numeric)) {
            throw new Error(`Facet aggregate ${aggregate.alias} requires numeric values`);
          }
          values[aggregate.alias] = Number(values[aggregate.alias] ?? 0) + numeric;
          if (fn === "avg") counts[aggregate.alias] = (counts[aggregate.alias] ?? 0) + 1;
        }
      } else if (fn === "min" || fn === "max") {
        if (raw !== void 0 && raw !== null) {
          const current = values[aggregate.alias];
          const comparison = current === void 0 || current === null ? 0 : compareAggregateValues(raw, current);
          if (current === void 0 || current === null || fn === "min" && comparison < 0 || fn === "max" && comparison > 0) {
            values[aggregate.alias] = raw;
          }
        }
      } else {
        throw new Error(`Unsupported facet aggregate: ${aggregate.function}`);
      }
    }
    result.set(key, values);
    averageCounts.set(key, counts);
  }
  for (const [key, values] of result) {
    const counts = averageCounts.get(key) ?? {};
    for (const aggregate of aggregates) {
      if (aggregate.function.toLowerCase() !== "avg") continue;
      const count = counts[aggregate.alias] ?? 0;
      values[aggregate.alias] = count ? Number(values[aggregate.alias] ?? 0) / count : null;
    }
  }
  return result;
}
async function executeRelationFacets(service, prepareQuery, outerQuery, facets) {
  const request = new QueryRequest(outerQuery);
  outerQuery = request.query;
  const result = {};
  for (const facet of facets) {
    const operation = request.deriveOperation(outerQuery, facet.operation ?? {
      kind: "facet",
      relation: facet.relationName,
      alias: facet.facetName
    });
    const nestedRequest = operation.deriveChild(facet.query.clone(), facet.relationName);
    const nestedQuery = nestedRequest.query;
    const nestedFacets = nestedQuery.facets;
    nestedQuery.facets = [];
    const requestedAggregates = nestedQuery.aggregateItems.map((item) => ({
      function: String(item.function),
      field: String(item.field),
      alias: String(item.alias)
    }));
    const executedAggregates = requestedAggregates.length ? requestedAggregates : [{ function: "Count", field: "id", alias: "__teaql_facet_membership_count" }];
    let aggregateValues;
    if (service.executeFacetAggregates) {
      aggregateValues = await service.executeFacetAggregates(
        operation.deriveHelper(
          prepareQuery(outerQuery.clone()),
          `aggregate ${facet.relationName}`
        ).query,
        facet.relationName,
        executedAggregates
      );
    } else if (service.executeFacetMembership && executedAggregates.every((item) => item.function.toLowerCase() === "count")) {
      const counts = await service.executeFacetMembership(
        operation.deriveHelper(
          prepareQuery(outerQuery.clone()),
          `aggregate ${facet.relationName}`
        ).query,
        facet.relationName
      );
      aggregateValues = new Map([...counts].map(([key, count]) => [
        key,
        Object.fromEntries(executedAggregates.map((item) => [item.alias, count]))
      ]));
    } else {
      aggregateValues = await executeFacetAggregatesFallback(
        service,
        prepareQuery,
        operation,
        outerQuery,
        facet.relationName,
        executedAggregates
      );
    }
    nestedQuery.aggregateItems = [];
    nestedQuery.groupByItems = [];
    nestedQuery.groupByAliases = void 0;
    for (const aggregate of nestedQuery.relationAggregates) {
      if (aggregate.query.entity !== outerQuery.entity) continue;
      const membership = outerQuery.clone();
      membership.selectItems = ["id"];
      membership.properties = [];
      membership.relations = [];
      membership.relationAggregates = [];
      membership.facets = [];
      membership.aggregateItems = [];
      membership.groupByItems = [];
      membership.groupByAliases = void 0;
      membership.orderItems = [];
      membership.offsetValue = 0;
      membership.limitValue = 0;
      const filter = { id: { $inSubquery: { query: membership, field: "id" } } };
      aggregate.query.filterCondition = aggregate.query.filterCondition ? { $and: [aggregate.query.filterCondition, filter] } : filter;
      retainQueryDiagnosticOrigin(outerQuery, aggregate.query);
    }
    if (!facet.includeAllFacets) {
      const membership = { id: { $in: [...aggregateValues.keys()] } };
      nestedQuery.filterCondition = nestedQuery.filterCondition ? { $and: [nestedQuery.filterCondition, membership] } : membership;
    }
    retainQueryDiagnosticOrigin(outerQuery, nestedQuery);
    const rows = await service.executeQuery(nestedRequest.withQuery(prepareQuery(nestedQuery)).query);
    const decorated = rows.map((row) => {
      const key = String(scalarId(row.id ?? row.Id));
      const values = aggregateValues.get(key);
      const copy = { ...row };
      for (const aggregate of requestedAggregates) {
        copy[aggregate.alias] = values?.[aggregate.alias] ?? emptyAggregateValue(aggregate);
      }
      return copy;
    }).filter((row) => facet.includeAllFacets || aggregateValues.has(String(scalarId(row.id ?? row.Id))));
    const list = new SmartList(decorated);
    if (nestedFacets.length) {
      list.facets = await executeRelationFacets(
        service,
        prepareQuery,
        nestedRequest.withQuery(nestedQuery).query,
        nestedFacets
      );
    }
    result[facet.facetName] = list;
  }
  return result;
}

export {
  integer32Error,
  ModeledInteger32Layout,
  validateInteger32Schemas,
  localTime,
  EntityRoot,
  MutationFieldLayout,
  ContextFix,
  SortDirection,
  OrderBy,
  AggregationCacheOptions,
  SelectQuery,
  MutationQuery,
  mergeRuntimeBootstrap,
  RuntimeModule,
  SmartList,
  executeRelationFacets
};
//# sourceMappingURL=chunk-7XDFNRIV.js.map
