# Browser SQLite/WASM example

This executable example runs the generated TypeScript Q API, Checker/Fix,
audited mutation API, an application-owned approved Mutation Policy, Runtime
Module bootstrap, and SQLite schema entirely in a dedicated browser worker.

```bash
npm install
npm run dev
```

Memory storage is the deterministic default. Refreshing recreates the data.
The optional OPFS mode persists within the current browser origin. Reset drops
the browser-local schema, explicitly runs `context.ensureSchema()` again, and
re-seeds records through generated audited mutation APIs.

The same policy installation and whole-graph review path is used by both
storage profiles. A denied plan is rejected before SQL is posted to the worker;
the focused runtime tests cover that negative path for both memory and OPFS.

The Vite development server emits the COOP/COEP headers required by the SQLite
OPFS implementation. A production host must emit the same headers. This first
profile intentionally excludes multi-tab database coordination and true row
streaming.
