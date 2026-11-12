# Natural Checker messages from generated Q and E

The backend returns `The name of the 2nd entry is required.` or
`请填写第2项明细的名称。`, while retaining `/entryList/1/name`. The frontend can
display the message directly and use the structured pointer independently.

```bash
node scripts/verify-natural-messages.cjs --full --example --output /new/evidence/path
```

This source-only gate installs pinned dependencies offline in an owned temporary
copy, typechecks, runs native tests, builds production bundles, checks the message
module's browser bundle, and runs this example twice against the same SQLite
database and file-backed JSON store.
Only `better-sqlite3` and `esbuild` install scripts are enabled in the disposable
execution manifest. The candidate manifest and dependency versions do not change.
Build outputs and dependencies are removed after owned child processes exit;
compact logs, source hashes, response JSON and both data stores remain.

The complete unedited Catalog/Entry library in `fixture/` is produced by
`TypescriptNaturalMessagesGenerationTest`. The model supplies Chinese labels and
classifies `name` as sensitive. Its generated module installs immutable message
descriptors automatically; no presentation model is installed by the application
or retained on its Context. The actual generated Checker requires a name and
limits it to 100 Unicode scalar values.

An unchanged parent and two edited children form the failing graph. The second
child fails required checks in English and Chinese, then exceeds the real length
bound with 101 private scalars. The message keeps that original count after
masking. A custom renderer is called once, and its safe text survives graph-path
relocation without restoring the private input. Every rejection precedes provider
work and committed mutation audits; the file store also remains byte-identical.
After restoring the first edit, audited Save updates only the corrected second
child. Generated Q reloads values and E verifies them. Both provider paths use
the same runtime privacy and rendering contracts.

The complete repository example inventory and published-artifact acceptance
remain separate gates.
The runtime renderer is browser-safe and has no Node-only context-local dependency.

Tracking: [teaql-ts #65](https://github.com/teaql/teaql-ts/issues/65),
[conformance #244](https://github.com/teaql/teaql-conformance/issues/244).
