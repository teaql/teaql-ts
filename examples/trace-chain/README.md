# Generated TypeScript Trace Chain example

This local-source example exercises request-owned intent, SQL paths and
committed audit lineage through generated Q, E and Mutation APIs. It is not a
released-package or complete-provider conformance claim.

From the runtime checkout:

```bash
npm run build
cd examples/trace-chain
npm install
npm run build
npm start
npm start
```

Both starts use `.local/trace-chain.sqlite` without resetting or deleting it.
Each run uses distinct business values and ensures schema/bootstrap twice.
Set `TEAQL_TRACE_CHAIN_DB` to select another dedicated SQLite file.

The six checks cover:

1. Idempotent generated schema/bootstrap and bounded Q/E access to the root.
2. Six creates with assigned IDs, inherited reasons and independent branches.
3. Six updates/deletion intents followed by one root save, with matching
   per-entity request, SQL and committed-audit lineages.
4. A bounded three-level relation query and loaded E traversal, including the
   normalized ID of a preloaded relation.
5. Two overlapping independent graph saves using the same UserContext.
6. Provider failure and write-success/readback-failure: retained SQL evidence,
   atomic rollback and no committed audit.

The generated model names the logical order `customer_order` to avoid a
reserved word. Payment and CustomerOrder intentionally share numeric IDs,
without sharing ledger identity. A child `auditAs(...)` is a local reason;
missing child reasons inherit rather than duplicate the parent chain.

`lib/` comes from the upstream generator and is not hand-edited. The application
checks every generated file's hash before and after execution and writes its
manifest outside the library. Evaluation, current object/field Assist and the
generated application rules are retained in `evidence/` and `AGENTS.md`.

Upstream generation is tested with the explicit local runtime path:

```bash
mvn -pl generator -am \
  -Dteaql.ts.dir=/path/to/teaql-ts \
  -Dtest=TypeScriptTraceChainExampleGenerationTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Prepared same-type batch lineage, complete privacy/entry-point coverage,
file-backed/Expo graph acceptance and internal Registry replay are separate
remaining gates. The full examples script also includes a task-board
compilation-only group and a School demo that resets data; neither is evidence
for this example's no-cleanup gate.
