# Browser SQLite/WASM example

This executable example runs the generated TypeScript Q API, Checker/Fix,
audited mutation API, Runtime Module bootstrap, and SQLite schema entirely in
a dedicated browser worker.

```bash
npm install
npm run dev
```

Memory storage is the deterministic default. Refreshing recreates the data.
The optional OPFS mode persists within the current browser origin. Reset drops
the browser-local schema, explicitly runs `context.ensureSchema()` again, and
re-seeds records through generated audited mutation APIs.

The Vite development server emits the COOP/COEP headers required by the SQLite
OPFS implementation. A production host must emit the same headers. This first
profile intentionally excludes multi-tab database coordination and true row
streaming.
