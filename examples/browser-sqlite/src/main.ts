import {
  BrowserSQLiteStorage,
  BrowserSQLiteTeaQLClient,
} from 'teaql-ts/sql/browser-sqlite';
import {
  SQLExecutionEvidenceStore,
  SQLExecutionMetadata,
} from 'teaql-ts/sql/core';
import {
  DelegatingMutationPolicyApprovalProvider,
  DelegatingMutationPolicyRegistry,
  MutationIntent,
  RuntimeModule,
  UserContext,
} from 'teaql-ts';
import { ORDER_SCHEMAS, ORDER_SEED, ORDER_STATUS, ORDER_STATUS_CONSTANTS } from './order-model';
import { Q } from './generated/Q';
import './style.css';

const status = document.querySelector<HTMLParagraphElement>('#status')!;
const persist = document.querySelector<HTMLInputElement>('#persist')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const queryCatalog = document.querySelector<HTMLElement>('#query-catalog')!;
const result = document.querySelector<HTMLElement>('#result')!;
const resultTitle = document.querySelector<HTMLHeadingElement>('#result-title')!;
const resultDescription = document.querySelector<HTMLParagraphElement>('#result-description')!;
const resultMeta = document.querySelector<HTMLParagraphElement>('#result-meta')!;
const queryCode = document.querySelector<HTMLElement>('#query-code')!;
const queryParamsBlock = document.querySelector<HTMLElement>('#query-params-block')!;
const queryParamsCode = document.querySelector<HTMLElement>('#query-params-code')!;
const resultGrid = document.querySelector<HTMLElement>('#result-grid')!;
const resultViewLabel = document.querySelector<HTMLElement>('#result-view-label')!;
const sqlCount = document.querySelector<HTMLElement>('#sql-count')!;
const sqlOutput = document.querySelector<HTMLElement>('#sql-output')!;
const expandAll = document.querySelector<HTMLButtonElement>('#expand-all')!;
const collapseAll = document.querySelector<HTMLButtonElement>('#collapse-all')!;
const viewTable = document.querySelector<HTMLButtonElement>('#view-table')!;
const viewTree = document.querySelector<HTMLButtonElement>('#view-tree')!;
const languageButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-locale]'));

type Runtime = {
  client: BrowserSQLiteTeaQLClient;
  context: UserContext;
  evidence: SQLExecutionEvidenceStore;
};
type QueryView = 'tree' | 'dashboard';
type ResultView = 'table' | 'tree';
type QueryExample = Readonly<{
  id: string;
  title: string;
  description: string;
  code: string;
  view?: QueryView;
  run(active: Runtime): Promise<unknown>;
}>;
type QueryGroup = Readonly<{
  label: string;
  description: string;
  queries: readonly QueryExample[];
}>;

type Locale = 'en' | 'zh';
type LocalizedCopy = Readonly<{ en: string; zh: string }>;

const UI_COPY: Readonly<Record<string, LocalizedCopy>> = {
  heroTitle: { en: 'Understand TeaQL queries through a familiar order model.', zh: '用一个熟悉的订单模型，看懂 TeaQL 查询。' },
  heroIntro: { en: 'Platform, customer, order, item, payment, and shipment data all run in the browser. Order status is backed by a constant model. Choose a query below to inspect real SQLite/WASM results.', zh: '平台、用户、订单、明细、支付和物流数据都在浏览器中运行；订单状态由常数模型提供。选择下面的查询，查看真实的 SQLite/WASM 结果。' },
  platform: { en: 'Platform', zh: '平台' }, customer: { en: 'Customer', zh: '用户' },
  order: { en: 'Order', zh: '订单' }, item: { en: 'Item', zh: '明细' },
  payment: { en: 'Payment', zh: '支付' }, shipment: { en: 'Shipment', zh: '物流' },
  constantModel: { en: 'Constant model', zh: '常数模型' },
  persist: { en: 'Persist locally with OPFS', zh: '使用 OPFS 保存在本地' },
  reset: { en: 'Reset demo data', zh: '重置演示数据' },
  chooseQuery: { en: 'Choose a query', zh: '选择一个查询' },
  queryIntro: { en: 'Queries are grouped by purpose and share the same order dataset.', zh: '查询按用途分组，并共用同一份订单数据。' },
  table: { en: 'Table', zh: '表格' }, resultTree: { en: 'Result Tree', zh: '结果树' },
  expandAll: { en: 'Expand all', zh: '全部展开' },
  collapseAll: { en: 'Collapse all', zh: '全部折叠' }, waiting: { en: 'Waiting for query…', zh: '等待查询…' },
  queryNote: { en: 'The Q expression stays fixed; search, status cards, and pagination only update dynamic parameters. The underlying SelectQuery remains inside the generated request implementation.', zh: 'Q 表达式保持不变；搜索、状态卡片和分页只更新动态参数。底层 SelectQuery 仍封装在生成的请求实现中。' },
  executionEvidence: { en: 'EXECUTION EVIDENCE', zh: '执行证据' },
  evidenceTime: { en: 'Time', zh: '时间' }, identity: { en: 'Identity', zh: '身份' },
  traceChain: { en: 'Trace chain', zh: '追踪链' },
  sqlNote: { en: 'One plain-text line per statement: time, identity, trace chain, and the SQL SQLite executed.', zh: '每条语句使用一行纯文本：时间、身份、追踪链，以及 SQLite 实际执行的 SQL。' },
  localData: { en: 'Data stays in this browser', zh: '数据只保留在当前浏览器中' },
};

