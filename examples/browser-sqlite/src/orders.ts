import { BrowserSQLiteTeaQLClient, type BrowserSQLiteStorage } from 'teaql-ts/sql/browser-sqlite';
import { DelegatingMutationPolicyApprovalProvider, DelegatingMutationPolicyRegistry, UserContext } from 'teaql-ts';
import { SQLExecutionEvidenceStore, type SQLExecutionMetadata } from 'teaql-ts/sql/core';
import { Q } from '../orders-lib/src/generated/Q';
import { E } from '../orders-lib/src/generated/E';
import { OrderStatus } from '../orders-lib/src/generated/models/OrderStatus';
import { GENERATED_RUNTIME_MODULE } from '../orders-lib/src/runtime-module';
import { ENTITY_SCHEMAS } from '../orders-lib/src/teaql-schemas';
import './style.css';

const status = document.querySelector<HTMLParagraphElement>('#status')!;
const output = document.querySelector<HTMLPreElement>('#result')!;
const trace = document.querySelector<HTMLPreElement>('#trace')!;
const sql = document.querySelector<HTMLPreElement>('#sql')!;
const evidenceRows = document.querySelector<HTMLTableSectionElement>('#evidence-rows')!;
const persist = document.querySelector<HTMLInputElement>('#persist')!;
const logging = document.querySelector<HTMLInputElement>('#logging')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const run = document.querySelector<HTMLButtonElement>('#query')!;
const search = document.querySelector<HTMLTextAreaElement>('#search')!;
const preset = {filter: {orderNumber: {$contains: 'KEEP'}}};
type Runtime = {client: BrowserSQLiteTeaQLClient; context: UserContext; evidence: SQLExecutionEvidenceStore; diagnostics: SQLExecutionMetadata[]};
let active: Runtime | undefined;
persist.checked = localStorage.getItem('teaql-browser-order-storage') === 'opfs';

async function open(storage: BrowserSQLiteStorage): Promise<Runtime> {
  const worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), {type: 'module'});
  const client = await BrowserSQLiteTeaQLClient.open(worker, {...ENTITY_SCHEMAS}, {
    storage, databaseName: 'teaql-browser-orders.sqlite3',
  });
  client.install(GENERATED_RUNTIME_MODULE);
  client.setDiagnosticSQLLogSink(undefined).setMutationLoggingEnabled(false);
  const identity = Object.freeze({policyId: 'browser-order-seed', version: '1', fingerprint: 'sha256:browser-order-seed-v1'});
  const context = new UserContext().insertResource('dataService', client)
    .withMutationPolicyRegistry(new DelegatingMutationPolicyRegistry(() => ({identity,
      review: (_context, plan) => plan.operations.length > 0 ? {verdict: 'allow'}
        : {verdict: 'deny', code: 'EMPTY_GRAPH', message: 'empty mutation graph'},
    })))
    .withMutationPolicyApprovalProvider(new DelegatingMutationPolicyApprovalProvider(
      policy => ({policy, approvedBy: 'browser-demo-owner', approvedAt: new Date()}),
    ));
  client.setUserContext(context);
  await context.ensureSchema();
  await context.ensureSchema();
  return {client, context, evidence: new SQLExecutionEvidenceStore(), diagnostics: []};
}

async function seed({context}: Runtime): Promise<void> {
  const existing = await Q.customerOrdersWithMinimalFields().limit(1)
    .comment('detect existing order demo').purpose('keep mutation seeding idempotent').executeForList(context);
  if (existing.length) return;
  const platform = (await Q.platforms().limit(2).comment('load bootstrap platform').purpose('prepare order demo').executeForList(context))[0];
  const customer = Q.customers().comment('initialize demo customer').purpose('prepare order demo').newEntity(context);
  customer.updateName('North Star Retail').updatePlatform(platform.id);
  await customer.auditAs('seed browser order customer').save(context);
  for (let index = 1; index <= 4; index++) {
    const order = Q.customerOrders().comment('initialize demo order').purpose('prepare order demo').newEntity(context);
    order.updateCustomer(customer.id).updateOrderNumber(index < 4 ? `KEEP-00${index}` : 'DROP-004')
      .updateOrderDate(`2026-10-0${index}`).updateTotalAmount(index < 4 ? index * 100 : 900);
    if (index === 1) order.updateStatusToNew(); else order.updateStatusToPaid();
    await order.auditAs('seed browser order').save(context);
    for (let item = 1; item <= 5; item++) {
      const line = Q.orderItems().comment('initialize demo item').purpose('prepare item previews').newEntity(context);
      line.updateCustomerOrder(order.id).updateProductName(`Box ${item}`).updateQuantity(item).updateUnitPrice(20);
      await line.auditAs('seed browser order item').save(context);
    }
  }
}

