# Order Management — TypeScript + SQLite

Use Node.js 22. No database server, fixture DB, model input, or generator installation is needed.

```bash
cd examples/order-management
npm install
npm start
```

The first run creates `../.local/order.db`, ensures schema, seeds through generated entities, performs a governed query, and saves an audited preset. The second run demonstrates idempotency.

Read `typescript-app-console/app.ts` first (handwritten), then `typescript-node-lib-core/src/generated/Q.ts`, `requests/CustomerOrderRequest.ts`, and `models/CustomerOrder.ts` (generated). `purpose(...)` returns the executable request; runtime dependencies come only from the trusted `UserContext`.

## Verify the first result

Expect `WEB-2026-001`, `2026-08-12`, and `129.95`. The first run reports four audited mutations and SQL trace entries; the second reports zero mutations.

## Customize it

Change `withOrderNumberContaining`, ordering, or a generated relation selection in `app.ts`, then run `npm run build`. Keep trusted context and application policy in `typescript-app-console`; regenerate `typescript-node-lib-core`. The workspace resolves the current TeaQL SQL runtime normally—there is no copied `dist` cache. The shared model is not needed at runtime.
