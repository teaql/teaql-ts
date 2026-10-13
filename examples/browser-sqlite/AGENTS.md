# Browser SQLite example

- Keep the existing WorkItem page and the generated Order page independently usable.
- Application-owned code lives in `src/`, HTML, and `scripts/`. Never hand-edit `orders-lib/`.
- Use `assist/query-*.md`, the required field help, and create/expression/debug Assist for API discovery. Do not inspect generated library source or guess method names.
- Order queries must remain bounded and carry non-empty comment/purpose; seeding uses generated audited mutation APIs with the trusted context.
- Search input is validated JSON. Never execute it with `eval` or `new Function`.
- Read actual statement `traceChain` and `tracePath`; UI rendering must not manufacture lineage from SQL, routes or known aliases.
- Dependencies resolve this repository's runtime, not a published package.
- Run `npm run build`, `npm run smoke`, and `npm run smoke:orders`. The latter checks generated-library hashes; the repository example gate runs both smoke tests.