const EN_TEXT: Readonly<Record<string, string>> = {
  '基本查询': 'Basic queries',
  '从订单、用户和关联对象开始': 'Start with orders, customers, and related objects',
  '汇总查询': 'Aggregations',
  '分组、计数、求和与平均值': 'Grouping, counts, sums, and averages',
  '过滤查询': 'Filtered queries',
  '精确、范围与组合条件': 'Exact, range, and combined predicates',
  '动态查询': 'Dynamic queries',
  '由页面条件安全生成，不使用 eval': 'Safely generated from page criteria without eval',
  '综合：订单管理中心': 'Comprehensive: Order management center',
  '一个真实的综合查询页面：状态指标、搜索、商品预览和分页都由 TeaQL 查询驱动。': 'A real composite query page: status metrics, search, product previews, and pagination are all driven by TeaQL.',
  '最近订单': 'Recent orders',
  '按下单日期倒序浏览全部订单，并带出所属平台与用户。': 'Browse all orders by date descending, including their platform and customer.',
  '完整订单详情': 'Complete order details',
  '查看一个订单及其用户、商品明细、支付和物流，体现完整对象图。': 'Inspect one order with its customer, items, payments, and shipments as a complete object graph.',
  '用户与订单数': 'Customers with order counts',
  '列出用户，并通过关联汇总显示每位用户的订单数量。': 'List customers and show each customer’s order count through a relation aggregate.',
  '订单状态汇总': 'Orders by status',
  '按币种与订单状态统计订单数、总额和平均客单价。': 'Aggregate order count, gross amount, and average order value by currency and status.',
  '商品销售汇总': 'Product sales summary',
  '按商品汇总销量与销售额，找出最受欢迎的订单明细。': 'Aggregate units and revenue by product to identify the most popular order items.',
  '支付渠道对账': 'Payment reconciliation',
  '按币种、支付渠道和状态汇总笔数与金额。': 'Aggregate transaction count and amount by currency, payment provider, and status.',
  '待支付订单': 'Orders awaiting payment',
  '筛选尚未完成付款的订单，并带出对应支付记录。': 'Find orders that have not completed payment and include their payment records.',
  '国内大额订单': 'High-value domestic orders',
  '组合平台与金额条件，找出 TeaQL 商城中金额不低于 500 元的订单。': 'Combine platform and amount filters to find TeaQL Store orders worth at least CNY 500.',
  '运输中的包裹': 'Active shipments',
  '筛选待揽收和运输中的物流单，并关联订单信息。': 'Find shipments that are ready or in transit and include their order information.',
  '动态：已付款国内订单': 'Dynamic: paid domestic orders',
  '从动态条件对象生成查询：人民币、金额至少 250，且状态为已付款或已发货。': 'Build a query from dynamic criteria: CNY, at least 250, and status PAID or SHIPPED.',
  '动态：九月新订单': 'Dynamic: new September orders',
  '运行时传入日期范围与排序方式，查询 9 月 15 日之后的订单。': 'Pass a date range and sort order at runtime to find orders after September 15.',
  '动态：字段白名单': 'Dynamic: field allowlist',
  '未知字段会被报告并忽略；合法条件仍可安全执行。': 'Unknown fields are reported and ignored while valid predicates still execute safely.',
};

let locale: Locale = localStorage.getItem('teaql-browser-locale') === 'zh' ? 'zh' : 'en';

function copy(key: string): string {
  return UI_COPY[key]?.[locale] ?? key;
}

function localize(value: string): string {
  return locale === 'en' ? EN_TEXT[value] ?? value : value;
}

let runtime: Runtime | undefined;
let activeQueryId = window.location.hash.slice(1) || 'order-center';
if (!window.location.hash) history.replaceState(null, '', '#order-center');
let activeResultView: ResultView = 'tree';
let currentResult: { data: unknown; query: QueryExample; active: Runtime } | undefined;
let lastElapsed = 0;
let lastExecutedAt: Date | undefined;
const dashboardState = { search: '', page: 0, pageSize: 4 };
const storagePreference = localStorage.getItem('teaql-browser-storage') === 'opfs' ? 'opfs' : 'memory';
persist.checked = storagePreference === 'opfs';

async function dynamicOrderQuery(
  active: Runtime,
  input: unknown,
): Promise<{ request: unknown; warnings: readonly unknown[]; data: unknown[] }> {
  const request = Q.customerOrders()
    .filterByJson(input)
    .limit(20)
    .comment('what: execute a validated browser search')
    .purpose('why: demonstrate safe dynamic order discovery');
  const data = await request.executeForList(active.context);
  return { request: input, warnings: request.warnings(), data };
}

type DashboardData = Readonly<{
  orders: ReadonlyArray<Record<string, unknown>>;
  totalOrders: number;
  filteredOrders: number;
  statusFacets: ReadonlyArray<Readonly<{
    code: string;
    name: string;
    color: string;
    orderCount: number;
    orderTotalAmount: number;
  }>>;
  search: string;
  page: number;
  pageSize: number;
  queryExpression: string;
}>;

const statusCodeById = Object.fromEntries(
  Object.entries(ORDER_STATUS).map(([code, id]) => [id, code]),
) as Readonly<Record<string, string>>;

function statusCodeFor(status: Record<string, unknown>): string {
  const selectedCode = String(status.code ?? '');
  if (selectedCode && selectedCode in ORDER_STATUS) return selectedCode;
  if (!('color' in status)) return '';
  return statusCodeById[String(status.id ?? '')] ?? '';
}

function orderCenterSearchParams(search: string): Record<string, unknown> {
  const value = search.trim();
  if (!value) return { filter: {} };
  const upper = value.toUpperCase();
  const status = ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    .find(candidate => candidate.includes(upper));
  if (status) return { filter: { 'status.code': status } };
  if (/^(TQL-|\d)/i.test(value)) return { filter: { orderNumber: { $contains: upper } } };
  return { filter: { 'itemList.productName': { $contains: value } } };
}

async function runOrderCenter(active: Runtime): Promise<DashboardData> {
  const searchParams = orderCenterSearchParams(dashboardState.search);
  const request = Q.customerOrdersWithMinimalFields()
      .filterByJson(searchParams)
      .countAs('totalOrders')
      .facetByStatusAs('statusCounts', Q.orderStatuses().selectName().selectColor().countAs('orderCount').sumOrderTotalAmountAs('orderTotalAmount').orderByDisplayOrderAscending().comment('load status facets'))
      .selectOrderNumber()
      .selectOrderDate()
      .selectStatusWith(Q.orderStatuses().selectName().selectColor().comment('load status'))
      .selectItemListWith(Q.orderItems().selectProductName().selectQuantity().orderByIdAscending().limit(3).comment('load item previews'))
      .countItemListAs('itemCount')
      .orderByOrderDateDescending()
      .orderByIdDescending()
    .comment('load order list')
    .purpose('render order list page');
  const queryExpression = request.toQExpression('offset(pageOffset)\n  .limit(pageSize)\n  .executeForList(ctx);');
  const orders = await request
    .offset(dashboardState.page * dashboardState.pageSize)
    .limit(dashboardState.pageSize)
    .executeForList(active.context);
  const statusRows = orders.facet('statusCounts') ?? [];
  return {
    orders,
    totalOrders: Number(orders.aggregations.totalOrders ?? orders.totalCount),
    filteredOrders: orders.totalCount ?? 0,
    statusFacets: statusRows.map(row => ({
      code: statusCodeFor(row),
      name: String(row.name ?? ''),
      color: String(row.color ?? ''),
      orderCount: Number(row.orderCount ?? 0),
      orderTotalAmount: Number(row.orderTotalAmount ?? 0),
    })).filter(status => status.code && status.name),
    search: dashboardState.search,
    page: dashboardState.page,
    pageSize: dashboardState.pageSize,
    queryExpression,
  };
}

