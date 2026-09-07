# TypeScript runtime conformance example

This retained SQLite example is generated from `model.xml` and verifies the minimum runtime-owned contract: explicit `ensureSchema`, Create, Update, Delete, typed Q, E loaded/null/not-loaded semantics, Checker rejection before SQL, and optimistic-version isolation for different entity types that share a numeric ID.

```bash
npm install
npm run build
npm start
```

The generated workspace targets `@teaql/teaql` 0.1.17. Regenerate it with the local code generator's `typescript-app-console` target before checking a new generator/runtime combination.
