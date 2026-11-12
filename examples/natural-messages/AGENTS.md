# Natural Checker messages example

Run `node scripts/verify-natural-messages.cjs --full --example --output
/new/evidence/path` from the runtime repository. The output path must not exist.

The example consumes the complete immutable generated library and model under
`../context-derived/fixture/`. Do not read or edit generated library source for
API discovery. Use current model-aware Assist when application code needs an
operation not already demonstrated here. Presentation metadata and the custom
name sensitivity/bounds policy are application-owned Runtime Module inputs.

Keep generated Q bounded and supply comment/purpose. Use generated audited Save
for every write. Never replace the scalar-length check with the mask's length or
dump the secret into diagnostics. The verifier runs twice against one retained
SQLite database and disposes only its owned source copy, dependencies and outputs.