const QUERY_GROUPS: readonly QueryGroup[] = [
  {
    label: '基本查询',
    description: '从订单、用户和关联对象开始',
    queries: [
      {
        id: 'order-center',
        title: '综合：订单管理中心',
        description: '一个真实的综合查询页面：状态指标、搜索、商品预览和分页都由 TeaQL 查询驱动。',
        code: '',
        view: 'dashboard',
        run: runOrderCenter,
      },
      {
        id: 'recent-orders',
        title: '最近订单',
        description: '按下单日期倒序浏览全部订单，并带出所属平台与用户。',
        code: `await Q.customerOrders()
  .selectPlatformWith(Q.platforms().selectName())
  .selectCustomerWith(Q.customers().selectName().selectCity().selectTier())
  .selectStatusWith(Q.orderStatuses().selectName().selectColor())
  .orderByOrderDateDescending()
  .orderByIdDescending()
  .limit(8)
  .comment('what: list recent commerce orders')
  .purpose('why: provide the default order overview')
  .executeForList(ctx)`,
        run: active => Q.customerOrders()
          .selectPlatformWith(Q.platforms().selectName())
          .selectCustomerWith(Q.customers().selectName().selectCity().selectTier())
          .selectStatusWith(Q.orderStatuses().selectName().selectColor())
          .orderByOrderDateDescending()
          .orderByIdDescending()
          .limit(8)
          .comment('what: list recent commerce orders')
          .purpose('why: provide the default order overview')
          .executeForList(active.context),
      },
      {
        id: 'order-detail',
        title: '完整订单详情',
        description: '查看一个订单及其用户、商品明细、支付和物流，体现完整对象图。',
        code: `await Q.customerOrders()
  .withOrderNumberIs('TQL-2026-1003')
  .selectPlatformWith(Q.platforms())
  .selectCustomerWith(Q.customers())
  .selectStatusWith(Q.orderStatuses().selectName().selectColor())
  .selectItemListWith(Q.orderItems().orderByIdAscending())
  .selectPaymentListWith(Q.payments().orderByIdAscending())
  .selectShipmentListWith(Q.shipments().orderByIdAscending())
  .limit(1)
  .comment('what: load one complete order graph')
  .purpose('why: inspect items, payment and fulfillment together')
  .executeForList(ctx)`,
        run: active => Q.customerOrders()
          .withOrderNumberIs('TQL-2026-1003')
          .selectPlatformWith(Q.platforms())
          .selectCustomerWith(Q.customers())
          .selectStatusWith(Q.orderStatuses().selectName().selectColor())
          .selectItemListWith(Q.orderItems().orderByIdAscending())
          .selectPaymentListWith(Q.payments().orderByIdAscending())
          .selectShipmentListWith(Q.shipments().orderByIdAscending())
          .limit(1)
          .comment('what: load one complete order graph')
          .purpose('why: inspect items, payment and fulfillment together')
          .executeForList(active.context),
      },
      {
        id: 'customers-with-order-count',
        title: '用户与订单数',
        description: '列出用户，并通过关联汇总显示每位用户的订单数量。',
        code: `await Q.customers()
  .selectPlatformWith(Q.platforms().selectName())
  .countOrderListAs('orderCount')
  .orderByNameAscending()
  .comment('what: list customers with related order counts')
  .purpose('why: compare customer activity at a glance')
  .executeForList(ctx)`,
        run: active => Q.customers()
          .selectPlatformWith(Q.platforms().selectName())
          .countOrderListAs('orderCount')
          .orderByNameAscending()
          .comment('what: list customers with related order counts')
          .purpose('why: compare customer activity at a glance')
          .executeForList(active.context),
      },
    ],
  },
  {
    label: '汇总查询',
    description: '分组、计数、求和与平均值',
    queries: [
      {
        id: 'orders-by-status',
        title: '订单状态汇总',
        description: '按币种与订单状态统计订单数、总额和平均客单价。',
        code: `await Q.customerOrders()
  .groupByCurrency().groupByStatus()
  .countAs('orderCount')
  .sumTotalAmountAs('grossAmount')
  .averageTotalAmountAs('averageOrderValue')
  .comment('what: aggregate orders by currency and status')
  .purpose('why: show the current order funnel')
  .executeForRows(ctx)`,
        run: active => Q.customerOrders()
          .groupByCurrency().groupByStatus()
          .countAs('orderCount')
          .sumTotalAmountAs('grossAmount')
          .averageTotalAmountAs('averageOrderValue')
          .comment('what: aggregate orders by currency and status')
          .purpose('why: show the current order funnel')
          .executeForRows(active.context),
      },
      {
        id: 'product-sales',
        title: '商品销售汇总',
        description: '按商品汇总销量与销售额，找出最受欢迎的订单明细。',
        code: `await Q.orderItems()
  .groupByProductName()
  .sumQuantityAs('units')
  .sumLineAmountAs('revenue')
  .comment('what: aggregate sold units and line revenue')
  .purpose('why: identify the strongest products in the demo data')
  .executeForRows(ctx)`,
        run: active => Q.orderItems()
          .groupByProductName()
          .sumQuantityAs('units')
          .sumLineAmountAs('revenue')
          .comment('what: aggregate sold units and line revenue')
          .purpose('why: identify the strongest products in the demo data')
          .executeForRows(active.context),
      },
      {
        id: 'payment-reconciliation',
        title: '支付渠道对账',
        description: '按币种、支付渠道和状态汇总笔数与金额。',
        code: `await Q.payments()
  .groupByCurrency().groupByProvider().groupByStatus()
  .countAs('paymentCount').sumAmountAs('paymentAmount')
  .orderByCurrencyAscending().orderByProviderAscending()
  .comment('what: reconcile payment totals by provider')
  .purpose('why: compare captured, pending and refunded money')
  .executeForRows(ctx)`,
        run: active => Q.payments()
          .groupByCurrency().groupByProvider().groupByStatus()
          .countAs('paymentCount').sumAmountAs('paymentAmount')
          .orderByCurrencyAscending().orderByProviderAscending()
          .comment('what: reconcile payment totals by provider')
          .purpose('why: compare captured, pending and refunded money')
          .executeForRows(active.context),
      },
    ],
  },
  {
    label: '过滤查询',
    description: '精确、范围与组合条件',
    queries: [
      {
        id: 'pending-payment',
        title: '待支付订单',
        description: '筛选尚未完成付款的订单，并带出对应支付记录。',
        code: `await Q.customerOrders()
  .withStatusIsPendingPayment()
  .selectStatusWith(Q.orderStatuses().selectName().selectColor())
  .selectCustomerWith(Q.customers().selectName())
  .selectPaymentListWith(Q.payments())
  .comment('what: find orders awaiting payment')
  .purpose('why: support payment follow-up')
  .executeForList(ctx)`,
        run: active => Q.customerOrders()
          .withStatusIsPendingPayment()
          .selectStatusWith(Q.orderStatuses().selectName().selectColor())
          .selectCustomerWith(Q.customers().selectName())
          .selectPaymentListWith(Q.payments())
          .comment('what: find orders awaiting payment')
          .purpose('why: support payment follow-up')
          .executeForList(active.context),
      },
      {
        id: 'large-cn-orders',
        title: '国内大额订单',
        description: '组合平台与金额条件，找出 TeaQL 商城中金额不低于 500 元的订单。',
        code: `await Q.customerOrders()
  .withPlatformIdIs('1')
  .withTotalAmountGreaterThanOrEqualTo(500)
  .selectCustomerWith(Q.customers().selectName().selectCity())
  .orderByTotalAmountDescending()
  .comment('what: find high-value domestic orders')
  .purpose('why: prioritize valuable fulfillment work')
  .executeForList(ctx)`,
        run: active => Q.customerOrders()
          .withPlatformIdIs('1')
          .withTotalAmountGreaterThanOrEqualTo(500)
          .selectCustomerWith(Q.customers().selectName().selectCity())
          .orderByTotalAmountDescending()
          .comment('what: find high-value domestic orders')
          .purpose('why: prioritize valuable fulfillment work')
          .executeForList(active.context),
      },
      {
        id: 'open-shipments',
        title: '运输中的包裹',
        description: '筛选待揽收和运输中的物流单，并关联订单信息。',
        code: `await Q.shipments()
  .withStatusIn('READY', 'IN_TRANSIT')
  .selectOrderWith(Q.customerOrders().selectOrderNumber().selectOrderDate().selectStatusWith(Q.orderStatuses().selectName().selectColor()).selectTotalAmount().selectCurrency())
  .orderByStatusAscending().orderByIdAscending()
  .comment('what: find shipments that are not delivered')
  .purpose('why: monitor active fulfillment')
  .executeForList(ctx)`,
        run: active => Q.shipments()
          .withStatusIn('READY', 'IN_TRANSIT')
          .selectOrderWith(Q.customerOrders()
            .selectOrderNumber().selectOrderDate()
            .selectStatusWith(Q.orderStatuses().selectName().selectColor())
            .selectTotalAmount().selectCurrency())
          .orderByStatusAscending().orderByIdAscending()
          .comment('what: find shipments that are not delivered')
          .purpose('why: monitor active fulfillment')
          .executeForList(active.context),
      },
    ],
  },
  {
    label: '动态查询',
    description: '由页面条件安全生成，不使用 eval',
    queries: [
      {
        id: 'dynamic-paid-cn',
        title: '动态：已付款国内订单',
        description: '从动态条件对象生成查询：人民币、金额至少 250，且状态为已付款或已发货。',
        code: `const input = {
  "filter": {
    "currency": "CNY",
    "totalAmount": { "$gte": 250 },
    "status": { "$in": ["PAID", "SHIPPED"] }
  },
  "orderBy": [{ "field": "totalAmount", "direction": "desc" }]
};
const data = await Q.customerOrders()
  .filterByJson(input)
  .limit(20)
  .comment('what: execute a validated browser search')
  .purpose('why: demonstrate safe dynamic order discovery')
  .executeForList(ctx);`,
        run: active => dynamicOrderQuery(active, {
          filter: {
            currency: 'CNY',
            totalAmount: { $gte: 250 },
            status: { $in: ['PAID', 'SHIPPED'] },
          },
          orderBy: [{ field: 'totalAmount', direction: 'desc' }],
        }),
      },
      {
        id: 'dynamic-date-range',
        title: '动态：九月新订单',
        description: '运行时传入日期范围与排序方式，查询 9 月 15 日之后的订单。',
        code: `const input = {
  "filter": { "orderDate": { "$gte": "2026-09-15" } },
  "orderBy": [{ "field": "orderDate", "direction": "asc" }]
};
const data = await Q.customerOrders()
  .filterByJson(input)
  .limit(20)
  .comment('what: execute a validated browser search')
  .purpose('why: demonstrate safe dynamic order discovery')
  .executeForList(ctx);`,
        run: active => dynamicOrderQuery(active, {
          filter: { orderDate: { $gte: '2026-09-15' } },
          orderBy: [{ field: 'orderDate', direction: 'asc' }],
        }),
      },
      {
        id: 'dynamic-safe-fields',
        title: '动态：字段白名单',
        description: '未知字段会被报告并忽略；合法条件仍可安全执行。',
        code: `const input = {
  "filter": {
    "status": "DELIVERED",
    "internalNote": { "$contains": "not queryable" }
  }
};
const request = Q.customerOrders().filterByJson(input);
const data = await request
  .limit(20)
  .comment('what: execute a validated browser search')
  .purpose('why: demonstrate safe dynamic order discovery')
  .executeForList(ctx);
const warnings = request.warnings();`,
        run: active => dynamicOrderQuery(active, {
          filter: {
            status: 'DELIVERED',
            internalNote: { $contains: 'not queryable' },
          },
        }),
      },
    ],
  },
] as const;

