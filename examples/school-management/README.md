# School Management example

This retained SQLite example is generated from `model.xml`. It verifies repeated root/constant bootstrap, the post-constant ID floor, generated forward relations, and checker-fixed Update.

The request-intent probe uses generated Q and audited-save APIs with logging
disabled. Blank comment/purpose must produce the runtime's stable request
errors without reaching SQL compilation. The library is regenerated from the
paired local generator; it is not manually patched.

Current generated bootstrap uses a mutation-API `ensure` hook. A second retained
generated library in `src/reconciled` changes the model's Primary constant name
to `Primary School`. It runs against the first library's existing SQLite file;
two Ensure Schema calls must yield exactly version 2. No custom replacement
bootstrap or metadata-only override bypasses the managed generated program.

This demo resets its SQLite test tables at startup. Running it twice is not
evidence of two starts without database cleanup; that stronger graph gate is
tracked separately.

```bash
mkdir -p .local
npm install
npx ts-node app.ts
```

Expected result:

```text
PASS TypeScript generated School request-intent gates
PASS TypeScript School Management: bootstrap, portable Query parity, relations, and Update
```
