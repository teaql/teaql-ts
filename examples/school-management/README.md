# School Management example

This retained SQLite example is generated from `model.xml`. It verifies repeated root/constant bootstrap, the post-constant ID floor, generated forward relations, and checker-fixed Update.

```bash
mkdir -p .local
npm install
npx ts-node app.ts
```

Expected result:

```text
PASS TypeScript School Management: idempotent bootstrap, ID floor, relations, and Update
```