const allQueries = QUERY_GROUPS.flatMap(group => group.queries);

async function openRuntime(storage: BrowserSQLiteStorage): Promise<Runtime> {
  const worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });
  const client = await BrowserSQLiteTeaQLClient.open(worker, { ...ORDER_SCHEMAS }, {
    storage,
    databaseName: 'teaql-order-playground-v3.sqlite3',
  });
  const evidence = new SQLExecutionEvidenceStore().enableSelect();
  client.install(new RuntimeModule(ORDER_SCHEMAS, {}, {
    constants: ORDER_STATUS_CONSTANTS,
  }));
  client.setRuntimeTelemetrySink(evidence).setDiagnosticSQLLogSink(undefined);
  const policyIdentity = Object.freeze({
    policyId: 'browser-order-demo-seed',
    version: '1',
    fingerprint: 'sha256:browser-order-demo-seed-v1',
  });
  const context = new UserContext()
    .insertResource('dataService', client)
    .withMutationPolicyRegistry(new DelegatingMutationPolicyRegistry(() => ({
      identity: policyIdentity,
      review: (_context, plan) => plan.operations.length > 0
        ? { verdict: 'allow' }
        : { verdict: 'deny', code: 'EMPTY_GRAPH', message: 'empty mutation graph' },
    })))
    .withMutationPolicyApprovalProvider(new DelegatingMutationPolicyApprovalProvider(
      identity => ({ policy: identity, approvedBy: 'browser-demo-owner', approvedAt: new Date() }),
    ));
  client.setUserContext(context);
  await context.ensureSchema();
  return { client, context, evidence };
}

