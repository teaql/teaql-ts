# School startup and query showcase

`model.xml` owns the generated `typescript-lib-core` and
`typescript-app-console` scopes. The workspace contains the original School
creation, Q/E, relation, ID-floor, checker and audited-update assertions. Its
`src/main.ts` starts that business application. `showcase.json` identifies the
model and producer. The constant-reconciliation variant has its own
`model-reconciled.xml` and generated library/workspace scopes in
`typescript-app-console/reconciled`; the parent application executes it against
the same SQLite store. The immutable older generation snapshots are historical
provenance; current scope identity comes from `showcase.json`.

Run `bash verify.sh` from this scene. The gate uses the current runtime, checks
all six file-provider scenarios twice against retained stores and runs the
SQLite School application in an isolated directory. Disposable compilation
outputs and caches are removed after compact receipts are written.

This retained SQLite example is generated from `model.xml`. It verifies repeated root/constant bootstrap, the post-constant ID floor, generated forward relations, and checker-fixed Update.

The request-intent probe uses generated Q and audited-save APIs with logging
disabled. Blank comment/purpose must produce the runtime's stable request
errors without reaching SQL compilation. The library is regenerated from the
paired local generator; it is not manually patched.

Current generated bootstrap uses a mutation-API `ensure` hook. A second retained
generated library in `typescript-app-console/reconciled` changes the model's Primary constant name
to `Primary School`. It runs against the first library's existing SQLite file;
two Ensure Schema calls must yield exactly version 2. No custom replacement
bootstrap or metadata-only override bypasses the managed generated program.

The SQLite application is qualified against a fresh store. Repeated
initialization is checked inside that application; file-provider scenarios
run twice on the same retained stores. This does not claim complete
hierarchical Trace Chain acceptance.

```bash
cd typescript-app-console
npm ci
npm start
```

Expected result:

```text
PASS TypeScript generated School request-intent gates
PASS TypeScript School Management: bootstrap, portable Query parity, relations, and Update
```
