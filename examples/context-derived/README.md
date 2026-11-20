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

## Current business model and workspace

`model.xml` defines Catalog and Entry. Trusted Context supplies collection/edit
times, IP and actor fields; the example shows why saving an unchanged entry
must leave those business values untouched. `typescript-node-lib-core/` is the exact, read-only
current generated domain library. The application is in `typescript-app-console/showcase/verify.test.ts`.
The historical `fixture/` remains byte-identical and retains all of its original
fingerprint checks; a separate guard verifies the current library before and
after business execution.

Run the focused source qualifier entry from the SDK repository root:

```bash
node examples/context-derived/verify-local.cjs
```

The original assertions run twice on retained stores: no-op saves produce no
updates, genuine edits consume the trusted Context, failed validation/provider
work preserves edits, and a later invalid child rolls back staged graph fields.
Current managed creation results are explicitly awaited or checked. No generated
implementation is hand-edited. Compact receipts and result stores are retained;
owned build output is removed. Full runtime inventories remain separate gates.

The current model adds only `_audit_mask_fields="guarded_token"` to satisfy the
current evaluator. Business fields/defaults and the frozen model are unchanged.