async function seedDemoData(active: Runtime): Promise<void> {
  const existing = await Q.customerOrders()
    .selectId()
    .limit(1)
    .comment('what: detect existing order playground data')
    .purpose('why: keep deterministic browser bootstrap idempotent')
    .executeForList(active.context);
  if (existing.length) return;
  const intent = new MutationIntent('Seed deterministic order playground data');
  await active.client.executeGraphSave(intent, async graph => {
    const requests = ORDER_SEED.map(record => graph.request({
      entity: record.entity,
      action: 'Create',
      id: record.id,
      payload: record.payload,
    }));
    for (const request of requests) active.client.preflightMutation(request);
    for (const request of requests) await active.client.executeMutation(request);
  });
}

function renderQueryCatalog(): void {
  queryCatalog.replaceChildren();
  for (const group of QUERY_GROUPS) {
    const section = document.createElement('section');
    section.className = 'query-group';
    const heading = document.createElement('div');
    heading.className = 'query-group-heading';
    const title = document.createElement('h2');
    title.textContent = localize(group.label);
    const description = document.createElement('p');
    description.textContent = localize(group.description);
    heading.append(title, description);
    const links = document.createElement('div');
    links.className = 'query-links';
    for (const query of group.queries) {
      const link = document.createElement('a');
      link.href = `#${query.id}`;
      link.dataset.queryId = query.id;
      link.textContent = localize(query.title);
      link.addEventListener('click', event => {
        event.preventDefault();
        activeQueryId = query.id;
        history.replaceState(null, '', `#${query.id}`);
        updateActiveLink();
        if (runtime) runQuery(query, runtime).catch(showError);
      });
      links.append(link);
    }
    section.append(heading, links);
    queryCatalog.append(section);
  }
  updateActiveLink();
}

