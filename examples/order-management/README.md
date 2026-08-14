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
### Materialized-list hard limit

`executeForList` protects the service by applying a default hard limit of 10,000 rows. A requested page size above that ceiling fails explicitly. Trusted application code can call `hardLimit(...)` to override the outer-query ceiling. **Caution:** most applications should not override it; do so only for a reviewed, exceptional requirement. This setting does not describe streaming execution.

### Streaming large root queries

`executeForStream(ctx, chunkSize)` is an `AsyncIterable` of generated entities backed by the SQL driver's cursor:

```typescript
for await (const order of request.comment('export orders').purpose('reviewed export').executeForStream(ctx, 500)) {
  await writeOrder(order);
}
```

Breaking the loop destroys/releases the cursor. **Caution:** normally keep the default 1,000. The SQL runtime enhances selected relations a batch at a time. The ordinary TFP client explicitly rejects streaming until a dedicated protocol exists.

### Optional continuous browsing optimization

For a browse-only screen ordered by the unique `id`, trusted application code can opt in:

```typescript
const orders = await Q.customerOrders()
  .orderByIdDescending()
  .offset(page * pageSize)
  .limit(pageSize)
  .optimizeForContinuousPageFetchWith('recent-orders', 60)
  .purpose('browse recent orders')
  .comment('order browser')
  .executeForList(ctx);
```

The runtime keeps a bounded, expiring cursor in `UserContext`. A matching next page
transparently uses an `id` seek instead of a deep offset; cache misses and unsupported
query shapes retain offset semantics. The plan and cursor ID remain observable.

**Caution:** this is an explicitly approximate optimization for continuous browsing, not
business logic, reconciliation, export, or a stable snapshot. Browse screens usually do
not need an exact count. Both the option and runtime scope are non-enumerable local state;
the TFP client also rejects malicious continuous-page fields, so federation cannot enable
or modify the optimization.
