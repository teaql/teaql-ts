import fs from "node:fs";
import path from "node:path";
import { Q } from "order-management-service-lib/src/generated/Q";
import { UserContext, decimal } from "teaql-ts";
import { SQLiteTeaQLClient } from "order-management-service-lib/src/teaql-node-sqlite";

async function main(): Promise<void> {
  const root = path.resolve(__dirname, "..");
  const database = path.join(root, ".local", "order.db");
  if (!fs.existsSync(database)) {
    console.log(`[database] ${database} was not found; TeaQL will create it`);
  }
  fs.mkdirSync(path.dirname(database), { recursive: true });
  const client = new SQLiteTeaQLClient(database);
  client.setAuditSink(event => {
    console.log(`[audit] ${event.action} ${event.entity}#${event.id}; reason=${JSON.stringify(event.reason)}`);
  });
  const ctx = new UserContext().insertResource("dataService", client);
  await ctx.ensureSchema();
  console.log("[schema] ensured 7 generated entity tables");

  const platforms = await Q.commercePlatforms()
    .withNameIs("Northwind Demo")
    .comment("Check whether deterministic quick-start data exists")
    .purpose("Initialize the local order-management example")
    .executeForList(ctx);
  let platformId: string;
  if (platforms.data.length === 0) {
    const platform = (await Q.commercePlatforms().comment("Prepare the demo commerce platform")
      .purpose("Reserve identity before initializing business data").newEntity(ctx)).updateName("Northwind Demo");
    await platform.auditAs("Create quick-start commerce platform").save(ctx);
    platformId = platform.id!;
  } else platformId = String(platforms.data[0].id);

  const seeded = await Q.customerOrders()
    .withOrderNumberIs("WEB-2026-001")
    .comment("Check whether the deterministic order exists")
    .purpose("Initialize the local order-management example")
    .executeForList(ctx);
  if (seeded.data.length === 0) {
    const customer = (await Q.customers().comment("Prepare the demo customer")
      .purpose("Reserve identity before initializing business data").newEntity(ctx))
      .updateName("Acme Retail")
      .updateEmail("masked-in-quick-start")
      .updateCommercePlatform(platformId);
    await customer.auditAs("Create masked quick-start customer").save(ctx);
    const order = (await Q.customerOrders().comment("Prepare the deterministic demo order")
      .purpose("Reserve identity before initializing business data").newEntity(ctx))
      .updateOrderNumber("WEB-2026-001")
      .updateOrderDate("2026-08-12")
      .updateTotalAmount(decimal('129.95'))
      .updateStatusToPending()
      .updateCustomer(customer.id)
      .updateCommercePlatform(platformId);
    await order.auditAs("Create deterministic quick-start order").save(ctx);
    console.log("[seed] inserted deterministic customer and order");
  } else console.log("[seed] deterministic data already exists; no duplicate rows added");

  const result = await Q.customerOrders()
    .withOrderNumberContaining("WEB-")
    .orderByIdAscending()
    .comment("List WEB orders for the terminal quick start")
    .purpose("Show the operator a deterministic order list")
    .executeForList(ctx);
  console.log(`[query] matched ${result.data.length} order(s)`);
  for (const order of result.data) {
    console.log(`  ${order.orderNumber}  ${order.orderDate}  ${order.totalAmount}`);
  }

  const presets = await Q.orderSearchPresets()
    .withRequestIdIs("quick-start-pending-orders")
    .comment("Check idempotent quick-start preset")
    .purpose("Persist the operator's reusable search")
    .executeForList(ctx);
  if (presets.data.length === 0) {
    const preset = (await Q.orderSearchPresets().comment("Prepare a reusable demo search")
      .purpose("Reserve identity before persisting a search preset").newEntity(ctx))
      .updateName("Pending web orders")
      .updateFilterJson('{"order_number":"WEB-"}')
      .updateRequestId("quick-start-pending-orders")
      .updateOwnerUserId("quick-start-user")
      .updateCommercePlatform(platformId);
    await preset.auditAs("Save idempotent quick-start search preset").save(ctx);
    console.log(`[mutation] saved preset #${preset.id}`);
  } else console.log(`[mutation] preset #${presets.data[0].id} already exists`);
  console.log(`[trace] ${client.sqlTrace.length} SQL statements captured; ${client.auditTrace.length} mutations audited`);
  await client.close();
}

main().catch(error => { console.error(error); process.exitCode = 1; });