function updateActiveLink(): void {
  queryCatalog.querySelectorAll<HTMLAnchorElement>('a[data-query-id]').forEach(link => {
    const active = link.dataset.queryId === activeQueryId;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function runQuery(query: QueryExample, active: Runtime): Promise<void> {
  const startedAt = performance.now();
  const executedAt = new Date();
  active.evidence.enableSelect();
  result.classList.add('loading');
  result.setAttribute('aria-busy', 'true');
  resultTitle.textContent = localize(query.title);
  resultDescription.textContent = localize(query.description);
  queryCode.textContent = query.code;
  queryParamsBlock.classList.toggle('hidden', query.view !== 'dashboard');
  queryParamsCode.textContent = query.view === 'dashboard'
    ? JSON.stringify({
      searchParams: orderCenterSearchParams(dashboardState.search),
      pageOffset: dashboardState.page * dashboardState.pageSize,
      pageSize: dashboardState.pageSize,
    }, null, 2)
    : '';
  resultGrid.classList.toggle('dashboard-mode', query.view === 'dashboard');
  result.classList.toggle('dashboard-result', query.view === 'dashboard');
  expandAll.closest<HTMLElement>('.tree-actions')?.classList.toggle('hidden', query.view === 'dashboard');
  resultViewLabel.textContent = query.view === 'dashboard'
    ? (locale === 'en' ? 'Order management center' : '订单管理中心')
    : (locale === 'en' ? 'Result tree' : '结果树');
  resultMeta.textContent = locale === 'en' ? 'Running query…' : '查询中…';
  try {
    const data = await query.run(active);
    if (query.view === 'dashboard') {
      queryCode.textContent = (data as DashboardData).queryExpression;
    }
    currentResult = { data, query, active };
    activeResultView = query.view === 'dashboard' || isTabularResult(data) ? 'table' : 'tree';
    renderCurrentResult();
    const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
    lastElapsed = elapsed;
    lastExecutedAt = executedAt;
    const statements = active.evidence.snapshot();
    renderSql(statements, executedAt);
    updateResultMeta(data, query, elapsed);
  } finally {
    result.classList.remove('loading');
    result.removeAttribute('aria-busy');
  }
}

function renderSql(statements: readonly SQLExecutionMetadata[], executedAt = lastExecutedAt): void {
  sqlOutput.replaceChildren();
  sqlCount.textContent = locale === 'en'
    ? `${statements.length} statement${statements.length === 1 ? '' : 's'}`
    : `${statements.length} 条语句`;
  statements.forEach((statement, index) => {
    const row = document.createElement('tr');
    row.className = 'evidence-row';
    const traceIdentity = [...statement.tracePath].reverse()
      .find(frame => frame.kind === 'relation' || frame.kind === 'request' || frame.kind === 'entity');
    const timeCell = document.createElement('td');
    timeCell.className = 'evidence-time';
    timeCell.dataset.executedAt = executedAt?.toISOString() ?? '';
    timeCell.textContent = `${executedAt?.toISOString() ?? '—'} · ${Math.max(0.01, statement.elapsedMicros / 1000).toFixed(2)} ms`;
    const identityCell = document.createElement('td');
    identityCell.textContent = `${currentResult?.query.id ?? 'query'} · #${index + 1} · ${traceIdentity?.name ?? 'query'}`;
    const traceCell = document.createElement('td');
    traceCell.className = 'evidence-trace';
    if (statement.traceChain?.length) {
      const purpose = statement.traceChain.find(node => node.kind === 'purpose');
      const comments = statement.traceChain
        .filter(node => node.kind === 'comment')
        .map(node => node.detail || node.name);
      traceCell.textContent = `${purpose?.detail || purpose?.name || ''}: ${comments.join(' → ')}`;
    } else {
      traceCell.textContent = statement.tracePath.map(frame => frame.detail || frame.name).join(' → ');
    }
    const sqlCell = document.createElement('td');
    sqlCell.className = 'evidence-sql';
    const bindings = statement.parameters.length
      ? statement.parameters.map(value => String(value)).join(', ')
      : 'none';
    sqlCell.textContent = `${statement.parameterizedSQL} · bindings: ${bindings}`;
    row.append(timeCell, identityCell, traceCell, sqlCell);
    sqlOutput.append(row);
  });
}

function isTabularResult(value: unknown): value is ReadonlyArray<Record<string, unknown>> {
  return Array.isArray(value) && value.every(row => row !== null && typeof row === 'object' && !Array.isArray(row));
}

function renderCurrentResult(): void {
  if (!currentResult) return;
  const { data, query, active } = currentResult;
  const tableAvailable = query.view === 'dashboard' || isTabularResult(data);
  if (!tableAvailable) activeResultView = 'tree';
  viewTable.disabled = !tableAvailable;
  viewTable.classList.toggle('active', activeResultView === 'table');
  viewTree.classList.toggle('active', activeResultView === 'tree');
  viewTable.setAttribute('aria-pressed', String(activeResultView === 'table'));
  viewTree.setAttribute('aria-pressed', String(activeResultView === 'tree'));
  expandAll.closest<HTMLElement>('.tree-actions')?.classList.toggle('hidden', activeResultView !== 'tree');

  if (activeResultView === 'table' && query.view === 'dashboard') {
    resultViewLabel.textContent = locale === 'en' ? 'Result table' : '结果表格';
    renderDashboard(data as DashboardData, active, query);
    return;
  }
  if (activeResultView === 'table' && isTabularResult(data)) {
    resultViewLabel.textContent = locale === 'en' ? 'Result table' : '结果表格';
    renderTable(data);
    return;
  }
  resultViewLabel.textContent = locale === 'en' ? 'Result tree' : '结果树';
  renderTree(query.view === 'dashboard' ? dashboardTreeData(data as DashboardData) : data);
}

function dashboardTreeData(data: DashboardData): Record<string, unknown> {
  return {
    orders: data.orders,
    totalOrders: data.totalOrders,
    filteredOrders: data.filteredOrders,
    statusFacets: data.statusFacets,
    search: data.search,
    page: data.page,
    pageSize: data.pageSize,
  };
}

function renderTable(rows: ReadonlyArray<Record<string, unknown>>): void {
  const shell = document.createElement('div');
  shell.className = 'result-table-shell';
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'result-table-empty';
    empty.textContent = locale === 'en' ? 'The query returned no records.' : '查询没有返回记录。';
    shell.append(empty);
    result.replaceChildren(shell);
    return;
  }
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const table = document.createElement('table');
  table.className = 'result-table';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of columns) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = column;
    headRow.append(cell);
  }
  head.append(headRow);
  const body = document.createElement('tbody');
  for (const row of rows) {
    const tableRow = document.createElement('tr');
    for (const column of columns) {
      const cell = document.createElement('td');
      cell.textContent = tableCellText(row[column]);
      tableRow.append(cell);
    }
    body.append(tableRow);
  }
  table.append(head, body);
  shell.append(table);
  result.replaceChildren(shell);
}

function tableCellText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return locale === 'en' ? `${value.length} items` : `${value.length} 项`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const code = statusCodeFor(record);
    if (code) return statusLabel(code);
    const identity = record.name ?? record.orderNumber ?? record.code ?? record.id;
    return identity === undefined
      ? (locale === 'en' ? `${Object.keys(record).length} fields` : `${Object.keys(record).length} 个字段`)
      : String(identity);
  }
  return String(value);
}

function renderDashboard(data: DashboardData, active: Runtime, query: QueryExample): void {
  const center = document.createElement('div');
  center.className = 'order-center';

  const toolbar = document.createElement('div');
  toolbar.className = 'order-center-toolbar';
  const heading = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = locale === 'en' ? 'Order Management Center' : '订单管理中心';
  const subtitle = document.createElement('p');
  subtitle.textContent = locale === 'en'
    ? 'One generated Q expression describes the entire page'
    : '一个生成式 Q 表达式描述整个页面';
  heading.append(title, subtitle);
  const searchForm = document.createElement('form');
  searchForm.className = 'order-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = locale === 'en'
    ? 'Order number, status, or product…'
    : '订单号、状态或商品名称…';
  searchInput.value = data.search;
  searchInput.setAttribute('aria-label', locale === 'en' ? 'Search orders' : '搜索订单');
  const searchButton = document.createElement('button');
  searchButton.type = 'submit';
  searchButton.className = 'order-search-submit';
  searchButton.setAttribute('aria-label', locale === 'en' ? 'Run order query' : '执行订单查询');
  searchButton.title = locale === 'en' ? 'Search' : '查询';
  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchButton.append(searchIcon);
  searchForm.append(searchInput, searchButton);
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    dashboardState.search = searchInput.value.trim();
    dashboardState.page = 0;
    runQuery(query, active).catch(showError);
  });
  toolbar.append(heading, searchForm);

  const metrics = document.createElement('div');
  metrics.className = 'order-metrics';
  metrics.append(metricCard(locale === 'en' ? 'All orders' : '全部订单', data.totalOrders, 'total', '#2B66D9', !data.search, () => {
    dashboardState.search = '';
    dashboardState.page = 0;
    runQuery(query, active).catch(showError);
  }));
  for (const status of data.statusFacets) {
    metrics.append(metricCard(
      status.name,
      status.orderCount,
      status.code.toLowerCase(),
      status.color,
      data.search.toUpperCase() === status.code, () => {
        dashboardState.search = status.code;
        dashboardState.page = 0;
        runQuery(query, active).catch(showError);
      },
      `${locale === 'en' ? 'Total' : '总额'} ${formatFacetAmount(status.orderTotalAmount)}`,
    ));
  }

  const table = document.createElement('div');
  table.className = 'order-table';
  const tableHeader = document.createElement('div');
  tableHeader.className = 'order-row order-row-head';
  const columnLabels = locale === 'en'
    ? ['Order number', 'Order date', 'Status', 'Product details']
    : ['订单号', '订单日期', '状态', '商品明细'];
  for (const label of columnLabels) {
    const cell = document.createElement('span');
    cell.textContent = label;
    tableHeader.append(cell);
  }
  table.append(tableHeader);
  if (!data.orders.length) {
    const empty = document.createElement('div');
    empty.className = 'order-empty';
    empty.textContent = locale === 'en'
      ? 'No matching orders. Try an order number, status code, or product name.'
      : '没有匹配的订单，请尝试订单号、状态英文或商品名称。';
    table.append(empty);
  }
  for (const order of data.orders) table.append(renderOrderRow(order));

  const footer = document.createElement('div');
  footer.className = 'order-center-footer';
  const pageInfo = document.createElement('p');
  const first = data.filteredOrders ? data.page * data.pageSize + 1 : 0;
  const last = Math.min(data.filteredOrders, (data.page + 1) * data.pageSize);
  pageInfo.textContent = locale === 'en'
    ? `Showing ${first}–${last} of ${data.filteredOrders} orders`
    : `显示 ${first}–${last}，共 ${data.filteredOrders} 条订单`;
  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  const pageCount = Math.max(1, Math.ceil(data.filteredOrders / data.pageSize));
  pagination.append(pageButton('‹', data.page - 1, data.page === 0, active, query));
  for (let page = 0; page < pageCount; page += 1) {
    const button = pageButton(String(page + 1), page, false, active, query);
    button.classList.toggle('active', page === data.page);
    pagination.append(button);
  }
  pagination.append(pageButton('›', data.page + 1, data.page >= pageCount - 1, active, query));
  footer.append(pageInfo, pagination);

  center.append(toolbar, metrics, table, footer);
  result.replaceChildren(center);
}

