<!-- ephemeral -->

# TeaQL safe SQL execution evidence (TypeScript)

Attach a trusted evidence store to the server-created SQL client and project
only bounded fields before returning diagnostics to an application or Coding
Agent.

```typescript
import type { SQLExecutionMetadata, SQLExecutionOperation } from 'teaql-ts/sql/core';

export type SafeSQLExecutionEvidence = Readonly<{
  operation: SQLExecutionOperation;
  parameterizedSQL: string;
  parameterCount: number;
  elapsedMicros: number;
  resultCount?: number;
  affectedRows?: number;
  resultSummary: string;
  traceChain?: SQLExecutionMetadata['traceChain'];
  tracePath: SQLExecutionMetadata['tracePath'];
}>;

export function safeSQLEvidence(
  entries: readonly SQLExecutionMetadata[],
): readonly SafeSQLExecutionEvidence[] {
  return entries.map(entry => Object.freeze({
    operation: entry.operation,
    parameterizedSQL: entry.parameterizedSQL,
    parameterCount: entry.parameters.length,
    elapsedMicros: entry.elapsedMicros,
    resultCount: entry.resultCount,
    affectedRows: entry.affectedRows,
    resultSummary: entry.resultSummary,
    traceChain: entry.traceChain,
    tracePath: entry.tracePath,
  }));
}
```

Create `SQLExecutionEvidenceStore`, attach it with
`client.setRuntimeTelemetrySink(store)`, and select `enableAll`, `enableSelect`,
`enableMutation`, or `disable`. Mode changes clear earlier entries. Raw
parameters, credentials, connection strings, and interpolated SQL remain inside
the trusted boundary and are intentionally absent above.

Query and mutation logs, including the text diagnostic sink, are enabled by default.
The default sink is `new TextDiagnosticSQLLogSink()` and may be
replaced with `client.setDiagnosticSQLLogSink(...)`. Disable the two operation
families independently with
`client.setQueryLoggingEnabled(false)` and
`client.setMutationLoggingEnabled(false)`; passing `undefined` to
`setDiagnosticSQLLogSink` removes operator output entirely. Each metadata entry
retains structured `comment`, `purpose`, `auditReason`, typed multi-level
`tracePath`, business `traceChain`, parameterized SQL, copy-paste `debugSQL`, elapsed
time, result count, and affected rows. `traceChain` follows the root purpose and
request-parent comments, preserving both the native Q operation and a nested
explicit/default comment. `tracePath` describes the physical provider/SQL route;
do not derive one from the other or reconstruct either from SQL text. Runtime
evidence is policy-projected by default; keep that projection when exposing it.
Explicit debug plaintext is not ordinary telemetry and must not leave the trusted
debugging boundary.


---

## TeaQL seven-language assist contract

Apply the verified Rust semantic ceiling while using only the exact TYPESCRIPT generated and
runtime APIs. Discover APIs through the generated application AGENTS.md and progressive
model-aware Assist. Do not inspect generated domain-library source.

- Do not create plurals by appending `s` or `es`; use the centralized generated plural.
- Human and non-human entities use different generated predicate vocabularies. Preserve
  forms such as “who are active” and “whose email is”; never infer them from English.
- Configure filters, projection, paging, and other query options before `purpose(...)`.
  Comment may appear anywhere in the chain. Purpose enters the executable stage; execution
  requires both values, but comment does not have to immediately precede purpose.
- Every execute/list/stream and every save accepts exactly one context argument:
  `UserContext`. Name that argument `context`, never `runtime`; data services and global
  policy are injected when the context is built. Reserve `runtime` for process-level
  runtime ownership, provider/pool setup, and module assembly.
- Tenant, merchant, identity, permissions, request policy, purpose policy, hard limit,
  and continuous-page cursor policy come only from trusted context, never dynamic JSON or TFP.
- If the required operation is absent after current entity/action and required field
  Assist, stop that path and report MISSING_ASSIST. Do not guess an API or search the
  generated library as a fallback.
- Create each application-owned source file once. After its first compile attempt,
  repair only the smallest block identified by the exact compiler or test diagnostic.
  Preserve unrelated code; do not rewrite the complete file as an error-recovery loop.
- Before a repair that would replace more than 25% of an existing application file,
  stop and report LARGE_REWRITE_REQUEST with the file, exact diagnostic, reason, and
  estimated scope. Initial creation and model-driven regeneration are not repairs.

Capability: `debug`.

- Capture purpose, comment, trace/correlation id, runtime-projected expanded masked
  SQL and its masking mode, duration, row count, provider and the native response.
- Preserve the immutable row audit event and the customizable App Audit Sink as
  separate paths. Redact credentials, tokens, connection strings, and customer data.
- Document only switches and hooks present in the selected runtime source.


## Standard OpenTelemetry module

Use the optional standard module supplied by the selected TeaQL runtime. Match
its version to the runtime dependency selected by the model and workspace;
keep local source or internal Registry overrides during development. Do not
upgrade to an unrelated public release just to enable telemetry. A runtime
without this module reports `module_unavailable`; package installation alone
does not enable export.

On a supported backend, configure these trusted process variables before startup, never
through a query, JSON or TFP payload:

```bash
export TEAQL_TELEMETRY_ENABLED=true
export TEAQL_TELEMETRY_SERVICE_NAME=payment-service
export TEAQL_TELEMETRY_OTLP_ENDPOINT=http://localhost:4318
```

Without enablement, startup reports `disabled` and all three activation variables;
no SDK export resources are created. Enabled startup reports safe effective
settings, full recording and masking. Invalid settings produce a fixed safe
diagnostic, not a claim of successful export. Never print credentials or raw
configuration values.

The module automatically records supported Q, graph mutation and physical SQL
operations as traces, logs and metrics. SQL is expanded with masked parameters;
plaintext debugging never authorizes plaintext telemetry export. Full recording
does not promise lossless delivery when bounded queues or exporters fail.
Do not add per-method spans or replace the customer's global SDK providers.

Keep schema reconciliation explicit. Run the generated ensure-schema and seed
flow through the same configured runtime to observe startup settings and audited,
idempotent seeding. Telemetry setup must not run ensure-schema implicitly.
Flush and shut down the owned pipeline at application shutdown, not per query.
Exporter failures do not change business results; durable business audit remains
an independent path.


### TypeScript Node assembly

The standard module is Node-only. Install the optional `@opentelemetry/*` peer
dependencies declared by the selected `@teaql/teaql` package, preserving their
declared ranges and the exact `@opentelemetry/otlp-transformer` pin. The generated
`teaql-ts` alias points to that package. Node SQL clients lazily assemble
`telemetry/standard-node` from the trusted environment; no application SDK setup
or per-query instrumentation is required.

Do not enable this Node exporter in browser SQLite or Expo. Keep collector
credentials and process variables on the Node backend; this is not a browser
telemetry module.
