import {
  __privateAdd,
  __privateGet,
  __privateSet
} from "./chunk-AQT573VW.js";

// src/core/trace-chain.ts
function cloneTraceNodes(source) {
  return Object.freeze(source.map((node) => Object.freeze({ ...node })));
}
var _parent, _node;
var MutationTraceScope = class {
  constructor(parent, node) {
    __privateAdd(this, _parent);
    __privateAdd(this, _node);
    __privateSet(this, _parent, parent);
    __privateSet(this, _node, Object.freeze({ ...node }));
    Object.freeze(this);
  }
  recover() {
    const nodes = [];
    let scope = this;
    while (scope) {
      nodes.push(__privateGet(scope, _node));
      scope = __privateGet(scope, _parent);
    }
    return cloneTraceNodes(nodes.reverse());
  }
};
_parent = new WeakMap();
_node = new WeakMap();
function mutationScopeForEntity(parent, entity, id, rootComment, localComment) {
  const reason = parent ? localComment : rootComment;
  if (parent && (typeof reason !== "string" || /^\p{White_Space}*$/u.test(reason))) return parent;
  const rawId = String(id);
  const entityId = /^(0|[1-9][0-9]*)$/.test(rawId) && BigInt(rawId) <= 18446744073709551615n ? id : void 0;
  return new MutationTraceScope(parent, {
    kind: "auditReason",
    name: entity,
    entityId,
    detail: reason
  });
}
var intentKinds = /* @__PURE__ */ new Set(["comment", "purpose", "auditReason"]);
var nonBlank = (value) => !/^\p{White_Space}*$/u.test(value);
function canonicalSQLTracePath(source, backend, operation) {
  const last = (kind) => {
    for (let index = source.length - 1; index >= 0; index--) {
      if (source[index].kind === kind) return source[index].detail ?? "";
    }
    return void 0;
  };
  const canonical = ["operation", "provider", "sql"].every((kind) => source.some((node) => node.kind === kind));
  let path;
  if (canonical) path = source.filter((node) => !intentKinds.has(node.kind));
  else {
    const root = source.find((node) => nonBlank(node.name))?.name ?? "unknown";
    let entity = root;
    if (operation !== "select") {
      for (const node of source) if (node.kind === "entity" && nonBlank(node.name)) entity = node.name;
    }
    path = [
      { kind: "operation", name: root, detail: operation === "select" ? "query" : "mutation" },
      { kind: operation === "select" ? "request" : "entity", name: operation === "select" ? root : entity, detail: "" },
      ...source.filter((node) => node.kind === "relation"),
      { kind: "provider", name: nonBlank(backend) ? backend : "unknown", detail: "" },
      { kind: "sql", name: operation, detail: "" }
    ];
  }
  return Object.freeze({
    tracePath: cloneTraceNodes(path),
    comment: last("comment"),
    purpose: last("purpose"),
    auditReason: last("auditReason")
  });
}
function queryTraceSource(entity, comment, purpose) {
  return cloneTraceNodes([
    { kind: "comment", name: entity, detail: comment },
    { kind: "purpose", name: entity, detail: purpose }
  ]);
}

