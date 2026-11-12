# Natural Checker messages example

Run `node scripts/verify-natural-messages.cjs --full --example --output
/new/evidence/path` from the runtime repository. The output path must not exist.

The example consumes the complete immutable generated library and model under
`fixture/`. Do not read or edit generated library source for
API discovery. Use current model-aware Assist when application code needs an
operation not already demonstrated here. Its generated Runtime Module installs
presentation metadata and actual Checker rules. Do not replace them with manual
descriptors or hand-written bounds to make the example pass.

Keep generated Q bounded and supply comment/purpose. Use generated audited Save
for every write. Never replace the scalar-length check with the mask's length or
dump the secret into diagnostics. The verifier runs twice against the same retained
SQLite database and JSON store, checks the unchanged-parent graph origin and a
single safe customer renderer invocation, and disposes only its owned source
copy, dependencies and outputs. Regenerate the fixture through
`TypescriptNaturalMessagesGenerationTest`; preserve its manifest and evaluation.
