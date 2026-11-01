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
