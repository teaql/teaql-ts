# School Management example

This retained SQLite example is generated from `model.xml`. It verifies that generated TypeScript SQL metadata contains forward relations, that `selectPlatformWith(...)` / `selectSchoolTypeWith(...)` hydrate typed entities, and that an Update checker can add `update_time` without mutating the immutable ledger snapshot.

```bash
mkdir -p .local
npm install
npx ts-node app.ts
```

Expected result:

```text
PASS TypeScript School Management: forward relations and checker-fixed Update
```
