import {
  CheckException,
  OrderBy,
  UserContext,
  contextSchemaCapability,
  mergeRuntimeBootstrap
} from "./chunk-CDSWS3BL.js";
import {
  observeRuntimeOperation,
  startRuntimeOperation
} from "./chunk-WZ3T4PU6.js";

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
  const enabled = typeof process !== "undefined" && process.env?.[PLAINTEXT_LOG_ENV] === PLAINTEXT_LOG_ACK;
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
function projectSQLLog(metadata, inherited) {
  const allow = plaintextLogsEnabled() && metadata.logMode !== "masked";
  const prior = projections.get(metadata);
  if (prior !== void 0 && (!prior || allow)) return metadata;
  const safe = safeAlternatives.get(metadata);
  if (!allow && safe) return safe;
  const projected = projectWithPolicy(metadata, allow, inherited);
  projections.set(projected, allow);
  if (allow) {
    const alternative = projectWithPolicy(metadata, false, inherited);
    projections.set(alternative, false);
    safeAlternatives.set(projected, alternative);
  }
  return projected;
}
function projectWithPolicy(metadata, allow, inherited) {
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
  const unknownDebugIntent = !allow && metadata.logMode === "debug-plaintext" && !inherited;
  const intentText = (value) => unknownDebugIntent && value ? redacted : scrubLogText(value, secrets);
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
    // Counts are operational metadata, not a copy of a masked numeric binding.
    resultSummary: metadata.resultCount !== void 0 ? `${metadata.resultCount} rows returned` : metadata.affectedRows !== void 0 ? `${metadata.affectedRows} rows affected` : intentText(metadata.resultSummary),
    tracePath: Object.freeze(metadata.tracePath.map((frame) => Object.freeze(
      Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, typeof value === "string" ? intentText(value) : value]))
    )))
  });
  return projected;
}

