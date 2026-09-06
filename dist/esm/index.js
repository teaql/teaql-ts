import {
  AggregationCacheOptions,
  CheckException,
  ContextRootError,
  I18nCatalog,
  MutationQuery,
  OrderBy,
  RuntimeModule,
  SelectQuery,
  SortDirection,
  UnsupportedLocaleError,
  UserContext,
  checkResultToWire,
  locales,
  mergeRuntimeBootstrap,
  parseLocale
} from "./chunks/chunk-65WCFPGD.js";
import {
  NOOP_RUNTIME_TELEMETRY,
  injectRuntimeContext,
  observeRuntimeOperation,
  runtimeErrorCategory,
  safeRuntimeOperation,
  startRuntimeOperation
} from "./chunks/chunk-WZ3T4PU6.js";

// src/core/value.ts
var Values = {
  Null: () => ({ type: "Null" }),
  Bool: (value) => ({ type: "Bool", value }),
  I64: (value) => ({ type: "I64", value }),
  U64: (value) => ({ type: "U64", value }),
  F64: (value) => ({ type: "F64", value }),
  Decimal: (value) => ({ type: "Decimal", value }),
  Text: (value) => ({ type: "Text", value }),
  Json: (value) => ({ type: "Json", value }),
  Date: (value) => ({ type: "Date", value }),
  Timestamp: (value) => ({ type: "Timestamp", value }),
  Object: (value) => ({ type: "Object", value }),
  List: (value) => ({ type: "List", value }),
  TypedNull: (dataType) => ({ type: "TypedNull", dataType }),
  isEmpty(v) {
    switch (v.type) {
      case "Null":
      case "TypedNull":
        return true;
      case "Text":
        return v.value === "";
      case "Object":
        return Object.keys(v.value).length === 0;
      case "List":
        return v.value.length === 0;
      default:
        return false;
    }
  },
  tryI64(v) {
    if (v.type === "I64" || v.type === "U64") return Number(v.value);
    if (v.type === "Decimal") return parseInt(v.value.toString(), 10);
    return null;
  }
};

// src/core/entity-root.ts
var identity = (key) => `${key.entity}\0${typeof key.id}:${String(key.id)}`;
var EntityRoot = class {
  constructor() {
    this.changes = /* @__PURE__ */ new Map();
    this.originalVersions = /* @__PURE__ */ new Map();
    this.newKeys = /* @__PURE__ */ new Map();
    this.deletedKeys = /* @__PURE__ */ new Map();
  }
  set(key, field, value) {
    if (!field.trim()) throw new TypeError("field is required");
    const id = identity(key);
    const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: {} };
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
  mergeFrom(other) {
    if (other === this) return;
    for (const entry of other.snapshot()) for (const [field, value] of Object.entries(entry.values)) this.set(entry.key, field, value);
    for (const key of other.newKeys.values()) this.markAsNew(key);
    for (const key of other.deletedKeys.values()) this.markAsDeleted(key);
    for (const entry of other.snapshotVersions()) this.setOriginalVersion(entry.key, entry.version);
  }
  snapshotVersions() {
    return [...this.originalVersions.values()];
  }
  rekey(oldKey, newKey) {
    const oldId = identity(oldKey);
    const newId = identity(newKey);
    if (oldId === newId) return;
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
  }
  clearEntity(key) {
    const id = identity(key);
    this.changes.delete(id);
    this.newKeys.delete(id);
    this.deletedKeys.delete(id);
  }
  setOriginalVersion(key, version) {
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
  }
};

// src/core/object-location.ts
function lowerCamel(name) {
  const parts = name.split("_");
  return parts[0] + parts.slice(1).map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join("");
}
function renderJsonFieldName(name, profile) {
  if (profile === "snake_case") return name;
  const camel = lowerCamel(name);
  if (profile === "camelCase" || !camel) return camel;
  return camel[0].toUpperCase() + camel.slice(1);
}
function escapeJsonPointer(value) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
var ObjectLocation = class _ObjectLocation {
  constructor(segments) {
    this.segments = segments;
  }
  static root() {
    return new _ObjectLocation([]);
  }
  static property(name) {
    return _ObjectLocation.root().property(name);
  }
  property(name) {
    return new _ObjectLocation([...this.segments, { kind: "property", name }]);
  }
  index(index) {
    return new _ObjectLocation([...this.segments, { kind: "index", index }]);
  }
  prefixedBy(prefix) {
    return new _ObjectLocation([...prefix.segments, ...this.segments]);
  }
  modelPath() {
    return this.render((name) => name);
  }
  nativePath() {
    return this.render(lowerCamel);
  }
  instancePath(profile = "camelCase") {
    return this.segments.map((segment) => segment.kind === "index" ? String(segment.index) : escapeJsonPointer(renderJsonFieldName(segment.name, profile))).map((value) => `/${value}`).join("");
  }
  toString() {
    return this.nativePath();
  }
  render(propertyName) {
    let result = "";
    for (const segment of this.segments) {
      if (segment.kind === "index") result += `[${segment.index}]`;
      else result += `${result ? "." : ""}${propertyName(segment.name)}`;
    }
    return result;
  }
};

