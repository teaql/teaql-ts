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

- Capture purpose, comment, trace/correlation id, parameterized SQL summary,
  duration, row count, provider, and the runtime's native response when available.
- Preserve the immutable row audit event and the customizable App Audit Sink as
  separate paths. Redact credentials, tokens, connection strings, and customer data.
- Document only switches and hooks present in the selected runtime source.
