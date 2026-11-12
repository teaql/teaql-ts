# Natural Checker messages from generated Q and E

The backend returns `The name of the 2nd entry is required.` or
`请填写第2条明细的名称。`, while retaining `/entryList/1/name`. The frontend can
display the message directly and use the structured pointer independently.

```bash
node scripts/verify-natural-messages.cjs --full --example --output /new/evidence/path
```

This source-only gate installs pinned dependencies offline in an owned temporary
copy, typechecks, runs native tests, builds production bundles, checks the message
module's browser bundle, and runs this example twice against one SQLite database.
Only `better-sqlite3` and `esbuild` install scripts are enabled in the disposable
execution manifest. The candidate manifest and dependency versions do not change.
Build outputs and dependencies are removed after owned child processes exit;
compact logs, source hashes, response JSON and the database remain.

The example reuses the complete unedited Catalog/Entry generated library from
`../context-derived/fixture/`. Application Runtime Module metadata classifies
`name` as sensitive and supplies localized model labels. Application Checker rules
require a nonempty name and limit it to eight Unicode scalar values. Both valid
children enter the failing graph; the first edit is restored before the corrected
save. Generated Q reloads values, E verifies them, and audited Save performs every
write. Rejections must occur before any provider call or transaction and without
a committed mutation audit. A corrected save updates only the second child.

Automatic generator emission, the complete repository example inventory,
file-backed-client alignment and published-artifact acceptance are separate gates.
The runtime renderer is browser-safe and has no Node-only context-local dependency.

Tracking: [teaql-ts #65](https://github.com/teaql/teaql-ts/issues/65),
[conformance #244](https://github.com/teaql/teaql-conformance/issues/244).