// src/core/wire-fields.ts
var WireInputError = class extends Error {
  constructor(code, instancePath, message) {
    super(message);
    this.code = code;
    this.instancePath = instancePath;
    this.name = "WireInputError";
  }
};
function createWireEntityMetadata(entityType, canonicalFields, profile = "camelCase", aliases = {}) {
  const fields = {};
  const spellings = /* @__PURE__ */ new Map();
  for (const canonicalName of canonicalFields) {
    const wireName = renderJsonFieldName(canonicalName, profile);
    const fieldAliases = [...aliases[canonicalName] ?? []];
    for (const spelling of [wireName, ...fieldAliases]) {
      const existing = spellings.get(spelling);
      if (existing && existing !== canonicalName) {
        throw new Error(
          `Wire field spelling '${spelling}' maps to both '${existing}' and '${canonicalName}'`
        );
      }
      spellings.set(spelling, canonicalName);
    }
    fields[canonicalName] = Object.freeze({
      canonicalName,
      wireName,
      aliases: Object.freeze(fieldAliases)
    });
  }
  return Object.freeze({ entityType, profile, fields: Object.freeze(fields) });
}
function normalizeWireInput(input, metadata, parentPointer = "") {
  const lookup = /* @__PURE__ */ new Map();
  for (const field of Object.values(metadata.fields)) {
    lookup.set(field.wireName, field);
    for (const alias of field.aliases) lookup.set(alias, field);
  }
  const values = {};
  const sourceInstancePaths = {};
  const submitted = /* @__PURE__ */ new Map();
  for (const [submittedName, value] of Object.entries(input)) {
    const pointer = `${parentPointer}/${escapeJsonPointer2(submittedName)}`;
    const field = lookup.get(submittedName);
    if (!field) {
      throw new WireInputError(
        "WIRE_UNKNOWN_FIELD",
        pointer,
        `Unknown ${metadata.entityType} field '${submittedName}'`
      );
    }
    const previous = submitted.get(field.canonicalName);
    if (previous !== void 0) {
      throw new WireInputError(
        "WIRE_FIELD_COLLISION",
        pointer,
        `Fields '${previous}' and '${submittedName}' both map to canonical field '${field.canonicalName}'`
      );
    }
    submitted.set(field.canonicalName, submittedName);
    values[field.canonicalName] = value;
    if (submittedName !== field.wireName) {
      sourceInstancePaths[field.canonicalName] = pointer;
    }
  }
  return Object.freeze({
    values: Object.freeze(values),
    sourceInstancePaths: Object.freeze(sourceInstancePaths)
  });
}
function encodeWireOutput(values, metadata) {
  const output = {};
  for (const [canonicalName, value] of Object.entries(values)) {
    const field = metadata.fields[canonicalName];
    if (!field) {
      throw new Error(`Unknown canonical ${metadata.entityType} field '${canonicalName}'`);
    }
    output[field.wireName] = value;
  }
  return Object.freeze(output);
}
function retainSubmittedPaths(results, normalized) {
  return results.map((result) => {
    const firstProperty = result.location.segments.find((segment) => segment.kind === "property");
    if (!firstProperty || firstProperty.kind !== "property") return { ...result };
    const sourceInstancePath = normalized.sourceInstancePaths[firstProperty.name];
    return sourceInstancePath === void 0 ? { ...result } : { ...result, sourceInstancePath };
  });
}
function escapeJsonPointer2(value) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

// src/core/tools.ts
var ToolPolicy = class _ToolPolicy {
  constructor(allowed, allowMemoryOnly = true) {
    this.allowed = allowed;
    this.allowMemoryOnly = allowMemoryOnly;
  }
  static standard() {
    return new _ToolPolicy(/* @__PURE__ */ new Set());
  }
  static denyAll() {
    return new _ToolPolicy(/* @__PURE__ */ new Set(), false);
  }
  static builder() {
    return new ToolPolicyBuilder();
  }
  allows(token) {
    return token.risk === "MEMORY_ONLY" && this.allowMemoryOnly || this.allowed.has(token.id);
  }
};
var ToolPolicyBuilder = class {
  constructor() {
    this.allowed = /* @__PURE__ */ new Set();
  }
  allow(token) {
    this.allowed.add(token.id);
    return this;
  }
  build() {
    return new ToolPolicy(new Set(this.allowed));
  }
};
var DefaultTools = class {
  constructor(context, policy, providers) {
    this.context = context;
    this.policy = policy;
    this.providers = /* @__PURE__ */ new Map();
    for (const provider of providers) this.providers.set(provider.token.id, provider);
  }
  has(token) {
    return this.providers.has(token.id);
  }
  get(token) {
    const provider = this.providers.get(token.id);
    if (!provider) throw new Error(`Tool not available: ${token.id}`);
    if (!this.policy.allows(token)) throw new Error(`Tool denied by policy: ${token.id}`);
    return provider.create(this.context);
  }
  descriptors() {
    return [...this.providers.values()].map((provider) => provider.token);
  }
};
var ContextTools = class {
  static builder(context) {
    return new ContextToolsBuilder(context);
  }
  static of(context) {
    return this.builder(context).build();
  }
};
var ContextToolsBuilder = class {
  constructor(context) {
    this.context = context;
    this.selectedPolicy = ToolPolicy.standard();
    this.providers = [];
  }
  policy(policy) {
    this.selectedPolicy = policy;
    return this;
  }
  provider(provider) {
    this.providers.push(provider);
    return this;
  }
  build() {
    return new DefaultTools(this.context, this.selectedPolicy, this.providers);
  }
};
var HTTP_TOOL = Object.freeze({
  id: "http",
  risk: "EXTERNAL_RESOURCE"
});
var FetchHttpToolProvider = class {
  constructor(fetchImpl = fetch) {
    this.fetchImpl = fetchImpl;
    this.token = HTTP_TOOL;
  }
  create(_context) {
    const stage = (method, url, body) => ({
      purpose: (intent) => executable(method, url, body, intent),
      auditAs: (intent) => executable(method, url, body, intent)
    });
    const executable = (method, url, body, intent) => ({
      execute: async () => {
        if (!intent.trim()) throw new Error("HTTP tool execution requires non-empty intent");
        const response = await this.fetchImpl(url, method === "GET" ? { method } : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`HTTP tool failed: ${response.status}`);
        return response.text();
      }
    });
    return { get: (url) => stage("GET", url), post: (url, body) => stage("POST", url, body) };
  }
};