// src/sql/core.ts
function canonicalRelationIndexes(schemas) {
  const indexes = /* @__PURE__ */ new Map();
  for (const schema of Object.values(schemas)) {
    for (const relation of Object.values(schema.relations || {})) {
      if (!relation.many) continue;
      const target = schemas[relation.targetEntity];
      const foreignColumn = target?.columns[relation.foreignKey]?.columnName;
      const idColumn = target?.columns.id?.columnName;
      if (!target || !foreignColumn || !idColumn) continue;
      const raw = `idx_${target.table}_${foreignColumn}_${idColumn}`;
      let hash = 2166136261;
      for (let i = 0; i < raw.length; i += 1) {
        hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
      }
      const suffix = (hash >>> 0).toString(36);
      const name = raw.length <= 30 ? raw : `${raw.slice(0, Math.max(1, 29 - suffix.length))}_${suffix}`;
      indexes.set(name, { name, table: target.table, foreignColumn, idColumn });
    }
  }
  return [...indexes.values()];
}
async function ensureOptimisticIdFloor(session, placeholder, entity, floor) {
  const numericFloor = Number(floor);
  if (!Number.isSafeInteger(numericFloor) || numericFloor < 0) {
    throw new Error(`Invalid ID space floor ${floor} for ${entity}`);
  }
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const currentResult = await session.query(
      `SELECT current_level AS id FROM teaql_id_space WHERE type_name = ${placeholder(1)}`,
      [entity]
    );
    if (!currentResult.rowCount) {
      try {
        const inserted = await session.query(
          `INSERT INTO teaql_id_space(type_name, current_level) VALUES (${placeholder(1)}, ${placeholder(2)})`,
          [entity, numericFloor]
        );
        if (inserted.rowCount === 1) return;
      } catch (error) {
        const winner = await session.query(
          `SELECT current_level FROM teaql_id_space WHERE type_name = ${placeholder(1)}`,
          [entity]
        );
        if (!winner.rowCount) throw error;
      }
      continue;
    }
    const current = Number(currentResult.rows[0].id);
    if (current >= numericFloor) return;
    const updated = await session.query(
      `UPDATE teaql_id_space SET current_level = ${placeholder(1)} WHERE type_name = ${placeholder(2)} AND current_level = ${placeholder(3)}`,
      [numericFloor, entity, current]
    );
    if (updated.rowCount === 1) return;
    if (updated.rowCount !== 0) throw new Error(
      `ID space floor update for ${entity} changed ${updated.rowCount} rows on attempt ${attempt}`
    );
  }
  throw new Error(
    `Unable to synchronize ID space floor for ${entity} after 100 optimistic-lock attempts`
  );
}
function unquoteIdentifier(identifier) {
  if (identifier.startsWith('"') && identifier.endsWith('"') || identifier.startsWith("`") && identifier.endsWith("`")) {
    return identifier.slice(1, -1).replace(/""/g, '"').replace(/``/g, "`");
  }
  return identifier;
}
function sameBootstrapValue(left, right) {
  if (left === right) return true;
  if (left instanceof Date) left = left.getTime();
  if (right instanceof Date) right = right.getTime();
  return left !== null && left !== void 0 && right !== null && right !== void 0 && String(left) === String(right);
}
function mutationTracePath(mutation, provider, sqlOperation) {
  return [
    { level: 0, kind: "operation", name: "mutation" },
    { level: 1, kind: "entity", name: String(mutation.entity) },
    { level: 2, kind: "provider", name: provider },
    { level: 3, kind: "sql", name: sqlOperation }
  ];
}
var TextDiagnosticSQLLogSink = class {
  constructor(writer = (text) => console.debug(text)) {
    this.writer = writer;
  }
  write(metadata) {
    metadata = projectSQLLog(metadata);
    this.writer(
      `[TeaQL SQL][${metadata.operation}][${metadata.elapsedMicros}us] ${metadata.resultSummary}${metadata.executionOutcome ? ` outcome=${metadata.executionOutcome}` : ""}
comment=${metadata.comment ?? ""} purpose=${metadata.purpose ?? ""} auditReason=${metadata.auditReason ?? ""} tracePath=${diagnosticJSON(metadata.tracePath)}
` + (metadata.omissionReason ? `SQL omitted: ${metadata.omissionReason}
` : "") + `Debug SQL: ${metadata.debugSQL}`
    );
  }
};
function diagnosticJSON(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
}
var SQLExecutionEvidenceStore = class {
  constructor() {
    this.mode = "all";
    this.entries = [];
  }
  record(metadata) {
    const isSelect = metadata.operation === "select";
    if (this.mode === "disabled" || this.mode === "select" && !isSelect || this.mode === "mutation" && isSelect) return;
    this.entries.push(Object.freeze({
      ...metadata,
      parameters: Object.freeze([...metadata.parameters])
    }));
  }
  setMode(mode) {
    this.mode = mode;
    this.entries = [];
    return this;
  }
  enableAll() {
    return this.setMode("all");
  }
  enableSelect() {
    return this.setMode("select");
  }
  enableMutation() {
    return this.setMode("mutation");
  }
  disable() {
    return this.setMode("disabled");
  }
  snapshot() {
    return [...this.entries];
  }
};
var AbstractSQLTeaQLClient = class {
  constructor(driver, schemas) {
    this.driver = driver;
    this.schemas = schemas;
    this.bootstrapTail = Promise.resolve();
    this.sqlTrace = [];
    this.internalQueryToken = /* @__PURE__ */ Symbol("teaql-internal-query");
    this.bindLogPolicies = /* @__PURE__ */ new WeakMap();
    this.derivedQueryBindings = /* @__PURE__ */ new WeakMap();
    this.auditEvents = [];
    this.diagnosticSQLLogSink = new TextDiagnosticSQLLogSink();
    this.queryLoggingEnabled = true;
    this.mutationLoggingEnabled = true;
    this.checkers = {};
    this.userContext = new UserContext();
    this.bootstrap = {};
    this.graphCommitActions = [];
    this.graphRollbackActions = [];
    this.graphSaveTail = Promise.resolve();
  }
  fieldLogPolicy(schema, field) {
    const column = schema.columns[field];
    const name = column?.modelName ?? column?.columnName ?? field;
    if (credentialName(name) || credentialName(field)) return "credential";
    if (!schema.auditMaskFields) return "unknown";
    if (schema.auditMaskFields?.includes(name) || schema.auditMaskFields?.includes(field)) return "masked";
    return column?.logPolicy ?? "unknown";
  }
  bindValue(values, value, policy) {
    const policies = this.bindLogPolicies.get(values) ?? values.map(() => "unknown");
    values.push(value);
    policies.push(policy);
    this.bindLogPolicies.set(values, policies);
  }
  /** Installs metadata only. Call context.ensureSchema() explicitly when schema changes are intended. */
  install(module) {
    Object.assign(this.schemas, module.schemas);
    Object.assign(this.checkers, module.checkers);
    this.bootstrap = mergeRuntimeBootstrap(this.bootstrap, module.bootstrap);
    return this;
  }
  setUserContext(context) {
    this.userContext = context;
    return this;
  }
  schema(entity) {
    const schema = this.schemas[entity];
    if (!schema) throw new Error(`Unknown TeaQL entity: ${entity}`);
    return schema;
  }
  toRuntimeMutationRecord(schema, canonicalRecord) {
    const result = {};
    for (const [canonicalName, value] of Object.entries(canonicalRecord)) {
      const runtimeName = schema.columns[canonicalName] ? canonicalName : Object.keys(schema.columns).find(
        (name) => schema.columns[name].modelName === canonicalName || schema.columns[name].columnName === canonicalName
      );
      if (runtimeName) result[runtimeName] = value;
    }
    return result;
  }
  encode(value, column) {
    const normalized = value?.id ?? value;
    if (normalized === void 0) return void 0;
    return this.driver.encode(normalized, column);
  }
  decodeRow(entity, row, aggregateNames = []) {
    const schema = this.schema(entity);
    const result = { ...row };
    for (const [field, column] of Object.entries(schema.columns)) {
      const value = result[field];
      if (value === null || value === void 0) continue;
      if (column.decode === "number") result[field] = Number(value);
      if (column.decode === "string") result[field] = String(value);
      if (column.decode === "date" && value instanceof Date) {
        result[field] = value.toISOString();
      }
      if (column.logicalType === "boolean") result[field] = Boolean(value);
    }
    for (const name of aggregateNames) {
      if (result[name] !== null && result[name] !== void 0) {
        result[name] = Number(result[name]);
      }
    }
    return result;
  }
  get auditTrace() {
    return [...this.auditEvents];
  }
  setAuditSink(sink) {
    this.auditSink = sink;
    return this;
  }
  setRuntimeTelemetrySink(sink) {
    this.telemetrySink = sink;
    return this;
  }
  setDiagnosticSQLLogSink(sink) {
    this.diagnosticSQLLogSink = sink;
    return this;
  }
  setQueryLoggingEnabled(enabled) {
    this.queryLoggingEnabled = enabled;
    return this;
  }
  setMutationLoggingEnabled(enabled) {
    this.mutationLoggingEnabled = enabled;
    return this;
  }
  setRuntimeTelemetry(telemetry) {
    this.runtimeTelemetry = telemetry;
    return this;
  }
  recordSQL(operation, parameterizedSQL, parameters, startedAt, resultCount, affectedRows, intent = {}, executionOutcome = "success", inherited) {
    const isSelect = operation === "select";
    if (isSelect && !this.queryLoggingEnabled || !isSelect && !this.mutationLoggingEnabled) return;
    if (!this.telemetrySink && !this.diagnosticSQLLogSink) return;
    try {
      const metadata = Object.freeze({
        operation,
        ...intent,
        executionOutcome,
        tracePath: Object.freeze([...intent.tracePath ?? []]),
        parameterizedSQL,
        parameters: Object.freeze([...parameters]),
        // Never build a plaintext SQL copy before the log policy boundary.
        debugSQL: "",
        databaseKind: this.driver.databaseKind,
        sqlOrigin: "generated",
        parameterLogPolicies: this.bindLogPolicies.get(parameters),
        elapsedMicros: Math.max(0, (Date.now() - startedAt) * 1e3),
        resultCount,
        affectedRows,
        resultSummary: resultCount !== void 0 ? `${resultCount} rows returned` : affectedRows !== void 0 ? `${affectedRows} rows affected` : `statement ${executionOutcome}; row count unknown`
      });
      const projected = projectSQLLog(metadata, inherited);
      try {
        this.telemetrySink?.record(projected);
      } catch {
      }
      try {
        this.diagnosticSQLLogSink?.write(projected);
      } catch {
      }
    } catch {
    }
  }
  queryLogIntent(query, operation = "query") {
    const inherited = Array.isArray(query?.__teaqlTracePath) ? query.__teaqlTracePath : [
      { level: 0, kind: "operation", name: operation },
      { level: 1, kind: "request", name: String(query.entity) }
    ];
    return {
      comment: query?._comment ?? query?.commentText,
      purpose: query?._purpose ?? query?.purposeText,
      tracePath: [
        ...inherited,
        { level: inherited.length, kind: "provider", name: this.driver.databaseKind },
        { level: inherited.length + 1, kind: "sql", name: "select" }
      ]
    };
  }
  async executeLoggedSQL(operation, sql, values, intent, execute, inherited) {
    const startedAt = Date.now();
    let result;
    try {
      result = await execute();
    } catch (error) {
      try {
        this.recordSQL(operation, sql, values, startedAt, void 0, void 0, intent, "failure", inherited);
      } finally {
        throw error;
      }
    }
    this.recordSQL(
      operation,
      sql,
      values,
      startedAt,
      operation === "select" ? result.rowCount : void 0,
      operation === "select" ? void 0 : result.rowCount,
      intent,
      "success",
      inherited
    );
    return result;
  }
  /** Package-internal physical capability used only by UserContext.ensureSchema(). */
  async [contextSchemaCapability](context) {
    this.userContext = context;
    if (!this.schemaReady) {
      this.schemaReady = this.driver.ensureSchema(this.schemas);
    }
    await this.schemaReady;
    const predecessor = this.bootstrapTail;
    let release;
    this.bootstrapTail = new Promise((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      if (this.bootstrap.ensure) {
        context.insertResource("bootstrapActor", "teaql-generated-bootstrap");
        context.insertResource("bootstrapCategory", "runtime-bootstrap");
        try {
          await this.bootstrap.ensure(context);
        } finally {
          context.removeResource("bootstrapActor");
          context.removeResource("bootstrapCategory");
        }
      } else {
        await this.ensureBootstrapData();
      }
    } finally {
      release();
    }
  }
  /** Allows a provider which replaces its physical store to require explicit schema reconciliation again. */
  invalidateSchemaState() {
    this.schemaReady = void 0;
  }
  async ensureBootstrapData() {
    const records = [
      ...this.bootstrap.defaultDomainRoot ? [this.bootstrap.defaultDomainRoot] : [],
      ...this.bootstrap.constants ?? []
    ];
    if (!records.length) return;
    await this.driver.transaction(async (session) => {
      for (const record of records) await this.reconcileBootstrapEntity(session, record);
    });
  }
  async reconcileBootstrapEntity(session, record) {
    const schema = this.schema(record.entity);
    const table = this.driver.identifier(schema.table);
    const idColumn = this.driver.identifier(schema.columns.id?.columnName ?? "id");
    const versionColumn = this.driver.identifier(schema.columns.version?.columnName ?? "version");
    const entries = Object.entries(record.values ?? {}).map(([field, value]) => {
      const column = schema.columns[field];
      if (!column) throw new Error(`Unknown bootstrap field ${record.entity}.${field}`);
      return {
        column: this.driver.identifier(column.columnName),
        value: this.driver.encode(value, column)
      };
    });
    const current = await session.query(
      `SELECT * FROM ${table} WHERE ${idColumn} = ${this.driver.placeholder(1)}`,
      [record.id]
    );
    if (!current.rowCount) {
      const columns = [idColumn, versionColumn, ...entries.map((entry) => entry.column)];
      const values = [record.id, 1, ...entries.map((entry) => entry.value)];
      const placeholders = values.map((_, index) => this.driver.placeholder(index + 1));
      await session.query(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
        values
      );
    } else {
      const row = current.rows[0];
      const changed = entries.filter((entry) => !sameBootstrapValue(row[unquoteIdentifier(entry.column)], entry.value));
      if (changed.length) {
        const assignments = changed.map((entry, index) => `${entry.column} = ${this.driver.placeholder(index + 1)}`);
        assignments.push(`${versionColumn} = ${versionColumn} + 1`);
        await session.query(
          `UPDATE ${table} SET ${assignments.join(", ")} WHERE ${idColumn} = ` + this.driver.placeholder(changed.length + 1),
          [...changed.map((entry) => entry.value), record.id]
        );
      }
    }
    await this.driver.ensureIdFloor(session, record.entity, record.id);
  }
  async executeGraphSave(work) {
    const predecessor = this.graphSaveTail;
    let release;
    this.graphSaveTail = new Promise((resolve) => {
      release = resolve;
    });
    await predecessor;
    this.graphCommitActions = [];
    this.graphRollbackActions = [];
    this.userContext.insertResource("fixTime", /* @__PURE__ */ new Date());
    this.userContext.beginFixEvidence();
    try {
      const result = await this.driver.transaction(async (session) => {
        this.graphMutationSession = session;
        try {
          return await work();
        } finally {
          this.graphMutationSession = void 0;
        }
      });
      for (const action of this.graphCommitActions) action();
      return result;
    } catch (error) {
      for (const action of [...this.graphRollbackActions].reverse()) action();
      throw error;
    } finally {
      this.graphCommitActions = [];
      this.graphRollbackActions = [];
      this.userContext.removeResource("fixTime").finishFixEvidence();
      release();
    }
  }
  afterGraphCommit(work) {
    if (!this.graphMutationSession) throw new Error("No graph save is active");
    this.graphCommitActions.push(work);
  }
  afterGraphRollback(work) {
    if (!this.graphMutationSession) throw new Error("No graph save is active");
    this.graphRollbackActions.push(work);
  }
  async withMutationSession(work) {
    return this.graphMutationSession ? work(this.graphMutationSession) : this.driver.transaction(work);
  }
  preflightMutation(mutation) {
    if (!String(mutation?.comment || "").trim()) {
      throw new Error("Security audit failure: audit reason is required before mutation");
    }
    mutation = { ...mutation, payload: { ...mutation?.payload ?? {} } };
    const checker = this.checkers[String(mutation.entity)];
    if (!checker) return mutation;
    const results = [];
    const ownsFixTime = this.userContext.getResource("fixTime") === void 0;
    if (ownsFixTime) this.userContext.insertResource("fixTime", /* @__PURE__ */ new Date()).beginFixEvidence();
    try {
      checker.checkAndFix(this.userContext, mutation, results);
      if (mutation.ledgerKey && mutation.ledgerRoot) {
        for (const [field, value] of Object.entries(mutation.payload || {})) {
          mutation.ledgerRoot.set(mutation.ledgerKey, field, value);
        }
      }
      this.userContext.translateCheckResults(results);
      if (results.length) throw new CheckException(results);
      return mutation;
    } finally {
      if (ownsFixTime) this.userContext.removeResource("fixTime").finishFixEvidence();
    }
  }
  async executeMutation(mutation) {
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "mutation",
      name: `${String(mutation?.entity || "unknown")}.${String(mutation?.action || "unknown").toLowerCase()}`,
      attributes: {
        "teaql.entity.type": String(mutation?.entity || "unknown"),
        "teaql.mutation.kind": String(mutation?.action || "unknown").toLowerCase()
      }
    });
    try {
      mutation = this.preflightMutation(mutation);
      const schema = this.schema(mutation.entity);
      const mutationRecord = this.toRuntimeMutationRecord(schema, mutation.payload || {});
      const table = this.driver.identifier(schema.table);
      const result = await observeRuntimeOperation(this.runtimeTelemetry, {
        family: "provider",
        name: `${this.driver.databaseKind}.mutation`,
        attributes: {
          "teaql.provider.kind": this.driver.databaseKind,
          "teaql.provider.operation": String(mutation.action).toLowerCase()
        }
      }, () => this.withMutationSession(async (session) => {
        if (mutation.action === "Create") {
          const id = mutation.id ? String(mutation.id) : await this.driver.nextId(session, mutation.entity);
          if (mutation.id) {
            await this.driver.ensureIdFloor(session, mutation.entity, id);
          }
          const version = Number(mutation.version || 0) + 1;
          const record = { ...mutationRecord, id, version };
          const fields = Object.keys(schema.columns).filter((field) => record[field] !== void 0);
          const columns = fields.map(
            (field) => this.driver.identifier(schema.columns[field].columnName)
          ).join(", ");
          const placeholders = fields.map(
            (_, index) => this.driver.placeholder(index + 1)
          ).join(", ");
          const values = fields.map(
            (field) => this.encode(record[field], schema.columns[field])
          );
          this.bindLogPolicies.set(values, fields.map((field) => this.fieldLogPolicy(schema, field)));
          const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
          const intent = {
            auditReason: String(mutation.comment),
            tracePath: mutationTracePath(mutation, this.driver.databaseKind, "insert")
          };
          await this.executeLoggedSQL("insert", sql, values, intent, () => session.query(sql, values));
          return {
            success: true,
            id,
            version,
            persistedRecord: await this.readPersistedRecord(session, schema, id, intent, sql, values)
          };
        }
        if (mutation.action === "Update") {
          const fields = Object.keys(schema.columns).filter(
            (field) => field !== "id" && field !== "version" && mutationRecord[field] !== void 0
          );
          const values = fields.map(
            (field) => this.encode(mutationRecord[field], schema.columns[field])
          );
          this.bindLogPolicies.set(values, fields.map((field) => this.fieldLogPolicy(schema, field)));
          const assignments = fields.map(
            (field, index) => `${this.driver.identifier(schema.columns[field].columnName)} = ` + this.driver.placeholder(index + 1)
          );
          const versionColumn = this.driver.identifier("version");
          assignments.push(`${versionColumn} = ${versionColumn} + 1`);
          this.bindValue(values, String(mutation.id), this.fieldLogPolicy(schema, "id"));
          const predicates = [
            `${this.driver.identifier("id")} = ${this.driver.placeholder(values.length)}`
          ];
          if (mutation.version !== void 0 && mutation.version !== null) {
            this.bindValue(values, Number(mutation.version), this.fieldLogPolicy(schema, "version"));
            predicates.push(
              `${versionColumn} = ${this.driver.placeholder(values.length)}`
            );
          }
          const sql = `UPDATE ${table} SET ${assignments.join(", ")} WHERE ${predicates.join(" AND ")}`;
          const intent = {
            auditReason: String(mutation.comment),
            tracePath: mutationTracePath(mutation, this.driver.databaseKind, "update")
          };
          const result2 = await this.executeLoggedSQL("update", sql, values, intent, () => session.query(sql, values));
          if (result2.rowCount !== 1) {
            throw new Error(
              `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`
            );
          }
          const persistedRecord = await this.readPersistedRecord(
            session,
            schema,
            String(mutation.id),
            intent,
            sql,
            values
          );
          return {
            success: true,
            id: String(mutation.id),
            version: Number(persistedRecord.version),
            persistedRecord
          };
        }
        if (mutation.action === "Delete") {
          const versionColumn = this.driver.identifier("version");
          const values = [String(mutation.id)];
          this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, "id")]);
          const predicates = [
            `${this.driver.identifier("id")} = ${this.driver.placeholder(1)}`
          ];
          if (mutation.version !== void 0 && mutation.version !== null) {
            this.bindValue(values, Number(mutation.version), this.fieldLogPolicy(schema, "version"));
            predicates.push(
              `${this.driver.identifier("version")} = ` + this.driver.placeholder(values.length)
            );
          }
          const sql = `UPDATE ${table} SET ${versionColumn} = -(${versionColumn} + 1) WHERE ${predicates.join(" AND ")}`;
          const intent = {
            auditReason: String(mutation.comment),
            tracePath: mutationTracePath(mutation, this.driver.databaseKind, "delete")
          };
          const result2 = await this.executeLoggedSQL("delete", sql, values, intent, () => session.query(sql, values));
          if (result2.rowCount !== 1) {
            throw new Error(
              `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`
            );
          }
          const persistedRecord = await this.readPersistedRecord(
            session,
            schema,
            String(mutation.id),
            intent,
            sql,
            values
          );
          return {
            success: true,
            id: String(mutation.id),
            version: Number(persistedRecord.version),
            deleted: true,
            persistedRecord
          };
        }
        throw new Error(`Unsupported mutation action: ${mutation.action}`);
      }));
      const event = Object.freeze({
        entity: mutation.entity,
        action: mutation.action,
        id: String(result.id),
        reason: scrubLogText(String(mutation.comment), logValueStrings(mutation.payload)),
        recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
        actor: this.userContext.getResource("bootstrapActor"),
        category: this.userContext.getResource("bootstrapCategory"),
        changedFields: Object.keys(mutation.payload || {}).sort(),
        version: result.version
      });
      this.auditEvents.push(event);
      if (this.auditSink) {
        await observeRuntimeOperation(this.runtimeTelemetry, {
          family: "audit",
          name: `${mutation.entity}.audit`,
          attributes: {
            "teaql.entity.type": String(mutation.entity),
            "teaql.mutation.kind": String(mutation.action).toLowerCase(),
            "teaql.audit.changed_field_count": Object.keys(mutation.payload || {}).length
          }
        }, async () => this.auditSink(event));
      }
      scope.success();
      return result;
    } catch (error) {
      scope.failure(error);
      throw error;
    }
  }
  async readPersistedRecord(session, schema, id, intent, writeSQL, writeValues) {
    const projection = Object.entries(schema.columns).map(
      ([field, column]) => `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`
    ).join(", ");
    const sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)} WHERE ${this.driver.identifier("id")} = ${this.driver.placeholder(1)}`;
    const values = [id];
    this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, "id")]);
    const startedAt = Date.now();
    let result;
    try {
      result = await session.query(sql, values);
      if (result.rowCount !== 1) throw new Error(`Persisted ${schema.table}(${id}) could not be read back`);
      return this.decodeRowForSchema(schema, result.rows[0]);
    } catch (error) {
      const outcome = result ? "success" : error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError") ? "cancelled" : "failure";
      const inherited = {
        parameterizedSQL: writeSQL,
        parameters: writeValues,
        parameterLogPolicies: this.bindLogPolicies.get(writeValues),
        sqlOrigin: "generated"
      };
      try {
        this.recordSQL(
          "select",
          sql,
          values,
          startedAt,
          result?.rowCount,
          void 0,
          { ...intent, tracePath: [
            ...intent.tracePath ?? [],
            { level: intent.tracePath?.length ?? 0, kind: "sql", name: "readback" }
          ] },
          outcome,
          inherited
        );
      } finally {
        throw error;
      }
    }
  }
  decodeRowForSchema(schema, row) {
    const result = { ...row };
    for (const [field, column] of Object.entries(schema.columns)) {
      const value = result[field];
      if (value === null || value === void 0) continue;
      if (column.decode === "number") result[field] = Number(value);
      if (column.decode === "string") result[field] = String(value);
      if (column.decode === "date" && value instanceof Date) result[field] = value.toISOString();
      if (column.logicalType === "boolean") result[field] = Boolean(value);
    }
    return result;
  }
  compileExpression(expression, schema, values) {
    if (Array.isArray(expression?.$and)) {
      const parts2 = expression.$and.map(
        (item) => this.compileExpression(item, schema, values)
      );
      return `(${parts2.join(" AND ")})`;
    }
    const parts = Object.entries(expression || {}).map(
      ([field, predicate]) => {
        const column = schema.columns[field];
        if (!column) throw new Error(`Unknown field ${field} for SQL query`);
        const quotedField = this.driver.identifier(column.columnName);
        const logPolicy = this.fieldLogPolicy(schema, field);
        if (predicate?.$eq !== void 0) {
          const value = predicate.$eq?.id ?? predicate.$eq;
          if (value === null) return `${quotedField} IS NULL`;
          this.bindValue(values, this.encode(value, column), logPolicy);
          return `${quotedField} = ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$ne !== void 0) {
          const value = predicate.$ne?.id ?? predicate.$ne;
          if (value === null) return `${quotedField} IS NOT NULL`;
          this.bindValue(values, this.encode(value, column), logPolicy);
          return `${quotedField} <> ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$soundLike !== void 0) {
          this.bindValue(values, String(predicate.$soundLike), logPolicy);
          return `SOUNDEX(${quotedField}) = SOUNDEX(${this.driver.placeholder(values.length)})`;
        }
        if (predicate?.$contains !== void 0) {
          this.bindValue(values, String(predicate.$contains), logPolicy);
          return this.driver.contains(
            quotedField,
            this.driver.placeholder(values.length)
          );
        }
        if (predicate?.$notContains !== void 0) {
          this.bindValue(values, String(predicate.$notContains), logPolicy);
          return `NOT (${this.driver.contains(quotedField, this.driver.placeholder(values.length))})`;
        }
        for (const [operator, prefix, suffix, negative] of [
          ["$startsWith", "", "%", false],
          ["$notStartsWith", "", "%", true],
          ["$endsWith", "%", "", false],
          ["$notEndsWith", "%", "", true]
        ]) {
          if (predicate?.[operator] !== void 0) {
            this.bindValue(values, `${prefix}${String(predicate[operator])}${suffix}`, logPolicy);
            const like = `${quotedField} LIKE ${this.driver.placeholder(values.length)}`;
            return negative ? `NOT (${like})` : like;
          }
        }
        if (Array.isArray(predicate?.$in)) {
          if (!predicate.$in.length) return "FALSE";
          const placeholders = predicate.$in.map((value) => {
            this.bindValue(values, this.encode(value?.id ?? value, column), logPolicy);
            return this.driver.placeholder(values.length);
          });
          return `${quotedField} IN (${placeholders.join(", ")})`;
        }
        if (Array.isArray(predicate?.$notIn)) {
          if (!predicate.$notIn.length) return "TRUE";
          const placeholders = predicate.$notIn.map((value) => {
            this.bindValue(values, this.encode(value?.id ?? value, column), logPolicy);
            return this.driver.placeholder(values.length);
          });
          return `${quotedField} NOT IN (${placeholders.join(", ")})`;
        }
        for (const [operator, negative] of [
          ["$inSubquery", false],
          ["$notInSubquery", true]
        ]) {
          const subquery = predicate?.[operator];
          if (subquery !== void 0) {
            const childQuery = subquery.query;
            const childSchema = this.schema(childQuery?.entity);
            const projectedField = String(subquery.field);
            const projectedColumn = childSchema.columns[projectedField];
            if (!projectedColumn) {
              throw new Error(
                `Unknown subquery projection ${projectedField} for ${childQuery?.entity}`
              );
            }
            const childPredicates = this.filters(childQuery).map(
              (item) => this.compileExpression(item, childSchema, values)
            );
            if (childSchema.columns.version) {
              childPredicates.push(
                `${this.driver.identifier(childSchema.columns.version.columnName)} > 0`
              );
            }
            if (negative) {
              childPredicates.push(
                `${this.driver.identifier(projectedColumn.columnName)} IS NOT NULL`
              );
            }
            const where = childPredicates.length ? ` WHERE ${childPredicates.join(" AND ")}` : "";
            const sql = `SELECT ${this.driver.identifier(projectedColumn.columnName)} FROM ${this.driver.identifier(childSchema.table)}${where}`;
            return `${quotedField} ${negative ? "NOT IN" : "IN"} (${sql})`;
          }
        }
        if (Array.isArray(predicate?.$between) && predicate.$between.length === 2) {
          this.bindValue(values, this.encode(predicate.$between[0], column), logPolicy);
          const lower = this.driver.placeholder(values.length);
          this.bindValue(values, this.encode(predicate.$between[1], column), logPolicy);
          const upper = this.driver.placeholder(values.length);
          return `${quotedField} BETWEEN ${lower} AND ${upper}`;
        }
        if (predicate?.$isNull === true) return `${quotedField} IS NULL`;
        if (predicate?.$isNull === false) return `${quotedField} IS NOT NULL`;
        if (predicate?.$gte !== void 0) {
          this.bindValue(values, this.encode(predicate.$gte, column), logPolicy);
          return `${quotedField} >= ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$lte !== void 0) {
          this.bindValue(values, this.encode(predicate.$lte, column), logPolicy);
          return `${quotedField} <= ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$gt !== void 0) {
          this.bindValue(values, this.encode(predicate.$gt, column), logPolicy);
          return `${quotedField} > ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$lt !== void 0) {
          this.bindValue(values, this.encode(predicate.$lt, column), logPolicy);
          return `${quotedField} < ${this.driver.placeholder(values.length)}`;
        }
        throw new Error(`Unsupported query predicate for ${field}: ${JSON.stringify(predicate)}`);
      }
    );
    return parts.length ? `(${parts.join(" AND ")})` : "TRUE";
  }
  filters(query) {
    if (Array.isArray(query._filters) && query._filters.length) return query._filters;
    return query.filterCondition ? [query.filterCondition] : [];
  }
  groupBy(query) {
    return query._groupBy || query.groupByItems || [];
  }
  aggregates(query) {
    if (Array.isArray(query._aggregates)) return query._aggregates;
    return (query.aggregateItems || []).map((aggregate) => ({
      func: aggregate.function,
      field: aggregate.field,
      retName: aggregate.alias
    }));
  }
  orders(query) {
    if (Array.isArray(query._orderBy)) {
      return query._orderBy.map((order) => ({
        field: order.f,
        direction: order.d
      }));
    }
    return (query.orderItems || []).map((order) => ({
      field: order.field,
      direction: order.direction
    }));
  }
  async compileQuery(query) {
    const internal = query?.[this.internalQueryToken] === true;
    const purpose = query?._purpose ?? query?.purposeText;
    const comment = query?._comment ?? query?.commentText;
    if (!internal && (!String(purpose || "").trim() || !String(comment || "").trim())) {
      throw new Error("Security audit failure: purpose and comment are required before query execution");
    }
    const schema = this.schema(query.entity);
    const values = [];
    const groupProperties = this.groupBy(query);
    const groupFields = groupProperties.map((field) => {
      if (!schema.columns[field]) throw new Error(`Unknown group field: ${field}`);
      return this.driver.identifier(schema.columns[field].columnName);
    });
    const groupProjection = groupProperties.map(
      (field) => `${this.driver.identifier(schema.columns[field].columnName)} AS ` + this.driver.identifier(field)
    );
    const aggregateNames = [];
    const requestedFields = Array.isArray(query.selectItems) && query.selectItems.length ? [.../* @__PURE__ */ new Set(["id", "version", ...query.selectItems])] : Object.keys(schema.columns);
    for (const field of requestedFields) {
      if (!schema.columns[field]) throw new Error(`Unknown selected field: ${field}`);
    }
    let projection = requestedFields.map((field) => {
      const column = schema.columns[field];
      return `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`;
    }).join(", ");
    const aggregates = this.aggregates(query);
    if (aggregates.length) {
      const aggregateProjection = aggregates.map((aggregate) => {
        if (!schema.columns[aggregate.field]) {
          throw new Error(`Unknown aggregate field: ${aggregate.field}`);
        }
        aggregateNames.push(aggregate.retName);
        return `${this.driver.aggregateFunction(aggregate.func)}(${this.driver.identifier(schema.columns[aggregate.field].columnName)}) AS ` + this.driver.identifier(aggregate.retName);
      });
      projection = [...groupProjection, ...aggregateProjection].join(", ");
    }
    const partitionBy = query.__teaqlPartitionBy;
    const orders = this.orders(query);
    const orderClauses = orders.map((order) => {
      if (!schema.columns[order.field]) {
        throw new Error(`Unknown order field: ${order.field}`);
      }
      const direction = String(order.direction).toLowerCase() === "desc" ? "DESC" : "ASC";
      return `${this.driver.identifier(schema.columns[order.field].columnName)} ${direction}`;
    });
    if (partitionBy) {
      const partitionColumn = schema.columns[partitionBy];
      if (!partitionColumn) throw new Error(`Unknown partition field: ${partitionBy}`);
      const windowOrder = orderClauses.length ? ` ORDER BY ${orderClauses.join(", ")}` : "";
      projection += `, ROW_NUMBER() OVER (PARTITION BY ${this.driver.identifier(partitionColumn.columnName)}${windowOrder}) AS ` + this.driver.identifier("__teaql_partition_rank");
    }
    let sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)}`;
    const filters = this.filters(query);
    const predicates = filters.map(
      (expression) => this.compileExpression(expression, schema, values)
    );
    if (schema.columns.version) {
      predicates.push(
        `${this.driver.identifier(schema.columns.version.columnName)} > 0`
      );
    }
    if (predicates.length) {
      sql += ` WHERE ${predicates.join(" AND ")}`;
    }
    if (groupFields.length) sql += ` GROUP BY ${groupFields.join(", ")}`;
    const limit = query._limit !== void 0 ? Number(query._limit) : Number(query.limitValue || 0);
    const offset = query._offset !== void 0 ? Number(query._offset) : Number(query.offsetValue || 0);
    if (partitionBy) {
      const rank = this.driver.identifier("__teaql_partition_rank");
      const predicates2 = [];
      this.bindValue(values, offset, "plain");
      predicates2.push(`${rank} > ${this.driver.placeholder(values.length)}`);
      if (limit > 0) {
        this.bindValue(values, offset + limit, "plain");
        predicates2.push(`${rank} <= ${this.driver.placeholder(values.length)}`);
      }
      sql = `SELECT * FROM (${sql}) AS ${this.driver.identifier("__teaql_partitioned")} WHERE ${predicates2.join(" AND ")} ORDER BY ${rank}`;
    } else if (orders.length) {
      sql += ` ORDER BY ${orderClauses.join(", ")}`;
    }
    if (!partitionBy && limit > 0) {
      this.bindValue(values, limit, "plain");
      sql += ` LIMIT ${this.driver.placeholder(values.length)}`;
    }
    if (!partitionBy && offset > 0) {
      this.bindValue(values, offset, "plain");
      sql += ` OFFSET ${this.driver.placeholder(values.length)}`;
    }
    this.sqlTrace.push(sql);
    return { sql, values, aggregateNames };
  }
  async executeQuery(query) {
    return this.executeQueryWithIntent(query, this.derivedQueryBindings.get(query));
  }
  async executeDerivedQuery(query, inherited) {
    if (inherited) this.derivedQueryBindings.set(query, inherited);
    try {
      return await this.executeQuery(query);
    } finally {
      this.derivedQueryBindings.delete(query);
    }
  }
  descendantBindings(query, sql, values, inherited) {
    if (!query.relations?.length && !query.relationAggregates?.length) return void 0;
    return inheritSQLLogBindings({
      parameterizedSQL: sql,
      parameters: values,
      parameterLogPolicies: this.bindLogPolicies.get(values),
      sqlOrigin: "generated"
    }, inherited);
  }
  async executeQueryWithIntent(query, inherited) {
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "query",
      name: `${String(query?.entity || "unknown")}.list`,
      attributes: { "teaql.entity.type": String(query?.entity || "unknown") }
    });
    try {
      const internal = query?.[this.internalQueryToken] === true;
      if (!internal) {
        if (typeof query?.prepareForList !== "function") {
          throw new Error("TeaQL list execution requires the formal runtime SelectQuery");
        }
        query.prepareForList();
      }
      const idSetPrepared = internal ? { query, execution: void 0 } : await this.prepareIdSetPage(query);
      const prepared = internal ? idSetPrepared : await this.prepareContinuousPage(idSetPrepared.query);
      query = prepared.query;
      const { sql, values, aggregateNames } = await this.compileQuery(query);
      const result = await this.executeLoggedSQL(
        "select",
        sql,
        values,
        this.queryLogIntent(query),
        () => observeRuntimeOperation(this.runtimeTelemetry, {
          family: "provider",
          name: `${this.driver.databaseKind}.query`,
          attributes: {
            "teaql.provider.kind": this.driver.databaseKind,
            "teaql.provider.operation": "query"
          }
        }, () => this.driver.query(sql, values)),
        inherited
      );
      const rows = result.rows.map(
        (row) => this.decodeRow(query.entity, row, aggregateNames)
      );
      if (idSetPrepared.execution?.pageIds) {
        const positions = new Map(
          idSetPrepared.execution.pageIds.map(
            (id, index) => [String(id), index]
          )
        );
        rows.sort((left, right) => (positions.get(String(left.id)) ?? Number.MAX_SAFE_INTEGER) - (positions.get(String(right.id)) ?? Number.MAX_SAFE_INTEGER));
      }
      const descendantBindings = this.descendantBindings(query, sql, values, inherited);
      await this.enhanceRelations(rows, query, descendantBindings);
      await this.enhanceRelationAggregates(rows, query, descendantBindings);
      if (!internal) await this.registerContinuousPage(query, prepared.execution, rows);
      scope.success({ attributes: { "teaql.result.cardinality": rows.length } });
      return rows;
    } catch (error) {
      scope.failure(error);
      throw error;
    }
  }
  async prepareIdSetPage(query) {
    const options = query.localIdSetPaginationOptions?.();
    const runtime = query.localIdSetPaginationRuntime?.();
    if (!options || !runtime) {
      runtime?.observe("ID_SET_DISABLED");
      return { query };
    }
    const limit = this.queryLimit(query);
    if (!limit || query.localContinuousPageOptions?.() || this.aggregates(query).length || this.groupBy(query).length || query.__teaqlPartitionBy) {
      runtime.observe("ID_SET_FALLBACK_UNSUPPORTED_SHAPE");
      return { query };
    }
    if ((query.orderItems || []).some((order) => order.expr != null)) {
      runtime.observe("ID_SET_FALLBACK_NON_DETERMINISTIC_ORDER");
      return { query };
    }
    if (!this.orders(query).some((order) => order.field === "id")) {
      query = query.clone().order(OrderBy.asc("id"));
    }
    const normalized = query.clone();
    normalized.offsetValue = 0;
    normalized.limitValue = 0;
    normalized.selectItems = [];
    normalized.relations = [];
    normalized.commentText = void 0;
    normalized.purposeText = void 0;
    normalized.clearIdSetPaginationRuntime();
    normalized.clearContinuousPageRuntime();
    const rawKey = `${options.namespace}|${runtime.scope}|${JSON.stringify(normalized)}`;
    let hash = 2166136261;
    for (let i = 0; i < rawKey.length; i++) hash = Math.imul(hash ^ rawKey.charCodeAt(i), 16777619);
    const queryKey = `teaql:id-set:v1:${(hash >>> 0).toString(16)}`;
    let retained;
    let cacheHit = false;
    try {
      retained = runtime.get(queryKey);
    } catch {
      runtime.observe("ID_SET_FALLBACK_STORE_UNAVAILABLE");
      return { query };
    }
    if (!retained) {
      let buildResult;
      try {
        buildResult = await runtime.build(queryKey, async () => {
          const existing = runtime.get(queryKey);
          if (existing) return existing;
          const idQuery = query.clone();
          idQuery.selectItems = ["id"];
          idQuery.relations = [];
          idQuery.relationAggregates = [];
          idQuery.facets = [];
          idQuery.offsetValue = 0;
          idQuery.limitValue = options.maxIds + 1;
          idQuery.clearIdSetPaginationRuntime();
          idQuery.clearContinuousPageRuntime();
          idQuery[this.internalQueryToken] = true;
          const idRows = await this.executeQuery(idQuery);
          if (idRows.length > options.maxIds) return void 0;
          let ids;
          try {
            ids = BigUint64Array.from(idRows.map((row) => BigInt(row.id)));
          } catch {
            throw new Error("ID_SET_UNSUPPORTED_ID");
          }
          const value = { ids, expiresAt: Date.now() + options.ttlSeconds * 1e3 };
          runtime.put(queryKey, value);
          return value;
        });
      } catch (error) {
        runtime.observe(error instanceof Error && error.message === "ID_SET_UNSUPPORTED_ID" ? "ID_SET_FALLBACK_UNSUPPORTED_SHAPE" : "ID_SET_FALLBACK_STORE_UNAVAILABLE");
        return { query };
      }
      retained = buildResult.value;
      if (!retained) {
        runtime.observe("ID_SET_FALLBACK_LIMIT_EXCEEDED", options.maxIds + 1);
        return { query };
      }
      cacheHit = !buildResult.built;
      runtime.observe(cacheHit ? "ID_SET_HIT" : "ID_SET_BUILD", retained.ids.length);
    } else {
      cacheHit = true;
      runtime.observe("ID_SET_HIT", retained.ids.length);
    }
    const offset = Number(query.offsetValue || query._offset || 0);
    const pageIds = Array.from(retained.ids.slice(offset, offset + limit));
    const page = query.clone();
    page.offsetValue = 0;
    page.limitValue = Math.max(pageIds.length, 1);
    page.filterCondition = page.filterCondition ? { $and: [page.filterCondition, { id: { $in: pageIds } }] } : { id: { $in: pageIds } };
    page.clearIdSetPaginationRuntime();
    runtime.observe(cacheHit ? "ID_SET_HIT" : "ID_SET_BUILD", retained.ids.length);
    return { query: page, execution: { pageIds, totalCount: retained.ids.length } };
  }
  async executeFacetMembership(outerQuery, relationName) {
    const query = outerQuery.clone();
    query.facets = [];
    query.relations = [];
    query.orderItems = [];
    query.offsetValue = 0;
    query.limitValue = 0;
    query.selectItems = [];
    query.groupByItems = [relationName];
    query.aggregateItems = [{ function: "Count", field: "id", alias: "__teaql_facet_count" }];
    query[this.internalQueryToken] = true;
    const rows = await this.executeQuery(query);
    return new Map(rows.flatMap((row) => {
      const value = row[relationName];
      const count = Number(row.__teaql_facet_count ?? 0);
      return value === null || value === void 0 ? [] : [[String(value), count]];
    }));
  }
  async executeCount(query) {
    if (typeof query?.forExactCount !== "function") {
      throw new Error("TeaQL exact count requires the formal runtime SelectQuery");
    }
    const alias = "__teaql_total";
    const rows = await this.executeQuery(query.forExactCount(alias));
    const value = rows[0]?.[alias];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`TeaQL provider did not return exact count alias ${alias}`);
    }
    return value;
  }
  async prepareContinuousPage(query) {
    const options = query.localContinuousPageOptions?.();
    const runtime = query.localContinuousPageRuntime?.();
    if (!options || !runtime) {
      runtime?.observe("DISABLED");
      return { query };
    }
    const orders = this.orders(query);
    const limit = this.queryLimit(query);
    if (!limit || orders.length !== 1 || orders[0].field !== "id" || this.aggregates(query).length || this.groupBy(query).length || query.__teaqlPartitionBy) {
      runtime.observe("OFFSET_FALLBACK:UNSUPPORTED_QUERY_SHAPE");
      return { query };
    }
    const clone = Object.assign(Object.create(Object.getPrototypeOf(query)), query);
    clone.orderItems = [...query.orderItems || []];
    clone.relations = [...query.relations || []];
    Object.defineProperty(clone, "continuousPageFetchOptions", { enumerable: false, writable: true, value: options });
    Object.defineProperty(clone, "continuousPageRuntimeContext", { enumerable: false, writable: true, value: runtime });
    const offset = Number(query.offsetValue || query._offset || 0);
    const normalized = { ...JSON.parse(JSON.stringify(clone)), offsetValue: 0, _offset: 0, commentText: void 0, purposeText: void 0 };
    const rawKey = `${options.namespace}|${runtime.owner}|${JSON.stringify(normalized)}`;
    let hash = 2166136261;
    for (let i = 0; i < rawKey.length; i++) hash = Math.imul(hash ^ rawKey.charCodeAt(i), 16777619);
    const queryKey = `teaql:continuous-page:v1:${(hash >>> 0).toString(16)}`;
    const execution = { queryKey, offset, limit, direction: String(orders[0].direction).toLowerCase(), ttlSeconds: options.ttlSeconds, runtime, optimized: false };
    if (offset === 0) {
      runtime.observe("OFFSET_FALLBACK:FIRST_PAGE");
      return { query: clone, execution };
    }
    let cursor;
    try {
      cursor = await observeRuntimeOperation(this.runtimeTelemetry, {
        family: "cache",
        name: "continuous_page.get",
        attributes: { "teaql.cache.operation": "get" }
      }, () => runtime.get(queryKey, offset));
    } catch {
      runtime.observe("OFFSET_FALLBACK:STORE_UNAVAILABLE");
      return { query: clone, execution };
    }
    if (!cursor) {
      runtime.observe("OFFSET_FALLBACK:CACHE_MISS");
      return { query: clone, execution };
    }
    const seek = { id: { [execution.direction === "desc" ? "$lt" : "$gt"]: cursor.boundary } };
    clone.filterCondition = clone.filterCondition ? { $and: [clone.filterCondition, seek] } : seek;
    clone.offsetValue = 0;
    if (clone._offset !== void 0) clone._offset = 0;
    execution.optimized = true;
    execution.cursorId = cursor.cursorId;
    runtime.observe("CURSOR_SEEK", cursor.cursorId);
    return { query: clone, execution };
  }
  async registerContinuousPage(_query, execution, rows) {
    if (!execution || rows.length !== execution.limit || !rows.length || rows[rows.length - 1].id === void 0) return;
    try {
      await observeRuntimeOperation(this.runtimeTelemetry, {
        family: "cache",
        name: "continuous_page.put",
        attributes: { "teaql.cache.operation": "put" }
      }, () => execution.runtime.put(execution.queryKey, execution.offset + rows.length, {
        cursorId: `cpg_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`,
        boundary: rows[rows.length - 1].id,
        expiresAt: Date.now() + execution.ttlSeconds * 1e3
      }));
    } catch {
      execution.runtime.observe("OFFSET_FALLBACK:STORE_UNAVAILABLE");
      return;
    }
    if (execution.optimized) execution.runtime.observe("CURSOR_SEEK", execution.cursorId);
  }
  async *executeForStream(query, chunkSize = 1e3) {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error("stream chunk size must be a positive integer");
    }
    if (Array.isArray(query.facets) && query.facets.length > 0) {
      throw new Error("QRY-F01_STREAM_UNSUPPORTED: execute facets with executeForList");
    }
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    const startedAt = Date.now();
    let outcome = "cancelled";
    let delivered = 0;
    let chunk = [];
    const descendantBindings = this.descendantBindings(query, sql, values);
    try {
      for await (const rawRow of this.driver.stream(sql, values)) {
        chunk.push(this.decodeRow(query.entity, rawRow, aggregateNames));
        if (chunk.length === chunkSize) {
          await this.enhanceRelations(chunk, query, descendantBindings);
          delivered += chunk.length;
          yield chunk;
          chunk = [];
        }
      }
      if (chunk.length) {
        await this.enhanceRelations(chunk, query, descendantBindings);
        delivered += chunk.length;
        yield chunk;
      }
      outcome = "success";
    } catch (error) {
      outcome = "failure";
      throw error;
    } finally {
      if (outcome === "failure") {
        try {
          this.recordSQL(
            "select",
            sql,
            values,
            startedAt,
            delivered,
            void 0,
            this.queryLogIntent(query, "stream"),
            outcome
          );
        } catch {
        }
      } else {
        this.recordSQL(
          "select",
          sql,
          values,
          startedAt,
          delivered,
          void 0,
          this.queryLogIntent(query, "stream"),
          outcome
        );
      }
    }
  }
  async enhanceRelations(parents, query, inherited) {
    if (!parents.length || !Array.isArray(query.relations) || !query.relations.length) return;
    const parentSchema = this.schema(query.entity);
    for (const load of query.relations) {
      const relation = parentSchema.relations?.[load.name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${load.name}`);
      const parentIds = parents.map((parent) => parent[relation.localKey]).filter((value) => value !== void 0 && value !== null);
      const limit = load.query ? this.queryLimit(load.query) : void 0;
      const threshold = load.query?.localTopNProbeParentThreshold?.();
      const boundedTopN = relation.many && limit !== void 0;
      const providerAlwaysProbe = this.driver.topNRelationPlanPolicy === "alwaysProbe";
      const useProbes = boundedTopN && (threshold === void 0 ? providerAlwaysProbe : threshold > 0 && parentIds.length <= threshold);
      const selectedPlan = useProbes ? "bounded_probes" : "window";
      const relationScope = startRuntimeOperation(this.runtimeTelemetry, {
        family: "relation_load",
        name: `${query.entity}.${String(load.name)}`,
        attributes: {
          "teaql.entity.type": String(query.entity),
          "teaql.relation.name": String(load.name),
          "teaql.relation.parent_count": parentIds.length,
          "teaql.relation.per_parent_limit": limit ?? 0,
          "teaql.relation.configured_probe_threshold": threshold ?? "provider-default",
          "teaql.relation.selected_plan": selectedPlan,
          "teaql.relation.probe_count": useProbes ? parentIds.length : 0
        }
      });
      try {
        if (!parentIds.length) {
          for (const parent of parents) parent[load.name] = relation.many ? [] : null;
          relationScope.success({ attributes: { "teaql.result.cardinality": 0 } });
          continue;
        }
        const childQuery = {
          ...load.query || {},
          entity: relation.targetEntity,
          _filters: [...this.filters(load.query || {})],
          relations: [...load.query?.relations || []],
          orderItems: [...load.query?.orderItems || []],
          __teaqlPartitionBy: boundedTopN && !useProbes ? relation.foreignKey : void 0,
          __teaqlTracePath: [
            ...Array.isArray(query.__teaqlTracePath) ? query.__teaqlTracePath : [
              { level: 0, kind: "operation", name: "query" },
              { level: 1, kind: "request", name: String(query.entity) }
            ],
            {
              level: Array.isArray(query.__teaqlTracePath) ? query.__teaqlTracePath.length : 2,
              kind: "relation",
              name: `${String(query.entity)}.${String(load.name)}`
            }
          ],
          commentText: query?._comment ?? query?.commentText,
          purposeText: query?._purpose ?? query?.purposeText
        };
        if (boundedTopN && !childQuery.orderItems.some((order) => order.field === "id")) {
          childQuery.orderItems.push(OrderBy.asc("id"));
        }
        if (typeof childQuery.clearContinuousPageRuntime === "function") childQuery.clearContinuousPageRuntime();
        childQuery[this.internalQueryToken] = true;
        const children = [];
        if (useProbes) {
          for (const parentId of parentIds) {
            const probeQuery = {
              ...childQuery,
              _filters: [...childQuery._filters, { [relation.foreignKey]: { $eq: parentId } }],
              __teaqlPartitionBy: void 0
            };
            children.push(...await this.executeDerivedQuery(probeQuery, inherited));
          }
        } else {
          childQuery._filters.push({ [relation.foreignKey]: { $in: parentIds } });
          children.push(...await this.executeDerivedQuery(childQuery, inherited));
        }
        for (const child of children) delete child.__teaql_partition_rank;
        const buckets = /* @__PURE__ */ new Map();
        for (const child of children) {
          const key = child[relation.foreignKey];
          const bucket = buckets.get(key) || [];
          bucket.push(child);
          buckets.set(key, bucket);
        }
        for (const parent of parents) {
          const related = buckets.get(parent[relation.localKey]) || [];
          parent[load.name] = relation.many ? related : related[0] ?? null;
        }
        relationScope.success({ attributes: { "teaql.result.cardinality": children.length } });
      } catch (error) {
        relationScope.failure(error);
        throw error;
      }
    }
  }
  async enhanceRelationAggregates(parents, query, inherited) {
    const aggregates = query.relationAggregates;
    if (!parents.length || !Array.isArray(aggregates) || !aggregates.length) return;
    const parentSchema = this.schema(query.entity);
    for (const aggregate of aggregates) {
      const relation = parentSchema.relations?.[aggregate.relationName];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${aggregate.relationName}`);
      const parentIds = parents.map((parent) => parent[relation.localKey]).filter((value) => value !== void 0 && value !== null);
      if (!parentIds.length) {
        for (const parent of parents) {
          parent[aggregate.alias] = aggregate.singleResult ? this.emptyAggregateValue(aggregate.query) : {};
        }
        continue;
      }
      const childQuery = aggregate.query.clone();
      childQuery.entity = relation.targetEntity;
      childQuery.selectItems = [];
      childQuery.properties = [];
      childQuery.orderItems = [];
      childQuery.limitValue = 0;
      childQuery.offsetValue = 0;
      childQuery.relations = [];
      childQuery.relationAggregates = [];
      if (!childQuery.aggregateItems.length) {
        childQuery.aggregate("Count", "id", aggregate.alias);
      }
      if (!childQuery.groupByItems.includes(relation.foreignKey)) {
        childQuery.groupBy(relation.foreignKey);
      }
      childQuery.filterCondition = {
        ...childQuery.filterCondition || {},
        [relation.foreignKey]: { $in: parentIds }
      };
      childQuery[this.internalQueryToken] = true;
      childQuery.commentText = query?._comment ?? query?.commentText;
      childQuery.purposeText = query?._purpose ?? query?.purposeText;
      childQuery.__teaqlTracePath = [
        ...query.__teaqlTracePath ?? [
          { level: 0, kind: "operation", name: "query" },
          { level: 1, kind: "request", name: String(query.entity) }
        ],
        { level: query.__teaqlTracePath?.length ?? 2, kind: "relation", name: `${query.entity}.${aggregate.relationName}` }
      ];
      const rows = await this.executeDerivedQuery(childQuery, inherited);
      const buckets = /* @__PURE__ */ new Map();
      for (const row of rows) buckets.set(row[relation.foreignKey], row);
      for (const parent of parents) {
        const row = buckets.get(parent[relation.localKey]);
        if (!row) {
          parent[aggregate.alias] = aggregate.singleResult ? this.emptyAggregateValue(aggregate.query) : {};
        } else if (aggregate.singleResult) {
          parent[aggregate.alias] = row[childQuery.aggregateItems[0].alias] ?? null;
        } else {
          parent[aggregate.alias] = Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== relation.foreignKey)
          );
        }
      }
    }
  }
  emptyAggregateValue(query) {
    const aggregate = query.aggregateItems[0];
    return !aggregate || String(aggregate.function).toLowerCase() === "count" ? 0 : null;
  }
  queryLimit(query) {
    if (query._limit !== void 0) return Number(query._limit);
    if (query.limitValue !== void 0 && Number(query.limitValue) > 0) {
      return Number(query.limitValue);
    }
    return void 0;
  }
  async close() {
    await this.driver.close();
  }
};
function assertSafeIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return value;
}
function standardAggregateFunction(name) {
  const functions = {
    count: "COUNT",
    sum: "SUM",
    avg: "AVG",
    min: "MIN",
    max: "MAX"
  };
  const sqlFunction = functions[String(name).toLowerCase()];
  if (!sqlFunction) throw new Error(`Unsupported aggregate: ${name}`);
  return sqlFunction;
}

export {
  debugSQL,
  canonicalRelationIndexes,
  ensureOptimisticIdFloor,
  TextDiagnosticSQLLogSink,
  SQLExecutionEvidenceStore,
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  standardAggregateFunction
};
//# sourceMappingURL=chunk-6ZBMIZTE.js.map