async function show(runtime: Runtime): Promise<void> {
  const searchParams: unknown = JSON.parse(search.value);
  const request = Q.customerOrdersWithMinimalFields().filterByJson(searchParams);
  runtime.evidence.enableAll(); runtime.diagnostics.length = 0;
  runtime.client.setRuntimeTelemetrySink(runtime.evidence).setQueryLoggingEnabled(logging.checked)
    .setDiagnosticSQLLogSink({write: entry => runtime.diagnostics.push(entry)});
  const page = await request.countAs('totalOrders')
    .facetByStatusAs('statusCounts', Q.orderStatusesWithMinimalFields().selectName().selectColor()
      .countAs('orderCount').sumTotalAmountOfCustomerOrdersAs('orderTotalAmount', Q.customerOrdersWithMinimalFields())
      .orderByDisplayOrderAscending().comment('load status facets'))
    .selectOrderNumber().selectOrderDate()
    .selectStatusWith(Q.orderStatusesWithMinimalFields().selectName().selectColor().comment('load status'))
    .selectOrderItemListWith(Q.orderItemsWithMinimalFields().selectProductName().selectQuantity()
      .orderByIdAscending().limit(3).comment('load item previews'))
    .countOrderItemsAs('itemCount').orderByOrderDateDescending().orderByIdDescending()
    .offset(1).limit(1).comment('load order list').purpose('render order list page').executeForList(runtime.context);
  const response = {
    data: page.data.map(row => {
      const expression = E.customerOrder(row);
      const previewSize = expression.orderItemList().size().eval();
      if (previewSize == null) throw new Error('Selected item list unexpectedly has a null size');
      return {id: row.id, version: row.version, orderNumber: expression.orderNumber().eval(), orderDate: expression.orderDate().eval(),
        status: {name: expression.status().name().eval(), color: expression.status().color().eval()},
        items: Array.from({length: previewSize}, (_, index) => ({
          productName: expression.orderItemList().get(index).productName().eval(), quantity: expression.orderItemList().get(index).quantity().eval(),
        })), itemCount: (row as unknown as Record<string, unknown>).itemCount};
    }),
    metadata: {totalCount: page.totalCount, pageOffset: 1, pageSize: 1, aggregations: page.data.aggregations, searchWarnings: request.dynamicSearchWarnings},
    facets: {statusCounts: page.data.facets.statusCounts.map(value => ({
      id: value.id, name: E.orderStatus(OrderStatus.fromRecord(value)).name().eval(),
      color: E.orderStatus(OrderStatus.fromRecord(value)).color().eval(), orderCount: value.orderCount, orderTotalAmount: value.orderTotalAmount,
    }))},
  };
  output.textContent = JSON.stringify(response, null, 2);
  const statements = runtime.evidence.snapshot();
  // Rendering only: ownership and comments come from the actual runtime metadata.
  const rows = statements.map(entry => {
    const chain = entry.traceChain ?? [];
    const purposes = chain.filter(node => node.kind === 'purpose');
    const businessTrace = purposes.length === 1
      ? `${purposes[0].detail}: ${chain.filter(node => node.kind === 'comment').map(node => node.detail).join(' → ')}`
      : 'TraceChain unavailable';
    const row = document.createElement('tr');
    for (const value of [`${entry.elapsedMicros} µs`,
      entry.tracePath.find(node => node.kind === 'request')?.name ?? '—', businessTrace, entry.debugSQL]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    return {row, businessTrace};
  });
  evidenceRows.replaceChildren(...rows.map(value => value.row));
  trace.textContent = rows.map(value => value.businessTrace).join('\n');
  sql.textContent = JSON.stringify(statements, null, 2);
  status.textContent = `${runtime.client.storage!.toUpperCase()} · ${page.totalCount} matches · ${statements.length} SQL statements · ${runtime.diagnostics.length} diagnostics · policy installed · ready`;
}

async function replace(storage: BrowserSQLiteStorage): Promise<void> {
  status.textContent = `Opening ${storage.toUpperCase()} SQLite/WASM…`;
  const previous = active; active = undefined;
  await previous?.client.close();
  const next = await open(storage); active = next;
  await seed(next); await show(next);
}
function fail(value: unknown): void {
  status.textContent = value instanceof Error ? `${value.name}: ${value.message}` : String(value);
}
run.addEventListener('click', async () => {
  if (!active) return;
  run.disabled = true;
  try { await show(active); } catch (error) { fail(error); } finally { run.disabled = false; }
});
document.querySelector('#preset')!.addEventListener('click', () => {
  search.value = JSON.stringify(preset, null, 2); run.click();
});
logging.addEventListener('change', () => { if (active) show(active).catch(fail); });
persist.addEventListener('change', () => {
  const storage = persist.checked ? 'opfs' : 'memory';
  localStorage.setItem('teaql-browser-order-storage', storage); replace(storage).catch(fail);
});
reset.addEventListener('click', async () => {
  if (!active) return;
  reset.disabled = true;
  try { await active.client.reset(active.context); await seed(active); await show(active); }
  catch (error) { fail(error); } finally { reset.disabled = false; }
});
replace(persist.checked ? 'opfs' : 'memory').catch(fail);