// src/sql/log-rendering.ts
function debugSQL(parameterizedSQL, parameters, databaseKind = "sqlite") {
  return renderSQL(parameterizedSQL, parameters, databaseKind);
}
function renderSQL(parameterizedSQL, parameters, databaseKind, parameterLiteral) {
  if (parameterLiteral && !parameterizedSQL.trim()) throw new Error("Missing SQL template");
  let positionalIndex = 0;
  const used = /* @__PURE__ */ new Set();
  const literal = (index) => {
    if (index < 0 || index >= parameters.length) throw new Error("SQL bind count mismatch");
    used.add(index);
    return parameterLiteral ? parameterLiteral(index) : sqlLiteral(parameters[index], databaseKind);
  };
  let result = "";
  let state = "sql";
  for (let index = 0; index < parameterizedSQL.length; index++) {
    const char = parameterizedSQL[index];
    const next = parameterizedSQL[index + 1] ?? "";
    if (state === "sql" && char === "'") {
      result += char;
      state = "single";
      continue;
    }
    if (state === "sql" && char === '"') {
      result += char;
      state = "double";
      continue;
    }
    if (state === "sql" && char === "`") {
      result += char;
      state = "backtick";
      continue;
    }
    if (state === "sql" && char === "-" && next === "-") {
      result += "--";
      index++;
      state = "line-comment";
      continue;
    }
    if (state === "sql" && char === "/" && next === "*") {
      result += "/*";
      index++;
      state = "block-comment";
      continue;
    }
    if (state === "single") {
      result += char;
      if (char === "'" && next === "'") result += parameterizedSQL[++index];
      else if (char === "'") state = "sql";
      continue;
    }
    if (state === "double") {
      result += char;
      if (char === '"' && next === '"') result += parameterizedSQL[++index];
      else if (char === '"') state = "sql";
      continue;
    }
    if (state === "backtick") {
      result += char;
      if (char === "`" && next === "`") result += parameterizedSQL[++index];
      else if (char === "`") state = "sql";
      continue;
    }
    if (state === "line-comment") {
      result += char;
      if (char === "\r" || char === "\n") state = "sql";
      continue;
    }
    if (state === "block-comment") {
      result += char;
      if (char === "*" && next === "/") {
        result += "/";
        index++;
        state = "sql";
      }
      continue;
    }
    if (char === "?") {
      if (parameterLiteral || positionalIndex < parameters.length) result += literal(positionalIndex++);
      else result += char;
      continue;
    }
    if (char === "$" && /[0-9]/.test(parameterizedSQL[index + 1] ?? "")) {
      let end = index + 1;
      while (/[0-9]/.test(parameterizedSQL[end] ?? "")) end++;
      const parameterIndex = Number(parameterizedSQL.slice(index + 1, end)) - 1;
      result += parameterLiteral || parameterIndex >= 0 && parameterIndex < parameters.length ? literal(parameterIndex) : parameterizedSQL.slice(index, end);
      index = end - 1;
      continue;
    }
    if (parameterizedSQL.slice(index).match(/^@p[0-9]+/i)) {
      const placeholder = parameterizedSQL.slice(index).match(/^@p([0-9]+)/i);
      const parameterIndex = Number(placeholder[1]) - 1;
      result += parameterLiteral || parameterIndex >= 0 && parameterIndex < parameters.length ? literal(parameterIndex) : placeholder[0];
      index += placeholder[0].length - 1;
      continue;
    }
    result += char;
  }
  if (parameterLiteral && (used.size !== parameters.length || state !== "sql" && state !== "line-comment")) {
    throw new Error("Incomplete SQL diagnostic rendering");
  }
  return result;
}
function sqlLiteral(value, databaseKind) {
  if (value && typeof value === "object" && "type" in value) {
    const typed = value;
    if (typed.type === "Null" || typed.type === "TypedNull") return "NULL";
    if (typed.type === "Date") {
      const date = typed.value instanceof Date ? typed.value.toISOString().slice(0, 10) : String(typed.value);
      if (databaseKind === "postgresql") return `DATE ${quoteSQLString(date)}`;
      if (databaseKind === "mysql") return `CAST(${quoteSQLString(date)} AS DATE)`;
      return quoteSQLString(date);
    }
    if (typed.type === "Timestamp") {
      if (databaseKind === "sqlite") return String(typed.value);
      const iso = new Date(Number(typed.value)).toISOString();
      if (databaseKind === "postgresql") return `TIMESTAMPTZ ${quoteSQLString(iso)}`;
      return `CAST(${quoteSQLString(iso.slice(0, 23).replace("T", " "))} AS DATETIME(3))`;
    }
    if (typed.type === "Bool") return typed.value ? "TRUE" : "FALSE";
    if (["I64", "U64", "F64", "Decimal"].includes(typed.type)) return String(typed.value);
    if (typed.type === "Text") return quoteSQLString(String(typed.value));
  }
  if (value === null || value === void 0) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Date) {
    if (databaseKind === "sqlite") return String(value.getTime());
    if (databaseKind === "postgresql") return `TIMESTAMPTZ ${quoteSQLString(value.toISOString())}`;
    return `CAST(${quoteSQLString(value.toISOString().slice(0, 23).replace("T", " "))} AS DATETIME(3))`;
  }
  if (value instanceof Uint8Array) {
    return `X'${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}'`;
  }
  if (typeof value === "object") return quoteSQLString(JSON.stringify(value));
  return quoteSQLString(String(value));
}
function quoteSQLString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

