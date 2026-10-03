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
npm run test:shared-reference
npm run test:shared-reference
npm run test:page
npm run test:page
npm run test:stream-capture
npm run test:stream-capture
```

Both starts use `.local/trace-chain.sqlite` without resetting or deleting it.
Each run uses distinct business values and ensures schema/bootstrap twice.
Set `TEAQL_TRACE_CHAIN_DB` to select another dedicated SQLite file.
The ownership suite uses a separate `.local/shared-reference.sqlite`; set
`TEAQL_TRACE_CHAIN_SHARED_DB` to override it. Do not mix these databases: the
normative fixture intentionally compares per-type IDs, whereas the ownership
suite creates a different number of records per type. Neither suite deletes its
database between runs.

The page suite uses `.local/paging.sqlite` (override with
`TEAQL_TRACE_CHAIN_PAGE_DB`). It tests a nonzero-offset page, a page scoped by
an application Context, a list and a chunked stream. Each selected root and its
child form one independently saveable graph. Updating both graphs and saving
only one must leave the other graph's persisted values and versions untouched.
COUNT and page rows share the Context-prepared request. List/stream do not run
COUNT. SQLite executes one root query and two per-parent child probes; pages
add one COUNT. Safe SQL metadata masks a marked child value even when the root
comment/purpose includes it. No diagnostic-source query is executed.

The delayed stream suite uses `.local/stream-capture.sqlite` (override with
`TEAQL_TRACE_CHAIN_STREAM_DB`). Two streams capture their generated predicates,
nested selections, comment/purpose and Context-applied scope before first poll.
The caller then changes its builder and Context before concurrent consumption.
The results and SQL evidence must retain the two original requests. Cancellation
after one row records exactly one delivered row; a never-polled stream emits no
SQL. Native tests additionally preserve an invalid request's captured rejection
even if the caller repairs its builder before polling. Validation failure stays
asynchronous at the low-level streaming API; the generated intent gate remains
synchronous. No cursor opens during capture.

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

The four ownership checks additionally execute:

1. Two overlapping public saves share a genuinely identical, immutable
   provider-loaded Platform record but retain independent generated wrappers
   and ledgers. Different original root versions are used; unchanged children
   and the read-only Platform receive no UPDATE or audit event.
2. Attaching a changed child imports only that reached key. The foreign root
   and unselected child changes remain pending in the original ledger.
3. A clean ancestor contributes its audit reason while only the changed child
   is written; the parent's optimistic version remains unchanged.
4. Composing two loaded versions of the same typed entity rejects before any
   business mutation or committed audit and retains both graphs' pending state.

The application prints actual request, SQL-metadata and committed-audit
observations. Saves overlap at the public boundary; the provider serializes
their transactions. This is not simultaneous SQLite writer or Checker proof.

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
arbitrary mutable reference composition,
file-backed/Expo graph acceptance and internal Registry replay are separate
remaining gates. The full examples script also includes a task-board
compilation-only group and a School demo that resets data; neither is evidence
for this example's no-cleanup gate.

The local runtime's package label remains `0.2.10`; these unreleased source
changes require regenerated models. The old generated post-commit hook cannot
use hydration to overwrite an existing loaded version. The producer now calls
the explicit runtime post-commit version hook instead. This example does not
prove adoption by an immutable Registry package.