// src/core/local-cache.ts
var LocalCache = class {
  constructor() {
    this.entries = /* @__PURE__ */ new Map();
  }
  put(key, value, timeToLiveInSeconds) {
    const expiresAt = timeToLiveInSeconds !== void 0 && timeToLiveInSeconds > 0 ? Date.now() + timeToLiveInSeconds * 1e3 : void 0;
    this.entries.set(key, { value, expiresAt });
  }
  get(key) {
    const entry = this.entries.get(key);
    if (entry === void 0) return void 0;
    if (entry.expiresAt !== void 0 && Date.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return void 0;
    }
    return entry.value;
  }
  remove(key) {
    this.entries.delete(key);
  }
  clear() {
    this.entries.clear();
  }
};
var localCache = new LocalCache();

// src/core/smart-list.ts
var SmartList = class _SmartList extends Array {
  static get [Symbol.species]() {
    return Array;
  }
  constructor(data = [], options = {}) {
    if (typeof data === "number") super(data);
    else super(...data);
    Object.setPrototypeOf(this, _SmartList.prototype);
    this.totalCount = options.totalCount;
    this.aggregations = options.aggregations ?? {};
    this.summary = options.summary ?? {};
    this.facets = options.facets ?? {};
    this.isLoaded = options.isLoaded ?? true;
  }
  static empty() {
    return new _SmartList([], { isLoaded: false });
  }
  get data() {
    return this;
  }
  withTotalCount(totalCount) {
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
};

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
async function executeRelationFacets(service, prepareQuery, outerQuery, facets) {
  const result = {};
  for (const facet of facets) {
    let counts;
    if (service.executeFacetMembership) {
      counts = await service.executeFacetMembership(
        prepareQuery(outerQuery.clone()),
        facet.relationName
      );
    } else {
      const membershipQuery = outerQuery.clone();
      membershipQuery.facets = [];
      membershipQuery.relations = [];
      membershipQuery.orderItems = [];
      membershipQuery.aggregateItems = [];
      membershipQuery.groupByItems = [];
      membershipQuery.offsetValue = 0;
      membershipQuery.limitValue = 0;
      membershipQuery.selectItems = [facet.relationName];
      const memberships = await service.executeQuery(prepareQuery(membershipQuery));
      counts = /* @__PURE__ */ new Map();
      for (const row of memberships) {
        const id = relationId(row, facet.relationName);
        if (id === void 0 || id === null) continue;
        const key = String(id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const nestedQuery = facet.query.clone();
    nestedQuery.facets = [];
    const countAliases = nestedQuery.aggregateItems.filter((item) => String(item.function).toLowerCase() === "count").map((item) => String(item.alias));
    nestedQuery.aggregateItems = [];
    nestedQuery.groupByItems = [];
    const rows = await service.executeQuery(prepareQuery(nestedQuery));
    const decorated = rows.map((row) => {
      const count = counts.get(String(scalarId(row.id ?? row.Id))) ?? 0;
      const copy = { ...row };
      for (const alias of countAliases) copy[alias] = count;
      return copy;
    }).filter((row) => facet.includeAllFacets || counts.has(String(scalarId(row.id ?? row.Id))));
    result[facet.facetName] = new SmartList(decorated);
  }
  return result;
}

// src/meta/descriptors.ts
var DataType = /* @__PURE__ */ ((DataType2) => {
  DataType2["Text"] = "Text";
  DataType2["I64"] = "I64";
  DataType2["U64"] = "U64";
  DataType2["F64"] = "F64";
  DataType2["Decimal"] = "Decimal";
  DataType2["Bool"] = "Bool";
  DataType2["Date"] = "Date";
  DataType2["Timestamp"] = "Timestamp";
  DataType2["Json"] = "Json";
  return DataType2;
})(DataType || {});
var PropertyDescriptor = class _PropertyDescriptor {
  constructor(name, dataType) {
    this.nullable = true;
    this.isId = false;
    this.isVersion = false;
    this.name = name;
    this.dataType = dataType;
    this.columnNameString = name;
  }
  static new(name, dataType) {
    return new _PropertyDescriptor(name, dataType);
  }
  columnName(name) {
    this.columnNameString = name;
    return this;
  }
  notNull() {
    this.nullable = false;
    return this;
  }
  id() {
    this.isId = true;
    return this;
  }
  version() {
    this.isVersion = true;
    return this;
  }
};
var RelationDescriptor = class _RelationDescriptor {
  constructor(name, targetEntity) {
    this.localKeyValue = "id";
    this.foreignKeyValue = "id";
    this.isMany = false;
    this.isAttach = true;
    this.isDeleteMissing = true;
    this.name = name;
    this.targetEntity = targetEntity;
  }
  static new(name, targetEntity) {
    return new _RelationDescriptor(name, targetEntity);
  }
  localKey(key) {
    this.localKeyValue = key;
    return this;
  }
  foreignKey(key) {
    this.foreignKeyValue = key;
    return this;
  }
  many(many = true) {
    this.isMany = many;
    return this;
  }
  attach(attach = true) {
    this.isAttach = attach;
    return this;
  }
  detached() {
    this.isAttach = false;
    return this;
  }
  deleteMissing(deleteMissing = true) {
    this.isDeleteMissing = deleteMissing;
    return this;
  }
  keepMissing() {
    this.isDeleteMissing = false;
    return this;
  }
};
var EntityDescriptor = class _EntityDescriptor {
  constructor(name) {
    this.properties = [];
    this.relations = [];
    this.auditMaskFieldList = [];
    this.name = name;
    this.tableNameValue = name.toLowerCase();
  }
  static new(name) {
    return new _EntityDescriptor(name);
  }
  tableName(name) {
    this.tableNameValue = name;
    return this;
  }
  dataService(name) {
    this.dataServiceName = name;
    return this;
  }
  property(prop) {
    this.properties.push(prop);
    return this;
  }
  relation(rel) {
    this.relations.push(rel);
    return this;
  }
  auditMaskFields(fields) {
    this.auditMaskFieldList = fields;
    return this;
  }
  auditValueMaxLen(len) {
    this.auditValueMaxLenValue = len;
    return this;
  }
  propertyByName(name) {
    return this.properties.find((p) => p.name === name);
  }
  relationByName(name) {
    return this.relations.find((r) => r.name === name);
  }
  idProperty() {
    return this.properties.find((p) => p.isId);
  }
  versionProperty() {
    return this.properties.find((p) => p.isVersion);
  }
};

// src/tfp/client.ts
function rejectRemoteHardLimit(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectRemoteHardLimit(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (normalized === "hardlimit" || normalized === "hardlimitvalue" || normalized.startsWith("continuouspage") || normalized.startsWith("idsetpagination") || normalized.startsWith("paginationwithidset")) {
      throw new Error(`TFP_FORBIDDEN_FIELD: ${path}.${key} is server-local policy`);
    }
    rejectRemoteHardLimit(child, `${path}.${key}`);
  }
}
function serializeQuery(query, nestedFacet = false) {
  if (!Number.isSafeInteger(query.offsetValue) || query.offsetValue < 0) {
    throw new Error("TFP_INVALID_REQUEST: offset must be a non-negative safe integer");
  }
  if (query.limitValue && (!Number.isSafeInteger(query.limitValue) || query.limitValue < 1)) {
    throw new Error("TFP_INVALID_REQUEST: limit must be a positive safe integer");
  }
  rejectRemoteHardLimit(JSON.parse(JSON.stringify(query)));
  if (!query.commentText?.trim()) throw new Error("TFP_INVALID_REQUEST: commentText is required");
  if (!query.purposeText?.trim()) throw new Error("TFP_POLICY_VIOLATION: purposeText is required");
  if (query.relations.length || query.joins.length) {
    throw new Error("TFP_INVALID_REQUEST: relations and joins are not part of canonical TFP v1");
  }
  if (nestedFacet && query.facets.length) {
    throw new Error("TFP_INVALID_REQUEST: nested facets are not supported");
  }
  return {
    entity: query.entity,
    filterCondition: query.filterCondition,
    limitValue: query.limitValue || void 0,
    offsetValue: query.offsetValue || void 0,
    orderItems: query.orderItems,
    selectItems: query.selectItems,
    groupByItems: query.groupByItems,
    aggregateItems: query.aggregateItems,
    facets: query.facets.map((facet) => ({
      facetName: facet.facetName,
      relationName: facet.relationName,
      includeAllFacets: facet.includeAllFacets,
      query: serializeQuery(facet.query, true)
    })),
    commentText: query.commentText,
    purposeText: query.purposeText
  };
}
var TeaQLClient = class {
  constructor(config) {
    this.config = config;
    this.fetchImpl = config.fetch ?? (typeof window !== "undefined" ? window.fetch.bind(window) : fetch);
    this.runtimeTelemetry = config.runtimeTelemetry ?? NOOP_RUNTIME_TELEMETRY;
  }
  setRuntimeTelemetry(telemetry) {
    this.runtimeTelemetry = telemetry ?? NOOP_RUNTIME_TELEMETRY;
    return this;
  }
  async requestHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    return this.config.getHeaders ? { ...headers, ...await this.config.getHeaders() } : headers;
  }
  async executeQuery(query) {
    const payload = serializeQuery(query);
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/query`;
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      { family: "tfp", name: "client.query", attributes: { "teaql.tfp.role": "client" } },
      async () => {
        const headers = injectRuntimeContext(
          this.runtimeTelemetry,
          await this.requestHeaders()
        );
        const response = await this.fetchImpl(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`TEAQL Query Error [${response.status}]: ${errText}`);
        }
        const responseJson = await response.json();
        const facets = {};
        for (const [name, values] of Object.entries(responseJson.facets ?? {})) {
          facets[name] = new SmartList(values);
        }
        return new SmartList(responseJson.data ?? [], { facets });
      },
      (result) => ({ attributes: { "teaql.result.cardinality": result.length } })
    );
  }
  async *executeForStream(_query, _chunkSize = 1e3) {
    throw new Error(
      "TeaQL federation does not support executeForStream over the ordinary TFP request/response protocol; use a dedicated streaming protocol"
    );
  }
  async executeMutation(query) {
    if (!query?.comment?.trim?.()) {
      throw new Error("TFP_AUDIT_REASON_REQUIRED: mutation audit reason is required");
    }
    const payload = {
      entity: query.entity,
      action: query.action,
      payload: query.payload,
      id: query.id,
      expectedVersion: query.expectedVersion,
      comment: query.comment
    };
    rejectRemoteHardLimit(payload);
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      { family: "tfp", name: "client.mutation", attributes: { "teaql.tfp.role": "client" } },
      async () => {
        const headers = injectRuntimeContext(
          this.runtimeTelemetry,
          await this.requestHeaders()
        );
        const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, "")}/mutate`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TeaQL Mutation failed: ${response.status} ${errorText}`);
        }
        return response.json();
      }
    );
  }
};

// src/parser/query-parser.generated.ts
var peg$SyntaxError = class extends SyntaxError {
  constructor(message, expected, found, location) {
    super(message);
    this.expected = expected;
    this.found = found;
    this.location = location;
    this.name = "SyntaxError";
  }
  format(sources) {
    let str = "Error: " + this.message;
    if (this.location) {
      let src = null;
      const st = sources.find((s2) => s2.source === this.location.source);
      if (st) {
        src = st.text.split(/\r\n|\n|\r/g);
      }
      const s = this.location.start;
      const offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
      const loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
      if (src) {
        const e = this.location.end;
        const filler = "".padEnd(offset_s.line.toString().length, " ");
        const line = src[s.line - 1];
        const last = s.line === e.line ? e.column : line.length + 1;
        const hatLen = last - s.column || 1;
        str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + "".padEnd(s.column - 1, " ") + "".padEnd(hatLen, "^");
      } else {
        str += "\n at " + loc;
      }
    }
    return str;
  }
  static buildMessage(expected, found) {
    function hex(ch) {
      return ch.codePointAt(0).toString(16).toUpperCase();
    }
    const nonPrintable = Object.prototype.hasOwnProperty.call(RegExp.prototype, "unicode") ? new RegExp("[\\p{C}\\p{Mn}\\p{Mc}]", "gu") : null;
    function unicodeEscape(s) {
      if (nonPrintable) {
        return s.replace(nonPrintable, (ch) => "\\u{" + hex(ch) + "}");
      }
      return s;
    }
    function literalEscape(s) {
      return unicodeEscape(s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, (ch) => "\\x0" + hex(ch)).replace(/[\x10-\x1F\x7F-\x9F]/g, (ch) => "\\x" + hex(ch)));
    }
    function classEscape(s) {
      return unicodeEscape(s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, (ch) => "\\x0" + hex(ch)).replace(/[\x10-\x1F\x7F-\x9F]/g, (ch) => "\\x" + hex(ch)));
    }
    const DESCRIBE_EXPECTATION_FNS = {
      literal(expectation) {
        return '"' + literalEscape(expectation.text) + '"';
      },
      class(expectation) {
        const escapedParts = expectation.parts.map(
          (part) => Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part)
        );
        return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]" + (expectation.unicode ? "u" : "");
      },
      any() {
        return "any character";
      },
      end() {
        return "end of input";
      },
      other(expectation) {
        return expectation.description;
      }
    };
    function describeExpectation(expectation) {
      return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }
    function describeExpected(expected2) {
      const descriptions = expected2.map(describeExpectation);
      descriptions.sort();
      if (descriptions.length > 0) {
        let j = 1;
        for (let i = 1; i < descriptions.length; i++) {
          if (descriptions[i - 1] !== descriptions[i]) {
            descriptions[j] = descriptions[i];
            j++;
          }
        }
        descriptions.length = j;
      }
      switch (descriptions.length) {
        case 1:
          return descriptions[0];
        case 2:
          return descriptions[0] + " or " + descriptions[1];
        default:
          return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
      }
    }
    function describeFound(found2) {
      return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
    }
    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  }
};
function peg$parse(input, options) {
  options = options !== void 0 ? options : {};
  const peg$FAILED = {};
  const peg$source = options.grammarSource;
  const peg$startRuleFunctions = {
    Start: peg$parseStart
  };
  let peg$startRuleFunction = peg$parseStart;
  const peg$c0 = ";";
  const peg$c1 = ".";
  const peg$c2 = "(";
  const peg$c3 = ")";
  const peg$c4 = ",";
  const peg$c5 = "[";
  const peg$c6 = "]";
  const peg$c7 = '"';
  const peg$c8 = "\\";
  const peg$c9 = "'";
  const peg$c10 = "-";
  const peg$c11 = "true";
  const peg$c12 = "false";
  const peg$c13 = "null";
  const peg$r0 = /^[^"\\]/;
  const peg$r1 = /^[^'\\]/;
  const peg$r2 = /^[0-9]/;
  const peg$r3 = /^[eE]/;
  const peg$r4 = /^[+\-]/;
  const peg$r5 = /^[A-Za-z_$]/;
  const peg$r6 = /^[A-Za-z0-9_$]/;
  const peg$r7 = /^[ \t\r\n]/;
  const peg$e0 = peg$literalExpectation(";", false);
  const peg$e1 = peg$literalExpectation(".", false);
  const peg$e2 = peg$literalExpectation("(", false);
  const peg$e3 = peg$literalExpectation(")", false);
  const peg$e4 = peg$literalExpectation(",", false);
  const peg$e5 = peg$literalExpectation("[", false);
  const peg$e6 = peg$literalExpectation("]", false);
  const peg$e7 = peg$literalExpectation('"', false);
  const peg$e8 = peg$literalExpectation("\\", false);
  const peg$e9 = peg$anyExpectation();
  const peg$e10 = peg$classExpectation(['"', "\\"], true, false, false);
  const peg$e11 = peg$literalExpectation("'", false);
  const peg$e12 = peg$classExpectation(["'", "\\"], true, false, false);
  const peg$e13 = peg$literalExpectation("-", false);
  const peg$e14 = peg$classExpectation([["0", "9"]], false, false, false);
  const peg$e15 = peg$classExpectation(["e", "E"], false, false, false);
  const peg$e16 = peg$classExpectation(["+", "-"], false, false, false);
  const peg$e17 = peg$literalExpectation("true", false);
  const peg$e18 = peg$literalExpectation("false", false);
  const peg$e19 = peg$literalExpectation("null", false);
  const peg$e20 = peg$classExpectation([["A", "Z"], ["a", "z"], "_", "$"], false, false, false);
  const peg$e21 = peg$classExpectation([["A", "Z"], ["a", "z"], ["0", "9"], "_", "$"], false, false, false);
  const peg$e22 = peg$classExpectation([" ", "	", "\r", "\n"], false, false, false);
  function peg$f0(value) {
    return value;
  }
  function peg$f1(target, calls) {
    return expression(target, calls);
  }
  function peg$f2(method, args) {
    return { type: "Call", method, arguments: args || [] };
  }
  function peg$f3(head, tail) {
    return [head, ...tail.map((item) => item[3])];
  }
  function peg$f4(values) {
    return values || [];
  }
  function peg$f5(value) {
    return JSON.parse(value);
  }
  function peg$f6(escaped) {
    return escaped;
  }
  function peg$f7(chars) {
    return chars.join("");
  }
  function peg$f8(value) {
    return Number(value);
  }
  function peg$f9() {
    return true;
  }
  function peg$f10() {
    return false;
  }
  function peg$f11() {
    return null;
  }
  function peg$f12(value) {
    return value;
  }
  let peg$currPos = options.peg$currPos | 0;
  let peg$savedPos = peg$currPos;
  const peg$posDetailsCache = [{ line: 1, column: 1 }];
  let peg$maxFailPos = peg$currPos;
  let peg$maxFailExpected = options.peg$maxFailExpected || [];
  let peg$silentFails = options.peg$silentFails | 0;
  let peg$result;
  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }
  function offset() {
    return peg$savedPos;
  }
  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }
  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }
  function expected(description, location2) {
    location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location2
    );
  }
  function error(message, location2) {
    location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildSimpleError(message, location2);
  }
  function peg$getUnicode(pos = peg$currPos) {
    const cp = input.codePointAt(pos);
    if (cp === void 0) {
      return "";
    }
    return String.fromCodePoint(cp);
  }
  function peg$literalExpectation(text2, ignoreCase) {
    return { type: "literal", text: text2, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase, unicode) {
    return { type: "class", parts, inverted, ignoreCase, unicode };
  }
  function peg$anyExpectation() {
    return { type: "any" };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    let details = peg$posDetailsCache[pos];
    let p;
    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {
        }
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset2) {
    const startPosDetails = peg$computePosDetails(startPos);
    const endPosDetails = peg$computePosDetails(endPos);
    const res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset2 && peg$source && typeof peg$source.offset === "function") {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }
  function peg$fail(expected2) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected2);
  }
  function peg$buildSimpleError(message, location2) {
    return new peg$SyntaxError(message, null, null, location2);
  }
  function peg$buildStructuredError(expected2, found, location2) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected2, found),
      expected2,
      found,
      location2
    );
  }
  function peg$parseStart() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parse_();
    s2 = peg$parseExpression();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 59) {
        s4 = peg$c0;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      s5 = peg$parse_();
      peg$savedPos = s0;
      s0 = peg$f0(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseExpression() {
    let s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseIdentifier();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 46) {
        s5 = peg$c1;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e1);
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseCall();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (input.charCodeAt(peg$currPos) === 46) {
            s5 = peg$c1;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e1);
            }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            s7 = peg$parseCall();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f1(s1, s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseCall() {
    let s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseIdentifier();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 40) {
        s3 = peg$c2;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e2);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        s5 = peg$parseArguments();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        s6 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 41) {
          s7 = peg$c3;
          peg$currPos++;
        } else {
          s7 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s7 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f2(s1, s5);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseArguments() {
    let s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$parseValue();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 44) {
        s5 = peg$c4;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_();
        s7 = peg$parseValue();
        if (s7 !== peg$FAILED) {
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c4;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          s7 = peg$parseValue();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      peg$savedPos = s0;
      s0 = peg$f3(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseValue() {
    let s0;
    s0 = peg$parseExpression();
    if (s0 === peg$FAILED) {
      s0 = peg$parseArray();
      if (s0 === peg$FAILED) {
        s0 = peg$parseDoubleQuotedString();
        if (s0 === peg$FAILED) {
          s0 = peg$parseSingleQuotedString();
          if (s0 === peg$FAILED) {
            s0 = peg$parseNumber();
            if (s0 === peg$FAILED) {
              s0 = peg$parseBoolean();
              if (s0 === peg$FAILED) {
                s0 = peg$parseNull();
              }
            }
          }
        }
      }
    }
    return s0;
  }
  function peg$parseArray() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 91) {
      s1 = peg$c5;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e5);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      s3 = peg$parseArguments();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s4 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 93) {
        s5 = peg$c6;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e6);
        }
      }
      if (s5 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f4(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseDoubleQuotedString() {
    let s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s3 = peg$c7;
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e7);
      }
    }
    if (s3 !== peg$FAILED) {
      s4 = [];
      s5 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s6 = peg$c8;
        peg$currPos++;
      } else {
        s6 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e8);
        }
      }
      if (s6 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s7 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s7 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s7 !== peg$FAILED) {
          s6 = [s6, s7];
          s5 = s6;
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
      } else {
        peg$currPos = s5;
        s5 = peg$FAILED;
      }
      if (s5 === peg$FAILED) {
        s5 = input.charAt(peg$currPos);
        if (peg$r0.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
      }
      while (s5 !== peg$FAILED) {
        s4.push(s5);
        s5 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s6 = peg$c8;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        if (s6 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s7 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s7 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
          if (s7 !== peg$FAILED) {
            s6 = [s6, s7];
            s5 = s6;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
        if (s5 === peg$FAILED) {
          s5 = input.charAt(peg$currPos);
          if (peg$r0.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e10);
            }
          }
        }
      }
      if (input.charCodeAt(peg$currPos) === 34) {
        s5 = peg$c7;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
      if (s5 !== peg$FAILED) {
        s3 = [s3, s4, s5];
        s2 = s3;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f5(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parseSingleQuotedString() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 39) {
      s1 = peg$c9;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e11);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s4 = peg$c8;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e8);
        }
      }
      if (s4 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s5 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s5 !== peg$FAILED) {
          peg$savedPos = s3;
          s3 = peg$f6(s5);
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = input.charAt(peg$currPos);
        if (peg$r1.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s4 = peg$c8;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s3 = peg$f6(s5);
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = input.charAt(peg$currPos);
          if (peg$r1.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e12);
            }
          }
        }
      }
      if (input.charCodeAt(peg$currPos) === 39) {
        s3 = peg$c9;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e11);
        }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f7(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseNumber() {
    let s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 45) {
      s3 = peg$c10;
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e13);
      }
    }
    if (s3 === peg$FAILED) {
      s3 = null;
    }
    s4 = peg$currPos;
    s5 = [];
    s6 = input.charAt(peg$currPos);
    if (peg$r2.test(s6)) {
      peg$currPos++;
    } else {
      s6 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e14);
      }
    }
    if (s6 !== peg$FAILED) {
      while (s6 !== peg$FAILED) {
        s5.push(s6);
        s6 = input.charAt(peg$currPos);
        if (peg$r2.test(s6)) {
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
      }
    } else {
      s5 = peg$FAILED;
    }
    if (s5 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 46) {
        s6 = peg$c1;
        peg$currPos++;
      } else {
        s6 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e1);
        }
      }
      if (s6 !== peg$FAILED) {
        s7 = [];
        s8 = input.charAt(peg$currPos);
        if (peg$r2.test(s8)) {
          peg$currPos++;
        } else {
          s8 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s8 !== peg$FAILED) {
          while (s8 !== peg$FAILED) {
            s7.push(s8);
            s8 = input.charAt(peg$currPos);
            if (peg$r2.test(s8)) {
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e14);
              }
            }
          }
        } else {
          s7 = peg$FAILED;
        }
        if (s7 !== peg$FAILED) {
          s5 = [s5, s6, s7];
          s4 = s5;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
    } else {
      peg$currPos = s4;
      s4 = peg$FAILED;
    }
    if (s4 === peg$FAILED) {
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r2.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e14);
        }
      }
      if (s5 !== peg$FAILED) {
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r2.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e14);
            }
          }
        }
      } else {
        s4 = peg$FAILED;
      }
    }
    if (s4 !== peg$FAILED) {
      s5 = peg$currPos;
      s6 = input.charAt(peg$currPos);
      if (peg$r3.test(s6)) {
        peg$currPos++;
      } else {
        s6 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e15);
        }
      }
      if (s6 !== peg$FAILED) {
        s7 = input.charAt(peg$currPos);
        if (peg$r4.test(s7)) {
          peg$currPos++;
        } else {
          s7 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        if (s7 === peg$FAILED) {
          s7 = null;
        }
        s8 = [];
        s9 = input.charAt(peg$currPos);
        if (peg$r2.test(s9)) {
          peg$currPos++;
        } else {
          s9 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s9 !== peg$FAILED) {
          while (s9 !== peg$FAILED) {
            s8.push(s9);
            s9 = input.charAt(peg$currPos);
            if (peg$r2.test(s9)) {
              peg$currPos++;
            } else {
              s9 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e14);
              }
            }
          }
        } else {
          s8 = peg$FAILED;
        }
        if (s8 !== peg$FAILED) {
          s6 = [s6, s7, s8];
          s5 = s6;
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
      } else {
        peg$currPos = s5;
        s5 = peg$FAILED;
      }
      if (s5 === peg$FAILED) {
        s5 = null;
      }
      s3 = [s3, s4, s5];
      s2 = s3;
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f8(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parseBoolean() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c11) {
      s1 = peg$c11;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e17);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseIdentifierPart();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = void 0;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f9();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c12) {
        s1 = peg$c12;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e18);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = void 0;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f10();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseNull() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c13) {
      s1 = peg$c13;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e19);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseIdentifierPart();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = void 0;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f11();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseIdentifier() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$currPos;
    s3 = input.charAt(peg$currPos);
    if (peg$r5.test(s3)) {
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e20);
      }
    }
    if (s3 !== peg$FAILED) {
      s4 = [];
      s5 = peg$parseIdentifierPart();
      while (s5 !== peg$FAILED) {
        s4.push(s5);
        s5 = peg$parseIdentifierPart();
      }
      s3 = [s3, s4];
      s2 = s3;
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f12(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parseIdentifierPart() {
    let s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r6.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e21);
      }
    }
    return s0;
  }
  function peg$parse_() {
    let s0, s1;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r7.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e22);
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r7.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e22);
        }
      }
    }
    return s0;
  }
  function expression(target, calls) {
    return { type: "CallChain", target, calls: calls.map((item) => item[3]) };
  }
  peg$result = peg$startRuleFunction();
  const peg$success = peg$result !== peg$FAILED && peg$currPos === input.length;
  function peg$throw() {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? peg$getUnicode(peg$maxFailPos) : null,
      peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
  if (options.peg$library) {
    return (
      /** @type {any} */
      {
        peg$result,
        peg$currPos,
        peg$FAILED,
        peg$maxFailExpected,
        peg$maxFailPos,
        peg$success,
        peg$throw: peg$success ? void 0 : peg$throw
      }
    );
  }
  if (peg$success) {
    return peg$result;
  } else {
    peg$throw();
  }
}

// src/parser/dsl.ts
var FORBIDDEN_PROPERTY_NAMES = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function executeCallChain(node, entryPoint) {
  if (node.target !== "Q") {
    throw new Error(`Unsupported query entry point ${node.target}; expected Q`);
  }
  let receiver = entryPoint;
  for (const call of node.calls) {
    if (FORBIDDEN_PROPERTY_NAMES.has(call.method)) {
      throw new Error(`Method ${call.method} is not allowed in a query expression`);
    }
    if (typeof receiver !== "object" && typeof receiver !== "function" || receiver === null) {
      throw new Error(`Cannot call ${call.method} on a non-query value`);
    }
    const method = receiver[call.method];
    if (typeof method !== "function") {
      throw new Error(`Method ${call.method} is not available on the generated query API`);
    }
    const args = call.arguments.map(
      (argument) => typeof argument === "object" && argument !== null && !Array.isArray(argument) ? executeCallChain(argument, entryPoint) : argument
    );
    receiver = method.apply(receiver, args);
  }
  return receiver;
}
var QueryParser = class {
  // The concrete return type is supplied by the generated entry point at runtime.
  // Keep `any` for source compatibility with existing generated Q facades.
  static parse(querySource, entryPoint) {
    const ast = peg$parse(querySource, void 0);
    return executeCallChain(ast, entryPoint);
  }
};
export {
  AggregationCacheOptions,
  CheckException,
  ContextRootError,
  ContextTools,
  ContextToolsBuilder,
  DataType,
  EntityDescriptor,
  EntityRoot,
  FetchHttpToolProvider,
  HTTP_TOOL,
  I18nCatalog,
  LocalCache,
  MutationQuery,
  NOOP_RUNTIME_TELEMETRY,
  ObjectLocation,
  OrderBy,
  PropertyDescriptor,
  QueryParser,
  RelationDescriptor,
  RuntimeModule,
  SelectQuery,
  SmartList,
  SortDirection,
  TeaQLClient,
  ToolPolicy,
  ToolPolicyBuilder,
  UnsupportedLocaleError,
  UserContext,
  Values,
  WireInputError,
  checkResultToWire,
  createWireEntityMetadata,
  encodeWireOutput,
  executeRelationFacets,
  injectRuntimeContext,
  localCache,
  locales,
  mergeRuntimeBootstrap,
  normalizeWireInput,
  observeRuntimeOperation,
  parseLocale,
  renderJsonFieldName,
  retainSubmittedPaths,
  runtimeErrorCategory,
  safeRuntimeOperation,
  startRuntimeOperation
};
//# sourceMappingURL=index.js.map