// src/core/log-privacy.ts
var PLAINTEXT_LOG_ENV = "TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS";
var PLAINTEXT_LOG_ACK = "I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK";
var redacted = "[REDACTED]";
var redactedSQL = "[REDACTED SQL; NOT REPLAYABLE]";
var debugLabel = "-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN\n";
var warned = false;
function maskAuditValue(value) {
  const scalars = Array.from(value);
  if (scalars.length < 8 || /^[0-9]+$/.test(value)) return "*".repeat(scalars.length);
  return scalars.slice(0, 2).join("") + "*".repeat(scalars.length - 4) + scalars.slice(-2).join("");
}
function plaintextLogsEnabled() {
  const environment = globalThis.process?.env;
  const enabled = environment?.[PLAINTEXT_LOG_ENV] === PLAINTEXT_LOG_ACK;
  if (enabled && !warned) {
    warned = true;
    console.warn("TeaQL: sensitive plaintext logging enabled; application data may be written to disk. Authentication secrets remain redacted.");
  }
  return enabled;
}
function credentialName(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    "password",
    "passwd",
    "passphrase",
    "privatekey",
    "secret",
    "accesstoken",
    "refreshtoken",
    "idtoken",
    "apikey",
    "authorization",
    "credential",
    "sessiontoken",
    "magiclinktoken"
  ].some((word) => normalized.includes(word));
}
function hasCredentials(value) {
  if (Array.isArray(value)) return value.some(hasCredentials);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => credentialName(key) || hasCredentials(child));
  }
  return false;
}
function logValueStrings(value) {
  if (value === void 0 || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(logValueStrings);
  if (value instanceof Date) return [value.toISOString()];
  if (typeof value === "object") return Object.values(value).flatMap(logValueStrings);
  return [String(value)];
}
function scrubLogText(text, values) {
  return [...new Set(values)].sort((a, b) => b.length - a.length).reduce((result, value) => result?.split(value).join(redacted), text);
}
var projections = /* @__PURE__ */ new WeakMap();
var safeAlternatives = /* @__PURE__ */ new WeakMap();
var rawProvenance = /* @__PURE__ */ new WeakMap();
function retainSQLLogProvenance(metadata, bindings, intentValues = []) {
  rawProvenance.set(metadata, {
    bindings: bindings ? inheritSQLLogBindings(bindings) : void 0,
    intentValues: Object.freeze(intentValues.map(copyLogValue))
  });
}
function bindingPolicies(metadata) {
  const supplied = metadata.parameterLogPolicies;
  const valid = !!supplied && supplied.length === metadata.parameters.length;
  const credentialStatement = credentialName(metadata.parameterizedSQL) && (metadata.sqlOrigin !== "generated" || !valid);
  return metadata.parameters.map((value, index) => {
    if (credentialStatement || hasCredentials(value)) return "credential";
    const policy = valid ? supplied[index] : void 0;
    return policy === "plain" || policy === "masked" || policy === "credential" ? policy : "unknown";
  });
}
function bindingIsMasked(policy, allow) {
  return policy === "credential" || policy === "unknown" || !allow && policy !== "plain";
}
function privateLogValueStrings(source) {
  if (!source) return [];
  const policies = bindingPolicies(source);
  return source.parameters.flatMap((value, index) => bindingIsMasked(policies[index], false) ? logValueStrings(value) : []);
}
function copyLogValue(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return Object.freeze(value.map(copyLogValue));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, copyLogValue(child)])
  ));
  return value;
}
function inheritSQLLogBindings(source, inherited) {
  const sources = inherited ? [inherited, source] : [source];
  return Object.freeze({
    parameterizedSQL: "",
    sqlOrigin: "generated",
    parameters: Object.freeze(sources.flatMap((item) => item.parameters.map(copyLogValue))),
    parameterLogPolicies: Object.freeze(sources.flatMap(bindingPolicies))
  });
}
function businessMask(value) {
  if (value === null || value === void 0) return null;
  if (Array.isArray(value)) return value.map(businessMask);
  if (value && typeof value === "object" && "type" in value) {
    return businessMask(value.value);
  }
  if (typeof value === "object" && !(value instanceof Date)) return redacted;
  return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}
