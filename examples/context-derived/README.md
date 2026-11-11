# Staged Context Fix with generated Q/E and audited save

Run `npm ci` at the runtime root, then:

```sh
node examples/context-derived/verify-local.cjs
```

This verifies both SQLite and the generated file-backed client, twice against
the same per-provider database. Every generated import is mapped to this local
runtime's source. The verifier checks source and generated-fixture hashes and
removes its owned compiler/Jest scratch directory on exit. To retain compact
logs, receipts and test databases, set `TEAQL_CONTEXT_FIX_EVIDENCE_DIR` to a new
directory. No public package publication or remote runtime fallback is used.

The two-entity fixture covers changed clock/IP/actor with an unchanged save,
real update versus create-only fields, located provider/type/validation errors,
retained caller edits, graph-wide Context rollback and retry. IP/actor ownership
is application metadata/Checker customization, not a new built-in KSML type.
`contextFixResolver` is synchronous: prepare external/async values before save;
an async provider is rejected with a safe field-level Check error.

Regenerate the immutable fixture from the generator's
`TypescriptContextFixGenerationTest` using
`-Dteaql.ts.context.fixture.output=<absolute fixture directory>`. Do not edit
generated library files to make a test pass.