function metricCard(
  label: string,
  count: number,
  tone: string,
  color: string,
  active: boolean,
  select: () => void,
  detail?: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `metric-card metric-${tone}`;
  if (color) button.style.setProperty('--metric-color', color);
  button.classList.toggle('active', active);
  const name = document.createElement('span');
  name.textContent = label;
  const value = document.createElement('strong');
  value.textContent = String(count);
  button.append(name, value);
  if (detail) {
    const secondary = document.createElement('small');
    secondary.textContent = detail;
    button.append(secondary);
  }
  button.addEventListener('click', select);
  return button;
}

function formatFacetAmount(value: number): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function renderOrderRow(order: Record<string, unknown>): HTMLElement {
  const row = document.createElement('div');
  row.className = 'order-row';
  const status = (order.status ?? {}) as Record<string, unknown>;
  const items = Array.isArray(order.itemList) ? order.itemList as Array<Record<string, unknown>> : [];
  const values = [
    String(order.orderNumber ?? ''),
    String(order.orderDate ?? ''),
  ];
  values.forEach(value => {
    const cell = document.createElement('span');
    cell.className = 'order-primary';
    cell.textContent = value;
    row.append(cell);
  });
  const statusCell = document.createElement('span');
  const badge = document.createElement('span');
  const statusCode = statusCodeFor(status);
  badge.className = `status-badge status-${statusCode.toLowerCase()}`;
  badge.textContent = statusLabel(statusCode) || String(status.name ?? statusCode);
  const statusColor = String(status.color ?? '');
  if (statusColor) {
    badge.style.color = statusColor;
    badge.style.backgroundColor = `${statusColor}18`;
  }
  statusCell.append(badge);
  row.append(statusCell);

  const products = document.createElement('span');
  products.className = 'product-preview';
  items.forEach((item, index) => {
    const thumb = document.createElement('span');
    thumb.className = `product-thumb product-tone-${index % 3}`;
    thumb.textContent = String(item.productName ?? '?').slice(0, 1);
    thumb.title = `${String(item.productName ?? '')} × ${String(item.quantity ?? 1)}`;
    products.append(thumb);
  });
  const remaining = Number(order.itemCount ?? items.length) - items.length;
  if (remaining > 0) {
    const more = document.createElement('small');
    more.textContent = `+${remaining}`;
    products.append(more);
  }
  row.append(products);
  return row;
}

function pageButton(
  label: string,
  page: number,
  disabled: boolean,
  active: Runtime,
  query: QueryExample,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', () => {
    dashboardState.page = page;
    runQuery(query, active).catch(showError);
  });
  return button;
}

function statusLabel(value: string): string {
  const labels = locale === 'en'
    ? { PENDING_PAYMENT: 'Pending payment', PAID: 'Paid', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' }
    : { PENDING_PAYMENT: '待支付', PAID: '已支付', SHIPPED: '运输中', DELIVERED: '已完成', CANCELLED: '已取消' };
  return (labels as Record<string, string>)[value] ?? value;
}

function renderTree(value: unknown): void {
  result.replaceChildren(createTreeNode(value, 'result', 0));
}

function createTreeNode(value: unknown, key: string, depth: number): HTMLElement {
  if (value !== null && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? value.map((item, index) => [String(index), item] as const)
      : Object.entries(value as Record<string, unknown>);
    const details = document.createElement('details');
    details.className = 'tree-branch';
    details.open = depth === 0;
    const summary = document.createElement('summary');
    const keyLabel = document.createElement('span');
    keyLabel.className = 'tree-key';
    keyLabel.textContent = key;
    const preview = document.createElement('span');
    preview.className = 'tree-preview';
    preview.textContent = objectPreview(value, entries.length);
    summary.append(keyLabel, preview);
    details.append(summary);
    const children = document.createElement('div');
    children.className = 'tree-children';
    for (const [childKey, childValue] of entries) {
      children.append(createTreeNode(childValue, Array.isArray(value) ? `#${Number(childKey) + 1}` : childKey, depth + 1));
    }
    details.append(children);
    return details;
  }

  const leaf = document.createElement('div');
  leaf.className = 'tree-leaf';
  const keyLabel = document.createElement('span');
  keyLabel.className = 'tree-key';
  keyLabel.textContent = key;
  const scalar = document.createElement('span');
  scalar.className = `tree-value tree-${value === null ? 'null' : typeof value}`;
  scalar.textContent = value === null ? 'null' : typeof value === 'string' ? `“${value}”` : String(value);
  leaf.append(keyLabel, scalar);
  return leaf;
}

function objectPreview(value: object, size: number): string {
  if (Array.isArray(value)) return locale === 'en' ? `${size} items` : `${size} 项`;
  const record = value as Record<string, unknown>;
  const identity = record.orderNumber ?? record.name ?? record.productName
    ?? record.transactionId ?? record.trackingNumber;
  return identity ? String(identity) : (locale === 'en' ? `${size} fields` : `${size} 个字段`);
}

function formatExecutedAt(value: Date): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(value);
}