function projectSQLLog(metadata, inherited, intentValues = []) {
  const allow = plaintextLogsEnabled() && metadata.logMode !== "masked";
  const prior = projections.get(metadata);
  if (prior !== void 0 && (!prior || allow)) return metadata;
  const safe = safeAlternatives.get(metadata);
  if (!allow && safe) return safe;
  const projected = projectWithPolicy(metadata, allow, inherited, intentValues);
  projections.set(projected, allow);
  if (allow) {
    const alternative = projectWithPolicy(metadata, false, inherited, intentValues);
    projections.set(alternative, false);
    safeAlternatives.set(projected, alternative);
  }
  return projected;
}
function projectSafeSQLLog(metadata) {
  const safe = safeAlternatives.get(metadata);
  if (safe) return safe;
  if (projections.get(metadata) === false) return metadata;
  const projected = projectWithPolicy(metadata, false);
  projections.set(projected, false);
  return projected;
}
function projectWithPolicy(metadata, allow, inherited, intentValues = []) {
  const retained = rawProvenance.get(metadata);
  if (retained?.bindings) inherited = inheritSQLLogBindings(retained.bindings, inherited);
  if (retained) intentValues = [...intentValues, ...retained.intentValues];
  const supplied = metadata.parameterLogPolicies;
  const policiesValid = !supplied || supplied.length === metadata.parameters.length;
  const credentialStatement = credentialName(metadata.parameterizedSQL) && (metadata.sqlOrigin !== "generated" || !supplied || !policiesValid);
  const policies = bindingPolicies(metadata);
  const masked = policies.map((policy) => bindingIsMasked(policy, allow));
  const secrets = metadata.parameters.flatMap((value, index) => masked[index] ? logValueStrings(value) : []);
  if (inherited) {
    const inheritedPolicies = bindingPolicies(inherited);
    secrets.push(...inherited.parameters.flatMap((value, index) => bindingIsMasked(inheritedPolicies[index], allow) ? logValueStrings(value) : []));
  }
  const intentSecrets = [...secrets, ...intentValues.flatMap(logValueStrings)];
  const unknownDebugIntent = !allow && metadata.logMode === "debug-plaintext" && !inherited;
  const intentText = (value) => unknownDebugIntent && value ? redacted : scrubLogText(value, intentSecrets);
  const safeValues = metadata.parameters.map((value, index) => {
    if (!masked[index]) return copyLogValue(value);
    return policies[index] === "masked" ? businessMask(value) : redacted;
  });
  const bareTemplate = metadata.parameterizedSQL.replace(/\$[0-9]+|@p[0-9]+/gi, "?");
  const unsafeSQL = (!allow || credentialStatement) && metadata.sqlOrigin !== "generated" && /['"`$]|--|\/\*|\b\d+\b|:[A-Za-z_]/.test(bareTemplate);
  const kind = metadata.databaseKind ?? "sqlite";
  let rendered = redactedSQL;
  let omissionReason = unsafeSQL ? "untrusted-literal-sql" : !policiesValid ? "policy-count-mismatch" : void 0;
  if (!unsafeSQL && policiesValid) {
    try {
      rendered = renderSQL(metadata.parameterizedSQL, safeValues, kind, (index) => sqlLiteral(safeValues[index], kind) + (masked[index] ? " /* masked */" : ""));
      rendered = (allow ? masked.some(Boolean) ? "-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN; PARTIALLY MASKED; NOT REPLAYABLE\n" : debugLabel : "-- TeaQL MASKED; NOT REPLAYABLE\n") + rendered;
    } catch {
      rendered = redactedSQL;
      omissionReason = "unsupported-or-mismatched-bindings";
    }
  }
  const projected = Object.freeze({
    ...metadata,
    ...metadata.statements ? { statements: Object.freeze(metadata.statements.map((statement) => projectWithPolicy(statement, allow, inheritSQLLogBindings(metadata, inherited), intentValues))) } : {},
    parameterizedSQL: unsafeSQL ? redactedSQL : metadata.sqlOrigin === "generated" ? metadata.parameterizedSQL : scrubLogText(metadata.parameterizedSQL, secrets),
    parameters: Object.freeze(safeValues),
    parameterLogPolicies: Object.freeze(policies),
    maskedParameters: Object.freeze(masked),
    logMode: allow ? "debug-plaintext" : "masked",
    omissionReason,
    debugSQL: rendered,
    comment: intentText(metadata.comment),
    purpose: intentText(metadata.purpose),
    auditReason: intentText(metadata.auditReason),
    ...metadata.traceChain ? { traceChain: Object.freeze(metadata.traceChain.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {},
    // Counts are operational metadata, not a copy of a masked numeric binding.
    resultSummary: metadata.resultCount !== void 0 ? `${metadata.resultCount} rows returned` : metadata.affectedRows !== void 0 ? `${metadata.affectedRows} rows affected` : scrubLogText(metadata.resultSummary, secrets),
    tracePath: Object.freeze(metadata.tracePath.map((frame) => Object.freeze(
      Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))
    ))),
    ...metadata.traceChain ? { traceChain: Object.freeze(metadata.traceChain.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {},
    // Typed identity is structural (as in the audit event's id), not prose.
    ...metadata.mutationLineage ? { mutationLineage: Object.freeze(metadata.mutationLineage.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {}
  });
  return projected;
}

// src/core/query-snapshot.ts
var origins = /* @__PURE__ */ new WeakMap();
var requestOwners = /* @__PURE__ */ new WeakMap();
function queryExecutionOwner(query) {
  return requestOwners.get(query);
}
function retainQueryExecutionOwner(query, owner) {
  requestOwners.set(query, owner);
}
function queryDiagnosticOrigin(query) {
  return origins.get(query);
}
function retainQueryDiagnosticOrigin(source, target) {
  origins.set(target, origins.get(source) ?? snapshotQuery(source));
}
function snapshotQuery(value, seen = /* @__PURE__ */ new Map()) {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return new Uint8Array(value);
  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if ("value" in descriptor && descriptor.enumerable) descriptor.value = snapshotQuery(descriptor.value, seen);
    Object.defineProperty(copy, key, descriptor);
  }
  const origin = origins.get(value);
  if (origin) origins.set(copy, origin);
  const owner = requestOwners.get(value);
  if (owner) requestOwners.set(copy, owner);
  return copy;
}

// src/core/loaded-scalar-snapshot.ts
var loadedSnapshots = /* @__PURE__ */ new WeakMap();
var _values;
var _LoadedScalarSnapshot = class _LoadedScalarSnapshot {
  constructor(values = {}) {
    __privateAdd(this, _values);
    __privateSet(this, _values, snapshotQuery(values));
    Object.freeze(this);
  }
  /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
  values() {
    return snapshotQuery(__privateGet(this, _values));
  }
  /** @internal Generated hydration stores provenance outside entity/JSON state. */
  static captureFor(entity, values) {
    const snapshot = new _LoadedScalarSnapshot(values);
    loadedSnapshots.set(entity, snapshot);
    return snapshot;
  }
  /** @internal Mutation uses the loaded values, not already-edited properties. */
  static forEntity(entity) {
    return loadedSnapshots.get(entity);
  }
  /** @internal Rollback restores provenance together with authoritative entity state. */
  static restoreFor(entity, snapshot) {
    if (snapshot) loadedSnapshots.set(entity, snapshot);
    else loadedSnapshots.delete(entity);
  }
};
_values = new WeakMap();
var LoadedScalarSnapshot = _LoadedScalarSnapshot;

// src/core/request-intent.ts
var mutationSnapshots = /* @__PURE__ */ new WeakMap();
var querySources = /* @__PURE__ */ new WeakMap();
var graphRequests = /* @__PURE__ */ new WeakMap();
var scopeOwners = /* @__PURE__ */ new WeakMap();
function operationSnapshot(operation) {
  if (!["named-count", "facet", "relation-count", "relation-select", "aggregate", "pagination"].includes(operation.kind) || operation.method !== void 0 && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(operation.method) || operation.alias !== void 0 && typeof operation.alias !== "string" || operation.relation !== void 0 && typeof operation.relation !== "string") {
    throw new Error("QUERY_OPERATION_INVALID: invalid generated operation descriptor");
  }
  return Object.freeze({
    kind: operation.kind,
    method: operation.method,
    alias: operation.alias,
    relation: operation.relation
  });
}
function queryOperationComment(operation) {
  const captured = operationSnapshot(operation);
  const literal = (value) => "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") + "'";
  if (!captured.method) return "framework: " + captured.kind + (captured.relation ? " " + captured.relation : "") + (captured.alias !== void 0 ? " " + literal(captured.alias) : "");
  return captured.method + "(" + (captured.alias !== void 0 ? literal(captured.alias) : captured.kind === "relation-select" ? "..." : "") + ")";
}
var requestBindingToken = /* @__PURE__ */ Symbol("runtime request binding");
var RequestIntentError = class extends Error {
  constructor(code, field, requestKind) {
    super(`${code}: ${requestKind} request requires a non-blank ${field}; supply it at the request entry point`);
    this.code = code;
    this.field = field;
    this.requestKind = requestKind;
    this.name = "RequestIntentError";
  }
};
function requireText(value, field, kind) {
  if (typeof value !== "string" || /^\p{White_Space}*$/u.test(value)) {
    throw new RequestIntentError(
      field === "comment" ? "REQUEST_COMMENT_REQUIRED" : "QUERY_PURPOSE_REQUIRED",
      field,
      kind
    );
  }
  return value;
}
var _comment, _purpose;
var QueryIntent = class {
  constructor(comment, purpose) {
    __privateAdd(this, _comment);
    __privateAdd(this, _purpose);
    __privateSet(this, _comment, requireText(comment, "comment", "query"));
    __privateSet(this, _purpose, requireText(purpose, "purpose", "query"));
    Object.freeze(this);
  }
  get comment() {
    return __privateGet(this, _comment);
  }
  get purpose() {
    return __privateGet(this, _purpose);
  }
};
_comment = new WeakMap();
_purpose = new WeakMap();
var _comment2;
var MutationIntent = class {
  constructor(comment) {
    __privateAdd(this, _comment2);
    __privateSet(this, _comment2, requireText(comment, "comment", "mutation"));
    Object.freeze(this);
  }
  get comment() {
    return __privateGet(this, _comment2);
  }
  get auditReason() {
    return __privateGet(this, _comment2);
  }
  readbackIntent() {
    return new QueryIntent(__privateGet(this, _comment2), "verify persisted mutation result");
  }
};
_comment2 = new WeakMap();
var _intent, _query, _parent2, _comment3, _name, _operation, _invocation;
var _QueryRequest = class _QueryRequest {
  constructor(query, intent, binding) {
    __privateAdd(this, _intent);
    __privateAdd(this, _query);
    __privateAdd(this, _parent2);
    __privateAdd(this, _comment3);
    __privateAdd(this, _name);
    __privateAdd(this, _operation);
    __privateAdd(this, _invocation);
    const source = query;
    const previous = queryExecutionOwner(query);
    const previousOwner = previous instanceof _QueryRequest ? previous : void 0;
    __privateSet(this, _intent, intent === void 0 ? previousOwner?.intent ?? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText) : new QueryIntent(intent?.comment, intent?.purpose));
    if (binding && binding[requestBindingToken] !== true)
      throw new Error("QUERY_REQUEST_OWNERSHIP_INVALID: request binding is runtime-owned");
    const owner = previousOwner && previousOwner.intent.comment === __privateGet(this, _intent).comment && previousOwner.purpose === __privateGet(this, _intent).purpose ? previousOwner : void 0;
    __privateSet(this, _invocation, binding?.invocation ?? (binding?.parent ? __privateGet(binding.parent, _invocation) : void 0) ?? (owner ? __privateGet(owner, _invocation) : void 0) ?? Object.freeze({}));
    __privateSet(this, _parent2, binding ? binding.parent : owner?.parentRequest);
    __privateSet(this, _comment3, requireText(binding?.comment ?? owner?.comment ?? __privateGet(this, _intent).comment, "comment", "query"));
    __privateSet(this, _name, binding?.name ?? owner?.requestName ?? String(source.entity ?? "query"));
    __privateSet(this, _operation, binding?.operation ?? owner?.operation);
    __privateSet(this, _query, snapshotQuery(query));
    const captured = __privateGet(this, _query);
    for (const [field, value] of [
      ["commentText", this.comment],
      ["purposeText", this.purpose],
      ["_comment", this.comment],
      ["_purpose", this.purpose]
    ]) {
      Object.defineProperty(captured, field, {
        value,
        enumerable: !field.startsWith("_"),
        configurable: true,
        writable: false
      });
    }
    querySources.set(captured, cloneTraceNodes(binding?.source ?? owner?.traceSource ?? querySources.get(query) ?? queryTraceSource(String(source.entity), this.intent.comment, this.purpose)));
    retainQueryExecutionOwner(captured, this);
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent);
  }
  get query() {
    return __privateGet(this, _query);
  }
  get comment() {
    return __privateGet(this, _comment3);
  }
  get purpose() {
    return __privateGet(this, _intent).purpose;
  }
  get traceSource() {
    return querySources.get(__privateGet(this, _query));
  }
  get parentRequest() {
    return __privateGet(this, _parent2);
  }
  get rootRequest() {
    let root = this;
    while (root.parentRequest) root = root.parentRequest;
    return root;
  }
  get requestName() {
    return __privateGet(this, _name);
  }
  get operation() {
    return __privateGet(this, _operation);
  }
  get traceChain() {
    const comments = [];
    for (let node = this; node; node = node.parentRequest)
      comments.push({ kind: "comment", name: node.requestName, detail: node.comment });
    return cloneTraceNodes([
      { kind: "purpose", name: this.rootRequest.requestName, detail: this.purpose },
      ...comments.reverse()
    ]);
  }
  /** Runtime derivation preserves this invocation's source across builder clones. */
  withQuery(query) {
    const previous = queryExecutionOwner(query);
    if (previous instanceof _QueryRequest && __privateGet(previous, _invocation) !== __privateGet(this, _invocation)) {
      throw new Error("QUERY_SCOPE_OWNER_MISMATCH: replacement belongs to another query invocation");
    }
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this.parentRequest,
      comment: this.comment,
      name: this.requestName,
      operation: this.operation,
      source: this.traceSource,
      invocation: __privateGet(this, _invocation)
    });
  }
  /** A real operation child need not execute SQL itself; descendants retain it. */
  deriveOperation(query, operation) {
    const captured = operationSnapshot(operation);
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this,
      comment: queryOperationComment(captured),
      name: String(query.entity ?? this.requestName),
      operation: captured,
      source: this.traceSource
    });
  }
  /** Local description for work created by the framework, never a root authorization. */
  deriveHelper(query, comment) {
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this,
      comment: requireText(comment, "comment", "query"),
      name: String(query.entity ?? this.requestName),
      source: this.traceSource
    });
  }
  /** Preserve the Q-operation parent and the actual nested request's own comment. */
  derive(query, relation, operation) {
    if (operation) return this.deriveOperation(this.query, operation).deriveChild(query, relation);
    const owner = `${String(this.query.entity)}.${relation}`;
    return this.deriveChild(query, relation, void 0, owner);
  }
  /** Aggregates execute their operation; an anonymous template is not a value load. */
  deriveAggregate(query, relation, operation) {
    const facet = this.parentRequest?.operation?.kind === "facet" ? this.parentRequest : void 0;
    const branch = facet ? facet.deriveHelper(query, "aggregate " + facet.operation.relation) : this.deriveOperation(query, operation);
    const physical = [...this.traceSource, {
      kind: "relation",
      name: relation,
      detail: `${String(this.query.entity)}.${relation}`
    }];
    const scoped = new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: branch.parentRequest,
      comment: branch.comment,
      name: branch.requestName,
      operation: branch.operation,
      source: physical
    });
    const comment = query._comment ?? query.commentText;
    return comment === void 0 ? scoped : scoped.deriveChild(query);
  }
  /** Bind a framework helper or value query below an existing operation parent. */
  deriveChild(query, relation, defaultComment, requestName) {
    const source = query;
    const comment = source._comment ?? source.commentText;
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this,
      comment: comment === void 0 ? defaultComment ?? `load ${String(source.entity)}` : requireText(comment, "comment", "query"),
      name: requestName ?? String(source.entity),
      source: relation === void 0 ? this.traceSource : [...this.traceSource, {
        kind: "relation",
        name: relation,
        detail: `${String(this.query.entity)}.${relation}`
      }]
    });
  }
};
_intent = new WeakMap();
_query = new WeakMap();
_parent2 = new WeakMap();
_comment3 = new WeakMap();
_name = new WeakMap();
_operation = new WeakMap();
_invocation = new WeakMap();
var QueryRequest = _QueryRequest;
var _intent2, _mutation;
var MutationRequest = class {
  constructor(mutation, intent) {
    __privateAdd(this, _intent2);
    __privateAdd(this, _mutation);
    __privateSet(this, _intent2, new MutationIntent(intent === void 0 ? mutation?.comment : intent?.comment));
    __privateSet(this, _mutation, { ...mutation });
    Object.defineProperty(__privateGet(this, _mutation), "comment", {
      value: __privateGet(this, _intent2).comment,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent2);
  }
  get mutation() {
    return __privateGet(this, _mutation);
  }
  get comment() {
    return __privateGet(this, _intent2).comment;
  }
  /** @internal Generated hydration/commit provenance, never a wire field. */
  withLoadedSnapshot(snapshot) {
    mutationSnapshots.set(this, new LoadedScalarSnapshot(snapshot.values()));
    return this;
  }
  /** @internal Does not become part of the write payload or policy input. */
  loadedValues() {
    return mutationSnapshots.get(this)?.values() ?? {};
  }
  /** Runtime-owned execution capability; raw mutation fields cannot forge it. */
  get graphSession() {
    return graphRequests.get(this)?.session;
  }
  scopeFor(key) {
    const graph = graphRequests.get(this);
    const scope = mutationScopeForEntity(graph?.parent, key.entity, key.id, this.comment, graph?.localComment);
    if (graph) scopeOwners.set(scope, graph.session);
    return scope;
  }
  traceFor(key) {
    const mutation = __privateGet(this, _mutation);
    const specific = mutation.ledgerRoot?.traceChain(mutation.ledgerKey ?? key);
    return specific?.length ? cloneTraceNodes(specific) : this.scopeFor(key).recover();
  }
  /** Safe event projection; internal policy intent is never mutated. */
  auditProjection(key, payload, bindings) {
    const secrets = [
      ...logValueStrings(payload),
      ...logValueStrings(__privateGet(this, _mutation).id),
      ...bindings ? privateLogValueStrings(bindings) : logValueStrings(this.loadedValues()),
      ...privateLogValueStrings(this.graphSession?.logBindings)
    ];
    return Object.freeze({
      reason: scrubLogText(this.comment, secrets),
      mutationLineage: cloneTraceNodes(this.traceFor(key).map((node) => ({
        ...node,
        detail: scrubLogText(node.detail, secrets)
      })))
    });
  }
};
_intent2 = new WeakMap();
_mutation = new WeakMap();
var _intent3, _bindings;
var GraphMutationSession = class {
  constructor(intent) {
    __privateAdd(this, _intent3);
    __privateAdd(this, _bindings);
    __privateSet(this, _intent3, new MutationIntent(intent?.comment));
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent3);
  }
  request(mutation, parent, localComment) {
    if (parent && scopeOwners.get(parent) !== this)
      throw new Error("GRAPH_TRACE_SCOPE_MISMATCH: parent scope belongs to another graph invocation");
    const request = new MutationRequest(mutation, __privateGet(this, _intent3));
    graphRequests.set(request, { session: this, parent, localComment });
    return request;
  }
  /** @internal Preflight snapshots bind provenance for all siblings before SQL. */
  captureLogBindings(source) {
    __privateSet(this, _bindings, inheritSQLLogBindings(source, __privateGet(this, _bindings)));
  }
  /** @internal Never put this raw provenance on a wire or log record. */
  get logBindings() {
    return __privateGet(this, _bindings);
  }
};
_intent3 = new WeakMap();
_bindings = new WeakMap();
var GraphCommittedError = class extends Error {
  constructor(cause) {
    super("GRAPH_ALREADY_COMMITTED: post-commit processing failed; do not retry as an uncommitted mutation");
    this.cause = cause;
    this.committed = true;
    this.name = "GraphCommittedError";
  }
};

export {
  cloneTraceNodes,
  MutationTraceScope,
  mutationScopeForEntity,
  canonicalSQLTracePath,
  queryTraceSource,
  debugSQL,
  credentialName,
  retainSQLLogProvenance,
  inheritSQLLogBindings,
  projectSQLLog,
  projectSafeSQLLog,
  queryDiagnosticOrigin,
  retainQueryDiagnosticOrigin,
  snapshotQuery,
  LoadedScalarSnapshot,
  queryOperationComment,
  RequestIntentError,
  QueryIntent,
  MutationIntent,
  QueryRequest,
  MutationRequest,
  GraphMutationSession,
  GraphCommittedError
};
//# sourceMappingURL=chunk-LDU2JPAZ.js.map
