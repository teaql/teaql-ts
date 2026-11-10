import {
  telemetryNotice
} from "./chunk-LGSUBUWZ.js";
import {
  ModeledInteger32Layout,
  MutationFieldLayout,
  OrderBy,
  SelectQuery,
  SmartList,
  executeRelationFacets,
  localTime,
  mergeRuntimeBootstrap,
  validateInteger32Schemas
} from "./chunk-4RL2SBSG.js";
import {
  CheckException,
  GraphCommittedError,
  GraphMutationSession,
  MutationIntent,
  MutationRequest,
  MutationVersionError,
  QueryIntent,
  QueryRequest,
  UserContext,
  canonicalSQLTracePath,
  cloneTraceNodes,
  contextSchemaCapability,
  credentialName,
  entityVersion,
  inheritSQLLogBindings,
  internalId,
  long,
  nextEntityVersion,
  projectSQLLog,
  projectSafeSQLLog,
  queryDiagnosticOrigin,
  queryTraceSource,
  retainQueryDiagnosticOrigin,
  retainSQLLogProvenance,
  translateCheckerResults
} from "./chunk-D2TPHZDJ.js";
import {
  decimal
} from "./chunk-2M5YIPLE.js";
import {
  observeRuntimeOperation,
  startRuntimeOperation
} from "./chunk-WEYNFMW2.js";

