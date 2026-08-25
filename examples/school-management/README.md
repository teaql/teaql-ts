# School Management example

This retained SQLite example is generated from `model.xml`. It verifies that generated TypeScript SQL metadata contains forward relations and that `selectPlatformWith(...)` / `selectSchoolTypeWith(...)` hydrate typed entities.

```bash
mkdir -p .local
npm install
npx ts-node app.ts
```

Expected result:

```text
PASS TypeScript School Management: forward relation metadata and hydration
```
