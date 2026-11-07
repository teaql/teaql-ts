# Generated Q/E, Checker and graph-save boundaries

This example uses the repository runtime and a retained, evaluated three-entity
model. Generated implementations are hash-checked, not edited or searched for
API discovery. Use current model-aware Assist and the handwritten application
probes when adding a case.

```sh
npm ci
node examples/fix-e-alignment/verify-local.cjs
```

The verifier records two rounds on the same SQLite files without resetting
them. Test caches and temporary compiler configuration are removed after the
owned test processes exit. Reports, logs and synthetic databases are retained
at the printed evidence path; shared dependency caches are not deleted.

`partial-ancestors-probe.ts` distinguishes NotLoaded from a selected empty
relation and saves a complete modified leaf through two untouched partial
ancestors. An incomplete modified leaf is rejected without losing its intent.

`partial-root-probe.ts` adds the managed-root boundary to that graph. It creates
another real domain root through generated mutation APIs, then changes only the
leaf's product name. Its loaded ownership is absent from the mutation delta,
but must still match the active context. Both wrong-context attempts must fail
without provider queries, transactions, ID allocation, policy lookup/review or
audit delivery. Returning to the original context saves the **same** graph:
only the leaf reaches version 2, both ancestors stay partial at version 1, and
the Business Clock supplies the update time.

All eleven side-effect counters are positively calibrated, including actual
SQLite BEGIN/COMMIT/ROLLBACK calls. A separate read-only database connection
checks persisted values. Diagnostic access to ledger state and driver spies is
test instrumentation, not application API discovery or business SQL writes.

The runtime does not define a tenant policy here: `Tenant` is this model's
declared root type. This save-boundary test does not establish query
authorization, untrusted-hydration authorization, full loading conformance, or
private/public package acceptance.

`unchanged-views-probe.ts` exercises three no-op views: selected null and a
sparse forward edge; a complete owner with another independently pending view;
and an explicitly loaded empty reverse list. Eleven positively calibrated
side-effect counters must remain zero. The same default verifier also injects
two transaction faults, **after a real UPDATE** and immediately before COMMIT.
It checks the uncommitted version, the independently observed rollback, retained
view geometry and optimistic baseline, and a successful retry of the same
object without another query. A genuine commit must advance only the changed
row and use the configured Business Clock. Both rounds retain their SQLite
files; no handwritten business INSERT/UPDATE is used.

This does not claim typed dynamic-property schemas, persistent dynamic fields,
an application-owned outer transaction, all-provider behavior or performance.

`checker-boundaries-probe.ts` adds required parent relations, independently omitted
business fields (while ownership stays loaded), untouched partial targets, and
customer Fix values rejected or repaired before generated save. It also installs
Checkers in a separate schema-free store and exercises the public object-local
JSON normalizer with declared aliases, escaped pointers and equal/unequal
collisions in both submitted orders under three profiles. Explicit generated
setters form the input allow-list; this is not recursive HTTP/TFP acceptance.
Each round records 32 cases plus independently read physical rows. The default
verifier runs both rounds without deleting either SQLite store and checks that
generated implementations remain unchanged.

`graph-fix-idempotence.test.ts` saves a graph with the same child instance
referenced twice. Each object is fixed and persisted once per invocation, using
one Business Clock snapshot; a later update advances both versions exactly
once. Separate contexts can overlap without sharing their Fix snapshots or
receipts. Two distinct modified views of the same ID remain a conflict and are
rejected before provider work. All three cases run twice on retained databases.

`delete-retry.test.ts` injects a failure after a real file-backed child Delete.
The file, audit history, optimistic baseline and parent version remain unchanged;
the Delete intent survives, but loaded validation values must not become field
writes. Saving the same graph again commits one child tombstone and one audit
event, without reloading or updating the parent. Repeating Delete on the committed
tombstone is rejected before persistence, mutation execution or another audit.
Both rounds use the same retained JSON store, also checked independently.

`fixture-manifest.json` records the unified generator revision, all 17 exported
file hashes and the previous manifest hash. The four updated generated files
are exact export bytes, including the file-client Delete guard and generated
GroupBy aliases. The prior collector qualification remains historical metadata;
it is not presented as evidence for this export.