// src/core/sql-diagnostic-event.ts
function sqlDiagnosticEvent(metadata, correlation) {
  if (metadata.logMode !== "masked") throw new Error("Telemetry requires safe SQL projection");
  const nodes = (frames = []) => JSON.stringify(frames.map((frame) => ({ kind: frame.kind, name: frame.name, detail: frame.detail ?? "" })));
  return Object.freeze({
    body: "TeaQL SQL execution",
    correlation,
    attributes: Object.freeze({
      "teaql.trace_chain": nodes(metadata.traceChain),
      "teaql.trace_path": nodes(metadata.tracePath),
      "teaql.mutation_lineage": nodes(metadata.mutationLineage),
      "teaql.intent.comment": metadata.comment ?? metadata.auditReason ?? "",
      "teaql.intent.purpose": metadata.purpose ?? "",
      "teaql.sql.debug": metadata.debugSQL,
      "teaql.sql.log_mode": metadata.logMode,
      "teaql.sql.operation": metadata.operation,
      "teaql.sql.outcome": metadata.executionOutcome ?? "unknown",
      "teaql.sql.elapsed_us": metadata.elapsedMicros,
      ...metadata.resultCount === void 0 ? {} : { "teaql.sql.result_count": metadata.resultCount },
      ...metadata.affectedRows === void 0 ? {} : { "teaql.sql.affected_rows": metadata.affectedRows }
    })
  });
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
function sameBootstrapValue(left, right) {
  if (left === right) return true;
  if (left instanceof Date) left = left.getTime();
  if (right instanceof Date) right = right.getTime();
  return left !== null && left !== void 0 && right !== null && right !== void 0 && String(left) === String(right);
}
function sqlTraceFrames(source) {
  return Object.freeze(source.map((node, level) => Object.freeze({ ...node, level })));
}
function mutationLogIntent(request, mutation, provider, operation, id, localBindings) {
  const lineage = request.traceFor({ entity: String(mutation.entity), id });
  const path = canonicalSQLTracePath([...lineage, {
    kind: "entity",
    name: String(mutation.entity),
    entityId: id,
    detail: ""
  }], provider, operation);
  return {
    auditReason: request.comment,
    tracePath: sqlTraceFrames(path.tracePath),
    mutationLineage: lineage,
    targetID: id,
    inheritedBindings: inheritSQLLogBindings(localBindings, request.graphSession?.logBindings)
  };
}
var TextDiagnosticSQLLogSink = class {
  constructor(writer = (text) => console.debug(text)) {
    this.writer = writer;
  }
  write(metadata) {
    metadata = projectSQLLog(metadata);
    this.writer(
      `[TeaQL SQL][${metadata.operation}][${metadata.elapsedMicros}us] ${metadata.resultSummary}${metadata.executionOutcome ? ` outcome=${metadata.executionOutcome}` : ""}
comment=${metadata.comment ?? ""} purpose=${metadata.purpose ?? ""} auditReason=${metadata.auditReason ?? ""} tracePath=${diagnosticJSON(metadata.tracePath)} traceChain=${diagnosticJSON(metadata.traceChain ?? [])} mutationLineage=${diagnosticJSON(metadata.mutationLineage ?? [])}
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
      ...metadata.traceChain ? { traceChain: cloneTraceNodes(metadata.traceChain) } : {},
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
    this.bootstrapTail = Promise.resolve();
    this.sqlTrace = [];
    this.internalQueryToken = /* @__PURE__ */ Symbol("teaql-internal-query");
    this.bindLogPolicies = /* @__PURE__ */ new WeakMap();
    // Compiler-owned operands before LIKE decoration, never SQL parameters or
    // serialized metadata. Lifetime follows this execution's binding array.
    this.bindOperandSources = /* @__PURE__ */ new WeakMap();
    this.derivedQueryBindings = /* @__PURE__ */ new WeakMap();
    this.derivedRelationAssembly = /* @__PURE__ */ new WeakMap();
    this.checkerPrivacyPolicy = (entity, field) => {
      const schema = entity ? this.schemas[entity] : void 0;
      if (!schema) return void 0;
      const native = Object.keys(schema.columns).find((name) => name === field || schema.columns[name].modelName === field || schema.columns[name].columnName === field) ?? field;
      const policy = this.fieldLogPolicy(schema, native);
      return policy === "masked" || policy === "credential" ? policy : void 0;
    };
    this.auditEvents = [];
    this.diagnosticSQLLogSink = new TextDiagnosticSQLLogSink();
    this.queryLoggingEnabled = true;
    this.mutationLoggingEnabled = true;
    this.customTelemetry = false;
    this.checkers = {};
    this.userContext = new UserContext();
    this.bootstrap = {};
    this.graphAuditActions = [];
    this.graphCommitActions = [];
    this.graphRollbackActions = [];
    this.graphSaveTail = Promise.resolve();
    validateInteger32Schemas(schemas);
    this.schemas = { ...schemas };
  }
  fieldLogPolicy(schema, field) {
    const column = schema.columns[field];
    const name = column?.modelName ?? column?.columnName ?? field;
    if (credentialName(name) || credentialName(field)) return "credential";
    if (!schema.auditMaskFields) return "unknown";
    if (schema.auditMaskFields?.includes(name) || schema.auditMaskFields?.includes(field)) return "masked";
    return column?.logPolicy ?? "unknown";
  }
  bindValue(values, value, policy, sourceOperand) {
    const policies = this.bindLogPolicies.get(values) ?? values.map(() => "unknown");
    values.push(value);
    policies.push(policy);
    this.bindLogPolicies.set(values, policies);
    if (sourceOperand !== void 0) {
      this.bindOperandSources.set(values, inheritSQLLogBindings({
        parameterizedSQL: "",
        parameters: [sourceOperand],
        parameterLogPolicies: [policy],
        sqlOrigin: "generated"
      }, this.bindOperandSources.get(values)));
    }
  }
  queryLogBindings(sql, values) {
    return inheritSQLLogBindings({
      parameterizedSQL: sql,
      parameters: values,
      parameterLogPolicies: this.bindLogPolicies.get(values),
      sqlOrigin: "generated"
    }, this.bindOperandSources.get(values));
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
  /** Separate reservation transaction: no business mutation, Checker, Fix or audit. */
  async reserveInternalId(entity, context) {
    if (!(context instanceof UserContext)) throw new TypeError("UserContext is required for ID reservation");
    this.schema(entity);
    if (this.activeGraph) throw new Error("Internal ID reservation is not allowed inside an active graph save");
    const predecessor = this.graphSaveTail;
    let release;
    this.graphSaveTail = new Promise((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      return await this.driver.transaction(async (session) => {
        const id = internalId(await this.driver.nextId(session, entity));
        if (!Number.isSafeInteger(Number(id))) throw new RangeError("SQL internal ID space exhausted its exact integer range");
        return id;
      });
    } finally {
      release();
    }
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
    this.requireFiniteFloatingPoint(normalized, column);
    if (column?.logicalType === "decimal" && normalized !== null) {
      if (column.decode !== "decimal") {
        if (typeof normalized === "number" && (!Number.isFinite(normalized) || Number.isInteger(normalized) && !Number.isSafeInteger(normalized))) {
          throw new TypeError("Legacy Decimal requires a finite JSON-safe number");
        }
        return this.driver.encode(normalized, column);
      }
      return this.driver.encode(decimal(normalized), column);
    }
    if (column?.logicalType === "long" && normalized !== null) return this.driver.encode(long(normalized), column);
    if (column?.logicalType === "time" && normalized !== null) return this.driver.encode(localTime(normalized), column);
    return this.driver.encode(normalized, column);
  }
  requireFiniteFloatingPoint(value, column) {
    if (column?.logicalType !== "double" || value === null || value === void 0) return;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Invalid numeric field ${column.modelName ?? column.columnName}: expected a finite Float/Double number`);
    }
  }
  validateFloatingMutation(mutation) {
    const schema = this.schemas[mutation.entity];
    if (!schema) return;
    const record = this.toRuntimeMutationRecord(schema, mutation.payload || {});
    for (const [field, value] of Object.entries(record)) this.requireFiniteFloatingPoint(value, schema.columns[field]);
  }
  decodeRow(entity, row, aggregateNames = [], groupAliases) {
    const schema = this.schema(entity);
    const result = { ...row };
    const width = new ModeledInteger32Layout(entity, schema);
    for (const [field, column] of Object.entries(schema.columns)) {
      if (groupAliases && !Object.prototype.hasOwnProperty.call(groupAliases, field)) continue;
      const output = groupAliases?.[field] ?? field;
      if (aggregateNames.some((aggregate) => aggregate.name === output)) continue;
      const value = result[output];
      if (value === null || value === void 0) continue;
      if (field === "version") {
        result[output] = entityVersion(value);
        continue;
      }
      if (column.decode === "number") result[output] = Number(width.read(field, value));
      this.requireFiniteFloatingPoint(result[output], column);
      if (column.decode === "string") result[output] = String(value);
      if (column.decode === "decimal") {
        if (typeof value !== "string") throw new TypeError(`Inexact Decimal readback for ${field}`);
        result[output] = decimal(value);
      }
      if (column.decode === "long") {
        if (typeof value !== "string" && typeof value !== "bigint") {
          throw new TypeError(`Inexact Long readback for ${field}`);
        }
        result[output] = long(value);
      }
      if (column.decode === "time") result[output] = localTime(value);
      if (column.decode === "date") {
        if (value instanceof Date) result[output] = column.logicalType === "date" ? value.toISOString().slice(0, 10) : value.toISOString();
        else if (column.logicalType === "datetime" && typeof value === "number") {
          result[output] = new Date(value).toISOString();
        }
      }
      if (column.logicalType === "boolean") result[output] = Boolean(value);
    }
    for (const aggregate of aggregateNames) {
      const value = result[aggregate.name];
      if (value !== null && value !== void 0) {
        if (aggregate.exactDecimal) {
          if (typeof value !== "string") throw new TypeError(`Inexact Decimal aggregate ${aggregate.name}`);
          result[aggregate.name] = decimal(value);
        } else result[aggregate.name] = Number(value);
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
    this.customTelemetry = true;
    this.runtimeTelemetry = telemetry;
    return this;
  }
  /** Node provider startup hook. Optional module initialization remains fail-open. */
  attachStandardTelemetryStartup(startup) {
    this.telemetryStartup = startup.then(async (handle) => {
      if (!handle) return;
      if (this.customTelemetry) {
        await handle.release();
        return;
      }
      this.standardTelemetryHandle = handle;
      this.runtimeTelemetry = handle.telemetry;
    }).catch(() => {
      telemetryNotice("TeaQL telemetry: initialization failed; business continues without export.", true);
    });
  }
  async flushTelemetry() {
    await this.telemetryStartup;
    try {
      await this.standardTelemetryHandle?.flush();
    } catch {
      telemetryNotice("TeaQL telemetry: export flush failed; business outcome unchanged.", true);
    }
  }
  async withQueryRequest(query, work) {
    new QueryRequest(query);
    await this.telemetryStartup;
    return observeRuntimeOperation(
      this.runtimeTelemetry,
      {
        family: "query",
        name: `${String(query.entity)}.request`,
        attributes: { "teaql.entity.type": String(query.entity) }
      },
      work,
      (result) => Array.isArray(result) ? { attributes: { "teaql.result.cardinality": result.length } } : {}
    );
  }
  recordSQL(operation, parameterizedSQL, parameters, startedAt, resultCount, affectedRows, intent = {}, executionOutcome = "success", inherited, correlation) {
    const isSelect = operation === "select";
    const logsEnabled = isSelect ? this.queryLoggingEnabled : this.mutationLoggingEnabled;
    const { targetID, inheritedBindings, ...visibleIntent } = intent;
    const metadata = Object.freeze({
      operation,
      ...visibleIntent,
      executionOutcome,
      traceChain: cloneTraceNodes(intent.traceChain ?? []),
      tracePath: sqlTraceFrames(intent.tracePath ?? []),
      ...intent.traceChain ? { traceChain: cloneTraceNodes(intent.traceChain) } : {},
      ...intent.mutationLineage ? { mutationLineage: cloneTraceNodes(intent.mutationLineage) } : {},
      parameterizedSQL,
      parameters: Object.freeze([...parameters]),
      // Never build a plaintext SQL copy before the log policy boundary.
      debugSQL: "",
      databaseKind: this.driver.databaseKind,
      sqlOrigin: "generated",
      parameterLogPolicies: Object.freeze([...this.bindLogPolicies.get(parameters) ?? parameters.map(() => "unknown")]),
      elapsedMicros: Math.max(0, (Date.now() - startedAt) * 1e3),
      resultCount,
      affectedRows,
      resultSummary: resultCount !== void 0 ? `${resultCount} rows returned` : affectedRows !== void 0 ? `${affectedRows} rows affected` : `statement ${executionOutcome}; row count unknown`
    });
    const ancestors = inheritedBindings && inherited ? inheritSQLLogBindings(inherited, inheritedBindings) : inheritedBindings ?? inherited;
    const operands = this.bindOperandSources.get(parameters);
    const provenance = operands ? inheritSQLLogBindings(operands, ancestors) : ancestors;
    retainSQLLogProvenance(metadata, provenance, targetID === void 0 ? [] : [targetID]);
    if (this.runtimeTelemetry?.recordDiagnostic) {
      try {
        if (this.runtimeTelemetry.recordsSQLDiagnostics?.() !== false)
          this.runtimeTelemetry.recordDiagnostic(sqlDiagnosticEvent(projectSafeSQLLog(metadata), correlation));
      } catch {
        telemetryNotice("TeaQL telemetry: SQL diagnostic rejected; business outcome unchanged.", true);
      }
    }
    if (!this.telemetrySink && !(logsEnabled && this.diagnosticSQLLogSink)) return metadata;
    try {
      const projected = projectSQLLog(metadata);
      try {
        this.telemetrySink?.record(projected);
      } catch {
      }
      if (logsEnabled) {
        try {
          this.diagnosticSQLLogSink?.write(projected);
        } catch {
        }
      }
    } catch {
    }
    return metadata;
  }
  queryLogIntent(query) {
    const request = new QueryRequest(query);
    const path = canonicalSQLTracePath(request.traceSource, this.driver.databaseKind, "select");
    return {
      comment: request.intent.comment,
      purpose: request.purpose,
      traceChain: request.traceChain,
      tracePath: sqlTraceFrames(path.tracePath)
    };
  }
  async executeLoggedSQL(operation, sql, values, intent, execute, inherited, statements) {
    await this.telemetryStartup;
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "provider",
      name: `${this.driver.databaseKind}.${operation}`,
      attributes: {
        "teaql.provider.kind": this.driver.databaseKind,
        "teaql.provider.execution": "statement",
        "teaql.provider.operation": operation === "select" ? "query" : operation
      }
    });
    const correlation = scope.correlation?.();
    const startedAt = Date.now();
    let result;
    try {
      result = await (scope.run ? scope.run(execute) : execute());
    } catch (error) {
      try {
        const metadata2 = this.recordSQL(operation, sql, values, startedAt, void 0, void 0, intent, "failure", inherited, correlation);
        statements?.push(metadata2);
      } finally {
        scope.failure(error);
        throw error;
      }
    }
    const metadata = this.recordSQL(
      operation,
      sql,
      values,
      startedAt,
      operation === "select" ? result.rowCount : void 0,
      operation === "select" ? void 0 : result.rowCount,
      intent,
      "success",
      inherited,
      correlation
    );
    statements?.push(metadata);
    scope.success({ attributes: { "teaql.result.cardinality": result.rowCount } });
    return result;
  }
  /** Package-internal physical capability used only by UserContext.ensureSchema(). */
  async [contextSchemaCapability](context) {
    await this.telemetryStartup;
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
    this.userContext = context;
    const previousActor = context.getResource("bootstrapActor");
    const previousCategory = context.getResource("bootstrapCategory");
    context.insertResource("bootstrapActor", "teaql-generated-bootstrap");
    context.insertResource("bootstrapCategory", "runtime-bootstrap");
    try {
      if (this.bootstrap.ensure) {
        const { runGeneratedBootstrap } = await import("./entity-creation-6ZV2BEXJ.js");
        await runGeneratedBootstrap(context, this.bootstrap, () => this.bootstrap.ensure(context));
      } else {
        await this.ensureBootstrapData();
      }
    } finally {
      if (previousActor === void 0) context.removeResource("bootstrapActor");
      else context.insertResource("bootstrapActor", previousActor);
      if (previousCategory === void 0) context.removeResource("bootstrapCategory");
      else context.insertResource("bootstrapCategory", previousCategory);
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
    await this.executeGraphSave(new MutationIntent("reconcile model bootstrap data"), async (graph) => {
      const session = this.graphMutationSession;
      const planned = [];
      for (const record of records) {
        const mutation = await this.planBootstrapMutation(session, record);
        if (mutation) planned.push({ record, request: graph.request(mutation) });
      }
      for (const { request } of planned) this.preflightMutation(request);
      for (const { request } of planned) await this.executeMutation(request);
      for (const record of records) await this.driver.ensureIdFloor(session, record.entity, record.id);
    });
  }
  async planBootstrapMutation(session, record) {
    const schema = this.schema(record.entity);
    const entries = Object.entries(record.values ?? {}).map(([field, value]) => {
      const column = schema.columns[field];
      if (!column) throw new Error(`Unknown bootstrap field ${record.entity}.${field}`);
      return {
        column: column.columnName,
        model: column.modelName ?? field,
        original: value,
        value: this.driver.encode(value, column)
      };
    });
    const canonicalValues = Object.fromEntries(entries.map((entry) => [entry.model, entry.original]));
    const query = new SelectQuery(record.entity).filter({ id: { $eq: record.id } }).limit(1).comment("inspect model bootstrap record").purpose("ensure model-defined root and constants");
    query.prepareForList();
    const request = new QueryRequest(query);
    const projection = Object.entries(schema.columns).map(([field, column]) => this.fieldProjection(field, column, column.columnName)).join(", ");
    const sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)} WHERE ${this.driver.identifier(schema.columns.id?.columnName ?? "id")} = ${this.driver.placeholder(1)}`;
    const values = [record.id];
    this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, "id")]);
    const current = await this.executeLoggedSQL(
      "select",
      sql,
      values,
      this.queryLogIntent(request.query),
      () => session.query(sql, values)
    );
    if (!current.rowCount) {
      return {
        entity: record.entity,
        action: "Create",
        id: record.id,
        version: 0,
        payload: canonicalValues
      };
    }
    const row = current.rows[0];
    const changed = entries.filter((entry) => !sameBootstrapValue(row[entry.column], entry.value));
    if (!changed.length) return void 0;
    return {
      entity: record.entity,
      action: "Update",
      id: record.id,
      version: entityVersion(row[schema.columns.version?.columnName ?? "version"]),
      payload: { ...Object.fromEntries(Object.entries(this.decodeRowForSchema(schema, row)).map(([field, value]) => [schema.columns[field]?.modelName ?? field, value])), ...canonicalValues }
    };
  }
  async executeGraphSave(intent, work, prepare, admit) {
    const graph = new GraphMutationSession(intent);
    const executionContext = this.userContext;
    graph.bindExecutionReference(() => this.userContext);
    graph.bindExecutionMetadata(() => ({ schemas: this.schemas, checkerNames: Object.keys(this.checkers).sort() }));
    for (const name of Object.keys(this.checkers)) {
      graph.bindExecutionReference(() => this.checkers[name]);
      graph.bindExecutionReference(() => this.checkers[name]?.checkAndFix);
    }
    await this.telemetryStartup;
    const save = async () => {
      const predecessor = this.graphSaveTail;
      let release;
      this.graphSaveTail = new Promise((resolve) => {
        release = resolve;
      });
      await predecessor;
      let fixEvidenceStarted = false;
      let mutationPolicyGraphStarted = false;
      let committed = false;
      try {
        graph.validatePreparedSources();
        this.graphCommitActions = [];
        this.graphRollbackActions = [];
        this.graphAuditActions = [];
        const pending = admit?.(graph);
        if (admit && typeof pending !== "boolean") throw new Error("GRAPH_ADMISSION_RESULT_REQUIRED");
        graph.captureInputSources();
        if (pending === false) {
          graph.sealPreparedGraph();
          this.activeGraph = graph;
          try {
            return await work(graph);
          } finally {
            this.activeGraph = void 0;
          }
        }
        executionContext.beginMutationPolicyGraph();
        mutationPolicyGraphStarted = true;
        executionContext.insertResource("fixTime", executionContext.businessTime());
        executionContext.beginFixEvidence();
        fixEvidenceStarted = true;
        this.activeGraph = graph;
        try {
          await prepare?.(graph);
        } finally {
          this.activeGraph = void 0;
        }
        if (prepare && !graph.isPreparedSealed) graph.sealPreparedGraph();
        executionContext.prepareMutationPolicyGraph(graph.preparedRootEntity);
        graph.validatePreparedSources();
        if (graph.isPreparedEmpty) {
          this.activeGraph = graph;
          try {
            return await work(graph);
          } finally {
            this.activeGraph = void 0;
          }
        }
        const result = await this.driver.transaction(async (session) => {
          this.graphMutationSession = session;
          this.activeGraph = graph;
          try {
            const value = await work(graph);
            graph.requirePreparedComplete();
            executionContext.ensureMutationPolicyGraphComplete();
            return value;
          } finally {
            this.graphMutationSession = void 0;
            this.activeGraph = void 0;
          }
        });
        committed = true;
        let failure;
        let failed = false;
        for (const action of [...this.graphCommitActions, ...this.graphAuditActions]) {
          try {
            await action();
          } catch (error) {
            if (!failed) failure = error;
            failed = true;
          }
        }
        if (failed) throw new GraphCommittedError(failure);
        return result;
      } catch (error) {
        if (!committed) {
          for (const action of [...this.graphRollbackActions].reverse()) {
            try {
              action();
            } catch {
            }
          }
        }
        throw error;
      } finally {
        this.graphCommitActions = [];
        this.graphRollbackActions = [];
        this.graphAuditActions = [];
        if (mutationPolicyGraphStarted) executionContext.endMutationPolicyGraph();
        if (fixEvidenceStarted) executionContext.removeResource("fixTime").finishFixEvidence();
        release();
      }
    };
    return observeRuntimeOperation(this.runtimeTelemetry, {
      family: "mutation",
      name: "graph.save",
      attributes: { "teaql.entity.type": "graph", "teaql.mutation.kind": "graph" }
    }, save);
  }
  afterGraphCommit(work) {
    if (!this.graphMutationSession) throw new Error("No graph save is active");
    this.graphCommitActions.push(work);
  }
  afterGraphRollback(work) {
    if (!this.graphMutationSession) throw new Error("No graph save is active");
    this.graphRollbackActions.push(work);
  }
  requireGraphOwnership(request) {
    if (request.graphSession !== this.activeGraph || this.graphMutationSession !== void 0 && request.graphSession === void 0) {
      throw new Error("GRAPH_MUTATION_SESSION_REQUIRED: use the explicit active graph request capability");
    }
  }
  async withMutationSession(request, work) {
    this.requireGraphOwnership(request);
    return request.graphSession ? work(this.graphMutationSession) : this.driver.transaction(work);
  }
  preflightMutation(mutation) {
    const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
    this.requireGraphOwnership(request);
    request.graphSession?.recordPreparedMutation();
    mutation = this.checkAndFixMutation(request);
    if (request.graphSession) {
      const schema = this.schema(mutation.entity);
      request.graphSession.captureLogBindings(this.mutationLogBindings(request, mutation, schema));
    }
    const policyMutation = request.graphSession ? request.graphSession.capturePreparedMutation(request, mutation, this.preparedReferences(mutation.entity)) : mutation;
    this.userContext.recordMutationPolicyPreflight(policyMutation);
    return mutation;
  }
  mutationLogBindings(request, mutation, schema) {
    const source = (values) => {
      const record = this.toRuntimeMutationRecord(schema, values);
      const fields = Object.keys(record);
      return {
        parameterizedSQL: "",
        sqlOrigin: "generated",
        parameters: fields.map((field) => record[field]),
        parameterLogPolicies: fields.map((field) => this.fieldLogPolicy(schema, field))
      };
    };
    return inheritSQLLogBindings(source(mutation.payload || {}), source(request.loadedValues()));
  }
  checkAndFixMutation(mutation) {
    const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
    this.requireGraphOwnership(request);
    const prepared = request.graphSession?.replayPreparedMutation(request);
    if (prepared) return prepared;
    mutation = request.mutation;
    const schema = this.schemas[String(mutation.entity)];
    if (schema) {
      const fields = new MutationFieldLayout(String(mutation.entity), Object.entries(schema.columns).map(([name, column]) => column.modelName ?? name));
      fields.validate(mutation.payload ?? {}, mutation.action === "Update");
      if (mutation.ledgerKey && mutation.ledgerRoot) {
        if (mutation.ledgerKey.entity !== mutation.entity) throw new Error("MUTATION_LAYOUT_OWNER_MISMATCH");
        fields.validate(mutation.ledgerRoot.change(mutation.ledgerKey), mutation.action === "Update");
      }
    }
    const originalVersion = schema ? this.checkedMutationVersion(mutation) : void 0;
    mutation = { ...mutation, payload: { ...mutation?.payload ?? {} } };
    request.bindCheckerLoadedValues(mutation);
    Object.defineProperty(mutation, "comment", { value: request.comment, enumerable: true });
    const declaringEntityType = String(mutation.entity);
    const width = new ModeledInteger32Layout(declaringEntityType, schema);
    const checker = this.checkers[declaringEntityType];
    if (!checker) {
      const violations = width.checkMutation(mutation.payload || {});
      if (violations.length) throw new CheckException(violations);
      this.validateFloatingMutation(mutation);
      return this.sealMutationVersion(mutation, schema ? originalVersion : void 0, Boolean(schema));
    }
    const results = [];
    const ownsFixTime = this.userContext.getResource("fixTime") === void 0;
    if (ownsFixTime) this.userContext.insertResource("fixTime", this.userContext.businessTime()).beginFixEvidence();
    try {
      checker.checkAndFix(this.userContext, mutation, results);
      if (schema && (mutation.action !== request.mutation.action || this.checkedMutationVersion(mutation) !== originalVersion)) {
        throw new MutationVersionError("invalid_type");
      }
      width.checkMutation(mutation.payload || {}, results);
      translateCheckerResults(
        this.userContext,
        results,
        declaringEntityType,
        this.checkerPrivacyPolicy,
        [request.loadedValues(), request.mutation.payload ?? {}, mutation.payload ?? {}]
      );
      if (results.length) throw new CheckException(results);
      this.validateFloatingMutation(mutation);
      if (mutation.action !== "Delete" && mutation.ledgerKey && mutation.ledgerRoot) {
        for (const [field, value] of Object.entries(mutation.payload || {})) mutation.ledgerRoot.set(mutation.ledgerKey, field, value);
      }
      return this.sealMutationVersion(mutation, originalVersion, Boolean(schema));
    } finally {
      if (ownsFixTime) this.userContext.removeResource("fixTime").finishFixEvidence();
    }
  }
  preparedReferences(entity) {
    const schema = this.schemas[entity];
    return Object.fromEntries(Object.values(schema?.relations ?? {}).filter((relation) => !relation.many).map((relation) => [schema.columns[relation.localKey]?.modelName ?? relation.localKey, relation.targetEntity]));
  }
  sealMutationVersion(mutation, original, modeled) {
    if (modeled && ["Create", "Update", "Delete", "Recover"].includes(mutation.action)) {
      Object.defineProperties(mutation, {
        version: { value: original, enumerable: true, writable: false, configurable: false },
        expectedVersion: { value: original, enumerable: mutation.expectedVersion !== void 0, writable: false, configurable: false },
        action: { value: mutation.action, enumerable: true, writable: false, configurable: false }
      });
    }
    return mutation;
  }
  /** Validate original state before Fix/policy/clock/provider. Missing originals
   * retain the explicit trusted administrative SQL path, never a fake version. */
  checkedMutationVersion(mutation) {
    if (mutation.action === "Create") {
      nextEntityVersion("Create");
      return void 0;
    }
    if (!["Update", "Delete", "Recover"].includes(mutation.action)) return void 0;
    const supplied = mutation.version !== void 0, expected = mutation.expectedVersion !== void 0;
    if (!supplied && !expected) {
      if (mutation.action === "Recover") throw new MutationVersionError("invalid_type", "Recover");
      return void 0;
    }
    const original = entityVersion(supplied ? mutation.version : mutation.expectedVersion);
    if (supplied && expected && original !== entityVersion(mutation.expectedVersion)) throw new MutationVersionError("invalid_type");
    nextEntityVersion(mutation.action, original);
    return original;
  }
  /** Preserve integer storage while asking JS drivers for exact version text. */
  fieldProjection(field, column, alias = field) {
    const sql = this.driver.identifier(column.columnName);
    const exact = field === "version" ? `CAST(${sql} AS ${this.driver.databaseKind === "mysql" ? "CHAR" : "TEXT"})` : sql;
    return `${exact} AS ${this.driver.identifier(alias)}`;
  }
  async executeMutation(mutation) {
    await this.telemetryStartup;
    const request = mutation instanceof MutationRequest ? mutation : new MutationRequest(mutation);
    this.requireGraphOwnership(request);
    request.graphSession?.requireMutationAllowed();
    if (this.activeGraph && !this.graphMutationSession) {
      throw new Error("Graph preparation cannot execute mutations before its transaction");
    }
    mutation = request.mutation;
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "mutation",
      name: `${String(mutation?.entity || "unknown")}.${String(mutation?.action || "unknown").toLowerCase()}`,
      attributes: {
        "teaql.entity.type": String(mutation?.entity || "unknown"),
        "teaql.mutation.kind": String(mutation?.action || "unknown").toLowerCase()
      }
    });
    const work = async () => {
      try {
        mutation = this.checkAndFixMutation(request);
        const mutationGovernance = this.userContext.enterMutationPolicy(mutation);
        const schema = this.schema(mutation.entity);
        const mutationRecord = this.toRuntimeMutationRecord(schema, mutation.payload || {});
        const diagnosticBindings = this.mutationLogBindings(request, mutation, schema);
        const table = this.driver.identifier(schema.table);
        const statements = [];
        const result = await observeRuntimeOperation(this.runtimeTelemetry, {
          family: "provider",
          name: `${this.driver.databaseKind}.mutation`,
          attributes: {
            "teaql.provider.kind": this.driver.databaseKind,
            "teaql.provider.operation": String(mutation.action).toLowerCase()
          }
        }, () => this.withMutationSession(request, async (session) => {
          if (mutation.action === "Create") {
            const id = mutation.id ? String(mutation.id) : await this.driver.nextId(session, mutation.entity);
            if (mutation.id) {
              await this.driver.ensureIdFloor(session, mutation.entity, id);
            }
            const version = nextEntityVersion("Create");
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
            const intent = mutationLogIntent(request, mutation, this.driver.databaseKind, "insert", id, diagnosticBindings);
            await this.executeLoggedSQL("insert", sql, values, intent, () => session.query(sql, values), void 0, statements);
            return {
              success: true,
              id,
              version,
              persistedRecord: await this.readPersistedRecord(session, schema, id, intent, sql, values, statements)
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
            const original = this.checkedMutationVersion(mutation);
            predicates.push(`${versionColumn} > 0`, `${versionColumn} < 9223372036854775807`);
            if (original !== void 0) {
              this.bindValue(values, original, this.fieldLogPolicy(schema, "version"));
              predicates.push(
                `${versionColumn} = ${this.driver.placeholder(values.length)}`
              );
            }
            const sql = `UPDATE ${table} SET ${assignments.join(", ")} WHERE ${predicates.join(" AND ")}`;
            const intent = mutationLogIntent(request, mutation, this.driver.databaseKind, "update", String(mutation.id), diagnosticBindings);
            const result2 = await this.executeLoggedSQL("update", sql, values, intent, () => session.query(sql, values), void 0, statements);
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
              values,
              statements
            );
            return {
              success: true,
              id: String(mutation.id),
              version: entityVersion(persistedRecord.version),
              persistedRecord
            };
          }
          if (mutation.action === "Delete" || mutation.action === "Recover") {
            const versionColumn = this.driver.identifier("version");
            const values = [String(mutation.id)];
            this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, "id")]);
            const predicates = [
              `${this.driver.identifier("id")} = ${this.driver.placeholder(1)}`
            ];
            const original = this.checkedMutationVersion(mutation), recovering = mutation.action === "Recover";
            predicates.push(`${versionColumn} ${recovering ? "<" : ">"} 0`);
            if (original !== void 0) {
              this.bindValue(values, original, this.fieldLogPolicy(schema, "version"));
              predicates.push(
                `${this.driver.identifier("version")} = ` + this.driver.placeholder(values.length)
              );
            }
            const sql = `UPDATE ${table} SET ${versionColumn} = -${versionColumn} ${recovering ? "+" : "-"} 1 WHERE ${predicates.join(" AND ")}`;
            const operation = recovering ? "update" : "delete";
            const intent = mutationLogIntent(request, mutation, this.driver.databaseKind, operation, String(mutation.id), diagnosticBindings);
            const result2 = await this.executeLoggedSQL(operation, sql, values, intent, () => session.query(sql, values), void 0, statements);
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
              values,
              statements
            );
            return {
              success: true,
              id: String(mutation.id),
              version: entityVersion(persistedRecord.version),
              deleted: !recovering,
              persistedRecord
            };
          }
          throw new Error(`Unsupported mutation action: ${mutation.action}`);
        }));
        request.graphSession?.recordPreparedResult(request, result);
        const auditProjection = request.auditProjection({ entity: String(mutation.entity), id: result.id }, mutation.payload, diagnosticBindings);
        const event = Object.freeze({
          entity: mutation.entity,
          action: mutation.action,
          id: String(result.id),
          ...auditProjection,
          recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
          actor: this.userContext.getResource("bootstrapActor"),
          category: this.userContext.getResource("bootstrapCategory"),
          changedFields: Object.freeze(Object.keys(mutation.payload || {}).sort()),
          version: result.version,
          mutationGovernance
        });
        const publish = async () => {
          this.auditEvents.push(event);
          if (this.auditSink) await observeRuntimeOperation(this.runtimeTelemetry, {
            family: "audit",
            name: `${mutation.entity}.audit`,
            attributes: {
              "teaql.entity.type": String(mutation.entity),
              "teaql.mutation.kind": String(mutation.action).toLowerCase(),
              "teaql.audit.changed_field_count": Object.keys(mutation.payload || {}).length
            }
          }, async () => this.auditSink(event));
        };
        if (request.graphSession) this.graphAuditActions.push(publish);
        else {
          try {
            await publish();
          } catch (error) {
            throw new GraphCommittedError(error);
          }
        }
        scope.success();
        const metadata = Object.freeze({ ...statements[0], statements: Object.freeze([...statements]) });
        retainSQLLogProvenance(metadata, inheritSQLLogBindings(diagnosticBindings, request.graphSession?.logBindings), [result.id]);
        return { ...result, metadata };
      } catch (error) {
        scope.failure(error);
        throw error;
      }
    };
    return scope.run ? scope.run(work) : work();
  }
  async readPersistedRecord(session, schema, id, intent, writeSQL, writeValues, statements) {
    const projection = Object.entries(schema.columns).map(([field, column]) => this.fieldProjection(field, column)).join(", ");
    const sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)} WHERE ${this.driver.identifier("id")} = ${this.driver.placeholder(1)}`;
    const values = [id];
    this.bindLogPolicies.set(values, [this.fieldLogPolicy(schema, "id")]);
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "provider",
      name: `${this.driver.databaseKind}.readback`,
      attributes: {
        "teaql.provider.execution": "statement",
        "teaql.provider.kind": this.driver.databaseKind,
        "teaql.provider.operation": "query"
      }
    });
    const startedAt = Date.now();
    let result;
    const inherited = {
      parameterizedSQL: writeSQL,
      parameters: writeValues,
      parameterLogPolicies: this.bindLogPolicies.get(writeValues),
      sqlOrigin: "generated"
    };
    const root = intent.tracePath?.find((node) => node.kind === "operation")?.name ?? "unknown";
    const path = canonicalSQLTracePath([
      ...queryTraceSource(root, intent.auditReason, "verify persisted mutation result"),
      ...(intent.tracePath ?? []).filter((node) => node.kind === "relation")
    ], this.driver.databaseKind, "select");
    const readIntent = {
      ...intent,
      tracePath: sqlTraceFrames(path.tracePath),
      comment: intent.auditReason,
      purpose: "verify persisted mutation result"
    };
    const recordReadback = (outcome) => statements.push(
      this.recordSQL("select", sql, values, startedAt, result?.rowCount, void 0, readIntent, outcome, inherited, scope.correlation?.())
    );
    let record;
    try {
      result = await (scope.run ? scope.run(() => session.query(sql, values)) : session.query(sql, values));
      scope.success({ attributes: { "teaql.result.cardinality": result.rowCount } });
      if (result.rowCount !== 1) throw new Error(`Persisted ${schema.table}(${id}) could not be read back`);
      record = this.decodeRowForSchema(schema, result.rows[0]);
    } catch (error) {
      if (!result) scope.failure(error);
      const outcome = result ? "success" : error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError") ? "cancelled" : "failure";
      try {
        recordReadback(outcome);
      } finally {
        throw error;
      }
    }
    recordReadback("success");
    return record;
  }
  decodeRowForSchema(schema, row) {
    const result = { ...row };
    const entityType = Object.keys(this.schemas).find((name) => this.schemas[name] === schema) ?? "Unknown";
    const width = new ModeledInteger32Layout(entityType, schema);
    for (const [field, column] of Object.entries(schema.columns)) {
      const value = result[field];
      if (value === null || value === void 0) continue;
      if (field === "version") {
        result[field] = entityVersion(value);
        continue;
      }
      if (column.decode === "number") result[field] = Number(width.read(field, value));
      this.requireFiniteFloatingPoint(result[field], column);
      if (column.decode === "string") result[field] = String(value);
      if (column.decode === "decimal") {
        if (typeof value !== "string") throw new TypeError(`Inexact Decimal readback for ${field}`);
        result[field] = decimal(value);
      }
      if (column.decode === "long") {
        if (typeof value !== "string" && typeof value !== "bigint") {
          throw new TypeError(`Inexact Long readback for ${field}`);
        }
        result[field] = long(value);
      }
      if (column.decode === "time") result[field] = localTime(value);
      if (column.decode === "date") {
        if (value instanceof Date) result[field] = column.logicalType === "date" ? value.toISOString().slice(0, 10) : value.toISOString();
        else if (column.logicalType === "datetime" && typeof value === "number") {
          result[field] = new Date(value).toISOString();
        }
      }
      if (column.logicalType === "boolean") result[field] = Boolean(value);
    }
    return result;
  }
  comparisonSql(column, columnSql, operator, operandSql) {
    if (column.logicalType !== "decimal" && column.logicalType !== "long") {
      return `${columnSql} ${operator} ${operandSql}`;
    }
    if (column.logicalType === "decimal" && column.decode !== "decimal") {
      return `${columnSql} ${operator} ${operandSql}`;
    }
    const exactComparison = column.logicalType === "long" ? this.driver.longComparison : this.driver.decimalComparison;
    if (exactComparison) return exactComparison.call(this.driver, columnSql, operator, operandSql);
    if (this.driver.databaseKind === "sqlite") {
      throw new Error(`EXACT_${column.logicalType.toUpperCase()}_UNSUPPORTED: this SQLite provider has no exact comparison`);
    }
    return `${columnSql} ${operator} ${operandSql}`;
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
          return this.comparisonSql(column, quotedField, "=", this.driver.placeholder(values.length));
        }
        if (predicate?.$ne !== void 0) {
          const value = predicate.$ne?.id ?? predicate.$ne;
          if (value === null) return `${quotedField} IS NOT NULL`;
          this.bindValue(values, this.encode(value, column), logPolicy);
          return this.comparisonSql(column, quotedField, "<>", this.driver.placeholder(values.length));
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
            const operand = String(predicate[operator]);
            this.bindValue(values, `${prefix}${operand}${suffix}`, logPolicy, operand);
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
          if (column.logicalType === "decimal" || column.logicalType === "long") return `(${placeholders.map((value) => this.comparisonSql(column, quotedField, "=", value)).join(" OR ")})`;
          return `${quotedField} IN (${placeholders.join(", ")})`;
        }
        if (Array.isArray(predicate?.$notIn)) {
          if (!predicate.$notIn.length) return "TRUE";
          const placeholders = predicate.$notIn.map((value) => {
            this.bindValue(values, this.encode(value?.id ?? value, column), logPolicy);
            return this.driver.placeholder(values.length);
          });
          if (column.logicalType === "decimal" || column.logicalType === "long") return `(${placeholders.map((value) => this.comparisonSql(column, quotedField, "<>", value)).join(" AND ")})`;
          return `${quotedField} NOT IN (${placeholders.join(", ")})`;
        }
        for (const [operator, negative] of [
          ["$inSubquery", false],
          ["$notInSubquery", true]
        ]) {
          const subquery = predicate?.[operator];
          if (subquery !== void 0) {
            if ((column.logicalType === "decimal" && column.decode === "decimal" || column.logicalType === "long") && this.driver.databaseKind === "sqlite") {
              throw new Error(`EXACT_${column.logicalType.toUpperCase()}_UNSUPPORTED: subquery membership needs an exact join`);
            }
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
          if (column.logicalType === "decimal" || column.logicalType === "long") return `(${this.comparisonSql(column, quotedField, ">=", lower)} AND ${this.comparisonSql(column, quotedField, "<=", upper)})`;
          return `${quotedField} BETWEEN ${lower} AND ${upper}`;
        }
        if (predicate?.$isNull === true) return `${quotedField} IS NULL`;
        if (predicate?.$isNull === false) return `${quotedField} IS NOT NULL`;
        if (predicate?.$gte !== void 0) {
          this.bindValue(values, this.encode(predicate.$gte, column), logPolicy);
          return this.comparisonSql(column, quotedField, ">=", this.driver.placeholder(values.length));
        }
        if (predicate?.$lte !== void 0) {
          this.bindValue(values, this.encode(predicate.$lte, column), logPolicy);
          return this.comparisonSql(column, quotedField, "<=", this.driver.placeholder(values.length));
        }
        if (predicate?.$gt !== void 0) {
          this.bindValue(values, this.encode(predicate.$gt, column), logPolicy);
          return this.comparisonSql(column, quotedField, ">", this.driver.placeholder(values.length));
        }
        if (predicate?.$lt !== void 0) {
          this.bindValue(values, this.encode(predicate.$lt, column), logPolicy);
          return this.comparisonSql(column, quotedField, "<", this.driver.placeholder(values.length));
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
  async compileQuery(query, recordTrace = true, assemblyFields = []) {
    new QueryIntent(query?.commentText ?? query?._comment, query?.purposeText ?? query?._purpose);
    const schema = this.schema(query.entity);
    const values = [];
    const groupProperties = [...new Set(this.groupBy(query))];
    const aggregates = this.aggregates(query);
    const aliases = query.groupByAliases;
    if (aliases !== void 0) {
      if (aliases === null || typeof aliases !== "object" || Array.isArray(aliases)) throw new Error("Invalid group aliases");
      for (const [field, alias] of Object.entries(aliases)) {
        if (!groupProperties.includes(field)) throw new Error("Group alias refers to an ungrouped field");
        if (typeof alias !== "string" || !alias.trim()) throw new Error("Group alias must be a non-empty string");
      }
    }
    const groupAliases = aggregates.length || groupProperties.length ? Object.fromEntries(groupProperties.map((field) => [
      field,
      aliases && Object.prototype.hasOwnProperty.call(aliases, field) ? aliases[field] : field
    ])) : void 0;
    const outputNames = [...Object.values(groupAliases ?? {}), ...aggregates.map((item) => item.retName)];
    const outputs = /* @__PURE__ */ new Set();
    for (const name of outputNames) {
      this.driver.identifier(name);
      if (outputs.has(name)) throw new Error("Duplicate grouped or aggregate output alias");
      outputs.add(name);
    }
    const groupFields = groupProperties.map((field) => {
      if (!schema.columns[field]) throw new Error(`Unknown group field: ${field}`);
      const column = schema.columns[field];
      const sql2 = this.driver.identifier(column.columnName);
      if (column.logicalType === "decimal" && column.decode !== "decimal") return sql2;
      if ((column.logicalType === "decimal" || column.logicalType === "long") && this.driver.databaseKind === "sqlite") {
        const exactOrder = column.logicalType === "long" ? this.driver.longOrderExpression : this.driver.decimalOrderExpression;
        if (exactOrder) return exactOrder.call(this.driver, sql2);
        throw new Error(`EXACT_${column.logicalType.toUpperCase()}_UNSUPPORTED: grouping`);
      }
      return sql2;
    });
    const groupProjection = groupProperties.map(
      (field) => `${this.driver.identifier(schema.columns[field].columnName)} AS ` + this.driver.identifier(groupAliases[field])
    );
    const aggregateNames = [];
    const requestedFields = Array.isArray(query.selectItems) && query.selectItems.length ? [.../* @__PURE__ */ new Set(["id", "version", ...query.selectItems])] : Object.keys(schema.columns);
    if (!groupProperties.length && !this.aggregates(query).length) {
      for (const field of assemblyFields) if (!requestedFields.includes(field)) requestedFields.push(field);
      const relationNames = [
        ...(query.relations ?? []).map((load) => load.name),
        ...(query.relationAggregates ?? []).map((aggregate) => aggregate.relationName)
      ];
      for (const name of relationNames) {
        const relation = schema.relations?.[name];
        if (!relation) throw new Error(`Missing relation ${query.entity}.${name}`);
        if (!requestedFields.includes(relation.localKey)) requestedFields.push(relation.localKey);
      }
    }
    for (const field of requestedFields) {
      if (!schema.columns[field]) throw new Error(`Unknown selected field: ${field}`);
    }
    let projection = requestedFields.map((field) => {
      const column = schema.columns[field];
      return this.fieldProjection(field, column);
    }).join(", ");
    if (aggregates.length || groupProperties.length) {
      const aggregateProjection = aggregates.map((aggregate) => {
        if (!schema.columns[aggregate.field]) {
          throw new Error(`Unknown aggregate field: ${aggregate.field}`);
        }
        const column = schema.columns[aggregate.field];
        if (column.logicalType === "long" && String(aggregate.func).toLowerCase() !== "count") {
          throw new Error("EXACT_LONG_AGGREGATION_UNSUPPORTED: define overflow and result type first");
        }
        const isExactDecimal = column.logicalType === "decimal" && column.decode === "decimal" && String(aggregate.func).toLowerCase() !== "count";
        aggregateNames.push({ name: aggregate.retName, exactDecimal: isExactDecimal });
        const functionName = isExactDecimal && this.driver.databaseKind === "sqlite" ? this.driver.decimalAggregateFunction?.(aggregate.func) : this.driver.aggregateFunction(aggregate.func);
        if (!functionName) throw new Error("EXACT_DECIMAL_UNSUPPORTED: decimal aggregation");
        return `${functionName}(${this.driver.identifier(schema.columns[aggregate.field].columnName)}) AS ` + this.driver.identifier(aggregate.retName);
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
      const column = schema.columns[order.field];
      let sql2 = this.driver.identifier(column.columnName);
      if (column.logicalType === "decimal" && column.decode !== "decimal") return `${sql2} ${direction}`;
      if ((column.logicalType === "decimal" || column.logicalType === "long") && this.driver.databaseKind === "sqlite") {
        const exactOrder = column.logicalType === "long" ? this.driver.longOrderExpression : this.driver.decimalOrderExpression;
        if (exactOrder) sql2 = exactOrder.call(this.driver, sql2);
        else throw new Error(`EXACT_${column.logicalType.toUpperCase()}_UNSUPPORTED: ordering`);
      }
      return `${sql2} ${direction}`;
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
    const visibility = query.deletionVisibility ?? "live";
    if (!["live", "all", "deleted"].includes(visibility)) throw new Error("QUERY_INVALID_DELETION_VISIBILITY");
    if (schema.columns.version && visibility !== "all") {
      predicates.push(
        `${this.driver.identifier(schema.columns.version.columnName)} ${visibility === "deleted" ? "<" : ">"} 0`
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
    if (recordTrace) this.sqlTrace.push(sql);
    return { sql, values, aggregateNames, groupAliases };
  }
  async executeQuery(query) {
    const request = query instanceof QueryRequest ? query : new QueryRequest(query);
    if (!(query instanceof QueryRequest) && query?.[this.internalQueryToken] !== true && typeof query?.prepareForList === "function") query.prepareForList();
    return this.executeQueryWithIntent(
      request.query,
      this.derivedQueryBindings.get(query),
      this.derivedRelationAssembly.get(query)
    );
  }
  async executeDerivedQuery(query, inherited, intent, assembly) {
    const captured = new QueryRequest(query, intent).query;
    if (inherited) this.derivedQueryBindings.set(captured, inherited);
    if (assembly) this.derivedRelationAssembly.set(captured, assembly);
    try {
      return await this.executeQuery(captured);
    } finally {
      this.derivedQueryBindings.delete(captured);
      this.derivedRelationAssembly.delete(captured);
    }
  }
  descendantBindings(query, sql, values, inherited) {
    if (!query.relations?.length && !query.relationAggregates?.length) return void 0;
    return inheritSQLLogBindings(this.queryLogBindings(sql, values), inherited);
  }
  async queryTreeBindings(query, sql, values, inherited) {
    let source = inheritSQLLogBindings(this.queryLogBindings(sql, values), inherited);
    const intent = new QueryRequest(query).intent;
    const stack = [query];
    const visited = /* @__PURE__ */ new Set();
    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      if (current !== query) {
        const compiled = await this.compileQuery(new QueryRequest(current, intent).query, false);
        source = inheritSQLLogBindings(this.queryLogBindings(compiled.sql, compiled.values), source);
      }
      const origin = queryDiagnosticOrigin(current);
      if (origin) stack.push(origin);
      for (const child of [...current.relations ?? [], ...current.relationAggregates ?? []]) {
        if (child.query) stack.push(child.query);
      }
      for (const facet of current.facets ?? []) {
        if (!facet.query) continue;
        const facetValueQuery = facet.query.clone();
        facetValueQuery.aggregateItems = [];
        facetValueQuery.groupByItems = [];
        facetValueQuery.groupByAliases = void 0;
        stack.push(facetValueQuery);
      }
    }
    return source;
  }
  async executeQueryWithIntent(query, inherited, assembly) {
    await this.telemetryStartup;
    const scope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "query",
      name: `${String(query?.entity || "unknown")}.list`,
      attributes: { "teaql.entity.type": String(query?.entity || "unknown") }
    });
    const work = async () => {
      try {
        const internal = query?.[this.internalQueryToken] === true;
        if (!internal) {
          if (typeof query?.prepareForList !== "function") {
            throw new Error("TeaQL list execution requires the formal runtime SelectQuery");
          }
          query.prepareForList();
        }
        const idSetPrepared = internal ? { query, execution: void 0 } : await this.prepareIdSetPage(query, inherited);
        const prepared = internal ? idSetPrepared : await this.prepareContinuousPage(idSetPrepared.query);
        query = new QueryRequest(query).withQuery(prepared.query).query;
        const { sql, values, aggregateNames, groupAliases } = await this.compileQuery(query, true, assembly ? [assembly.field] : []);
        inherited = await this.queryTreeBindings(query, sql, values, inherited);
        const result = await this.executeLoggedSQL(
          "select",
          sql,
          values,
          this.queryLogIntent(query),
          () => this.driver.query(sql, values),
          inherited
        );
        const rows = result.rows.map(
          (row) => this.decodeRow(query.entity, row, aggregateNames, groupAliases)
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
        if (assembly) for (const row of rows) assembly.keys.set(row, row[assembly.field]);
        await this.enhanceQueryRows(rows, query, descendantBindings);
        if (assembly && Array.isArray(query.selectItems) && query.selectItems.length && !["id", "version", ...query.selectItems, ...this.groupBy(query)].includes(assembly.field)) {
          const schema = this.schema(query.entity);
          const selectedRelations = [
            ...(query.relations ?? []).map((load) => load.name),
            ...(query.relationAggregates ?? []).map((aggregate) => aggregate.relationName)
          ];
          if (!selectedRelations.some((name) => schema.relations?.[name]?.localKey === assembly.field))
            for (const row of rows) delete row[assembly.field];
        }
        if (!internal) await this.registerContinuousPage(query, prepared.execution, rows);
        scope.success({ attributes: { "teaql.result.cardinality": rows.length } });
        return rows;
      } catch (error) {
        scope.failure(error);
        throw error;
      }
    };
    return scope.run ? scope.run(work) : work();
  }
  async prepareIdSetPage(query, inherited) {
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
          const helper = new QueryRequest(query).deriveHelper(idQuery, `collect ${query.entity} IDs for pagination`);
          const diagnostic = await this.compileQuery(query, false);
          const helperBindings = await this.queryTreeBindings(query, diagnostic.sql, diagnostic.values, inherited);
          const idRows = await this.executeDerivedQuery(
            helper.query,
            helperBindings,
            helper.intent
          );
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
  async executeFacetMembership(outerQuery, relationName, countAliases = []) {
    const aggregates = await this.executeFacetAggregates(outerQuery, relationName, [{
      function: "Count",
      field: "id",
      alias: "__teaql_facet_count"
    }]);
    return new Map([...aggregates].map(([key, values]) => [
      key,
      Number(values.__teaql_facet_count ?? 0)
    ]));
  }
  async executeFacetAggregates(outerQuery, relationName, aggregates) {
    const request = new QueryRequest(outerQuery);
    outerQuery = request.query;
    const query = request.withQuery(outerQuery.clone()).query;
    retainQueryDiagnosticOrigin(outerQuery, query);
    query.facets = [];
    query.relations = [];
    query.relationAggregates = [];
    query.orderItems = [];
    query.offsetValue = 0;
    query.limitValue = 0;
    query.selectItems = [];
    query.groupByItems = [relationName];
    query.groupByAliases = void 0;
    query.aggregateItems = aggregates.map((aggregate) => ({ ...aggregate }));
    query[this.internalQueryToken] = true;
    const rows = await this.executeQuery(query);
    return new Map(rows.flatMap((row) => {
      const value = row[relationName];
      if (value === null || value === void 0) return [];
      const result = {};
      for (const aggregate of aggregates) result[aggregate.alias] = row[aggregate.alias];
      return [[String(value), result]];
    }));
  }
  async executeCount(query, countAlias, operation) {
    const request = query instanceof QueryRequest ? query : new QueryRequest(query);
    query = request.query;
    if (typeof query?.forExactCount !== "function") {
      throw new Error("TeaQL exact count requires the formal runtime SelectQuery");
    }
    const alias = countAlias ?? "__teaql_total";
    const countRequest = request.deriveOperation(query.forExactCount(alias), operation ?? {
      kind: "named-count",
      ...countAlias !== void 0 ? { alias: countAlias } : {}
    });
    const rows = await this.executeQuery(countRequest.query);
    const value = rows[0]?.[alias];
    if (rows.length !== 1 || typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
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
  executeForStream(query, chunkSize = 1e3) {
    try {
      const request = query instanceof QueryRequest ? new QueryRequest(query.query, query.intent) : new QueryRequest(query);
      return this.executeCapturedStream(request.query, chunkSize);
    } catch (error) {
      return (async function* () {
        throw error;
      })();
    }
  }
  async *executeCapturedStream(query, chunkSize) {
    await this.telemetryStartup;
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error("stream chunk size must be a positive integer");
    }
    if (Array.isArray(query.facets) && query.facets.length > 0) {
      throw new Error("QRY-F01_STREAM_UNSUPPORTED: execute facets with executeForList");
    }
    const { sql, values, aggregateNames, groupAliases } = await this.compileQuery(query);
    const inherited = await this.queryTreeBindings(query, sql, values);
    const queryScope = startRuntimeOperation(this.runtimeTelemetry, {
      family: "query",
      name: `${String(query.entity)}.stream`,
      attributes: { "teaql.entity.type": String(query.entity) }
    });
    let providerScope;
    const startProvider = async () => {
      providerScope = startRuntimeOperation(this.runtimeTelemetry, {
        family: "provider",
        name: `${this.driver.databaseKind}.stream`,
        attributes: {
          "teaql.provider.execution": "statement",
          "teaql.provider.kind": this.driver.databaseKind,
          "teaql.provider.operation": "query"
        }
      });
    };
    await (queryScope.run ? queryScope.run(startProvider) : startProvider());
    const correlation = providerScope.correlation?.();
    const iterator = this.driver.stream(sql, values)[Symbol.asyncIterator]();
    const startedAt = Date.now();
    let outcome = "cancelled";
    let delivered = 0;
    let chunk = [];
    const descendantBindings = this.descendantBindings(query, sql, values, inherited);
    try {
      while (true) {
        const next = await (providerScope.run ? providerScope.run(() => iterator.next()) : iterator.next());
        if (next.done) break;
        chunk.push(this.decodeRow(query.entity, next.value, aggregateNames, groupAliases));
        if (chunk.length === chunkSize) {
          await this.enhanceQueryRows(chunk, query, descendantBindings);
          delivered += chunk.length;
          yield chunk;
          chunk = [];
        }
      }
      if (chunk.length) {
        await this.enhanceQueryRows(chunk, query, descendantBindings);
        delivered += chunk.length;
        yield chunk;
      }
      outcome = "success";
    } catch (error) {
      outcome = "failure";
      providerScope.failure(error);
      queryScope.failure(error);
      throw error;
    } finally {
      try {
        await iterator.return?.();
      } catch (error) {
        if (outcome !== "failure") {
          outcome = "failure";
          providerScope.failure(error);
          queryScope.failure(error);
          throw error;
        }
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
              this.queryLogIntent(query),
              outcome,
              inherited,
              correlation
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
            this.queryLogIntent(query),
            outcome,
            inherited,
            correlation
          );
          providerScope.success({ attributes: { "teaql.result.cardinality": delivered } });
          queryScope.success({ attributes: { "teaql.result.cardinality": delivered } });
        }
      }
    }
  }
  async enhanceQueryRows(rows, query, inherited) {
    if (!rows.length) return;
    const names = [
      ...(query.relations ?? []).map((load) => load.name),
      ...(query.relationAggregates ?? []).map((aggregate) => aggregate.relationName)
    ];
    if (!names.length) return;
    const schema = this.schema(query.entity);
    const keys = /* @__PURE__ */ new Map();
    for (const name of names) {
      const relation = schema.relations?.[name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${name}`);
      if (!keys.has(relation.localKey)) keys.set(relation.localKey, rows.map((row) => row[relation.localKey]));
    }
    await this.enhanceRelationAggregates(rows, query, keys, inherited);
    await this.enhanceRelations(rows, query, keys, inherited);
  }
  async enhanceRelations(parents, query, keys, inherited) {
    if (!parents.length || !Array.isArray(query.relations) || !query.relations.length) return;
    const parentSchema = this.schema(query.entity);
    const intent = new QueryRequest(query).intent;
    for (const load of query.relations) {
      const relation = parentSchema.relations?.[load.name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${load.name}`);
      const parentKeys = keys.get(relation.localKey);
      const parentIds = parentKeys.filter((value) => value !== void 0 && value !== null);
      const limit = load.query ? this.queryLimit(load.query) : void 0;
      const threshold = load.query?.localTopNProbeParentThreshold?.();
      const boundedTopN = relation.many && limit !== void 0;
      const requestedChildFields = Array.isArray(load.query?.selectItems) ? load.query.selectItems : [];
      const implicitRelationKey = requestedChildFields.length > 0 && !requestedChildFields.includes(relation.foreignKey);
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
        if (!parentIds.length && !(relation.many && load.query?.facets?.length)) {
          for (const parent of parents) parent[load.name] = relation.many ? [] : null;
          relationScope.success({ attributes: { "teaql.result.cardinality": 0 } });
          continue;
        }
        const childQuery = {
          ...load.query || {},
          entity: relation.targetEntity,
          // Relation assembly keys belong to the runtime protocol. Callers should
          // not have to expose selectId()/selectOrderId() in their domain query.
          selectItems: implicitRelationKey ? [...requestedChildFields, relation.foreignKey] : requestedChildFields,
          _filters: [...this.filters(load.query || {})],
          relations: [...load.query?.relations || []],
          orderItems: [...load.query?.orderItems || []],
          __teaqlPartitionBy: boundedTopN && !useProbes ? relation.foreignKey : void 0
        };
        if (boundedTopN) {
          const groups = this.groupBy(childQuery);
          const stableFields = groups.length || this.aggregates(childQuery).length ? groups : ["id"];
          for (const field of stableFields) {
            if (!childQuery.orderItems.some((order) => order.field === field)) {
              childQuery.orderItems.push(OrderBy.asc(field));
            }
          }
        }
        if (typeof childQuery.clearContinuousPageRuntime === "function") childQuery.clearContinuousPageRuntime();
        childQuery[this.internalQueryToken] = true;
        const children = [];
        const assembly = { field: relation.foreignKey, keys: /* @__PURE__ */ new WeakMap() };
        if (useProbes) {
          for (const parentId of parentIds) {
            const probeQuery = {
              ...childQuery,
              _filters: [...childQuery._filters, { [relation.foreignKey]: { $eq: parentId } }],
              __teaqlPartitionBy: void 0
            };
            children.push(...await this.executeDerivedQuery(
              new QueryRequest(query).derive(probeQuery, load.name, load.operation).query,
              inherited,
              intent,
              assembly
            ));
          }
        } else {
          childQuery._filters.push({ [relation.foreignKey]: { $in: parentIds } });
          children.push(...await this.executeDerivedQuery(
            new QueryRequest(query).derive(childQuery, load.name, load.operation).query,
            inherited,
            intent,
            assembly
          ));
        }
        for (const child of children) delete child.__teaql_partition_rank;
        const buckets = /* @__PURE__ */ new Map();
        for (const child of children) {
          if (!assembly.keys.has(child)) throw new Error("Relation assembly lost its captured row identity");
          const key = assembly.keys.get(child);
          const bucket = buckets.get(key) || [];
          bucket.push(child);
          buckets.set(key, bucket);
        }
        if (implicitRelationKey) {
          for (const child of children) delete child[relation.foreignKey];
        }
        for (const [index, parent] of parents.entries()) {
          const related = buckets.get(parentKeys[index]) || [];
          if (relation.many && load.query?.facets?.length) {
            const facetQuery = load.query.clone();
            facetQuery.entity = relation.targetEntity;
            const key = parentKeys[index];
            const membership = { [relation.foreignKey]: key === null || key === void 0 ? { $in: [] } : { $eq: key } };
            facetQuery.filterCondition = facetQuery.filterCondition ? { $and: [facetQuery.filterCondition, membership] } : membership;
            retainQueryDiagnosticOrigin(query, facetQuery);
            const derived = new QueryRequest(query).derive(facetQuery, load.name, load.operation).query;
            parent[load.name] = new SmartList(related, { facets: await executeRelationFacets(this, (item) => item, derived, facetQuery.facets) });
          } else {
            const key = parentKeys[index];
            parent[load.name] = relation.many ? related : related[0] ?? (key === null || key === void 0 ? null : { [relation.foreignKey]: key });
          }
        }
        relationScope.success({ attributes: { "teaql.result.cardinality": children.length } });
      } catch (error) {
        relationScope.failure(error);
        throw error;
      }
    }
  }
  async enhanceRelationAggregates(parents, query, keys, inherited) {
    const aggregates = query.relationAggregates;
    if (!parents.length || !Array.isArray(aggregates) || !aggregates.length) return;
    const parentSchema = this.schema(query.entity);
    const intent = new QueryRequest(query).intent;
    for (const aggregate of aggregates) {
      const relation = parentSchema.relations?.[aggregate.relationName];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${aggregate.relationName}`);
      const parentKeys = keys.get(relation.localKey);
      const parentIds = parentKeys.filter((value) => value !== void 0 && value !== null);
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
      const membership = { [relation.foreignKey]: { $in: parentIds } };
      childQuery.filterCondition = childQuery.filterCondition ? { $and: [childQuery.filterCondition, membership] } : membership;
      childQuery[this.internalQueryToken] = true;
      const rows = await this.executeDerivedQuery(
        new QueryRequest(query).deriveAggregate(childQuery, aggregate.relationName, aggregate.operation ?? {
          kind: "relation-count",
          relation: aggregate.relationName,
          alias: aggregate.alias
        }).query,
        inherited,
        intent
      );
      const buckets = /* @__PURE__ */ new Map();
      for (const row of rows) buckets.set(row[relation.foreignKey], row);
      for (const [index, parent] of parents.entries()) {
        const row = buckets.get(parentKeys[index]);
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
    try {
      await this.driver.close();
    } finally {
      await this.telemetryStartup;
      await this.standardTelemetryHandle?.release();
      this.standardTelemetryHandle = void 0;
    }
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
  canonicalRelationIndexes,
  ensureOptimisticIdFloor,
  TextDiagnosticSQLLogSink,
  SQLExecutionEvidenceStore,
  AbstractSQLTeaQLClient,
  assertSafeIdentifier,
  standardAggregateFunction
};
//# sourceMappingURL=chunk-ZLU3HZMD.js.map
