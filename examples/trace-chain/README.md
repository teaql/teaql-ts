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
npm run test:relation-aggregate
npm run test:relation-aggregate
npm run test:checker-overlap
npm run test:checker-overlap
```

Both starts use `.local/trace-chain.sqlite` without resetting or deleting it.
Each run uses distinct business values and ensures schema/bootstrap twice.
Set `TEAQL_TRACE_CHAIN_DB` to select another dedicated SQLite file.
The ownership suite uses a separate `.local/shared-reference.sqlite`; set
`TEAQL_TRACE_CHAIN_SHARED_DB` to override it. Do not mix these databases: the
normative fixture intentionally compares per-type IDs, whereas the ownership
suite creates a different number of records per type. Neither suite deletes its
database between runs.

The normative fixture explicitly reserves unused IDs and raises CustomerOrder
and Payment sequence floors through the runtime allocator before each run.
This creates a repeatable same-numeric-ID case even when historical counters
differ; it never rewrites business rows or guesses a generated ID setter.
Only this test setup creates intentional sequence gaps. Business records are
still created/updated/deleted through generated APIs.

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

Native SQLite regression `tests/trace-chain-sql.test.ts` additionally checks
relation aggregates in full/tail stream chunks, early cancellation and SQL
failure. Lists and streams compute aggregates before forward-relation hydration
can replace scalar membership keys with objects. This covers loading and counting
the same relation, nested aggregate ancestry and inherited private intent.
The generated relation-aggregate suite uses `.local/relation-aggregate.sqlite`
(override with `TEAQL_TRACE_CHAIN_AGGREGATE_DB`). It combines generated related
counts with loaded child lists, at the root and inside a loaded forward relation.
Twelve combinations cover lists, full/trailing stream chunks and SQL logging
on/off. Generated E verifies modeled identity and child membership; dynamic count
aliases are narrowed from unknown as documented by field Assist. The suite also
saves an aggregate-loaded graph, checks the count is not mutation data, and
verifies aggregate failure prevents incomplete stream delivery. No generated
library source is edited or inspected; each execution fingerprints it.

Run `bash scripts/verify-current-aggregate.sh` from the runtime checkout for the
deeper aggregate-membership gate. It rebuilds local runtime output, compiles the
application, runs numeric-partition and scalar-membership native tests twice,
then runs 24 generated combinations twice on the same dedicated SQLite database
without cleanup. Set `TEAQL_TS_AGGREGATE_EVIDENCE` to retain logs at a chosen path.
Generated Q related counts, loaded child lists and explicitly filtered/unfiltered
forward targets combine root/nested owners, list/full/tail streams and logging
off/on. Count remains 1 while membership remains 2; filtered targets retain their
actual FK identity but not loaded details. Independent full reads cannot widen
those old views. The runtime-generated safe path is checked against each actual
driver statement; streams report root completion after the child statements.
Raw driver SQL/bindings are test evidence, not an invented raw metadata API.
Telemetry still supplies safe metadata when ordinary SQL logging is disabled;
the diagnostic sink then receives nothing. Query probes produce no mutation
commands or committed audits. The generated library remains unchanged. This
local-source gate is not a private Registry or complete TC-SQL-10 claim.

The seven checks cover:

1. Idempotent generated schema/bootstrap and bounded Q/E access to the root.
2. Six creates with assigned IDs, inherited reasons and independent branches.
3. Six updates/deletion intents followed by one root save, with matching
   per-entity request, SQL and committed-audit lineages.
4. A bounded three-level relation query and loaded E traversal, including the
   normalized ID of a preloaded relation.
5. Two overlapping independent graph saves using the same UserContext.
6. Provider failure and write-success/readback-failure: retained SQL evidence,
   atomic rollback and no committed audit.
7. Loaded private old values, committed refresh, rollback/retry and isolation
   of the next independent request.

Create, update/delete and both concurrent graphs compare exactly six distinct
`(entity type, ID)` pairs at the command, actual physical-write and committed
audit boundaries. Canonical SQL paths do not contain target IDs: each write is
bound to its actual observed command/result in order, with successful outcome,
one affected row, the correct entity frame and matching action. Audit identity
comes from the event's independent `entity` and `id`, not an inherited reason.
The Order and Payment deliberately have equal numeric IDs. Guard controls reject
duplicates, a missing identity and collapse across entity types. IDs are checked
as decimal strings without converting them through an imprecise JavaScript
number. `GRAPH IDENTITY EVIDENCE` prints the actual normative update observations.

Each successful generated mutation also returns physical write/readback metadata.
Six graph changes produce twelve ordered SQL facts, while committed audit still
contains six events. Readbacks use the originating root's query/request path,
keep branch-local lineage and have the explicit purpose `verify persisted
mutation result`. The same checks cover creates, updates, soft deletion and
overlapping graph saves; failed graphs retain earlier successful SELECTs without
emitting committed audits. Generated Q/E observations remain ordinary queries,
distinct from mutation readback SQL.

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

The Checker overlap suite uses the real installed generated Checker, not a
simulated failure. Four cases combine SQL logging on/off and both invocation
orders: a valid graph updates its root and child; a second graph omits a new
child's required name. Both share an immutable provider-loaded Platform snapshot
but keep separate generated wrappers and ledgers. The rejected graph rolls back
its transaction before any business SQL, ID allocation, mutation command or
committed audit. It does start a transaction; Checker callbacks are serialized
by the runtime gate. Q/E readback proves only the valid graph changed, and a
following independent save has its own lineage and no residual Fix state.
The read-only Platform receives no write or audit.

Run `bash scripts/verify-checker-overlap.sh` from the runtime checkout for a
bounded build and two consecutive runs against one retained SQLite database.
It never installs packages or cleans data, unsets the plaintext-log opt-in for
the safe subprocesses, and retains logs and generated-file fingerprints. Set
`TEAQL_TRACE_CHAIN_CHECKER_EVIDENCE` and `TEAQL_TRACE_CHAIN_CHECKER_DB` to choose
the evidence directory and database. Direct npm runs default to
`.local/checker-overlap.sqlite` and `.local/checker-overlap-evidence`.

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