function resultRowCount(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  return Array.isArray((data as { data?: unknown[] })?.data)
    ? (data as { data: unknown[] }).data.length
    : 1;
}

function updateResultMeta(data: unknown, query: QueryExample, elapsed: number): void {
  const count = query.view === 'dashboard'
    ? (data as DashboardData).filteredOrders
    : resultRowCount(data);
  const rows = locale === 'en'
    ? `${count} ${query.view === 'dashboard' ? `matching order${count === 1 ? '' : 's'}` : `result${count === 1 ? '' : 's'}`}`
    : `${count} 条${query.view === 'dashboard' ? '匹配订单' : '结果'}`;
  resultMeta.textContent = `${rows} · ${elapsed} ms · ${locale === 'en' ? 'in-browser SQLite' : '浏览器内 SQLite'}`;
}

function updateRuntimeStatus(storage: BrowserSQLiteStorage): void {
  const orders = ORDER_SEED.filter(record => record.entity === 'CustomerOrder').length;
  status.textContent = locale === 'en'
    ? `${storage.toUpperCase()} · ${orders} orders · 7 entities · policy installed · ready`
    : `${storage.toUpperCase()} · ${orders} 个订单 · 7 个实体 · 已安装策略 · 就绪`;
}

function applyLocale(): void {
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  document.title = locale === 'en' ? 'TeaQL Order Query Playground' : 'TeaQL 订单查询演练场';
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = locale === 'en'
    ? 'A TeaQL order-query playground running entirely in the browser'
    : '完全运行在浏览器中的 TeaQL 订单查询演练场';
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    if (key) element.textContent = copy(key);
  });
  languageButtons.forEach(button => {
    const active = button.dataset.locale === locale;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector<HTMLElement>('.language-switch')?.setAttribute('aria-label', locale === 'en' ? 'Language' : '语言');
  document.querySelector<HTMLElement>('.brand')?.setAttribute('aria-label', locale === 'en' ? 'TeaQL Playground home' : 'TeaQL 演练场首页');
  document.querySelector<HTMLElement>('.model-map')?.setAttribute('aria-label', locale === 'en' ? 'Order domain model' : '订单领域模型');
  document.querySelector<HTMLElement>('.runtime-bar')?.setAttribute('aria-label', locale === 'en' ? 'Runtime settings' : '运行时设置');
  queryCatalog.setAttribute('aria-label', locale === 'en' ? 'Example queries' : '示例查询');
  document.querySelector<HTMLElement>('.result-view-switch')?.setAttribute('aria-label', locale === 'en' ? 'Result views' : '结果视图');
  document.querySelector<HTMLElement>('.tree-actions')?.setAttribute('aria-label', locale === 'en' ? 'Result tree actions' : '结果树操作');
  renderQueryCatalog();
  if (currentResult) {
    const { data, query, active } = currentResult;
    resultTitle.textContent = localize(query.title);
    resultDescription.textContent = localize(query.description);
    renderCurrentResult();
    renderSql(active.evidence.snapshot(), lastExecutedAt);
    updateResultMeta(data, query, lastElapsed);
    updateRuntimeStatus(persist.checked ? 'opfs' : 'memory');
  } else {
    status.textContent = locale === 'en' ? 'Starting SQLite/WASM…' : '正在启动 SQLite/WASM…';
  }
}

function selectedQuery(): QueryExample {
  return allQueries.find(query => query.id === activeQueryId) ?? allQueries[0];
}

async function replaceRuntime(storage: BrowserSQLiteStorage): Promise<void> {
  status.textContent = locale === 'en'
    ? `Opening ${storage.toUpperCase()} SQLite/WASM…`
    : `正在打开 ${storage.toUpperCase()} SQLite/WASM…`;
  const previous = runtime;
  runtime = undefined;
  await previous?.client.close();
  const next = await openRuntime(storage);
  runtime = next;
  await seedDemoData(next);
  await runQuery(selectedQuery(), next);
  updateRuntimeStatus(storage);
}

persist.addEventListener('change', () => {
  const storage = persist.checked ? 'opfs' : 'memory';
  localStorage.setItem('teaql-browser-storage', storage);
  replaceRuntime(storage).catch(showError);
});

reset.addEventListener('click', async () => {
  if (!runtime) return;
  reset.disabled = true;
  try {
    await runtime.client.reset(runtime.context);
    await seedDemoData(runtime);
    await runQuery(selectedQuery(), runtime);
  } catch (error) { showError(error); }
  finally { reset.disabled = false; }
});

expandAll.addEventListener('click', () => {
  result.querySelectorAll<HTMLDetailsElement>('details').forEach(branch => { branch.open = true; });
});

viewTable.addEventListener('click', () => {
  if (viewTable.disabled) return;
  activeResultView = 'table';
  renderCurrentResult();
});

viewTree.addEventListener('click', () => {
  activeResultView = 'tree';
  renderCurrentResult();
});

collapseAll.addEventListener('click', () => {
  result.querySelectorAll<HTMLDetailsElement>('details').forEach((branch, index) => { branch.open = index === 0; });
});

languageButtons.forEach(button => {
  button.addEventListener('click', () => {
    locale = button.dataset.locale === 'zh' ? 'zh' : 'en';
    localStorage.setItem('teaql-browser-locale', locale);
    applyLocale();
  });
});

function showError(value: unknown): void {
  const error = value instanceof Error ? value : new Error(String(value));
  status.textContent = `${error.name}: ${error.message}`;
  resultMeta.textContent = locale === 'en' ? 'Query failed' : '查询失败';
  renderTree({ error: error.name, message: error.message });
}

applyLocale();
activeQueryId = selectedQuery().id;
updateActiveLink();
replaceRuntime(storagePreference).catch(showError);
