# TypeScript runtime conformance example

This retained SQLite example is generated from `model.xml` and verifies the minimum runtime-owned contract: explicit `ensureSchema`, Create, Update, Delete, typed Q, E loaded/null/not-loaded semantics, Checker rejection before SQL, and optimistic-version isolation for different entity types that share a numeric ID.

```bash
npm install
npm run build
npm start
```

The example's `file:../..` dependency uses this repository's local runtime, not
an old public package. Generated model inputs retain their evaluated manifest;
this example does not hand-edit generated implementations.

`operational-clock-verification.ts` additionally checks real LocalCache TTL
expiry with a positively calibrated, then unavailable Business Clock. Moving
the business calendar forwards/backwards cannot expire or revive entries;
zero/false/empty/null values and zero/omitted TTL retain their existing meaning.
The emitted `TYPESCRIPT_OPERATIONAL_CLOCK_EXAMPLE` contains no cached values.
Companion native tests cover local pagination-state TTLs and telemetry deadlines.
These tests do not add security-reference or local-lock APIs, which are outside
this runtime's current frontend-oriented scope.
